import asyncio
import logging
import math
import os
import re
import tempfile
from functools import lru_cache
from typing import Any, Dict, List, Optional, Sequence, Tuple

from state import LoanState

LOGGER = logging.getLogger(__name__)

FACE_MATCH_THRESHOLD = 0.70
FACE_REVIEW_THRESHOLD = 0.55
EAR_BLINK_THRESHOLD = 0.21
HEAD_MOTION_THRESHOLD = 0.015
MIN_VALID_LIVENESS_FRAMES = 5


def _load_video_kyc_dependencies():
    try:
        import cv2
        import mediapipe as mp
        import numpy as np
        import pytesseract
        import torch
        from facenet_pytorch import InceptionResnetV1, MTCNN
        from PIL import Image
    except ImportError as exc:
        raise RuntimeError(
            "Video KYC dependencies are missing. Install torch, torchvision, "
            "opencv-python, facenet-pytorch, mediapipe, pillow, numpy, and pytesseract."
        ) from exc

    return cv2, mp, np, pytesseract, torch, InceptionResnetV1, MTCNN, Image


@lru_cache(maxsize=1)
def _get_device() -> str:
    _, _, _, _, torch, _, _, _ = _load_video_kyc_dependencies()
    return "cuda" if torch.cuda.is_available() else "cpu"


@lru_cache(maxsize=1)
def _get_face_detector():
    _, _, _, _, _, _, MTCNN, _ = _load_video_kyc_dependencies()
    return MTCNN(
        image_size=160,
        margin=12,
        keep_all=True,
        post_process=True,
        device=_get_device(),
    )


@lru_cache(maxsize=1)
def _get_face_embedder():
    _, _, _, _, _, InceptionResnetV1, _, _ = _load_video_kyc_dependencies()
    model = InceptionResnetV1(pretrained="vggface2").eval().to(_get_device())
    return model


@lru_cache(maxsize=1)
def _get_face_mesh():
    _, mp, _, _, _, _, _, _ = _load_video_kyc_dependencies()
    return mp.solutions.face_mesh.FaceMesh(
        static_image_mode=False,
        refine_landmarks=True,
        max_num_faces=1,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    )


def _normalize_name(value: Optional[str]) -> str:
    if not value:
        return ""
    return re.sub(r"[^a-z]", "", value.lower())


def _name_similarity(expected_name: Optional[str], extracted_name: Optional[str]) -> float:
    import difflib

    expected = _normalize_name(expected_name)
    extracted = _normalize_name(extracted_name)
    if not expected or not extracted:
        return 0.0
    return difflib.SequenceMatcher(None, expected, extracted).ratio()


def _coerce_image(image: Any):
    cv2, _, np, _, _, _, _, Image = _load_video_kyc_dependencies()

    if image is None:
        raise ValueError("Image input is required for Video KYC.")

    if isinstance(image, np.ndarray):
        frame = image.copy()
    elif isinstance(image, Image.Image):
        frame = cv2.cvtColor(np.array(image.convert("RGB")), cv2.COLOR_RGB2BGR)
    elif isinstance(image, bytes):
        decoded = cv2.imdecode(np.frombuffer(image, dtype=np.uint8), cv2.IMREAD_COLOR)
        if decoded is None:
            raise ValueError("Unable to decode image bytes.")
        frame = decoded
    elif isinstance(image, str):
        if not os.path.exists(image):
            raise ValueError(f"Image path does not exist: {image}")
        decoded = cv2.imread(image)
        if decoded is None:
            raise ValueError(f"Unable to read image from path: {image}")
        frame = decoded
    else:
        raise TypeError(f"Unsupported image input type: {type(image).__name__}")

    if frame.ndim != 3 or frame.shape[2] != 3:
        raise ValueError("Image must be a 3-channel color frame.")
    return frame


def _decode_video_frames(video_input: Any) -> List[Any]:
    cv2, _, _, _, _, _, _, _ = _load_video_kyc_dependencies()

    if video_input is None:
        return []

    if isinstance(video_input, list):
        return [_coerce_image(frame) for frame in video_input]

    if isinstance(video_input, tuple):
        return [_coerce_image(frame) for frame in list(video_input)]

    if isinstance(video_input, str):
        if not os.path.exists(video_input):
            raise ValueError(f"Video path does not exist: {video_input}")
        capture = cv2.VideoCapture(video_input)
        return _read_video_capture(capture)

    if isinstance(video_input, bytes):
        with tempfile.NamedTemporaryFile(suffix=".mp4", delete=False) as handle:
            handle.write(video_input)
            temp_path = handle.name
        try:
            capture = cv2.VideoCapture(temp_path)
            return _read_video_capture(capture)
        finally:
            if os.path.exists(temp_path):
                os.unlink(temp_path)

    raise TypeError(f"Unsupported video input type: {type(video_input).__name__}")


