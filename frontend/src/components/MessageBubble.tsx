import type { ChatMessage, LoanData } from '../types';
import LoanOfferCard from './LoanOfferCard';
import KYCCard from './KYCCard';

interface Props {
  msg: ChatMessage;
  loanData: LoanData;
}

function formatTime(d: Date) {
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function MessageBubble({ msg, loanData }: Props) {
  const isUser = msg.role === 'user';

  return (
    <div className={`flex flex-col animate-slide-up ${isUser ? 'items-end' : 'items-start'}`}>
      <div
        className="px-[18px] py-[14px] text-sm leading-relaxed whitespace-pre-wrap break-words"
        style={{
          maxWidth: '75%',
          background: isUser ? '#b8ff4f' : '#1a2a4a',
          color: isUser ? '#0B1120' : '#ffffff',
          fontWeight: isUser ? 500 : 400,
          borderRadius: isUser ? '18px 18px 4px 18px' : '4px 18px 18px 18px',
        }}
      >
        {msg.content}
      </div>

      {/* Inline cards — only on bot messages */}
      {!isUser && msg.showLoanOffer && loanData.loan_amount && loanData.tenure && loanData.emi && (
        <LoanOfferCard
          loanAmount={loanData.loan_amount}
          tenure={loanData.tenure}
          emi={loanData.emi}
        />
      )}
      {!isUser && msg.showKYCCard && loanData.name && loanData.aadhaar && loanData.pan && (
        <KYCCard
          name={loanData.name}
          aadhaar={loanData.aadhaar}
          pan={loanData.pan}
        />
      )}

      <span className="text-[10px] mt-1 px-1" style={{ color: '#8892a4' }}>
        {formatTime(msg.timestamp)}
      </span>
    </div>
  );
}
