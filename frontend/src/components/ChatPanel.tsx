import { useEffect, useRef, useState } from 'react';
import { Paperclip, Mic, Send } from 'lucide-react';
import type { ChatMessage, LoanData } from '../types';
import MessageBubble from './MessageBubble';
import CreditLoadingCard from './CreditLoadingCard';
import ApprovalScreen from './ApprovalScreen';

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  currentStep: string;
  loanData: LoanData;
  pdfReady: boolean;
  pdfFilename: string | null;
  onSend: (text: string) => void;
}

export default function ChatPanel({
  messages,
  loading,
  currentStep,
  loanData,
  pdfReady,
  pdfFilename,
  onSend,
}: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const isDone    = currentStep === 'done';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading || isDone) return;
    onSend(input.trim());
    setInput('');
  }

  return (
    <div
      className="flex flex-col flex-1 h-screen overflow-hidden"
      style={{ background: '#0B1120' }}
    >
      {/* ── Chat header ── */}
      <div
        className="flex items-center gap-3 px-6 py-4 shrink-0"
        style={{
          background: '#0d1424',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {/* Avatar */}
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-base font-bold shrink-0"
          style={{ background: '#1a2235', color: '#6d5ce7', border: '2px solid rgba(109,92,231,0.3)' }}
        >
          LB
        </div>
        <div>
          <p className="text-base font-semibold text-white leading-none">LoanBot AI</p>
          <p className="text-xs mt-0.5" style={{ color: '#b8ff4f' }}>Typically replies instantly</p>
        </div>
      </div>

      {/* ── Messages or Approval Screen ── */}
      {isDone ? (
        <ApprovalScreen loanData={loanData} pdfReady={pdfReady} pdfFilename={pdfFilename} />
      ) : (
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {messages.map(msg => (
            <MessageBubble key={msg.id} msg={msg} loanData={loanData} />
          ))}

          {/* Credit loading card shown while thinking on kyc→credit transition */}
          {loading && currentStep === 'kyc' && (
            <CreditLoadingCard />
          )}

          {/* Generic typing indicator */}
          {loading && (
            <div className="flex items-start gap-2 animate-slide-up">
              <div
                className="px-4 py-3 rounded-[4px_18px_18px_18px] text-sm flex items-center gap-2"
                style={{ background: '#1a2a4a', color: '#8892a4' }}
              >
                <span className="inline-flex gap-1">
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-current animate-pulse"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </span>
                LoanBot is thinking...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      )}

      {/* ── Input bar (hidden when done) ── */}
      {!isDone && (
        <div
          className="shrink-0 px-6 py-4"
          style={{
            background: '#0d1424',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <form onSubmit={handleSubmit}>
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{
                background: '#141B2D',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '50px',
              }}
            >
              {/* Attachment icon */}
              <Paperclip className="w-5 h-5 shrink-0" style={{ color: '#8892a4' }} />

              {/* Text input */}
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Type in Hindi or English..."
                disabled={loading}
                className="flex-1 bg-transparent border-none outline-none text-sm text-white"
                style={{ color: '#ffffff' }}
              />

              {/* Mic icon */}
              <Mic className="w-5 h-5 shrink-0" style={{ color: '#8892a4' }} />

              {/* Send button */}
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 disabled:cursor-not-allowed"
                style={{
                  background: input.trim() && !loading ? '#b8ff4f' : '#1a2235',
                }}
              >
                <Send
                  className="w-4 h-4"
                  style={{ color: input.trim() && !loading ? '#0B1120' : '#4a5568' }}
                />
              </button>
            </div>
          </form>

          {/* Encryption note */}
          <p
            className="text-center mt-2 uppercase tracking-[0.15em] text-[10px]"
            style={{ color: '#4a5568' }}
          >
            ENCRYPTED WITH 256-BIT AES PROTECTION
          </p>
        </div>
      )}
    </div>
  );
}
