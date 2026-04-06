import { formatINR } from '../types';

interface Props {
  loanAmount: number;
  tenure: number;
  emi: number;
}

export default function LoanOfferCard({ loanAmount, tenure, emi }: Props) {
  const totalInterest = Math.max(0, emi * tenure - loanAmount);

  return (
    <div
      className="rounded-2xl p-6 mt-3 animate-slide-up"
      style={{
        background: '#141B2D',
        border: '1px solid rgba(255,255,255,0.1)',
        maxWidth: '320px',
      }}
    >
      <h3 className="text-lg font-bold text-white mb-5">Instant Offer Breakdown</h3>

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
    </div>
  );
}
