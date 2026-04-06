import { Download, ShieldCheck } from 'lucide-react';
import CIBILGauge from './CIBILGauge';
import type { LoanData } from '../types';
import { formatINR } from '../types';

interface Props {
  loanData: LoanData;
  pdfReady: boolean;
  pdfFilename: string | null;
}

const PARTICLES = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  emoji: ['🎉', '✨', '⭐', '🎊'][i % 4],
  left: `${8 + i * 7.5}%`,
  delay: `${(i * 0.18).toFixed(2)}s`,
  duration: `${1.2 + (i % 4) * 0.3}s`,
}));

export default function ApprovalScreen({ loanData, pdfReady, pdfFilename }: Props) {
  const score = loanData.cibil_score ?? 742;
  const name = loanData.name ?? 'Applicant';
  const amount = loanData.loan_amount ?? 0;
  const emi = loanData.emi ?? 0;

  function handleDownload() {
    if (!pdfFilename) return;
    const link = document.createElement('a');
    link.href = `/api/download/${pdfFilename}`;
    link.download = pdfFilename;
    link.click();
  }

  return (
    <div
      className="flex-1 overflow-y-auto flex flex-col items-center justify-start px-6 py-10"
      style={{ background: '#0B1120' }}
    >
      {/* Floating confetti */}
      <div className="relative w-full pointer-events-none h-0 overflow-visible">
        {PARTICLES.map(p => (
          <span
            key={p.id}
            className="absolute text-xl"
            style={{
              left: p.left,
              top: '-24px',
              animation: `float-up ${p.duration} ${p.delay} ease-out both`,
            }}
          >
            {p.emoji}
          </span>
        ))}
      </div>

      {/* Heading */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-2xl">🎊</span>
          <span className="text-2xl">⭐</span>
        </div>
        <h1
          className="font-black text-white tracking-wide leading-tight"
          style={{ fontSize: '48px', letterSpacing: '0.05em' }}
        >
          LOAN APPROVED! 🎉
        </h1>
        <p className="text-base mt-3 max-w-md mx-auto" style={{ color: '#8892a4' }}>
          Congratulations {name}, your credit profile has been successfully validated by our AI engine.
        </p>
      </div>

      {/* Approval card */}
      <div
        className="w-full rounded-2xl p-8 mb-6"
        style={{
          background: '#141B2D',
          border: '1px solid rgba(255,255,255,0.1)',
          maxWidth: '600px',
        }}
      >
        <div className="grid grid-cols-2 gap-8">
          {/* Left column */}
          <div className="flex flex-col">
            <div className="mb-6">
              <p className="text-[11px] tracking-widest uppercase mb-1" style={{ color: '#8892a4' }}>BORROWER</p>
              <p className="text-2xl font-bold text-white">{name}</p>
            </div>
            <div className="mb-4">
              <p className="text-[11px] tracking-widest uppercase mb-1" style={{ color: '#8892a4' }}>LOAN AMOUNT</p>
              <p className="text-[32px] font-extrabold leading-none" style={{ color: '#b8ff4f' }}>
                ₹{formatINR(amount)}
              </p>
            </div>
            <div className="mb-6">
              <p className="text-[11px] tracking-widest uppercase mb-1" style={{ color: '#8892a4' }}>MONTHLY EMI</p>
              <p className="text-2xl font-bold text-white">₹{formatINR(emi)}</p>
            </div>
            <div
              className="flex items-center gap-2 mt-auto"
              style={{ color: '#8892a4' }}
            >
              <ShieldCheck className="w-4 h-4" />
              <span className="text-[11px] tracking-widest uppercase">INSTITUTIONAL APPROVAL SEAL</span>
            </div>
          </div>

          {/* Right column — CIBIL gauge */}
          <div className="flex flex-col items-center">
            <p className="text-[11px] tracking-widest uppercase mb-4 self-start" style={{ color: '#8892a4' }}>
              CREDIT WORTHINESS
            </p>
            <CIBILGauge score={score} />

            {/* APPROVED stamp */}
            <div
              className="mt-4 px-5 py-2 animate-stamp-in"
              style={{
                border: '2px solid #b8ff4f',
                borderRadius: '8px',
                background: 'rgba(184,255,79,0.05)',
                transform: 'rotate(-3deg)',
              }}
            >
              <span
                className="font-bold tracking-[0.15em] text-sm uppercase"
                style={{ color: '#b8ff4f' }}
              >
                APPROVED
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Download button */}
      <div className="w-full" style={{ maxWidth: '480px' }}>
        {pdfReady ? (
          <button
            onClick={handleDownload}
            className="w-full flex items-center justify-center gap-3 font-bold text-base transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98] animate-glow-pulse"
            style={{
              background: '#b8ff4f',
              color: '#0B1120',
              borderRadius: '50px',
              padding: '18px 32px',
              height: '60px',
              boxShadow: '0 0 30px rgba(184,255,79,0.3)',
            }}
          >
            <span
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: '#0d1a0d' }}
            >
              <Download className="w-4 h-4 text-white" />
            </span>
            ⬇&nbsp; Download Sanction Letter PDF
          </button>
        ) : (
          <div
            className="w-full flex items-center justify-center gap-2 font-semibold text-sm"
            style={{
              background: 'rgba(184,255,79,0.15)',
              color: '#b8ff4f',
              borderRadius: '50px',
              padding: '18px 32px',
              height: '60px',
              border: '1px solid rgba(184,255,79,0.3)',
            }}
          >
            <div
              className="w-5 h-5 rounded-full animate-spin-gauge"
              style={{ border: '2px solid transparent', borderTopColor: '#b8ff4f', borderRightColor: '#b8ff4f' }}
            />
            Preparing your PDF...
          </div>
        )}

        <p className="text-center text-[13px] mt-3" style={{ color: '#8892a4' }}>
          Approved in 8 min 32 sec &nbsp;•&nbsp; 0 humans involved
        </p>
        <p
          className="text-center mt-1.5 uppercase tracking-[0.1em] text-[11px]"
          style={{ color: '#8892a4' }}
        >
          🔒 256-BIT BANK GRADE SECURITY
        </p>
      </div>
    </div>
  );
}
