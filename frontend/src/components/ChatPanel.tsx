import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send } from 'lucide-react';
import type { ChatMessage, LoanData } from '../types';
import MessageBubble from './MessageBubble';
import CreditLoadingCard from './CreditLoadingCard';
import ApprovalScreen from './ApprovalScreen';
import LoanBotLogo from './LoanBotLogo';
import CreditReportCard from './CreditReportCard';
import AffordabilityAlert from './AffordabilityAlert';
import LoanOfferCard from './LoanOfferCard';
import KYCCard from './KYCCard';
import VideoKYC, { type VideoKycCaptureMeta } from './VideoKYC';
import { VoiceButton } from './VoiceButton';

interface Props {
  messages: ChatMessage[];
  loading: boolean;
  currentStep: string;
  loanData: LoanData;
  pdfReady: boolean;
  pdfFilename: string | null;
  sessionId: string;
  onSend: (text: string) => void;
  onVideoKycUpload: (aadhaarImage: File, signatureImage: File, liveVideo: File, metadata: VideoKycCaptureMeta) => void;
}

export default function ChatPanel({
  messages,
  loading,
  currentStep,
  loanData,
  pdfReady,
  pdfFilename,
  sessionId,
  onSend,
  onVideoKycUpload,
}: Props) {
  const navigate = useNavigate();
  const [input, setInput]             = useState('');
  const [interimText, setInterimText] = useState('');
  const [isVoiceActive, setIsVoiceActive] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);
  const isDone    = currentStep === 'done';
  const needsVideoKyc = currentStep === 'video_kyc';

  const handleVoiceTranscript = useCallback((text: string) => {
    setInterimText('');
    setInput('');
    if (!loading && !isDone && text.trim()) onSend(text.trim());
  }, [loading, isDone, onSend]);

  // Clear interim display when a request is in flight
  useEffect(() => { if (loading) setInterimText(''); }, [loading]);

  /* ── Scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (loading || isDone) return;
    const frameId = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frameId);
  }, [loading, isDone, messages.length]);

  /* ── Form submit ── */
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim() || loading || isDone) return;
    onSend(input.trim());
    setInput('');
  }

  /* ── Render assistant messages ── */
  function renderAssistantMessage(msg: ChatMessage) {
    const content = msg.content;

    if (content.includes('AI Credit Analysis Report')) {
      return (
        <div key={msg.id} className="flex flex-col items-start">
          <CreditReportCard content={content} loanData={loanData} />
          <span className="text-[10px] mt-1 px-1" style={{ color: '#8892a4' }}>
            {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </span>
        </div>
      );
    }

    if (content.includes('EMI-to-income ratio') && content.includes('Would you like to') && loanData.affordability_warning) {
      return (
        <div key={msg.id} className="flex flex-col items-start">
          <AffordabilityAlert content={content} onChoice={onSend} />
          <span className="text-[10px] mt-1 px-1" style={{ color: '#8892a4' }}>
            {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </span>
        </div>
      );
    }

    if (content.includes('Instant Offer Breakdown') || content.includes('Loan Offer')) {
      return (
        <div key={msg.id} className="flex flex-col items-start">
          <LoanOfferCard content={content} loanData={loanData} />
          <span className="text-[10px] mt-1 px-1" style={{ color: '#8892a4' }}>
            {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </span>
        </div>
      );
    }

    if ((content.includes('KYC VERIFIED') || content.includes('Identity Verification') || content.includes('Document KYC Captured'))
      && loanData.name && loanData.aadhaar && loanData.pan) {
      return (
        <div key={msg.id} className="flex flex-col items-start">
          <KYCCard
            name={loanData.name}
            aadhaar={loanData.aadhaar}
            pan={loanData.pan}
          />
          <span className="text-[10px] mt-1 px-1" style={{ color: '#8892a4' }}>
            {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </span>
        </div>
      );
    }

    return (
      <MessageBubble
        key={msg.id}
        content={content}
        role="assistant"
        timestamp={msg.timestamp}
      />
    );
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
        <div>
          <LoanBotLogo iconSize={36} wordmarkSize={24} onClick={() => navigate('/')} />
          <p className="text-xs mt-1 ml-[50px]" style={{ color: '#b8ff4f' }}>Typically replies instantly</p>
        </div>
      </div>

      {/* ── Messages or Approval Screen ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 py-5 space-y-5">
          {messages.map(msg => (
            msg.role === 'user'
              ? (
                <MessageBubble
                  key={msg.id}
                  content={msg.content}
                  role="user"
                  timestamp={msg.timestamp}
                />
              )
              : renderAssistantMessage(msg)
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
        </div>

        {isDone && (
          <ApprovalScreen loanData={loanData} pdfReady={pdfReady} pdfFilename={pdfFilename} />
        )}

        <div ref={bottomRef} />
      </div>

      {/* ── Input bar (hidden when done) ── */}
      {!isDone && (
        <div
          className="shrink-0 px-6 py-4"
          style={{
            background: '#0d1424',
            borderTop: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {needsVideoKyc ? (
            <VideoKYC
              sessionId={sessionId}
              loading={loading}
              userName={loanData.name}
              onSubmit={onVideoKycUpload}
            />
          ) : (
            <form onSubmit={handleSubmit}>
              <div
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  background: '#141B2D',
                  border: `1px solid ${isVoiceActive ? 'rgba(184,255,79,0.35)' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: '50px',
                }}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={input || interimText}
                  onChange={e => { setInput(e.target.value); setInterimText(''); }}
                  placeholder={isVoiceActive ? 'Listening…' : 'Type in Hindi or English…'}
                  disabled={loading || isVoiceActive}
                  className="flex-1 bg-transparent border-none outline-none text-sm"
                  style={{
                    color: '#ffffff',
                    fontStyle: interimText && !input ? 'italic' : 'normal',
                  }}
                />

                <VoiceButton
                  onTranscript={handleVoiceTranscript}
                  onListeningChange={setIsVoiceActive}
                  disabled={loading || isDone}
                  className="shrink-0"
                />

                <button
                  type="submit"
                  disabled={!input.trim() || loading || isVoiceActive}
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 disabled:cursor-not-allowed"
                  style={{ background: input.trim() && !loading && !isVoiceActive ? '#b8ff4f' : '#1a2235' }}
                >
                  <Send
                    className="w-4 h-4"
                    style={{ color: input.trim() && !loading && !isVoiceActive ? '#0B1120' : '#4a5568' }}
                  />
                </button>
              </div>
            </form>
          )}

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
