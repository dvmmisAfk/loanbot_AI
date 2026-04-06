import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';

const MEDIAPIPE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm';
const FACE_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export type LivenessPrompt = 'blink' | 'smile' | 'turn_side' | 'nod';

export interface FaceBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FaceDetectionState {
  loading: boolean;
  ready: boolean;
  error: string | null;
  guidance: string;
  faceCount: number;
  faceBox: FaceBox | null;
  brightness: number;
  centered: boolean;
  stable: boolean;
  lightingGood: boolean;
  faceArea: number;
  yaw: number;
  pitch: number;
  canCapture: boolean;
  qualityIssues: string[];
  actions: Record<LivenessPrompt, boolean>;
}

const EMPTY_ACTION_STATE: Record<LivenessPrompt, boolean> = {
  blink: false,
  smile: false,
  turn_side: false,
  nod: false,
};

const INITIAL_STATE: FaceDetectionState = {
  loading: true,
  ready: false,
  error: null,
  guidance: 'Starting secure face scan…',
  faceCount: 0,
  faceBox: null,
  brightness: 0,
  centered: false,
  stable: false,
  lightingGood: false,
  faceArea: 0,
  yaw: 0,
  pitch: 0,
  canCapture: false,
  qualityIssues: [],
  actions: EMPTY_ACTION_STATE,
};

let faceLandmarkerPromise: Promise<FaceLandmarker> | null = null;

function cloneActionState() {
  return { ...EMPTY_ACTION_STATE };
}

