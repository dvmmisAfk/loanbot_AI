import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Loader2,
  RefreshCcw,
  ScanFace,
  ShieldCheck,
  Smartphone,
  Video,
} from 'lucide-react';
import { useCamera } from '../hooks/useCamera';
import { useFaceDetection, type LivenessPrompt } from '../hooks/useFaceDetection';

type VideoKycStep = 'align' | 'liveness' | 'record' | 'review';

export interface VideoKycCaptureMeta {
  sessionId: string;
  capturedAt: string;
  prompt: LivenessPrompt;
  facingMode: 'user' | 'environment';
  brightness: number;
  guidance: string;
  lightingGood: boolean;
  centered: boolean;
  stable: boolean;
  faceCount: number;
  faceArea: number;
  qualityIssues: string[];
  actions: Record<LivenessPrompt, boolean>;
}

interface Props {
  sessionId: string;
  loading: boolean;
  userName?: string;
  onSubmit: (aadhaarImage: File, signatureImage: File, liveVideo: File, metadata: VideoKycCaptureMeta) => void;
}

const PROMPTS: Array<{ id: LivenessPrompt; title: string; hint: string }> = [
  { id: 'blink', title: 'Blink your eyes once', hint: 'A natural blink helps us block photo spoofing.' },
  { id: 'smile', title: 'Give a slight smile', hint: 'Keep your chin inside the frame while smiling.' },
  { id: 'turn_side', title: 'Turn your head slightly to one side', hint: 'Move gently while keeping your face visible.' },
  { id: 'nod', title: 'Nod your head once', hint: 'A small nod is enough. Stay inside the oval.' },
];

const STEP_COPY: Array<{ id: VideoKycStep; label: string }> = [
  { id: 'align', label: 'Align face' },
  { id: 'liveness', label: 'Prove liveness' },
  { id: 'record', label: 'Auto-record clip' },
  { id: 'review', label: 'Confirm capture' },
];

const RECORDING_DURATION_MS = 4000;

function getPreferredMimeType() {
  const candidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? '';
}

function getStepIndex(step: VideoKycStep) {
  return STEP_COPY.findIndex((entry) => entry.id === step);
}

