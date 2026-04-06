import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Send, Download, Loader2 } from 'lucide-react';
import LoanBotLogo from './LoanBotLogo';
import { API_BASE_URL, apiUrl } from '../lib/api';
import { VoiceButton } from './VoiceButton';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STEP_SUBTITLES: Record<string, string> = {
  greeting: 'Collecting loan details...',
  sales: 'Collecting loan details...',
  kyc: 'Verifying your identity...',
  credit: 'Running credit check...',
  sanction: 'Generating sanction letter...',
  done: 'Loan approved ✓',
};

const STEP_LABELS = ['Loan Info', 'KYC', 'Credit', 'Sanction', 'Complete'];
const STEPS = ['sales', 'kyc', 'credit', 'sanction', 'done'];

export default function ChatModal({ isOpen, onClose }: ChatModalProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState('greeting');
  const [loading, setLoading] = useState(false);
  const [pdfReady, setPdfReady] = useState(false);
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sendMessageRef = useRef<((text: string) => Promise<void>) | null>(null);
  const [isVoiceActive, setIsVoiceActive] = useState(false);

  const handleVoiceTranscript = useCallback((text: string) => {
    if (!loading && currentStep !== 'done' && text.trim()) {
      void sendMessageRef.current?.(text.trim());
    }
  }, [loading, currentStep]);


  useEffect(() => {
    if (isOpen && !started) {
      void sendMessageRef.current?.('Hello');
      setStarted(true);
    }
  }, [isOpen, started]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || loading || currentStep === 'done') return;

    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [isOpen, loading, currentStep, messages.length]);

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return;

    if (text !== 'Hello') {
      setMessages(prev => [...prev, { role: 'user', content: text }]);
    }
    setInput('');
    setLoading(true);

    try {
      const res = await fetch(apiUrl('/chat'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: text }),
      });

      if (!res.ok) throw new Error('Network error');

      const data = await res.json();
      const assistantMessages: string[] = data.messages?.length
        ? data.messages
        : data.message
        ? [data.message]
        : [];

      setSessionId(data.session_id);
      setCurrentStep(data.current_step || 'greeting');
      setPdfReady(data.pdf_ready);
      setPdfFilename(data.pdf_filename);

      if (assistantMessages.length) {
        setMessages(prev => [
          ...prev,
          ...assistantMessages.map((content) => ({ role: 'assistant' as const, content })),
        ]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: `Connection error. Please make sure the LoanBot API is running on ${API_BASE_URL}.` },
      ]);
    } finally {
      setLoading(false);
    }
  }

  sendMessageRef.current = sendMessage;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    sendMessage(input);
  }

  function handleDownload() {
    if (!pdfFilename) return;
    const link = document.createElement('a');
    link.href = apiUrl(`/download/${encodeURIComponent(pdfFilename)}`);
    link.download = pdfFilename;
    link.click();
  }

  function handleClose() {
    onClose();
    setTimeout(() => {
      setMessages([]);
      setSessionId(null);
      setCurrentStep('greeting');
      setLoading(false);
      setPdfReady(false);
      setPdfFilename(null);
      setStarted(false);
    }, 300);
  }

  const activeStepIndex = STEPS.indexOf(currentStep === 'greeting' ? 'sales' : currentStep);
  const subtitle = STEP_SUBTITLES[currentStep] ?? 'Processing...';

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="relative w-full max-w-2xl h-[85vh] flex flex-col bg-[var(--color-fintech-navy)] border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            initial={{ scale: 0.92, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[var(--color-dark-base)]/50">
              <div>
                <LoanBotLogo iconSize={34} wordmarkSize={22} onClick={() => navigate('/')} />
                <div>
                  <p className="text-xs text-[var(--color-secondary)] mt-1 ml-[46px]">{subtitle}</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl hover:bg-white/10 transition-colors text-[var(--color-secondary)] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step Progress */}
            <div className="px-6 py-3 border-b border-white/5 bg-[var(--color-dark-base)]/30">
              <div className="flex items-center gap-1">
                {STEP_LABELS.map((label, i) => (
                  <div key={label} className="flex items-center gap-1 flex-1">
                    <div className="flex flex-col items-center flex-1">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                          i < activeStepIndex
                            ? 'bg-[var(--color-success)] text-white shadow-[0_0_8px_rgba(34,197,94,0.5)]'
                            : i === activeStepIndex
                            ? 'bg-[var(--color-accent-blue)] text-white shadow-[0_0_8px_rgba(56,189,248,0.5)] scale-110'
                            : 'bg-white/10 text-[var(--color-secondary)]'
                        }`}
                      >
                        {i < activeStepIndex ? '✓' : i + 1}
                      </div>
                      <span
                        className={`text-[10px] mt-1 hidden sm:block transition-colors ${
                          i <= activeStepIndex ? 'text-white' : 'text-[var(--color-secondary)]'
                        }`}
                      >
                        {label}
                      </span>
                    </div>
                    {i < STEP_LABELS.length - 1 && (
                      <div
                        className={`h-[2px] flex-1 mb-4 rounded transition-all duration-500 ${
                          i < activeStepIndex ? 'bg-[var(--color-success)]' : 'bg-white/10'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                      msg.role === 'user'
                        ? 'bg-[var(--color-accent-blue)] text-white rounded-br-sm'
                        : 'bg-white/5 border border-white/10 text-[var(--color-primary)] rounded-bl-sm'
                    }`}
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {loading && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-white/5 border border-white/10 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[var(--color-accent-blue)]" />
                    <span className="text-sm text-[var(--color-secondary)]">LoanBot is thinking...</span>
                  </div>
                </motion.div>
              )}

              {pdfReady && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex justify-center px-2"
                >
                  <button
                    onClick={handleDownload}
                    className="w-full flex items-center justify-center gap-2 py-[14px] px-6 font-semibold rounded-lg transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    style={{
                      background: '#b8ff4f',
                      color: '#0B1120',
                      borderRadius: '8px',
                      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    }}
                  >
                    <Download className="w-5 h-5" />
                    ⬇&nbsp;&nbsp;Download Your Sanction Letter PDF
                  </button>
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-4 py-4 border-t border-white/10 bg-[var(--color-dark-base)]/30">
              <form onSubmit={handleSubmit} className="flex items-center gap-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder={currentStep === 'done' ? 'Your loan journey is complete ✓' : 'Tell LoanBot what you need...'}
                  disabled={loading || currentStep === 'done'}
                  className="flex-1 bg-white/5 border rounded-xl px-4 py-3 text-sm placeholder-[var(--color-secondary)] focus:outline-none transition-all disabled:opacity-50"
                  style={{ borderColor: 'rgba(255,255,255,0.1)', color: 'var(--color-primary)' }}
                />
                <VoiceButton
                  onTranscript={handleVoiceTranscript}
                  onListeningChange={setIsVoiceActive}
                  disabled={loading || currentStep === 'done'}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || loading || currentStep === 'done' || isVoiceActive}
                  className="p-3 bg-[var(--color-accent-blue)] rounded-xl text-white hover:scale-105 active:scale-95 transition-transform disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_12px_rgba(56,189,248,0.3)]"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
