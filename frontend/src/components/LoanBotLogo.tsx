interface LoanBotLogoProps {
  className?: string;
  iconSize?: number;
  showWordmark?: boolean;
  wordmarkSize?: number;
  onClick?: () => void;
}

function LoanBotMark({ size }: { size: number }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.22),
        background: '#020202',
        border: '1px solid rgba(45,255,98,0.24)',
        boxShadow: '0 0 22px rgba(45,255,98,0.18), inset 0 0 18px rgba(45,255,98,0.04)',
      }}
    >
      <svg
        viewBox="0 0 144 144"
        className="absolute inset-[14%] h-[72%] w-[72%]"
        fill="none"
        stroke="#FFFFFF"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{
          filter: 'drop-shadow(0 0 4px rgba(45,255,98,0.98)) drop-shadow(0 0 14px rgba(45,255,98,0.45))',
        }}
      >
        <path d="M22 12V126H96" />
        <path d="M60 12H98C115 12 128 25 128 42C128 59 115 72 98 72H74" />
        <path d="M60 126H100C118 126 132 112 132 94C132 76 118 62 100 62H78L60 82" />
        <path d="M60 12V72" />
      </svg>
    </div>
  );
}

export default function LoanBotLogo({
  className = '',
  iconSize = 40,
  showWordmark = true,
  wordmarkSize,
  onClick,
}: LoanBotLogoProps) {
  const resolvedWordmarkSize = wordmarkSize ?? Math.max(20, Math.round(iconSize * 0.58));

  return (
    <div
      className={`flex items-center gap-3 ${className}`.trim()}
      role="img"
      aria-label="LoanBot AI"
      onClick={onClick}
      style={{
        cursor: onClick ? 'pointer' : 'default',
      }}
    >
      <LoanBotMark size={iconSize} />
      {showWordmark && (
        <span
          className="font-['Poppins'] font-light leading-none text-white whitespace-nowrap"
          style={{
            fontSize: resolvedWordmarkSize,
            letterSpacing: '-0.065em',
            textShadow: '0 0 18px rgba(255,255,255,0.08)',
          }}
        >
          LoanBot AI
        </span>
      )}
    </div>
  );
}
