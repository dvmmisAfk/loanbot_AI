import { useEffect, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import ChatSidebar from './ChatSidebar';
import ChatPanel from './ChatPanel';
import type { ChatMessage, LoanData } from '../types';
import { parseLoanData } from '../types';

interface Props {
  onBack: () => void;
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Module-level guard — survives Strict Mode's double-invocation of effects
let _greetingSent = false;

export default function ChatPage({ onBack }: Props) {
  const [messages,    setMessages]    = useState<ChatMessage[]>([]);
  const sessionIdRef  = useRef<string>(genId());
  const [currentStep, setCurrentStep] = useState('greeting');
  const [loanData,    setLoanData]    = useState<LoanData>({});
  const [loading,     setLoading]     = useState(false);
  const [pdfReady,    setPdfReady]    = useState(false);
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);

  // Auto-greet on mount — guard prevents double-fire in React Strict Mode
  useEffect(() => {
    if (_greetingSent) return;
    _greetingSent = true;
    sendMessage('Hello', true);
  }, []);

  async function sendMessage(text: string, isGreeting = false) {
    if (loading) return;
    if (!isGreeting) {
      const userMsg: ChatMessage = {
        id:        genId(),
        role:      'user',
        content:   text,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMsg]);
    }
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ session_id: sessionIdRef.current, message: text }),
      });
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();

      const newStep: string  = data.current_step ?? 'greeting';
      const msgText: string  = data.message ?? '';

      // Update session ID (first call generates it server-side too)
      sessionIdRef.current = data.session_id;
      setCurrentStep(newStep);
      setPdfReady(data.pdf_ready ?? false);
      setPdfFilename(data.pdf_filename ?? null);

      // Parse loan fields from message
      setLoanData(prev => parseLoanData(msgText, prev));

      // Decide which inline card to attach
      const showLoanOffer = msgText.includes('Your Loan Offer:');
      const showKYCCard   = msgText.includes('KYC Status: VERIFIED');

      const botMsg: ChatMessage = {
        id:           genId(),
        role:         'assistant',
        content:      msgText,
        timestamp:    new Date(),
        showLoanOffer,
        showKYCCard,
      };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id:        genId(),
          role:      'assistant',
          content:   '⚠️ Connection error. Make sure the backend is running on port 8002.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function sendVideoKyc(aadhaarImage: File, liveVideo: File) {
    if (loading) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('aadhaar_image', aadhaarImage);
      formData.append('live_video', liveVideo);

      const res = await fetch(`/api/video-kyc/${sessionIdRef.current}`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Video KYC failed');

      const data = await res.json();
      const msgText: string = data.message ?? 'Video eKYC processed.';

      sessionIdRef.current = data.session_id ?? sessionIdRef.current;
      setCurrentStep(data.current_step ?? 'video_kyc');
      setPdfReady(data.pdf_ready ?? false);
      setPdfFilename(data.pdf_filename ?? null);
      setLoanData(prev => parseLoanData(msgText, prev));

      const botMsg: ChatMessage = {
        id: genId(),
        role: 'assistant',
        content: msgText,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: genId(),
          role: 'assistant',
          content: '⚠️ Video eKYC upload failed. Please retry with a clear Aadhaar image and a short selfie video.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0B1120' }}>
      {/* Back button (top-left overlay) */}
      <button
        onClick={onBack}
        className="absolute top-4 left-4 z-50 flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
        style={{ color: '#8892a4', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <ChevronLeft className="w-3.5 h-3.5" />
        Back
      </button>

      {/* Left sidebar */}
      <ChatSidebar currentStep={currentStep} loanData={loanData} />

      {/* Right chat panel */}
      <ChatPanel
        messages={messages}
        loading={loading}
        currentStep={currentStep}
        loanData={loanData}
        pdfReady={pdfReady}
        pdfFilename={pdfFilename}
        sessionId={sessionIdRef.current}
        onSend={text => sendMessage(text)}
        onVideoKycUpload={sendVideoKyc}
      />
    </div>
  );
}
