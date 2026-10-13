/**
 * Grafik arus kas, dirakit tangan (bukan Recharts) seperti TrendChart supaya
 * sewarna dengan grafik lain di aplikasi dan tidak menambah beban bundle.
 */

import { useState } from "react";
import {
  compactRupiah,
  monthLabel,
  monthLongLabel,
  rupiah,
  signedRupiah,
  type CashflowPoint,
  type CategorySlice,
} from "@/lib/finance";
import { CategoryIcon } from "./icons";
import { EXPENSE_COLOR, INCOME_COLOR } from "./ui";

/** Batas atas sumbu yang "bulat": 1 / 2 / 2,5 / 5 × 10ⁿ. */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const mag = 10 ** Math.floor(Math.log10(v));
  const n = v / mag;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10;
  return step * mag;
}

const PLOT_H = 150;

/** Kolom berpasangan pemasukan vs pengeluaran per bulan, satu sumbu rupiah. */
export function CashflowChart({ data, current }: { data: CashflowPoint[]; current: string }) {
  const [active, setActive] = useState<number | null>(null);
  const max = niceMax(Math.max(...data.flatMap((d) => [d.income, d.expense])));
  const ticks = [max, max / 2, 0];
  const empty = data.every((d) => d.income === 0 && d.expense === 0);

  return (
    <div>
      <div className="mb-4 flex items-center gap-4 text-[11px] text-muted-foreground">
        <LegendKey color={INCOME_COLOR} label="Pemasukan" />
        <LegendKey color={EXPENSE_COLOR} label="Pengeluaran" />
      </div>

      <div className="flex gap-2">
        {/* Sumbu Y */}
        <div
          className="relative w-10 shrink-0 text-right text-[10px] tabular-nums text-muted-foreground"
          style={{ height: PLOT_H }}
          aria-hidden="true"
        >
          {ticks.map((t) => (
            <span
              key={t}
              className="absolute right-0 -translate-y-1/2"
              style={{ top: `${(1 - t / max) * 100}%` }}
            >
              {t === 0 ? "0" : compactRupiah(t)}
            </span>
          ))}
        </div>

        <div className="relative min-w-0 flex-1">
          {/* Garis bantu */}
          <div className="pointer-events-none absolute inset-x-0 top-0" style={{ height: PLOT_H }}>
            {ticks.map((t) => (
              <div
                key={t}
                className={[
                  "absolute inset-x-0 h-px",
                  t === 0 ? "bg-white/20" : "bg-white/[0.06]",
                ].join(" ")}
                style={{ top: `${(1 - t / max) * 100}%` }}
              />
            ))}
          </div>

          {/* Hover hanya untuk mouse: di layar sentuh `pointerleave` langsung
              terpicu begitu jari diangkat, jadi tap ditangani lewat fokus. */}
          <div
            className="relative flex"
            onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
          >
            {data.map((d, i) => {
              const isActive = active === i;
              const align = i === 0 ? "left" : i === data.length - 1 ? "right" : "center";
              return (
                <div
                  key={d.month}
                  tabIndex={0}
                  role="img"
                  aria-label={`${monthLongLabel(d.month)}: pemasukan ${rupiah(d.income)}, pengeluaran ${rupiah(d.expense)}`}
                  onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="group relative flex flex-1 cursor-default flex-col items-center outline-none"
                >
                  <div
                    className={[
                      "flex w-full items-end justify-center gap-[2px] rounded-t-lg transition-colors",
                      isActive ? "bg-white/[0.04]" : "",
                      "group-focus-visible:ring-1 group-focus-visible:ring-[var(--gold)]/60",
                    ].join(" ")}
                    style={{ height: PLOT_H }}
                  >
                    <Bar value={d.income} max={max} color={INCOME_COLOR} />
                    <Bar value={d.expense} max={max} color={EXPENSE_COLOR} />
                  </div>
                  <span
                    className={[
                      "mt-2 text-[10px] uppercase tracking-wide",
                      d.month === current ? "text-foreground" : "text-muted-foreground",
                    ].join(" ")}
                  >
                    {monthLabel(d.month).split(" ")[0]}
                  </span>

                  {isActive && <CashflowTooltip point={d} align={align} />}
                </div>
              );
            })}
          </div>

          {empty && (
            <p
              className="pointer-events-none absolute inset-x-0 top-0 grid place-items-center text-xs text-muted-foreground"
              style={{ height: PLOT_H }}
            >
              Belum ada pemasukan atau pengeluaran.
            </p>
          )}
        </div>
      </div>

      {/* Tabel yang sama untuk pembaca layar — tooltip bukan satu-satunya jalan.
          `sr-only` di pembungkus, bukan di <table>: tabel menolak menyusut ke 1px
          dan malah membuat halaman HP bisa digeser ke samping. */}
      <div className="sr-only">
        <table>
          <caption>Pemasukan dan pengeluaran per bulan</caption>
          <thead>
            <tr>
              <th scope="col">Bulan</th>
              <th scope="col">Pemasukan</th>
              <th scope="col">Pengeluaran</th>
              <th scope="col">Selisih</th>
            </tr>
          </thead>
          <tbody>
            {data.map((d) => (
              <tr key={d.month}>
                <th scope="row">{monthLongLabel(d.month)}</th>
                <td>{rupiah(d.income)}</td>
                <td>{rupiah(d.expense)}</td>
                <td>{signedRupiah(d.income - d.expense)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const h = value > 0 ? Math.max(2, (value / max) * PLOT_H) : 0;
  return (
    <div
      className="w-full max-w-[18px] rounded-t-[4px] transition-[height] duration-700 ease-out"
      style={{ height: h, background: color }}
    />
  );
}

function CashflowTooltip({
  point,
  align,
}: {
  point: CashflowPoint;
  align: "left" | "center" | "right";
}) {
  const net = point.income - point.expense;
  return (
    <div
      role="tooltip"
      className={[
        "pointer-events-none absolute bottom-full z-10 mb-2 w-max min-w-40 rounded-2xl bg-[var(--surface-2)] px-3.5 py-3 text-left shadow-[0_16px_40px_-12px_oklch(0_0_0/0.6)] hairline",
        align === "left" ? "left-0" : align === "right" ? "right-0" : "left-1/2 -translate-x-1/2",
      ].join(" ")}
    >
      <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {monthLongLabel(point.month)}
      </p>
      <TooltipRow color={INCOME_COLOR} label="Pemasukan" value={rupiah(point.income)} />
      <TooltipRow color={EXPENSE_COLOR} label="Pengeluaran" value={rupiah(point.expense)} />
      <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-white/[0.08] pt-2">
        <span className="text-[11px] text-muted-foreground">Selisih</span>
        <span className="text-sm font-medium tabular-nums">{signedRupiah(net)}</span>
      </div>
    </div>
  );
}

function TooltipRow({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.5">
      <span className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span className="h-0.5 w-3 rounded-full" style={{ background: color }} />
        {label}
      </span>
      <span className="text-sm font-medium tabular-nums text-foreground">{value}</span>
    </div>
  );
}

function LegendKey({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="size-2.5 rounded-[3px]" style={{ background: color }} />
      {label}
    </span>
  );
}

/**
 * Peringkat kategori: batang horizontal satu warna, panjangnya relatif ke
 * kategori terbesar. Nilai dan persennya ditulis langsung di tiap baris.
 */
export function CategoryBars({
  rows,
  color = EXPENSE_COLOR,
}: {
  rows: CategorySlice[];
  color?: string;
}) {
  const max = Math.max(...rows.map((r) => r.amount), 1);
  return (
    <ul className="space-y-3.5">
      {rows.map((r) => (
        <li key={r.categoryId ?? r.name}>
          <div className="mb-1.5 flex items-center gap-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-muted-foreground">
              <CategoryIcon icon={r.icon} className="size-3.5" />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">{r.name}</span>
            <span className="shrink-0 text-sm tabular-nums">{rupiah(r.amount)}</span>
            <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">
              {Math.round(r.share * 100)}%
            </span>
          </div>
          <div className="ml-[38px] h-2">
            <div
              className="h-full rounded-r-[4px] transition-[width] duration-700 ease-out"
              style={{ width: `${Math.max(1, (r.amount / max) * 100)}%`, background: color }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
