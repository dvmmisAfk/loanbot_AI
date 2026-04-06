import { useState } from 'react';
import type { LoanData } from '../types';
import { formatINR } from '../types';
import { clampPercent, getEmiRatioColor } from '../lib/loanMetrics';

interface Props {
  content: string;
  loanData: LoanData;
}

export default function LoanOfferCard({ content, loanData }: Props) {
  const [expanded, setExpanded] = useState(false);
  const loanAmount = loanData.loan_amount ?? 0;
  const tenure = loanData.tenure ?? 0;
  const emi = loanData.emi ?? 0;
  const emiRatio = loanData.emi_ratio ?? 0;
  const totalInterest = Math.max(0, emi * tenure - loanAmount);
  const affordabilityColor = getEmiRatioColor(emiRatio);
  const affordabilityLabel = emiRatio <= 40 ? '✓ Within safe limit' : '⚠ Above recommended';
  const cibil = loanData.cibil_score ?? 0;
  const rateReason =
    cibil >= 750
      ? 'Based on your CIBIL profile and loan-to-income ratio, you qualify for our premium rate. Excellent profiles (750+ CIBIL) get 10.5%.'
      : 'Based on your CIBIL profile and loan-to-income ratio, you qualify for our standard rate. Excellent profiles (750+ CIBIL) get 10.5%. Good profiles get 10.5%-12%.';

  return (
    <div
      className="rounded-2xl p-6 mt-3 animate-slide-up"
      style={{
        background: '#141B2D',
        border: '1px solid rgba(255,255,255,0.1)',
        maxWidth: '360px',
      }}
    >
      <h3 className="text-lg font-bold text-white mb-5">Instant Offer Breakdown</h3>
      <p className="mb-4 text-xs leading-relaxed" style={{ color: '#8892a4' }}>
        {content.split('\n').slice(0, 2).join(' ')}
      </p>

      <div className="grid grid-cols-2 gap-5 mb-4">
        {/* Interest Rate */}
        <div>
          <p className="text-[9px] tracking-widest mb-1 uppercase" style={{ color: '#8892a4' }}>
            INTEREST RATE
          </p>
          <p className="text-[32px] font-extrabold text-white leading-none">
            10.5
            <span className="text-sm font-normal ml-0.5" style={{ color: '#8892a4' }}>% p.a.</span>
          </p>
        </div>
        {/* EMI */}
        <div>
          <p className="text-[9px] tracking-widest mb-1 uppercase" style={{ color: '#8892a4' }}>
            MONTHLY EMI
          </p>
          <p className="text-[32px] font-extrabold leading-none" style={{ color: '#b8ff4f' }}>
            ₹{formatINR(emi)}
          </p>
        </div>
      </div>

      <div
        className="rounded-xl p-4 mb-4"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[9px] tracking-widest uppercase mb-1" style={{ color: '#8892a4' }}>
              EMI / Income Ratio
            </p>
            <p className="text-lg font-bold" style={{ color: affordabilityColor }}>
              {emiRatio ? `${emiRatio.toFixed(1)}%` : 'Pending'}
            </p>
          </div>
          <p className="text-xs font-semibold text-right" style={{ color: affordabilityColor }}>
            {emiRatio ? affordabilityLabel : 'Waiting for income details'}
          </p>
        </div>

        <div className="mt-3 h-1 rounded-full" style={{ background: '#1a2235' }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${clampPercent(emiRatio)}%`,
              background: affordabilityColor,
            }}
          />
        </div>
      </div>

      {/* Total Interest */}
      <div
        className="pt-4"
        style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}
      >
        <p className="text-[9px] tracking-widest mb-1 uppercase" style={{ color: '#8892a4' }}>
          TOTAL INTEREST PAYABLE
        </p>
        <p className="text-xl font-bold text-white">₹{formatINR(Math.round(totalInterest))}</p>
      </div>

      <button
        type="button"
        onClick={() => setExpanded(prev => !prev)}
        className="mt-4 text-left text-xs transition-colors"
        style={{ color: '#8892a4' }}
      >
        10.5% p.a. — why this rate? {expanded ? '▴' : '▾'}
      </button>

      {expanded && (
        <p className="mt-2 text-xs leading-relaxed" style={{ color: '#8892a4' }}>
          {rateReason}
        </p>
      )}
    </div>
  );
}
