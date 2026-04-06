import { Check, Lock, RefreshCw, Calculator } from 'lucide-react';
import type { LoanData } from '../types';
import { formatINR } from '../types';

interface Props {
  currentStep: string;
  loanData: LoanData;
}

const STEPS = [
  { key: 'greeting', label: 'Greeting',        sublabel: 'Welcome' },
  { key: 'sales',    label: 'Loan Details',     sublabel: 'Loan Info' },
  { key: 'kyc',      label: 'KYC Verify',       sublabel: 'Identity' },
  { key: 'credit',   label: 'Credit Check',     sublabel: 'CIBIL' },
  { key: 'done',     label: 'Sanction Letter',  sublabel: 'Complete' },
];

function getActiveIndex(step: string): number {
  switch (step) {
    case 'greeting': return 0;
    case 'sales':    return 1;
    case 'kyc':      return 2;
    case 'credit':   return 3;
    case 'sanction':
    case 'done':     return 4;
    default:         return 0;
  }
}

export default function ChatSidebar({ currentStep, loanData }: Props) {
  const activeIdx = getActiveIndex(currentStep);
  const progressPct = Math.round((activeIdx / (STEPS.length - 1)) * 100);

  return (
    <aside
      className="flex flex-col h-screen sticky top-0 overflow-hidden"
      style={{
        width: '30%',
        minWidth: '240px',
        background: '#0d1424',
        borderRight: '1px solid rgba(255,255,255,0.08)',
        padding: '32px 24px',
      }}
    >
      {/* ── Progress header ── */}
      <div className="mb-6">
        <p className="text-xl font-bold" style={{ color: '#b8ff4f' }}>Loan Progress</p>
        <p className="text-[13px] mt-1" style={{ color: '#8892a4' }}>
          Step {activeIdx + 1} of {STEPS.length}
        </p>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between mb-1">
            <span className="text-[10px] uppercase tracking-widest" style={{ color: '#8892a4' }}>
              LOAN PROGRESS
            </span>
            <span className="text-[13px] font-semibold" style={{ color: '#b8ff4f' }}>
              {progressPct}%
            </span>
          </div>
          <div
            className="w-full rounded-full"
            style={{ height: '6px', background: '#1a2235' }}
          >
            <div
              className="rounded-full"
              style={{
                height: '6px',
                background: '#b8ff4f',
                width: `${progressPct}%`,
                transition: 'width 0.5s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Step list ── */}
      <div className="flex flex-col">
        {STEPS.map((step, i) => {
          const isCompleted = i < activeIdx;
          const isActive    = i === activeIdx;
          const isLocked    = i > activeIdx;

          return (
            <div key={step.key} className="flex flex-col">
              {/* Step row */}
              <div
                className="flex items-center gap-3 py-2 px-2 rounded-xl transition-colors"
                style={{
                  background: isActive ? 'rgba(109,92,231,0.15)' : 'transparent',
                  borderRadius: '12px',
                }}
              >
                {/* Circle indicator */}
                <div className="relative shrink-0">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                    style={{
                      background: isCompleted
                        ? '#b8ff4f'
                        : isActive
                        ? '#6d5ce7'
                        : '#1a2235',
                      border: isActive ? '2px solid rgba(255,255,255,0.3)' : 'none',
                      color: isCompleted ? '#0B1120' : isActive ? '#fff' : '#4a5568',
                    }}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" strokeWidth={3} />
                    ) : isLocked ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  {/* Pulsing active dot */}
                  {isActive && (
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full animate-pulse-dot"
                      style={{ background: '#b8ff4f' }}
                    />
                  )}
                </div>

                {/* Step labels */}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-semibold leading-none"
                    style={{ color: isCompleted ? '#b8ff4f' : isActive ? '#6d5ce7' : '#4a5568' }}
                  >
                    {step.label}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: '#8892a4' }}>
                    {step.sublabel}
                  </p>
                </div>

                {/* Active right dot */}
                {isActive && (
                  <span
                    className="w-2 h-2 rounded-full shrink-0 animate-pulse-dot"
                    style={{ background: '#b8ff4f' }}
                  />
                )}
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div
                  className="ml-6 w-0.5"
                  style={{
                    height: '24px',
                    background: i < activeIdx ? '#b8ff4f' : '#1e2d45',
                    transition: 'background 0.4s ease',
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Loan data (bottom) ── */}
      {loanData.loan_amount ? (
        <div
          className="pt-5 mt-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
        >
          {/* Estimated limit row */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[10px] tracking-widest uppercase mb-0.5" style={{ color: '#8892a4' }}>
                LOAN AMOUNT
              </p>
              <p className="text-[22px] font-bold leading-none" style={{ color: '#b8ff4f' }}>
                ₹{formatINR(loanData.loan_amount)}
              </p>
            </div>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-lg"
              style={{ border: '1px solid rgba(255,255,255,0.1)', background: '#141B2D' }}
            >
              <Calculator className="w-4 h-4" style={{ color: '#8892a4' }} />
            </button>
          </div>

          {loanData.tenure && (
            <div className="mb-3">
              <p className="text-[10px] tracking-widest uppercase mb-0.5" style={{ color: '#8892a4' }}>TENURE</p>
              <p className="text-lg font-semibold text-white">{loanData.tenure} months</p>
            </div>
          )}

          {loanData.emi && (
            <div className="mb-4">
              <p className="text-[10px] tracking-widest uppercase mb-0.5" style={{ color: '#8892a4' }}>EMI</p>
              <p className="text-lg font-semibold text-white">₹{formatINR(loanData.emi)}/mo</p>
            </div>
          )}

          {currentStep === 'kyc' && (
            <div className="flex items-center gap-2" style={{ color: '#8892a4' }}>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span className="text-[13px]">KYC in progress...</span>
            </div>
          )}
        </div>
      ) : (
        <p className="text-[11px] text-center" style={{ color: '#4a5568' }}>
          Loan details will appear here after collection.
        </p>
      )}
    </aside>
  );
}
