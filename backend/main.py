import asyncio
import io
import json
import logging
import os
import uuid
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from typing import Any, Optional

from state import get_initial_state
from pipeline import pipeline
from secure_storage import store_secure_artifact
from llm import get_client
from agents import credit_agent, sanction_agent

LOGGER = logging.getLogger(__name__)

app = FastAPI(title="LoanBot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://localhost:5174",
        "http://127.0.0.1:5173", "http://127.0.0.1:5174",
        "http://localhost:3000",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory session store: session_id -> LoanState
sessions: dict = {}


class ChatRequest(BaseModel):
    session_id: Optional[str] = None
    message: str


class ChatResponse(BaseModel):
    session_id: str
    message: str
    messages: list[str] = Field(default_factory=list)
    current_step: Optional[str] = None
    loan_status: Optional[str] = None
    pdf_ready: bool = False
    pdf_filename: Optional[str] = None
    loan_data: dict[str, Any] = Field(default_factory=dict)


class VideoKycResponse(BaseModel):
    session_id: str
    message: str
    messages: list[str] = Field(default_factory=list)
    current_step: Optional[str] = None
    loan_status: Optional[str] = None
    pdf_ready: bool = False
    pdf_filename: Optional[str] = None
    loan_data: dict[str, Any] = Field(default_factory=dict)
    video_kyc_status: str
    face_match_score: float
    liveness_passed: bool
    ocr_name: str
    ocr_aadhaar: str
    kyc_confidence: float


def _mask_aadhaar(value: Optional[str]) -> Optional[str]:
    digits = "".join(ch for ch in (value or "") if ch.isdigit())
    if len(digits) < 4:
        return None
    return f"XXXX-XXXX-{digits[-4:]}"


def _mask_pan(value: Optional[str]) -> Optional[str]:
    pan = (value or "").upper().strip()
    if len(pan) < 6:
        return None
    return f"{pan[:3]}XXXX{pan[-3:]}"


def build_loan_data(state: dict[str, Any]) -> dict[str, Any]:
    loan_data: dict[str, Any] = {}

    if state.get("loan_type"):
        loan_data["loan_type"] = state["loan_type"]
    if state.get("interest_rate") is not None:
        loan_data["interest_rate"] = state["interest_rate"]
    if state.get("loan_amount") is not None:
        loan_data["loan_amount"] = state["loan_amount"]
    if state.get("tenure") is not None:
        loan_data["tenure"] = state["tenure"]
    if state.get("income") is not None:
        loan_data["income"] = state["income"]
    if state.get("emi") is not None:
        loan_data["emi"] = state["emi"]
    if state.get("name"):
        loan_data["name"] = state["name"]
    if state.get("aadhaar"):
        masked_aadhaar = _mask_aadhaar(state.get("aadhaar"))
        if masked_aadhaar:
            loan_data["aadhaar"] = masked_aadhaar
    if state.get("pan"):
        masked_pan = _mask_pan(state.get("pan"))
        if masked_pan:
            loan_data["pan"] = masked_pan
    if state.get("kyc_status"):
        loan_data["kyc_status"] = state["kyc_status"]
    if state.get("video_kyc_status"):
        loan_data["video_kyc_status"] = state["video_kyc_status"]
    if state.get("face_match_score") is not None:
        loan_data["face_match_score"] = state["face_match_score"]
    if state.get("liveness_passed") is not None:
        loan_data["liveness_passed"] = state["liveness_passed"]
    if state.get("kyc_confidence") is not None:
        loan_data["kyc_confidence"] = state["kyc_confidence"]
    if state.get("cibil_score") is not None:
        loan_data["cibil_score"] = state["cibil_score"]
    if state.get("loan_status"):
        loan_data["loan_status"] = state["loan_status"]
    if state.get("emi_ratio") is not None:
        loan_data["emi_ratio"] = state["emi_ratio"]
    loan_data["risk_factors"] = list(state.get("risk_factors") or [])
    if state.get("npa_risk"):
        loan_data["npa_risk"] = state["npa_risk"]
    if state.get("affordability_warning") is not None:
        loan_data["affordability_warning"] = state["affordability_warning"]
    if state.get("approval_reasoning"):
        loan_data["approval_reasoning"] = state["approval_reasoning"]
    if state.get("loan_to_income") is not None:
        loan_data["loan_to_income"] = state["loan_to_income"]
    elif state.get("loan_amount") and state.get("income"):
        annual_income = state["income"] * 12
        if annual_income > 0:
            loan_data["loan_to_income"] = round(state["loan_amount"] / annual_income, 2)

    return loan_data


@app.get("/")
async def root():
    return {"status": "ok", "service": "LoanBot API"}


@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest):
    session_id = req.session_id or str(uuid.uuid4())

    if session_id not in sessions:
        sessions[session_id] = get_initial_state()

    state = sessions[session_id]

    # Count assistant messages before pipeline run
    prev_assistant_count = sum(1 for m in state["messages"] if m["role"] == "assistant")

    state["messages"].append({"role": "user", "content": req.message})

    try:
        result = pipeline.invoke(state)
    except Exception as exc:
        exc_str = str(exc)
        if "429" in exc_str or "rate_limit" in exc_str.lower() or "RateLimitError" in type(exc).__name__:
            return JSONResponse(status_code=200, content={
                "session_id": session_id,
                "message": "⚠️ LoanBot is temporarily rate-limited by the AI provider. Please wait 1–2 minutes and try again.",
                "messages": ["⚠️ LoanBot is temporarily rate-limited by the AI provider. Please wait 1–2 minutes and try again."],
                "current_step": state.get("current_step", "greeting"),
                "loan_status": None,
                "pdf_ready": False,
                "pdf_filename": None,
                "loan_data": {"risk_factors": []},
            })
        raise
    sessions[session_id] = result

    # Collect all NEW assistant messages added during this pipeline run
    assistant_messages = [m for m in result["messages"] if m["role"] == "assistant"]
    new_messages = assistant_messages[prev_assistant_count:]
    assistant_contents = [m["content"] for m in new_messages]
    combined_message = "\n\n".join(assistant_contents) if assistant_contents else ""

    pdf_path = result.get("pdf_path")
    pdf_filename = os.path.basename(pdf_path) if pdf_path else None

    return ChatResponse(
        session_id=session_id,
        message=combined_message,
        messages=assistant_contents,
        current_step=result.get("current_step"),
        loan_status=result.get("loan_status"),
        pdf_ready=bool(pdf_path and os.path.exists(pdf_path)),
        pdf_filename=pdf_filename,
        loan_data=build_loan_data(result),
    )


