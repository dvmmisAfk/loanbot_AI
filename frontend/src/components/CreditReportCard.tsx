import { ShieldCheck } from 'lucide-react';
import type { LoanData } from '../types';
import { formatINR } from '../types';
import {
  clampPercent,
  getDecisionState,
  getEmiRatioColor,
  getNpaRiskColor,
  getScoreColor,
  getScorePillLabel,
} from '../lib/loanMetrics';

interface Props {
  content: string;
  loanData: LoanData;
}

const SCORE_REFERENCE = [
  { label: '< 550 Very Poor', color: '#ef4444' },
  { label: '550-649 Poor', color: '#f59e0b' },
  { label: '650-749 Fair', color: '#facc15' },
  { label: '750+ Excellent', color: '#22c55e' },
];

const TICKS = [300, 550, 650, 750, 900];

export default function CreditReportCard({ content, loanData }: Props) {
  const score = loanData.cibil_score ?? 0;
  const emiRatio = loanData.emi_ratio ?? 0;
  const loanToIncome = loanData.loan_to_income ?? 0;
  const remainingIncome = (loanData.income ?? 0) - (loanData.emi ?? 0);
  const riskFactors = loanData.risk_factors ?? [];
  const npaRisk = loanData.npa_risk ?? 'MEDIUM';
  const scoreColor = getScoreColor(score);
  const decision = getDecisionState(score);
  const scoreProgress = clampPercent((score / 900) * 100);
  const markerPosition = clampPercent((score / 900) * 100);
  const pillLabel = getScorePillLabel(score);
  const highlightedBandIndex = score >= 750 ? 3 : score >= 650 ? 2 : score >= 550 ? 1 : 0;

  return (
    <div
      className="mt-3 animate-slide-up overflow-hidden"
      style={{
        background: '#141B2D',
        border: '1px solid rgba(109,92,231,0.4)',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '480px',
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-full"
            style={{ background: 'rgba(109,92,231,0.22)' }}
          >
            <ShieldCheck className="h-5 w-5" style={{ color: '#6d5ce7' }} />
          </div>
          <div>
            <p className="text-base font-bold text-white">AI Credit Analysis Report</p>
            <p className="text-[11px]" style={{ color: '#8892a4' }}>
              Transparent lending decision summary
            </p>
          </div>
        </div>

        <div
          className="rounded-2xl px-4 py-2 text-right"
          style={{ background: scoreColor, minWidth: '92px' }}
        >
          <div className="text-2xl font-black leading-none text-white">
            {score}
            <span className="ml-1 text-xs font-semibold text-white/80">/900</span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <span
          className="inline-flex rounded-full px-3 py-1 text-[13px] font-semibold tracking-[0.1em]"
          style={{
            background: `${scoreColor}22`,
            border: `1px solid ${scoreColor}55`,
            color: scoreColor,
          }}
        >
          {pillLabel}
        </span>
      </div>

      <div className="mt-5">
        <div
          className="relative overflow-hidden rounded-full"
          style={{ height: '8px', background: '#1a2235' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              width: `${scoreProgress}%`,
              background: `linear-gradient(90deg, ${scoreColor} 0%, #b8ff4f 100%)`,
            }}
          />
          {TICKS.map(tick => (
            <span
              key={tick}
              className="absolute top-0 h-full"
              style={{
                left: `${clampPercent((tick / 900) * 100)}%`,
                width: '1px',
                background: 'rgba(255,255,255,0.28)',
              }}
            />
          ))}
        </div>
        <div className="relative mt-2 h-4">
          <span
            className="absolute text-white"
            style={{
              left: `${markerPosition}%`,
              transform: 'translateX(-50%)',
              fontSize: '14px',
              lineHeight: 1,
            }}
          >
            ▼
          </span>
        </div>
        <div className="mt-1 flex justify-between text-[10px]" style={{ color: '#4a5568' }}>
          {TICKS.map(tick => (
            <span key={tick}>{tick}</span>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <MetricCell
          label="EMI / INCOME RATIO"
          value={`${emiRatio.toFixed(1)}%`}
          valueColor={getEmiRatioColor(emiRatio)}
          sub="Safe limit: 50% (RBI)"
        />
        <MetricCell
          label="LOAN-TO-INCOME"
          value={`${loanToIncome.toFixed(1)}x`}
          valueColor="#ffffff"
          sub="Recommended: < 4x"
        />
        <MetricCell
          label="REMAINING INCOME"
          value={`₹${formatINR(Math.round(remainingIncome))}`}
          valueColor={remainingIncome >= 0 ? '#b8ff4f' : '#ef4444'}
          sub="After EMI deduction"
        />
        <MetricCell
          label="NPA RISK"
          value={npaRisk}
          valueColor={getNpaRiskColor(npaRisk)}
          sub="Default probability"
          compactValue
        />
      </div>

      <div
        className="mt-4 rounded-xl p-3"
        style={{
          background: riskFactors.length ? 'rgba(245,158,11,0.05)' : 'rgba(34,197,94,0.07)',
          border: `1px solid ${riskFactors.length ? 'rgba(245,158,11,0.2)' : 'rgba(34,197,94,0.2)'}`,
        }}
      >
        {riskFactors.length ? (
          <>
            <p className="text-xs font-semibold" style={{ color: '#f59e0b' }}>
              ⚠ Risk Factors
            </p>
            <div className="mt-2 space-y-1">
              {riskFactors.map(factor => (
                <p key={factor} className="text-xs leading-relaxed" style={{ color: '#f59e0b' }}>
                  • {factor}
                </p>
              ))}
            </div>
          </>
        ) : (
          <p className="text-xs font-semibold" style={{ color: '#22c55e' }}>
            ✓ No significant risk factors identified
          </p>
        )}
      </div>

      {loanData.approval_reasoning && (
        <div className="mt-4 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
          <p className="text-[10px] uppercase tracking-[0.12em]" style={{ color: '#8892a4' }}>
            Officer Reasoning
          </p>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: '#d7deea' }}>
            {loanData.approval_reasoning}
          </p>
        </div>
      )}

      <div className="mt-4">
        <div className="grid grid-cols-4 overflow-hidden rounded-md">
          {SCORE_REFERENCE.map((segment, index) => (
            <div
              key={segment.label}
              className="relative h-8 px-2 py-1 text-[9px] font-semibold"
              style={{
                background: segment.color,
                color: index === 2 ? '#0B1120' : '#ffffff',
                opacity: highlightedBandIndex === index ? 1 : 0.45,
              }}
            >
              <span>{segment.label}</span>
              {highlightedBandIndex === index && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs">←</span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div
        className="mt-4 rounded-b-xl px-4 py-3 text-center text-[13px] font-bold"
        style={{
          background: decision.background,
          borderTop: `1px solid ${decision.border}`,
          color: decision.color,
        }}
      >
        {decision.label}
      </div>

      {content && (
        <p className="mt-3 text-[10px] leading-relaxed" style={{ color: '#4a5568' }}>
          Generated from the AI credit report returned by the backend scoring engine.
        </p>
      )}
    </div>
  );
}

function MetricCell({
  label,
  value,
  valueColor,
  sub,
  compactValue = false,
}: {
  label: string;
  value: string;
  valueColor: string;
  sub: string;
  compactValue?: boolean;
}) {
  return (
    <div
      className="rounded-lg p-3"
      style={{
        border: '1px solid rgba(255,255,255,0.08)',
        background: 'rgba(255,255,255,0.02)',
      }}
    >
      <p className="text-[9px] uppercase tracking-[0.14em]" style={{ color: '#8892a4' }}>
        {label}
      </p>
      <p
        className="mt-2 font-black leading-none"
        style={{
          color: valueColor,
          fontSize: compactValue ? '18px' : '22px',
        }}
      >
        {value}
      </p>
      <p className="mt-2 text-[10px]" style={{ color: '#4a5568' }}>
        {sub}
      </p>
    </div>
  );
}
