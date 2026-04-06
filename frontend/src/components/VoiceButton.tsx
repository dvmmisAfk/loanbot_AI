import { useEffect, useRef, useState } from 'react';
import { useSpeechToText } from '../hooks/useSpeechToText';

interface Props {
  onTranscript: (text: string) => void;
  onListeningChange?: (active: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Mic button using MediaRecorder → Groq Whisper (/transcribe endpoint).
 * Does NOT use the browser Web Speech API, so it works on Indian networks
 * where speech.googleapis.com is unreachable.
 */
export function VoiceButton({ onTranscript, onListeningChange, disabled = false, className = '' }: Props) {
  const [showError, setShowError] = useState(true);
  const prevListeningRef = useRef(false);

  const { status: _status, isListening, isProcessing, isSupported, errorMessage, startListening } =
    useSpeechToText({ onTranscript });

  // Notify parent when listening state changes
  useEffect(() => {
    if (prevListeningRef.current !== isListening) {
      prevListeningRef.current = isListening;
      onListeningChange?.(isListening);
    }
  }, [isListening, onListeningChange]);

  // Auto-show error toast when errorMessage changes
  useEffect(() => {
    if (errorMessage) setShowError(true);
  }, [errorMessage]);

  // Auto-dismiss error after 5 seconds
  useEffect(() => {
    if (!errorMessage || !showError) return;
    const t = setTimeout(() => setShowError(false), 5000);
    return () => clearTimeout(t);
  }, [errorMessage, showError]);

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        title="Voice input requires a modern browser"
        className={`w-10 h-10 rounded-full bg-[#1a2235] flex items-center justify-center opacity-30 cursor-not-allowed ${className}`}
      >
        <MicOffIcon />
      </button>
    );
  }

  const isActive = isListening || isProcessing;

  return (
    <div className={`relative flex items-center justify-center ${className}`}>

      {/* Error toast */}
      {errorMessage && showError && (
        <div className="absolute bottom-14 right-0 w-72 z-50 bg-[#1f1515] border border-red-500/40 rounded-xl px-4 py-3 shadow-2xl">
          <p className="text-red-400 text-[11px] leading-relaxed pr-5">{errorMessage}</p>
          <button
            type="button"
            onClick={() => setShowError(false)}
            className="absolute top-2 right-2 text-red-400/50 hover:text-red-400 text-xs"
          >✕</button>
        </div>
      )}

      {/* Listening / processing pill */}
      {isActive && (
        <div className="absolute bottom-14 right-0 z-40 flex items-center gap-2 bg-[#141B2D] border border-[#b8ff4f]/30 rounded-full px-3 py-1.5 whitespace-nowrap pointer-events-none">
          {isListening ? (
            <>
              <span className="flex gap-0.5 items-end h-4">
                {[0, 1, 2, 3].map(i => (
                  <span
                    key={i}
                    className="w-0.5 bg-[#b8ff4f] rounded-full"
                    style={{
                      height: `${6 + i * 3}px`,
                      animation: 'vbWave 0.8s ease-in-out infinite',
                      animationDelay: `${i * 0.12}s`,
                    }}
                  />
                ))}
              </span>
              <span className="text-[#b8ff4f] text-[11px] font-medium">Listening…</span>
            </>
          ) : (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-[#b8ff4f] border-t-transparent animate-spin" />
              <span className="text-[#b8ff4f] text-[11px] font-medium">Transcribing…</span>
            </>
          )}
        </div>
      )}

      {/* Main mic button */}
      <button
        type="button"
        onClick={startListening}
        disabled={disabled || isProcessing}
        title={
          isListening   ? 'Tap to stop'
          : isProcessing ? 'Transcribing…'
          : 'Tap to speak'
        }
        className={`relative flex items-center justify-center w-10 h-10 rounded-full
                    transition-all duration-200 disabled:cursor-not-allowed
                    ${isListening
                      ? 'bg-[#b8ff4f]/15 border-2 border-[#b8ff4f] text-[#b8ff4f] scale-110'
                      : isProcessing
                      ? 'bg-[#b8ff4f]/10 border border-[#b8ff4f]/40 text-[#b8ff4f] opacity-70'
                      : 'bg-[#1a2235] border border-white/10 text-[#4a5568] hover:border-[#b8ff4f]/40 hover:text-[#b8ff4f] hover:scale-105'
                    } ${disabled ? 'opacity-30' : ''}`}
      >
        {isListening && (
          <span className="absolute inset-0 rounded-full border-2 border-[#b8ff4f]/40 animate-ping" />
        )}
        {isListening || isProcessing ? <MicOnIcon /> : <MicOffIcon />}
      </button>

      <style>{`
        @keyframes vbWave {
          0%,100% { transform: scaleY(0.4); opacity: 0.5; }
          50%      { transform: scaleY(1);   opacity: 1;   }
        }
      `}</style>
    </div>
  );
}

function MicOnIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"
         stroke="currentColor" strokeWidth="0.5" strokeLinecap="round">
      <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" strokeWidth="2"/>
      <line x1="12" y1="19" x2="12" y2="23" strokeWidth="2"/>
      <line x1="8"  y1="23" x2="16" y2="23" strokeWidth="2"/>
    </svg>
  );
}

function MicOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 1a4 4 0 0 1 4 4v7a4 4 0 0 1-8 0V5a4 4 0 0 1 4-4z"/>
      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8"  y1="23" x2="16" y2="23"/>
    </svg>
  );
}