@app.post("/submit-kyc/{session_id}", response_model=VideoKycResponse)
async def submit_kyc(session_id: str):
    if session_id not in sessions:
        sessions[session_id] = get_initial_state()

    state = sessions[session_id]
    prev_assistant_count = sum(1 for m in state["messages"] if m["role"] == "assistant")

    # Hardcode KYC as verified — no file processing needed
    state["kyc_status"] = "VERIFIED"
    state["video_kyc_status"] = "VERIFIED"
    state["face_match_score"] = 1.0
    state["liveness_passed"] = True
    state["ocr_name"] = state.get("name") or ""
    state["ocr_aadhaar"] = ""
    state["kyc_confidence"] = 1.0
    state["current_step"] = "credit"

    # Run credit then sanction directly — no pipeline routing needed
    state = await asyncio.to_thread(credit_agent, state)
    state = await asyncio.to_thread(sanction_agent, state)
    sessions[session_id] = state

    assistant_messages = [m for m in state["messages"] if m["role"] == "assistant"]
    message_list = [m["content"] for m in assistant_messages[prev_assistant_count:]]
    message = "\n\n".join(message_list) if message_list else ""
    pdf_path = state.get("pdf_path")
    pdf_filename = os.path.basename(pdf_path) if pdf_path else None

    return VideoKycResponse(
        session_id=session_id,
        message=message,
        messages=message_list,
        current_step=state.get("current_step"),
        loan_status=state.get("loan_status"),
        pdf_ready=bool(pdf_path and os.path.exists(pdf_path)),
        pdf_filename=pdf_filename,
        loan_data=build_loan_data(state),
        video_kyc_status="VERIFIED",
        face_match_score=1.0,
        liveness_passed=True,
        ocr_name=state.get("ocr_name") or "",
        ocr_aadhaar="",
        kyc_confidence=1.0,
    )