def _read_video_capture(capture) -> List[Any]:
    frames: List[Any] = []
    try:
        while True:
            ok, frame = capture.read()
            if not ok:
                break
            frames.append(frame)
    finally:
        capture.release()
    return frames


def _select_largest_face(boxes, probabilities):
    if boxes is None or probabilities is None:
        return None

    best_idx = None
    best_score = -1.0
    for idx, (box, probability) in enumerate(zip(boxes, probabilities)):
        if probability is None:
            continue
        x1, y1, x2, y2 = box
        area = max(0.0, (x2 - x1) * (y2 - y1))
        score = float(probability) * float(area)
        if score > best_score:
            best_score = score
            best_idx = idx

    if best_idx is None:
        return None
    return int(best_idx)


def _blur_score(frame) -> float:
    cv2, _, _, _, _, _, _, _ = _load_video_kyc_dependencies()
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    return float(cv2.Laplacian(gray, cv2.CV_64F).var())


def _best_video_frame(video_frames: Sequence[Any]):
    detector = _get_face_detector()
    best_frame = None
    best_score = -1.0

    for frame in video_frames:
        image = _coerce_image(frame)
        rgb = image[:, :, ::-1]
        boxes, probs = detector.detect(rgb)
        selected_idx = _select_largest_face(boxes, probs)
        if selected_idx is None:
            continue
        sharpness = min(_blur_score(image) / 300.0, 1.0)
        score = float(probs[selected_idx]) * 0.7 + sharpness * 0.3
        if score > best_score:
            best_frame = image
            best_score = score

    if best_frame is None:
        raise ValueError("No usable face detected in supplied video frames.")
    return best_frame


def extract_face_embedding(image: Any):
    _, _, _, _, torch, _, _, _ = _load_video_kyc_dependencies()
    detector = _get_face_detector()
    embedder = _get_face_embedder()

    frame = _coerce_image(image)
    rgb = frame[:, :, ::-1]
    boxes, probs = detector.detect(rgb)
    selected_idx = _select_largest_face(boxes, probs)
    if selected_idx is None:
        raise ValueError("No face detected in image.")

    aligned = detector.extract(rgb, [boxes[selected_idx]], save_path=None)
    if aligned is None or len(aligned) == 0:
        raise ValueError("Unable to align face from image.")

    face_tensor = aligned[0].unsqueeze(0).to(_get_device())
    with torch.inference_mode():
        embedding = embedder(face_tensor).squeeze(0).detach().cpu()
    return embedding


def compare_faces(embedding1: Any, embedding2: Any) -> float:
    _, _, _, _, torch, _, _, _ = _load_video_kyc_dependencies()

    vector1 = embedding1 if isinstance(embedding1, torch.Tensor) else torch.tensor(embedding1)
    vector2 = embedding2 if isinstance(embedding2, torch.Tensor) else torch.tensor(embedding2)

    vector1 = vector1.float()
    vector2 = vector2.float()
    similarity = torch.nn.functional.cosine_similarity(vector1.unsqueeze(0), vector2.unsqueeze(0))
    return float(torch.clamp(similarity, min=0.0, max=1.0).item())


def _euclidean(point_a: Tuple[float, float], point_b: Tuple[float, float]) -> float:
    return math.dist(point_a, point_b)


def _eye_aspect_ratio(points: Sequence[Tuple[float, float]]) -> float:
    if len(points) != 6:
        return 0.0
    numerator = _euclidean(points[1], points[5]) + _euclidean(points[2], points[4])
    denominator = 2.0 * _euclidean(points[0], points[3])
    if denominator == 0:
        return 0.0
    return numerator / denominator