async function getFaceLandmarker() {
  if (!faceLandmarkerPromise) {
    faceLandmarkerPromise = FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL).then((vision) =>
      FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: FACE_LANDMARKER_MODEL_URL,
        },
        runningMode: 'VIDEO',
        numFaces: 2,
        minFaceDetectionConfidence: 0.55,
        minFacePresenceConfidence: 0.55,
        minTrackingConfidence: 0.55,
        outputFaceBlendshapes: true,
      }),
    );
  }

  try {
    return await faceLandmarkerPromise;
  } catch (error) {
    faceLandmarkerPromise = null;
    throw error;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function sampleBrightness(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  const width = 96;
  const height = 72;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return 0;

  context.drawImage(video, 0, 0, width, height);
  const { data } = context.getImageData(0, 0, width, height);

  let totalLuma = 0;
  for (let i = 0; i < data.length; i += 4) {
    totalLuma += (0.2126 * data[i]) + (0.7152 * data[i + 1]) + (0.0722 * data[i + 2]);
  }

  return totalLuma / (data.length / 4);
}

function buildFaceBox(landmarks: Array<{ x: number; y: number }>): FaceBox | null {
  if (!landmarks.length) return null;

  const xs = landmarks.map((point) => point.x);
  const ys = landmarks.map((point) => point.y);
  const minX = clamp(Math.min(...xs), 0, 1);
  const maxX = clamp(Math.max(...xs), 0, 1);
  const minY = clamp(Math.min(...ys), 0, 1);
  const maxY = clamp(Math.max(...ys), 0, 1);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function useFaceDetection(videoRef: RefObject<HTMLVideoElement | null>, active: boolean) {
  const [state, setState] = useState<FaceDetectionState>(INITIAL_STATE);
  const frameIdRef = useRef<number | null>(null);
  const historyRef = useRef<Array<{ x: number; y: number; area: number }>>([]);
  const poseHistoryRef = useRef<Array<{ yaw: number; pitch: number }>>([]);
  const actionStateRef = useRef<Record<LivenessPrompt, boolean>>(cloneActionState());
  const blinkArmedRef = useRef(false);

  const resetActionHistory = useCallback(() => {
    actionStateRef.current = cloneActionState();
    blinkArmedRef.current = false;
    poseHistoryRef.current = [];
    setState((current) => ({
      ...current,
      actions: cloneActionState(),
    }));
  }, []);

  useEffect(() => {
    if (!active) {
      historyRef.current = [];
      poseHistoryRef.current = [];
      actionStateRef.current = cloneActionState();
      blinkArmedRef.current = false;
      return;
    }

    let cancelled = false;
    const sampleCanvas = document.createElement('canvas');

    async function boot() {
      try {
        const faceLandmarker = await getFaceLandmarker();
        if (cancelled) return;

        setState((current) => ({
          ...current,
          loading: false,
          ready: true,
          error: null,
          guidance: 'Align your face inside the frame',
        }));

        const analyze = () => {
          if (cancelled) return;

          const video = videoRef.current;
          if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
            frameIdRef.current = window.requestAnimationFrame(analyze);
            return;
          }

          const brightness = sampleBrightness(video, sampleCanvas);
          const detection = faceLandmarker.detectForVideo(video, performance.now());
          const faceCount = detection.faceLandmarks.length;

          if (faceCount !== 1) {
            historyRef.current = [];

            const qualityIssues =
              faceCount > 1 ? ['Multiple faces detected. Only one applicant is allowed in the frame.'] : ['No face detected.'];

            setState({
              loading: false,
              ready: true,
              error: null,
              guidance: faceCount > 1 ? 'Multiple faces detected' : 'No face detected',
              faceCount,
              faceBox: null,
              brightness,
              centered: false,
              stable: false,
              lightingGood: brightness >= 80,
              faceArea: 0,
              yaw: 0,
              pitch: 0,
              canCapture: false,
              qualityIssues,
              actions: { ...actionStateRef.current },
            });

            frameIdRef.current = window.requestAnimationFrame(analyze);
            return;
          }

          const landmarks = detection.faceLandmarks[0];
          const faceBox = buildFaceBox(landmarks);
          if (!faceBox) {
            frameIdRef.current = window.requestAnimationFrame(analyze);
            return;
          }

          const faceArea = faceBox.width * faceBox.height;
          const centerX = faceBox.x + (faceBox.width / 2);
          const centerY = faceBox.y + (faceBox.height / 2);
          const centered = Math.abs(centerX - 0.5) <= 0.1 && Math.abs(centerY - 0.47) <= 0.12;
          const lightingGood = brightness >= 82;
          const distanceGood = faceArea >= 0.075 && faceArea <= 0.34;

          historyRef.current.push({ x: centerX, y: centerY, area: faceArea });
          if (historyRef.current.length > 16) {
            historyRef.current.shift();
          }

          let movementAverage = 1;
          if (historyRef.current.length >= 6) {
            let movementTotal = 0;
            for (let index = 1; index < historyRef.current.length; index += 1) {
              const previous = historyRef.current[index - 1];
              const current = historyRef.current[index];
              movementTotal += Math.hypot(current.x - previous.x, current.y - previous.y);
            }
            movementAverage = movementTotal / Math.max(historyRef.current.length - 1, 1);
          }
          const stable = historyRef.current.length >= 6 && movementAverage < 0.018;

          const leftEye = landmarks[33];
          const rightEye = landmarks[263];
          const noseTip = landmarks[1];
          const eyeMidX = (leftEye.x + rightEye.x) / 2;
          const eyeMidY = (leftEye.y + rightEye.y) / 2;
          const eyeDistance = Math.max(Math.abs(rightEye.x - leftEye.x), 0.001);
          const faceHeight = Math.max(faceBox.height, 0.001);
          const yaw = (noseTip.x - eyeMidX) / eyeDistance;
          const pitch = (noseTip.y - eyeMidY) / faceHeight;

          poseHistoryRef.current.push({ yaw, pitch });
          if (poseHistoryRef.current.length > 20) {
            poseHistoryRef.current.shift();
          }

          const categories = detection.faceBlendshapes[0]?.categories ?? [];
          const blendshapeScores = new Map<string, number>();
          categories.forEach((category) => {
            blendshapeScores.set(category.categoryName, category.score);
          });

          const blinkScore = (
            (blendshapeScores.get('eyeBlinkLeft') ?? 0) +
            (blendshapeScores.get('eyeBlinkRight') ?? 0)
          ) / 2;
          if (blinkScore < 0.15) {
            blinkArmedRef.current = true;
          }
          if (blinkArmedRef.current && blinkScore > 0.42) {
            actionStateRef.current.blink = true;
          }

          const smileScore = (
            (blendshapeScores.get('mouthSmileLeft') ?? 0) +
            (blendshapeScores.get('mouthSmileRight') ?? 0)
          ) / 2;
          if (smileScore > 0.5) {
            actionStateRef.current.smile = true;
          }

          if (Math.abs(yaw) > 0.12) {
            actionStateRef.current.turn_side = true;
          }

          if (poseHistoryRef.current.length >= 8) {
            const pitchValues = poseHistoryRef.current.map((sample) => sample.pitch);
            const pitchRange = Math.max(...pitchValues) - Math.min(...pitchValues);
            if (pitchRange > 0.09) {
              actionStateRef.current.nod = true;
            }
          }

          const qualityIssues: string[] = [];
          if (!lightingGood) {
            qualityIssues.push('Increase lighting around your face.');
          }
          if (faceArea < 0.075) {
            qualityIssues.push('Move closer to the camera.');
          }
          if (faceArea > 0.34) {
            qualityIssues.push('Move slightly back so your full face stays visible.');
          }
          if (!centered) {
            qualityIssues.push('Center your face inside the oval frame.');
          }
          if (!stable) {
            qualityIssues.push('Hold still for a stable verification scan.');
          }

          let guidance = 'Good position ✅';
          if (!lightingGood) {
            guidance = 'Increase lighting';
          } else if (faceArea < 0.075) {
            guidance = 'Move closer';
          } else if (faceArea > 0.34) {
            guidance = 'Move slightly back';
          } else if (!centered) {
            guidance = 'Center your face';
          } else if (!stable) {
            guidance = 'Face not stable';
          }

          setState({
            loading: false,
            ready: true,
            error: null,
            guidance,
            faceCount,
            faceBox,
            brightness,
            centered,
            stable,
            lightingGood,
            faceArea,
            yaw,
            pitch,
            canCapture: faceCount === 1 && lightingGood && centered && stable && distanceGood,
            qualityIssues,
            actions: { ...actionStateRef.current },
          });

          frameIdRef.current = window.requestAnimationFrame(analyze);
        };

        frameIdRef.current = window.requestAnimationFrame(analyze);
      } catch {
        if (cancelled) return;
        setState({
          ...INITIAL_STATE,
          loading: false,
          ready: false,
          error: 'Face detection model failed to load. Please check your internet connection and retry.',
          guidance: 'Face detection unavailable',
        });
      }
    }

    void boot();

    return () => {
      cancelled = true;
      if (frameIdRef.current !== null) {
        window.cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
    };
  }, [active, videoRef]);

  return {
    ...state,
    resetActionHistory,
  };
}
