import { Shield, CheckCircle } from 'lucide-react';

interface Props {
  name: string;
  aadhaar: string;
  pan: string;
}

const rows = [
  { label: 'FULL NAME', key: 'name' },
  { label: 'AADHAAR', key: 'aadhaar' },
  { label: 'PAN CARD', key: 'pan' },
] as const;

export default function KYCCard({ name, aadhaar, pan }: Props) {
  const values: Record<string, string> = { name, aadhaar, pan };

  return (
    <div
      className="rounded-2xl overflow-hidden mt-3 animate-slide-up"
      style={{
        background: '#141B2D',
        border: '1px solid rgba(109,92,231,0.4)',
        maxWidth: '440px',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ background: 'rgba(109,92,231,0.25)' }}
        >
          <Shield className="w-4 h-4" style={{ color: '#6d5ce7' }} />
        </div>
        <span className="text-base font-semibold text-white">Identity Verification</span>
      </div>

      <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />

      {/* Rows */}
      <div className="px-6 py-4 space-y-4">
        {rows.map(({ label, key }) => (
          <div key={key} className="flex items-center justify-between">
            <div>
              <p className="text-[10px] tracking-widest uppercase mb-0.5" style={{ color: '#8892a4' }}>
                {label}
              </p>
              <p className="text-[15px] font-medium text-white">{values[key] || '—'}</p>
            </div>
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: '#22c55e' }}
            >
              <CheckCircle className="w-3 h-3 text-white" strokeWidth={3} />
            </div>
          </div>
        ))}
      </div>

      {/* Success banner */}
      <div
        className="px-6 py-2.5 flex items-center gap-2"
        style={{
          background: 'rgba(34,197,94,0.15)',
          borderTop: '1px solid rgba(34,197,94,0.3)',
        }}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-widest"
          style={{ color: '#22c55e' }}
        >
          KYC VERIFIED SUCCESSFULLY ✓
        </span>
      </div>
    </div>
  );
}
