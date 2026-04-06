export default function CreditLoadingCard() {
  return (
    <div
      className="rounded-2xl p-5 mt-3 flex items-center gap-4 animate-slide-up"
      style={{
        background: '#141B2D',
        border: '1px solid rgba(255,255,255,0.08)',
        maxWidth: '360px',
      }}
    >
      {/* Spinner */}
      <div
        className="w-8 h-8 rounded-full shrink-0 animate-spin-gauge"
        style={{
          border: '2px solid transparent',
          borderTopColor: '#b8ff4f',
          borderRightColor: '#b8ff4f',
        }}
      />
      <div>
        <p className="text-[9px] tracking-widest uppercase mb-0.5" style={{ color: '#8892a4' }}>
          ANALYZING SCORE
        </p>
        <p className="text-sm text-white">Accessing Credit Bureau...</p>
      </div>
    </div>
  );
}
