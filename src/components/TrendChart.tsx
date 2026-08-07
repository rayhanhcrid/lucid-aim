/**
 * Grafik garis + area sederhana berbasis SVG inline.
 *
 * Dibuat tangan alih-alih memakai Recharts supaya sewarna dengan grafik lain di
 * aplikasi ini (yang juga dirakit sendiri) dan tidak menambah beban bundle.
 */

import { useId } from "react";

export type TrendPoint = { label: string; value: number };

export function TrendChart({
  points,
  format,
  height = 140,
}: {
  points: TrendPoint[];
  format: (n: number) => string;
  height?: number;
}) {
  // Id unik supaya beberapa grafik di satu halaman tidak saling menimpa gradiennya.
  const fillId = useId();
  if (points.length < 2) return null;

  const values = points.map((p) => p.value);
  const rawMax = Math.max(...values, 0);
  const rawMin = Math.min(...values, 0);
  // Beri sedikit ruang atas-bawah supaya garis tidak menempel di tepi.
  const pad = (rawMax - rawMin) * 0.12 || Math.abs(rawMax) * 0.12 || 1;
  const max = rawMax + pad;
  const min = rawMin - pad;
  const span = max - min || 1;

  const x = (i: number) => (i / (points.length - 1)) * 100;
  const y = (v: number) => 100 - ((v - min) / span) * 100;

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i)},${y(p.value)}`).join(" ");
  const area = `${line} L100,${y(min)} L0,${y(min)} Z`;
  const zeroY = y(0);
  const last = points[points.length - 1]!;
  const negative = last.value < 0;

  return (
    <div>
      <div className="relative w-full" style={{ height }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="size-full overflow-visible"
          role="img"
          aria-label={`Grafik tren, nilai terakhir ${format(last.value)}`}
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="oklch(0.62 0.11 195)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="oklch(0.62 0.11 195)" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Garis nol hanya relevan kalau data melewati angka nol. */}
          {rawMin < 0 && (
            <line
              x1="0"
              y1={zeroY}
              x2="100"
              y2={zeroY}
              stroke="currentColor"
              strokeWidth="1"
              strokeDasharray="3 3"
              vectorEffect="non-scaling-stroke"
              className="text-white/20"
            />
          )}

          <path d={area} fill={`url(#${fillId})`} />
          <path
            d={line}
            fill="none"
            stroke={negative ? "oklch(0.65 0.19 25)" : "oklch(0.72 0.13 195)"}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          <circle
            cx={x(points.length - 1)}
            cy={y(last.value)}
            r="3"
            fill={negative ? "oklch(0.65 0.19 25)" : "oklch(0.72 0.13 195)"}
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </div>

      <div className="mt-2 flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        <span>{points[0]!.label}</span>
        <span className="tabular-nums text-foreground">{format(last.value)}</span>
        <span>{last.label}</span>
      </div>
    </div>
  );
}