def detect_liveness(video_frames: Sequence[Any]) -> Dict[str, Any]:
    cv2, _, _, _, _, _, _, _ = _load_video_kyc_dependencies()
    face_mesh = _get_face_mesh()

    left_eye_idx = [33, 160, 158, 133, 153, 144]
    right_eye_idx = [362, 385, 387, 263, 373, 380]
    nose_idx = 1

    blink_detected = False
    eye_closed = False
    valid_frames = 0
    nose_positions: List[Tuple[float, float]] = []

    for frame in video_frames:
        image = _coerce_image(frame)
        rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        results = face_mesh.process(rgb)
        if not results.multi_face_landmarks:
            continue

        face_landmarks = results.multi_face_landmarks[0]
        h, w, _ = image.shape

        def point(idx: int) -> Tuple[float, float]:
            landmark = face_landmarks.landmark[idx]
            return landmark.x * w, landmark.y * h

        left_ear = _eye_aspect_ratio([point(idx) for idx in left_eye_idx])
        right_ear = _eye_aspect_ratio([point(idx) for idx in right_eye_idx])
        ear = (left_ear + right_ear) / 2.0

        if ear < EAR_BLINK_THRESHOLD:
            eye_closed = True
        elif eye_closed and ear >= EAR_BLINK_THRESHOLD:
            blink_detected = True
            eye_closed = False

        nose_x, nose_y = point(nose_idx)
        nose_positions.append((nose_x / w, nose_y / h))
        valid_frames += 1

    if valid_frames < MIN_VALID_LIVENESS_FRAMES:
        return {
            "liveness_passed": False,
            "liveness_score": 0.0,
            "blink_detected": False,
            "head_movement_detected": False,
        }

    total_motion = 0.0
    for prev_point, curr_point in zip(nose_positions, nose_positions[1:]):
        total_motion += _euclidean(prev_point, curr_point)

    average_motion = total_motion / max(len(nose_positions) - 1, 1)
    head_movement_detected = average_motion >= HEAD_MOTION_THRESHOLD

    blink_score = 1.0 if blink_detected else 0.0
    motion_score = min(average_motion / (HEAD_MOTION_THRESHOLD * 2.0), 1.0)
    liveness_score = round((0.5 * blink_score) + (0.5 * motion_score), 4)

    return {
        "liveness_passed": blink_detected and head_movement_detected,
        "liveness_score": liveness_score,
        "blink_detected": blink_detected,
        "head_movement_detected": head_movement_detected,
    }


def _preprocess_ocr_image(image: Any):
    cv2, _, _, _, _, _, _, _ = _load_video_kyc_dependencies()
    frame = _coerce_image(image)
    gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    denoised = cv2.bilateralFilter(gray, 9, 75, 75)
    binary = cv2.adaptiveThreshold(
        denoised,
        255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        31,
        11,
    )
    return binary


def _extract_candidate_name(ocr_text: str) -> str:
    blacklist = {
        "governmentofindia",
        "yearofbirth",
        "dob",
        "male",
        "female",
        "address",
        "aadhaar",
        "enrolment",
        "vid",
        "india",
        "uniqueidentificationauthorityofindia",
    }

    candidates: List[str] = []
    for raw_line in ocr_text.splitlines():
        line = re.sub(r"[^A-Za-z ]", " ", raw_line).strip()
        line = re.sub(r"\s+", " ", line)
        normalized = _normalize_name(line)
        if len(line.split()) < 2 or len(normalized) < 5:
            continue
        if normalized in blacklist:
            continue
        candidates.append(line.title())

    if not candidates:
        return ""
    return max(candidates, key=len)


def extract_ocr(aadhaar_image: Any) -> Dict[str, Any]:
    _, _, _, pytesseract, _, _, _, Image = _load_video_kyc_dependencies()

    processed = _preprocess_ocr_image(aadhaar_image)
    pil_image = Image.fromarray(processed)
    text = pytesseract.image_to_string(pil_image, config="--oem 3 --psm 6")

    aadhaar_match = re.search(r"\b(\d{4}\s?\d{4}\s?\d{4})\b", text)
    aadhaar_number = re.sub(r"\D", "", aadhaar_match.group(1)) if aadhaar_match else ""
    name = _extract_candidate_name(text)
    aadhaar_valid = len(aadhaar_number) == 12

    return {
        "ocr_name": name,
        "ocr_aadhaar": aadhaar_number,
        "valid_ocr": bool(name) and aadhaar_valid,
        "raw_text": text,
    }


