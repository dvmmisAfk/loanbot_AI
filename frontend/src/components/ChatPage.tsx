import { useEffect, useRef, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import ChatSidebar from './ChatSidebar';
import ChatPanel from './ChatPanel';
import type { ChatMessage, LoanData } from '../types';
import { parseLoanData } from '../types';
import { API_BASE_URL, apiUrl } from '../lib/api';
import type { VideoKycCaptureMeta } from './VideoKYC';

interface Props {
  onBack: () => void;
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export default function ChatPage({ onBack }: Props) {
  const [messages,    setMessages]    = useState<ChatMessage[]>([]);
  const sessionIdRef   = useRef<string>(genId());
  const [currentStep, setCurrentStep] = useState('greeting');
  const [loanData,    setLoanData]    = useState<LoanData>({});
  const savedDoneRef   = useRef(false);
  const greetingSentRef = useRef(false);
  const [loading,     setLoading]     = useState(false);
  const [pdfReady,    setPdfReady]    = useState(false);
  const [pdfFilename, setPdfFilename] = useState<string | null>(null);
  const sendMessageRef = useRef<((text: string, isGreeting?: boolean) => Promise<void>) | null>(null);

  // Save loan data to localStorage when step reaches "done"
  useEffect(() => {
    if (currentStep !== 'done' || savedDoneRef.current) return;
    savedDoneRef.current = true;
    localStorage.setItem('loanbot_session_id', sessionIdRef.current);
    localStorage.setItem('loanbot_loan_data', JSON.stringify({
      name: loanData.name,
      loan_amount: loanData.loan_amount,
      income: loanData.income,
      emi: loanData.emi,
      emi_ratio: loanData.emi_ratio,
      tenure: loanData.tenure,
      cibil_score: loanData.cibil_score,
      loan_status: loanData.loan_status,
      risk_factors: loanData.risk_factors,
      npa_risk: loanData.npa_risk,
      approval_reasoning: loanData.approval_reasoning,
      loan_to_income: loanData.loan_to_income,
      pdf_filename: pdfFilename,
      session_id: sessionIdRef.current,
      approved_at: new Date().toISOString(),
    }));
  }, [currentStep, loanData, pdfFilename]);

  // Auto-greet on mount — useRef guard prevents double-fire in React Strict Mode
  // and resets each time ChatPage is freshly mounted (unlike a module-level flag)
  useEffect(() => {
    if (greetingSentRef.current) return;
    greetingSentRef.current = true;
    void sendMessageRef.current?.('Hello', true);
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
      const res = await fetch(apiUrl('/chat'), {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ session_id: sessionIdRef.current, message: text }),
      });
      if (!res.ok) throw new Error('Network error');
      const data = await res.json();

      const newStep: string  = data.current_step ?? 'greeting';
      const assistantMessages: string[] = data.messages?.length
        ? data.messages
        : data.message
        ? [data.message]
        : [];
      const msgText = assistantMessages.join('\n\n');

      // Update session ID (first call generates it server-side too)
      sessionIdRef.current = data.session_id;
      setCurrentStep(newStep);
      setPdfReady(data.pdf_ready ?? false);
      setPdfFilename(data.pdf_filename ?? null);

      setLoanData(prev => parseLoanData(msgText, prev, data.loan_data ?? {}));

      if (assistantMessages.length) {
        const timestamp = new Date();
        const botMessages: ChatMessage[] = assistantMessages.map(content => ({
          id: genId(),
          role: 'assistant',
          content,
          timestamp,
        }));
        setMessages(prev => [...prev, ...botMessages]);
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id:        genId(),
          role:      'assistant',
          content:   `⚠️ Connection error. Make sure the LoanBot API is running on ${API_BASE_URL}.`,
          timestamp: new Date(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  sendMessageRef.current = sendMessage;

  async function sendVideoKyc(aadhaarImage: File, signatureImage: File, liveVideo: File, metadata: VideoKycCaptureMeta) {
    if (loading) return;
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('aadhaar_image', aadhaarImage);
      formData.append('signature_image', signatureImage);
      formData.append('live_video', liveVideo);
      formData.append('video_meta', JSON.stringify(metadata));

      const res = await fetch(apiUrl(`/video-kyc/${sessionIdRef.current}`), {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Video KYC failed');

      const data = await res.json();
      const assistantMessages: string[] = data.messages?.length
        ? data.messages
        : data.message
        ? [data.message]
        : ['Video eKYC processed.'];
      const msgText = assistantMessages.join('\n\n');

      sessionIdRef.current = data.session_id ?? sessionIdRef.current;
      setCurrentStep(data.current_step ?? 'video_kyc');
      setPdfReady(data.pdf_ready ?? false);
      setPdfFilename(data.pdf_filename ?? null);
      setLoanData(prev => parseLoanData(msgText, prev, data.loan_data ?? {}));

      const timestamp = new Date();
      const botMessages: ChatMessage[] = assistantMessages.map(content => ({
        id: genId(),
        role: 'assistant',
        content,
        timestamp,
      }));
      setMessages(prev => [...prev, ...botMessages]);
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: genId(),
          role: 'assistant',
          content: '⚠️ Live Video KYC failed. Please retry with a clear Aadhaar image, signature image, stable lighting, and a centered face.',
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
