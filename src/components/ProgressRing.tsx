type Props = {
  value: number; // 0..100
  size?: number;
  stroke?: number;
  label?: string;
  sub?: string;
};

export function ProgressRing({ value, size = 176, stroke = 6, label, sub }: Props) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          className="stroke-white/[0.06]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-foreground transition-[stroke-dashoffset] duration-1000 ease-out"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label && <span className="font-serif text-4xl leading-none tracking-tight">{label}</span>}
        {sub && (
          <span className="mt-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}