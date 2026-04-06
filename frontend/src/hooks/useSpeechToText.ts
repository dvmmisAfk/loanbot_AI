import { useCallback, useRef, useState } from 'react';

export type STTStatus = 'idle' | 'listening' | 'processing' | 'error';

export interface UseSpeechToTextOptions {
  onTranscript?: (text: string) => void;
  onInterim?:    (text: string) => void;  // kept for API compat; not used in recorder
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000';

/**
 * Voice input hook — uses MediaRecorder (built into every browser) to capture
 * audio and sends it to the backend /transcribe endpoint (Groq Whisper).
 *
 * This completely sidesteps Chrome's Web Speech API and its dependency on
 * being able to reach Google's speech.googleapis.com servers, which frequently
 * fails on Indian networks / behind proxies.
 */
export function useSpeechToText({ onTranscript }: UseSpeechToTextOptions = {}) {
  const [status,       setStatus]       = useState<STTStatus>('idle');
  const [interimText,  setInterimText]  = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef   = useRef<Blob[]>([]);
  const streamRef   = useRef<MediaStream | null>(null);

  /* ── Pick the best supported MIME type ── */
  function getMimeType(): string {
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
    ];
    for (const t of candidates) {
      if (MediaRecorder.isTypeSupported(t)) return t;
    }
    return ''; // browser will pick default
  }

  /* ── Stop recording and transcribe ── */
  const stopAndTranscribe = useCallback(() => {
    const recorder = recorderRef.current;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.stop(); // triggers onstop
  }, []);

  /* ── Start / stop toggle ── */
  const startListening = useCallback(async () => {
    // Second tap — stop
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      stopAndTranscribe();
      return;
    }

    setErrorMessage(null);
    setInterimText('');
    chunksRef.current = [];

    /* Request mic */
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setErrorMessage('Microphone access denied. Click the 🔒 icon in the address bar and allow the mic.');
      setStatus('error');
      return;
    }
    streamRef.current = stream;

    /* Create recorder */
    const mimeType = getMimeType();
    const recorder = mimeType
      ? new MediaRecorder(stream, { mimeType })
      : new MediaRecorder(stream);
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = async () => {
      /* Stop all mic tracks */
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;

      const blob = new Blob(chunksRef.current, {
        type: recorder.mimeType || 'audio/webm',
      });
      chunksRef.current = [];
      recorderRef.current = null;

      if (blob.size < 1000) {
        // Too small — probably silence / accidental tap
        setStatus('idle');
        setInterimText('');
        return;
      }

      setStatus('processing');

      try {
        const form = new FormData();
        form.append('audio', blob, `recording.${blob.type.includes('ogg') ? 'ogg' : 'webm'}`);

        const res = await fetch(`${API_BASE}/transcribe`, {
          method: 'POST',
          body: form,
        });

        if (!res.ok) {
          const detail = await res.text();
          throw new Error(detail);
        }

        const { text } = await res.json() as { text: string };
        const trimmed = text.trim();

        setStatus('idle');
        setInterimText('');

        if (trimmed) {
          onTranscript?.(trimmed);
        }
      } catch (err) {
        console.error('[STT] transcription error:', err);
        setErrorMessage('Transcription failed. Check backend is running and try again.');
        setStatus('error');
      }
    };

    recorder.onerror = () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      setErrorMessage('Recording error. Please try again.');
      setStatus('error');
    };

    recorder.start(250); // collect chunks every 250ms
    setStatus('listening');
  }, [stopAndTranscribe, onTranscript]);

  const stopListening = useCallback(() => {
    stopAndTranscribe();
  }, [stopAndTranscribe]);

  const reset = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop();
    }
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current  = null;
    recorderRef.current = null;
    chunksRef.current   = [];
    setStatus('idle');
    setInterimText('');
    setErrorMessage(null);
  }, []);

  return {
    status,
    interimText,
    errorMessage,
    isSupported:  typeof MediaRecorder !== 'undefined',
    isListening:  status === 'listening',
    isProcessing: status === 'processing',
    startListening,
    stopListening,
    reset,
  };
}