export default function VideoKYC({ sessionId, loading, userName, onSubmit }: Props) {
  const [aadhaarImage, setAadhaarImage] = useState<File | null>(null);
  const [signatureImage, setSignatureImage] = useState<File | null>(null);
  const [step, setStep] = useState<VideoKycStep>('align');
  const [selectedPrompt, setSelectedPrompt] = useState<(typeof PROMPTS)[number] | null>(null);
  const [recordProgress, setRecordProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [recordedFile, setRecordedFile] = useState<File | null>(null);
  const [recordingActive, setRecordingActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    videoRef,
    stream,
    error: cameraError,
    facingMode,
    permissionState,
    startCamera,
    toggleFacingMode,
  } = useCamera({ active: true, preferredFacingMode: 'user' });
  const {
    actions,
    brightness,
    canCapture,
    centered,
    error: detectionError,
    faceArea,
    faceBox,
    faceCount,
    guidance,
    lightingGood,
    qualityIssues,
    resetActionHistory,
    stable,
  } = useFaceDetection(videoRef, Boolean(stream));

  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordStopTimeoutRef = useRef<number | null>(null);
  const recordProgressIntervalRef = useRef<number | null>(null);
  const invalidDuringRecordingRef = useRef<number | null>(null);
  const alignReadyTimeoutRef = useRef<number | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingDispositionRef = useRef<'completed' | 'cancelled'>('completed');

  const activeStepIndex = getStepIndex(step);
  const mirroredPreview = facingMode === 'user';

  const mirroredFaceBox = useMemo(() => {
    if (!faceBox) return null;

    if (!mirroredPreview) {
      return faceBox;
    }

    return {
      ...faceBox,
      x: 1 - faceBox.x - faceBox.width,
    };
  }, [faceBox, mirroredPreview]);

  const clearRecordingTimers = useCallback(() => {
    if (recordStopTimeoutRef.current !== null) {
      window.clearTimeout(recordStopTimeoutRef.current);
      recordStopTimeoutRef.current = null;
    }
    if (recordProgressIntervalRef.current !== null) {
      window.clearInterval(recordProgressIntervalRef.current);
      recordProgressIntervalRef.current = null;
    }
    if (invalidDuringRecordingRef.current !== null) {
      window.clearTimeout(invalidDuringRecordingRef.current);
      invalidDuringRecordingRef.current = null;
    }
  }, []);

  const resetPreview = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setRecordedFile(null);
    setRecordProgress(0);
  }, [previewUrl]);

  const resetFlow = useCallback(() => {
    clearRecordingTimers();
    if (alignReadyTimeoutRef.current !== null) {
      window.clearTimeout(alignReadyTimeoutRef.current);
      alignReadyTimeoutRef.current = null;
    }
    resetActionHistory();
    recordingDispositionRef.current = 'cancelled';
    setRecordingActive(false);

    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }

    recorderRef.current = null;
    chunksRef.current = [];
    resetPreview();
    setSelectedPrompt(null);
    setError(null);
    setStep('align');
  }, [clearRecordingTimers, resetActionHistory, resetPreview]);

  const finishRecording = useCallback((mode: 'completed' | 'cancelled') => {
    recordingDispositionRef.current = mode;
    clearRecordingTimers();
    setRecordingActive(false);
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    } else if (mode === 'cancelled') {
      setStep('align');
    }
  }, [clearRecordingTimers]);

  const startRecording = useCallback(() => {
    if (!stream) return;

    if (typeof MediaRecorder === 'undefined') {
      setError('This browser does not support secure in-browser recording for live Video KYC.');
      return;
    }

    const mimeType = getPreferredMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);

    chunksRef.current = [];
    recordingDispositionRef.current = 'completed';
    recorderRef.current = recorder;
    setRecordingActive(true);
    setError(null);
    setRecordProgress(0);

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    recorder.onstop = () => {
      const disposition = recordingDispositionRef.current;
      recorderRef.current = null;
      clearRecordingTimers();
      setRecordingActive(false);

      if (disposition === 'cancelled') {
        chunksRef.current = [];
        setRecordProgress(0);
        setStep('align');
        return;
      }

      if (!chunksRef.current.length) {
        setError('The secure KYC clip could not be created. Please try again.');
        setStep('align');
        return;
      }

      resetPreview();

      const recordedBlob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
      const fileExtension = recordedBlob.type.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([recordedBlob], `loanbot-kyc-${Date.now()}.${fileExtension}`, {
        type: recordedBlob.type || 'video/webm',
      });
      const nextPreviewUrl = URL.createObjectURL(recordedBlob);
      setRecordedFile(file);
      setPreviewUrl(nextPreviewUrl);
      setRecordProgress(100);
      setStep('review');
    };

    recorder.start(250);
    const startedAt = Date.now();

    recordProgressIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      setRecordProgress(Math.min(100, (elapsed / RECORDING_DURATION_MS) * 100));
    }, 120);

    recordStopTimeoutRef.current = window.setTimeout(() => {
      finishRecording('completed');
    }, RECORDING_DURATION_MS);
  }, [clearRecordingTimers, finishRecording, resetPreview, stream]);

  function handleConfirm() {
    if (!aadhaarImage || !signatureImage || !recordedFile || !selectedPrompt) {
      setError('Please upload your Aadhaar image, signature image, and complete the live capture before submitting.');
      return;
    }

    setError(null);
    onSubmit(aadhaarImage, signatureImage, recordedFile, {
      sessionId,
      capturedAt: new Date().toISOString(),
      prompt: selectedPrompt.id,
      facingMode,
      brightness: Math.round(brightness),
      guidance,
      lightingGood,
      centered,
      stable,
      faceCount,
      faceArea: Number(faceArea.toFixed(4)),
      qualityIssues: [...qualityIssues],
      actions: { ...actions },
    });
  }

  useEffect(() => {
    return () => {
      clearRecordingTimers();
      if (alignReadyTimeoutRef.current !== null) {
        window.clearTimeout(alignReadyTimeoutRef.current);
        alignReadyTimeoutRef.current = null;
      }
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [clearRecordingTimers, previewUrl]);

  useEffect(() => {
    if (step !== 'align') {
      if (alignReadyTimeoutRef.current !== null) {
        window.clearTimeout(alignReadyTimeoutRef.current);
        alignReadyTimeoutRef.current = null;
      }
      return;
    }

    if (!canCapture) {
      if (alignReadyTimeoutRef.current !== null) {
        window.clearTimeout(alignReadyTimeoutRef.current);
        alignReadyTimeoutRef.current = null;
      }
      return;
    }

    alignReadyTimeoutRef.current = window.setTimeout(() => {
      resetActionHistory();
      setSelectedPrompt(PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);
      setStep('liveness');
    }, 900);

    return () => {
      if (alignReadyTimeoutRef.current !== null) {
        window.clearTimeout(alignReadyTimeoutRef.current);
        alignReadyTimeoutRef.current = null;
      }
    };
  }, [canCapture, resetActionHistory, step]);

  useEffect(() => {
    if (step !== 'liveness' || !selectedPrompt) return;

    if (!actions[selectedPrompt.id]) return;

    const timeoutId = window.setTimeout(() => {
      setStep('record');
    }, 700);

    return () => window.clearTimeout(timeoutId);
  }, [actions, selectedPrompt, step]);

  useEffect(() => {
    if (step !== 'record' || !stream || recordingActive || recordedFile || !canCapture) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      startRecording();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [canCapture, recordingActive, recordedFile, startRecording, step, stream]);

  useEffect(() => {
    if (step !== 'record' || !recordingActive) return;

    if (canCapture) {
      if (invalidDuringRecordingRef.current !== null) {
        window.clearTimeout(invalidDuringRecordingRef.current);
        invalidDuringRecordingRef.current = null;
      }
      return;
    }

    invalidDuringRecordingRef.current = window.setTimeout(() => {
      setError('Face not stable during recording. Please retake the secure KYC clip.');
      finishRecording('cancelled');
    }, 700);

    return () => {
      if (invalidDuringRecordingRef.current !== null) {
        window.clearTimeout(invalidDuringRecordingRef.current);
        invalidDuringRecordingRef.current = null;
      }
    };
  }, [canCapture, finishRecording, recordingActive, step]);

  const statusColor = canCapture ? '#22c55e' : guidance.includes('Multiple') || guidance.includes('No face') ? '#ef4444' : '#f59e0b';
  const sidebarCards = [
    {
      label: 'Face Status',
      value: guidance,
      tone: statusColor,
      subtext: faceCount > 1 ? 'Only one face allowed' : 'Real-time camera guidance',
    },
    {
      label: 'Lighting',
      value: `${Math.round(brightness)}/255`,
      tone: lightingGood ? '#22c55e' : '#f59e0b',
      subtext: lightingGood ? 'Adequate lighting' : 'Increase lighting',
    },
    {
      label: 'Liveness Prompt',
      value: selectedPrompt ? selectedPrompt.title : 'Pending alignment',
      tone: '#c084fc',
      subtext: selectedPrompt ? selectedPrompt.hint : 'We randomize this per session',
    },
  ];

  return (
    <div
      className="rounded-[28px] p-4 sm:p-5"
      style={{
        background: 'linear-gradient(180deg, rgba(20,27,45,0.98) 0%, rgba(12,18,32,0.98) 100%)',
        border: '1px solid rgba(109,92,231,0.24)',
        boxShadow: '0 22px 60px rgba(4,8,18,0.55)',
      }}
    >
      <div className="flex flex-col gap-4 xl:flex-row">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ background: 'rgba(168,85,247,0.1)', color: '#d8b4fe' }}>
                <ShieldCheck className="h-3.5 w-3.5" />
                Live Video KYC
              </div>
              <h3 className="mt-3 text-lg font-semibold text-white">
                Real-time identity verification{userName ? ` for ${userName}` : ''}
              </h3>
              <p className="mt-1 max-w-2xl text-sm leading-6" style={{ color: '#94a3b8' }}>
                Upload your Aadhaar and signature images, then complete a live liveness check so we can create a secure NBFC-grade KYC packet.
              </p>
            </div>

            <div className="rounded-2xl px-4 py-3 text-right" style={{ background: 'rgba(8,13,25,0.7)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <p className="text-[10px] uppercase tracking-[0.2em]" style={{ color: '#64748b' }}>Session</p>
              <p className="mt-1 font-mono text-sm text-white">{sessionId.slice(0, 8)}...</p>
              <p className="mt-1 text-[11px]" style={{ color: '#8b9bb2' }}>Encrypted capture at rest</p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-4">
            {STEP_COPY.map((entry, index) => {
              const isActive = index === activeStepIndex;
              const isComplete = index < activeStepIndex;
              const accent = isComplete ? '#22c55e' : isActive ? '#a855f7' : 'rgba(255,255,255,0.1)';

              return (
                <div
                  key={entry.id}
                  className="rounded-2xl px-3 py-3 transition-all duration-300"
                  style={{
                    background: isActive ? 'rgba(168,85,247,0.08)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${accent}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold"
                      style={{ background: accent, color: isComplete || isActive ? '#fff' : '#94a3b8' }}
                    >
                      {isComplete ? '✓' : index + 1}
                    </div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: isActive || isComplete ? '#f8fafc' : '#94a3b8' }}>
                      {entry.label}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 overflow-hidden rounded-[26px]" style={{ border: '1px solid rgba(255,255,255,0.08)', background: '#040915' }}>
            <div className="relative aspect-[4/5] w-full overflow-hidden sm:aspect-[16/10]">
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                className="h-full w-full object-cover"
                style={{ transform: mirroredPreview ? 'scaleX(-1)' : undefined }}
              />

              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,9,21,0.12),rgba(4,9,21,0.45))]" />

              <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4">
                <div
                  className="relative h-[74%] w-[64%] max-h-[360px] max-w-[280px] rounded-[46%]"
                  style={{
                    border: `2px solid ${canCapture ? 'rgba(34,197,94,0.95)' : 'rgba(255,255,255,0.42)'}`,
                    boxShadow: `0 0 0 9999px rgba(4,9,21,0.55), 0 0 32px ${canCapture ? 'rgba(34,197,94,0.32)' : 'rgba(255,255,255,0.08)'}`,
                    transition: 'all 180ms ease',
                  }}
                />
              </div>

              {mirroredFaceBox && (
                <div
                  className="pointer-events-none absolute rounded-[22px] border border-dashed"
                  style={{
                    left: `${mirroredFaceBox.x * 100}%`,
                    top: `${mirroredFaceBox.y * 100}%`,
                    width: `${mirroredFaceBox.width * 100}%`,
                    height: `${mirroredFaceBox.height * 100}%`,
                    borderColor: canCapture ? 'rgba(34,197,94,0.9)' : 'rgba(245,158,11,0.85)',
                    boxShadow: canCapture ? '0 0 18px rgba(34,197,94,0.18)' : undefined,
                    transition: 'all 120ms linear',
                  }}
                />
              )}

              <div className="absolute left-3 right-3 top-3 flex flex-wrap items-center justify-between gap-2">
                <div
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{
                    background: canCapture ? 'rgba(34,197,94,0.15)' : 'rgba(245,158,11,0.15)',
                    color: canCapture ? '#86efac' : '#fcd34d',
                    border: `1px solid ${canCapture ? 'rgba(34,197,94,0.32)' : 'rgba(245,158,11,0.25)'}`,
                  }}
                >
                  {canCapture ? <CheckCircle2 className="h-4 w-4" /> : <ScanFace className="h-4 w-4" />}
                  {guidance}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void toggleFacingMode();
                  }}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors"
                  style={{
                    background: 'rgba(8,13,25,0.72)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: '#e2e8f0',
                  }}
                >
                  <Smartphone className="h-4 w-4" />
                  {facingMode === 'user' ? 'Front camera' : 'Rear camera'}
                </button>
              </div>

              <div className="absolute bottom-3 left-3 right-3 space-y-2">
                {step === 'liveness' && selectedPrompt && (
                  <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(13,19,34,0.88)', border: '1px solid rgba(168,85,247,0.28)' }}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#c084fc' }}>Random Liveness Prompt</p>
                    <p className="mt-2 text-sm font-semibold text-white">{selectedPrompt.title}</p>
                    <p className="mt-1 text-xs leading-5" style={{ color: '#94a3b8' }}>{selectedPrompt.hint}</p>
                  </div>
                )}

                {step === 'record' && (
                  <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(13,19,34,0.9)', border: '1px solid rgba(34,197,94,0.25)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#86efac' }}>Recording Secure Clip</p>
                        <p className="mt-1 text-sm text-white">Hold steady for 4 seconds. Recording starts only while your face stays compliant.</p>
                      </div>
                      <div className="shrink-0 rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ background: 'rgba(34,197,94,0.18)' }}>
                        {Math.round(recordProgress)}%
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div
                        className="h-full rounded-full transition-all duration-150"
                        style={{
                          width: `${recordProgress}%`,
                          background: 'linear-gradient(90deg, #22c55e 0%, #b8ff4f 100%)',
                        }}
                      />
                    </div>
                  </div>
                )}

                {(cameraError || detectionError || error) && (
                  <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(127,29,29,0.28)', border: '1px solid rgba(248,113,113,0.35)' }}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: '#fca5a5' }} />
                      <p className="text-sm leading-6" style={{ color: '#fecaca' }}>
                        {cameraError || detectionError || error}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="grid gap-3 border-t border-white/8 px-4 py-4 sm:grid-cols-3">
              {sidebarCards.map((card) => (
                <div key={card.label} className="rounded-2xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#64748b' }}>{card.label}</p>
                  <p className="mt-2 text-sm font-semibold" style={{ color: card.tone }}>{card.value}</p>
                  <p className="mt-1 text-xs leading-5" style={{ color: '#94a3b8' }}>{card.subtext}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-full max-w-xl xl:max-w-[360px]">
          <div className="space-y-3">
            <div className="rounded-[24px] p-4" style={{ background: 'rgba(8,13,25,0.72)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#94a3b8' }}>Document Capture</p>
                  <h4 className="mt-2 text-base font-semibold text-white">Upload Aadhaar front image</h4>
                  <p className="mt-1 text-sm leading-6" style={{ color: '#94a3b8' }}>
                    We still need the document image for OCR extraction and face-match validation against the live clip.
                  </p>
                </div>
                <Camera className="h-5 w-5 shrink-0" style={{ color: '#b8ff4f' }} />
              </div>

              <label
                className="mt-4 flex cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed px-4 py-5 text-center transition-colors"
                style={{
                  borderColor: aadhaarImage ? 'rgba(34,197,94,0.45)' : 'rgba(255,255,255,0.16)',
                  background: aadhaarImage ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setAadhaarImage(event.target.files?.[0] ?? null)}
                  disabled={loading}
                  className="hidden"
                />
                <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: 'rgba(184,255,79,0.12)' }}>
                  {aadhaarImage ? <CheckCircle2 className="h-5 w-5" style={{ color: '#86efac' }} /> : <Camera className="h-5 w-5" style={{ color: '#b8ff4f' }} />}
                </div>
                <p className="mt-3 text-sm font-semibold text-white">
                  {aadhaarImage ? aadhaarImage.name : 'Choose Aadhaar image'}
                </p>
                <p className="mt-1 text-xs leading-5" style={{ color: '#94a3b8' }}>
                  Accepted: JPG, PNG, HEIC. A clear front-side image works best.
                </p>
              </label>

              <label
                className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-[20px] border border-dashed px-4 py-5 text-center transition-colors"
                style={{
                  borderColor: signatureImage ? 'rgba(34,197,94,0.45)' : 'rgba(255,255,255,0.16)',
                  background: signatureImage ? 'rgba(34,197,94,0.08)' : 'rgba(255,255,255,0.02)',
                }}
              >
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => setSignatureImage(event.target.files?.[0] ?? null)}
                  disabled={loading}
                  className="hidden"
                />
                <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ background: 'rgba(184,255,79,0.12)' }}>
                  {signatureImage ? <CheckCircle2 className="h-5 w-5" style={{ color: '#86efac' }} /> : <ShieldCheck className="h-5 w-5" style={{ color: '#b8ff4f' }} />}
                </div>
                <p className="mt-3 text-sm font-semibold text-white">
                  {signatureImage ? signatureImage.name : 'Choose signature image'}
                </p>
                <p className="mt-1 text-xs leading-5" style={{ color: '#94a3b8' }}>
                  Use a clean handwritten signature image on a light background so it can be placed on the sanction letter.
                </p>
              </label>
            </div>

            <div className="rounded-[24px] p-4" style={{ background: 'rgba(8,13,25,0.72)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#94a3b8' }}>Fraud Controls</p>
                  <h4 className="mt-2 text-base font-semibold text-white">Session quality gates</h4>
                </div>
                <ShieldCheck className="h-5 w-5" style={{ color: '#a855f7' }} />
              </div>

              <div className="mt-4 space-y-2">
                  {[
                  { label: 'Single face only', ok: faceCount <= 1 },
                  { label: 'Adequate lighting', ok: lightingGood },
                  { label: 'Centered and stable', ok: centered && stable },
                  { label: 'Live movement challenge', ok: selectedPrompt ? actions[selectedPrompt.id] : false },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-2xl px-3 py-3" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-sm text-white">{item.label}</span>
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        background: item.ok ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
                        color: item.ok ? '#86efac' : '#fcd34d',
                      }}
                    >
                      {item.ok ? 'Pass' : 'Pending'}
                    </span>
                  </div>
                ))}
              </div>

                <div className="mt-4 rounded-2xl px-4 py-3" style={{ background: 'rgba(168,85,247,0.08)', border: '1px solid rgba(168,85,247,0.22)' }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#d8b4fe' }}>Current guidance</p>
                  <p className="mt-2 text-sm font-semibold text-white">{guidance}</p>
                  <ul className="mt-2 space-y-1 text-xs leading-5" style={{ color: '#94a3b8' }}>
                    {(qualityIssues.length ? qualityIssues : ['Looks good. You can proceed with capture.']).map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
              </div>
            </div>

            {step === 'review' && previewUrl ? (
              <div className="rounded-[24px] p-4" style={{ background: 'rgba(8,13,25,0.72)', border: '1px solid rgba(34,197,94,0.2)' }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#86efac' }}>Review Clip</p>
                    <h4 className="mt-2 text-base font-semibold text-white">Confirm secure KYC capture</h4>
                    <p className="mt-1 text-sm leading-6" style={{ color: '#94a3b8' }}>
                      Preview the recorded clip before it is sent to the backend along with your Aadhaar and signature images for full verification.
                    </p>
                  </div>
                  <Video className="h-5 w-5 shrink-0" style={{ color: '#86efac' }} />
                </div>

                <video
                  src={previewUrl}
                  controls
                  playsInline
                  className="mt-4 h-56 w-full rounded-[20px] object-cover"
                  style={{ background: '#02050d' }}
                />

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={resetFlow}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Retake capture
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirm}
                    disabled={loading || !aadhaarImage || !signatureImage || !recordedFile}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all disabled:cursor-not-allowed"
                    style={{
                      background: loading || !aadhaarImage || !signatureImage || !recordedFile ? 'rgba(255,255,255,0.08)' : '#b8ff4f',
                      color: loading || !aadhaarImage || !signatureImage || !recordedFile ? '#64748b' : '#0b1120',
                    }}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                    Confirm and submit
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] p-4" style={{ background: 'rgba(8,13,25,0.72)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: '#94a3b8' }}>Capture Flow</p>
                <div className="mt-3 space-y-3">
                  {[
                    'Step 1: Align your face inside the oval until the guidance turns green.',
                    'Step 2: Complete the randomized liveness challenge shown on screen.',
                    'Step 3: We auto-record a short 4-second clip only when your face is valid.',
                    'Step 4: Review the clip, then submit it with your Aadhaar and signature images.',
                  ].map((item) => (
                    <div key={item} className="rounded-2xl px-3 py-3 text-sm leading-6" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', color: '#cbd5e1' }}>
                      {item}
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={() => {
                      void startCamera();
                    }}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all"
                    style={{ background: 'rgba(168,85,247,0.12)', color: '#e9d5ff', border: '1px solid rgba(168,85,247,0.24)' }}
                  >
                    <Camera className="h-4 w-4" />
                    {permissionState === 'granted' ? 'Refresh camera' : 'Enable camera'}
                  </button>
                  <button
                    type="button"
                    onClick={resetFlow}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', color: '#e2e8f0', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Restart flow
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
