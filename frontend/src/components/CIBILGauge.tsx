interface Props {
  score: number;
  maxScore?: number;
}

export default function CIBILGauge({ score, maxScore = 900 }: Props) {
  const size = 120;
  const sw = 8;
  const r = 46;
  const cx = size / 2;
  const cy = size / 2;
  const circ = 2 * Math.PI * r;       // ≈ 289.03
  const arc = circ * 0.75;             // 270° of track
  const progress = arc * (Math.min(score, maxScore) / maxScore);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Track */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#1a2235"
          strokeWidth={sw}
          strokeDasharray={`${arc} ${circ - arc}`}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
        />
        {/* Progress */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke="#b8ff4f"
          strokeWidth={sw}
          strokeDasharray={`${progress} ${circ - progress}`}
          strokeLinecap="round"
          transform={`rotate(135 ${cx} ${cy})`}
          style={{ transition: 'stroke-dasharray 1.2s ease' }}
        />
      </svg>
      {/* Center labels */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[28px] font-extrabold text-white leading-none">{score}</span>
        <span className="text-[9px] tracking-widest mt-1" style={{ color: '#8892a4' }}>CIBIL SCORE</span>
      </div>
    </div>
  );
}
