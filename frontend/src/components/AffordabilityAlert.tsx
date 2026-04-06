interface Props {
  content: string;
  onChoice: (text: string) => void;
}

const OPTIONS = [
  '📉 Reduce loan amount',
  '📅 Extend to 36 months',
  '➡ Proceed with evaluation',
] as const;

const PAYLOADS: Record<(typeof OPTIONS)[number], string> = {
  '📉 Reduce loan amount': 'I want to reduce the loan amount',
  '📅 Extend to 36 months': 'Extend tenure to 36 months',
  '➡ Proceed with evaluation': 'Proceed with my application',
};

export default function AffordabilityAlert({ content, onChoice }: Props) {
  return (
    <div
      className="mt-3 animate-slide-up"
      style={{
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.4)',
        borderRadius: '16px',
        padding: '20px',
        maxWidth: '400px',
      }}
    >
      <p className="text-sm font-bold" style={{ color: '#f59e0b' }}>
        ⚠ Affordability Check
      </p>
      <div className="mt-3" style={{ borderTop: '1px solid rgba(245,158,11,0.2)' }} />
      <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed" style={{ color: '#f7dcc0' }}>
        {content}
      </p>

      <div className="mt-4 space-y-3">
        {OPTIONS.map(option => (
          <button
            key={option}
            type="button"
            onClick={() => onChoice(PAYLOADS[option])}
            className="w-full rounded-[10px] px-4 py-3 text-left text-[13px] transition-colors"
            style={{
              background: 'rgba(245,158,11,0.1)',
              border: '1px solid rgba(245,158,11,0.2)',
              color: '#f59e0b',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(245,158,11,0.2)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(245,158,11,0.1)';
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