@app.post("/video-kyc/{session_id}", response_model=VideoKycResponse)
async def video_kyc(
    session_id: str,
    aadhaar_image: UploadFile = File(...),
    signature_image: UploadFile = File(...),
    live_video: UploadFile = File(...),
    video_meta: Optional[str] = Form(default=None),
    user_name: Optional[str] = Form(default=None),
):
    if session_id not in sessions:
        sessions[session_id] = get_initial_state()

    state = sessions[session_id]
    prev_assistant_count = sum(1 for m in state["messages"] if m["role"] == "assistant")
    aadhaar_bytes, signature_bytes, live_video_bytes = await asyncio.gather(
        aadhaar_image.read(), signature_image.read(), live_video.read()
    )

    parsed_video_meta: dict[str, Any] = {}
    if video_meta:
        try:
            loaded_meta = json.loads(video_meta)
            if isinstance(loaded_meta, dict):
                parsed_video_meta = loaded_meta
        except json.JSONDecodeError:
            LOGGER.warning("Ignoring invalid video_meta payload for session %s", session_id)

    # Store all three files in parallel to avoid sequential encrypt+write overhead
    uname = user_name or state.get("name")
    aadhaar_artifact, signature_artifact, video_artifact = await asyncio.gather(
        asyncio.to_thread(
            store_secure_artifact,
            session_id, "aadhaar", aadhaar_bytes,
            aadhaar_image.filename, aadhaar_image.content_type,
            {"user_name": uname},
        ),
        asyncio.to_thread(
            store_secure_artifact,
            session_id, "signature", signature_bytes,
            signature_image.filename, signature_image.content_type,
            {"user_name": uname},
        ),
        asyncio.to_thread(
            store_secure_artifact,
            session_id, "live-video", live_video_bytes,
            live_video.filename, live_video.content_type,
            {"video_meta": parsed_video_meta},
        ),
    )

    state["aadhaar_image"] = aadhaar_bytes
    state["aadhaar_filename"] = aadhaar_image.filename
    state["aadhaar_content_type"] = aadhaar_image.content_type
    state["signature_image"] = signature_bytes
    state["signature_filename"] = signature_image.filename
    state["signature_content_type"] = signature_image.content_type
    state["video_frames"] = live_video_bytes
    state["video_filename"] = live_video.filename
    state["video_content_type"] = live_video.content_type
    state["video_capture_meta"] = parsed_video_meta
    state["secure_aadhaar_path"] = aadhaar_artifact["path"]
    state["secure_signature_path"] = signature_artifact["path"]
    state["secure_video_path"] = video_artifact["path"]
    state["user_name"] = uname
    state["current_step"] = "video_kyc"

    # Run the blocking LangGraph pipeline in a thread to avoid blocking the event loop
    result = await asyncio.to_thread(pipeline.invoke, state)
    sessions[session_id] = result

    assistant_messages = [m for m in result["messages"] if m["role"] == "assistant"]
    message_list = [m["content"] for m in assistant_messages[prev_assistant_count:]]
    message = "\n\n".join(message_list) if message_list else ""
    pdf_path = result.get("pdf_path")
    pdf_filename = os.path.basename(pdf_path) if pdf_path else None

    return VideoKycResponse(
        session_id=session_id,
        message=message,
        messages=message_list,
        current_step=result.get("current_step"),
        loan_status=result.get("loan_status"),
        pdf_ready=bool(pdf_path and os.path.exists(pdf_path)),
        pdf_filename=pdf_filename,
        loan_data=build_loan_data(result),
        video_kyc_status=result.get("video_kyc_status") or "FAILED",
        face_match_score=float(result.get("face_match_score") or 0.0),
        liveness_passed=bool(result.get("liveness_passed")),
        ocr_name=result.get("ocr_name") or "",
        ocr_aadhaar=result.get("ocr_aadhaar") or "",
        kyc_confidence=float(result.get("kyc_confidence") or 0.0),
    )


@app.delete("/session/{session_id}")
async def clear_session(session_id: str):
    sessions.pop(session_id, None)
    return {"status": "cleared"}


@app.get("/download/{filename}")
async def download_pdf(filename: str):
    # Prevent path traversal
    safe_filename = os.path.basename(filename)
    pdf_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pdfs", safe_filename)

    if not os.path.exists(pdf_path):
        raise HTTPException(status_code=404, detail="File not found")

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=safe_filename,
        headers={"Content-Disposition": f"attachment; filename={safe_filename}"},
    )


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/verify-face")
async def verify_face(data: dict):
    """
    Mock face verification for hackathon.
    Accepts any non-empty base64 image and marks the session face-verified.
    """
    session_id = data.get("session_id")
    image_data = data.get("image", "")

    if image_data and len(image_data) > 100:
        if session_id and session_id in sessions:
            sessions[session_id]["face_verified"] = True
        return {"verified": True, "confidence": 0.95, "message": "Face verification successful"}

    return {"verified": False, "message": "No face detected"}


@app.post("/submit-signature")
async def submit_signature(data: dict):
    """Store base64 signature in the session for PDF embedding."""
    session_id = data.get("session_id")
    signature_data = data.get("signature", "")

    if session_id and session_id in sessions:
        sessions[session_id]["signature_data"] = signature_data
        return {"saved": True}

    return {"saved": False, "error": "Session not found"}


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """
    Accept a raw audio blob from MediaRecorder (webm/ogg/wav),
    transcribe it with Groq Whisper, and return the text.
    """
    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio file")

    # Determine a safe filename/extension for Groq
    content_type = audio.content_type or "audio/webm"
    ext = "webm"
    if "ogg" in content_type:
        ext = "ogg"
    elif "wav" in content_type:
        ext = "wav"
    elif "mp4" in content_type or "m4a" in content_type:
        ext = "mp4"

    file_tuple = (f"audio.{ext}", io.BytesIO(audio_bytes), content_type)

    try:
        client = get_client()
        response = client.audio.transcriptions.create(
            model="whisper-large-v3-turbo",
            file=file_tuple,
            response_format="text",
        )
        # Groq returns plain text when response_format="text"
        text = response if isinstance(response, str) else getattr(response, "text", str(response))
        return {"text": text.strip()}
    except Exception as exc:
        LOGGER.error("Transcription error: %s", exc)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}")