def _compute_ocr_accuracy(ocr_result: Dict[str, Any], expected_name: Optional[str]) -> Tuple[float, bool]:
    aadhaar_valid = len(ocr_result.get("ocr_aadhaar", "")) == 12
    name_present = bool(ocr_result.get("ocr_name"))
    name_similarity = _name_similarity(expected_name, ocr_result.get("ocr_name"))

    if expected_name:
        valid_ocr = aadhaar_valid and name_similarity >= 0.75
        name_score = name_similarity
    else:
        valid_ocr = aadhaar_valid and name_present
        name_score = 1.0 if name_present else 0.0

    ocr_accuracy = (0.6 * (1.0 if aadhaar_valid else 0.0)) + (0.4 * name_score)
    return round(ocr_accuracy, 4), valid_ocr


def _result_payload(
    video_kyc_status: str,
    face_match_score: float = 0.0,
    liveness_passed: bool = False,
    ocr_name: str = "",
    ocr_aadhaar: str = "",
    kyc_confidence: float = 0.0,
) -> Dict[str, Any]:
    return {
        "video_kyc_status": video_kyc_status,
        "face_match_score": round(float(face_match_score), 4),
        "liveness_passed": bool(liveness_passed),
        "ocr_name": ocr_name,
        "ocr_aadhaar": ocr_aadhaar,
        "kyc_confidence": round(float(kyc_confidence), 4),
    }


def run_video_kyc(state: LoanState) -> LoanState:
    aadhaar_image = state.get("aadhaar_image")
    video_input = state.get("video_frames")
    user_name = state.get("user_name") or state.get("name")

    try:
        if aadhaar_image is None or video_input is None:
            raise ValueError("Both aadhaar_image and video_frames are required for Video KYC.")

        frames = _decode_video_frames(video_input)
        if not frames:
            raise ValueError("No decodable frames found for Video KYC.")

        aadhaar_embedding = extract_face_embedding(aadhaar_image)
        best_frame = _best_video_frame(frames)
        live_embedding = extract_face_embedding(best_frame)
        face_match_score = compare_faces(aadhaar_embedding, live_embedding)

        liveness = detect_liveness(frames)
        ocr_result = extract_ocr(aadhaar_image)
        ocr_accuracy, valid_ocr = _compute_ocr_accuracy(ocr_result, user_name)

        kyc_confidence = min(
            (0.5 * face_match_score)
            + (0.3 * liveness["liveness_score"])
            + (0.2 * ocr_accuracy),
            1.0,
        )

        if face_match_score > FACE_MATCH_THRESHOLD and liveness["liveness_passed"] and valid_ocr:
            status = "VERIFIED"
            state["current_step"] = "credit"
            state["kyc_status"] = "VERIFIED"
        elif face_match_score < FACE_REVIEW_THRESHOLD or not liveness["liveness_passed"]:
            status = "FAILED"
            state["current_step"] = "video_kyc"
            state["kyc_status"] = "FAILED"
        else:
            status = "REVIEW"
            state["current_step"] = "video_kyc"
            state["kyc_status"] = "REVIEW"

        payload = _result_payload(
            video_kyc_status=status,
            face_match_score=face_match_score,
            liveness_passed=liveness["liveness_passed"],
            ocr_name=ocr_result.get("ocr_name", ""),
            ocr_aadhaar=ocr_result.get("ocr_aadhaar", ""),
            kyc_confidence=kyc_confidence,
        )

    except Exception as exc:
        LOGGER.exception("Video KYC execution failed: %s", exc)
        state["current_step"] = "video_kyc"
        state["kyc_status"] = "FAILED"
        payload = _result_payload(video_kyc_status="FAILED")

    state.update(payload)

    summary_message = (
        f"Video eKYC Result: {state['video_kyc_status']}\n"
        f"• Face Match Score: {state['face_match_score']:.2f}\n"
        f"• Liveness Passed: {'Yes' if state['liveness_passed'] else 'No'}\n"
        f"• OCR Name: {state['ocr_name'] or 'Not detected'}\n"
        f"• OCR Aadhaar: {state['ocr_aadhaar'] or 'Not detected'}\n"
        f"• Confidence: {state['kyc_confidence']:.2f}"
    )
    state["messages"].append({"role": "assistant", "content": summary_message})
    return state


async def run_video_kyc_async(state: LoanState) -> LoanState:
    return await asyncio.to_thread(run_video_kyc, state)


class VideoKycAgent:
    def __call__(self, state: LoanState) -> LoanState:
        return run_video_kyc(state)

    async def arun(self, state: LoanState) -> LoanState:
        return await run_video_kyc_async(state)


def video_kyc_agent(state: LoanState) -> LoanState:
    return run_video_kyc(state)
