import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  PiggyBank,
  CandlestickChart,
  TrendingUp,
  TrendingDown,
  Minus,
  Pencil,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { TrendChart } from "@/components/TrendChart";
import {
  useHydrated,
  useStore,
  todayKey,
  tradePnl,
  tradeReturn,
  type Trade,
} from "@/lib/store";
import { useUIStore } from "@/lib/ui-store";
import { celebrate } from "@/lib/celebrate";

export const Route = createFileRoute("/finance")({
  head: () => ({
    meta: [
      { title: "Keuangan · Rayhan" },
      {
        name: "description",
        content:
          "Pantau tabungan per tujuan dan catat jurnal trading harian — hasil, setup, dan emosi di balik setiap posisi.",
      },
      { property: "og:title", content: "Keuangan · Rayhan" },
      {
        property: "og:description",
        content: "Tabungan per tujuan dan jurnal trading harian dalam satu tempat yang tenang.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: FinancePage,
});

const rupiah = (n: number) =>
  "Rp " + Math.round(Math.abs(n)).toLocaleString("id-ID") ;

const emotions = ["tenang", "sabar", "serakah", "takut", "balas dendam"] as const;

function FinancePage() {
  const hydrated = useHydrated();
  const [tab, setTab] = useState<"tabungan" | "trading">("tabungan");

  return (
    <AppShell>
      <header className="animate-rise mb-8">
        <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Uang yang terarah
        </p>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">Keuangan</h1>
      </header>

      <div className="animate-rise mb-6 inline-flex gap-1 rounded-full bg-surface p-1 hairline">
        {(["tabungan", "trading"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={[
              "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs uppercase tracking-widest transition",
              tab === t
                ? "bg-gradient-to-br from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] text-white"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {t === "tabungan" ? (
              <PiggyBank className="size-3.5" />
            ) : (
              <CandlestickChart className="size-3.5" />
            )}
            {t === "tabungan" ? "Tabungan" : "Jurnal Trading"}
          </button>
        ))}
      </div>

      {tab === "tabungan" ? <Savings hydrated={hydrated} /> : <Trading hydrated={hydrated} />}
    </AppShell>
  );
}

/* ---------------------------------- Tabungan --------------------------------- */

function Savings({ hydrated }: { hydrated: boolean }) {
  const pots = useStore((s) => s.pots);
  const txs = useStore((s) => s.savingTx);
  const monthly = useStore((s) => s.monthlySavings);
  const addPot = useStore((s) => s.addPot);
  const updatePot = useStore((s) => s.updatePot);
  const removePot = useStore((s) => s.removePot);
  const addTx = useStore((s) => s.addSavingTx);
  const setDialogOpen = useUIStore((s) => s.setDialogOpen);

  const [open, setOpen] = useState(false);
  const [editingPot, setEditingPot] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", target: "", note: "" });
  const [moveFor, setMoveFor] = useState<string | null>(null);
  const [move, setMove] = useState({ amount: "", note: "", dir: "in" as "in" | "out" });

  useEffect(() => {
    setDialogOpen(open || moveFor !== null);
    return () => setDialogOpen(false);
  }, [open, moveFor, setDialogOpen]);

  const saldoPer = useMemo(() => {
    const m: Record<string, number> = {};
    for (const t of txs) m[t.potId] = (m[t.potId] || 0) + t.amount;
    return m;
  }, [txs]);

  // Angka utama mengikuti setoran akhir bulan terakhir yang kamu catat; kalau
  // belum ada satu pun, jatuh ke penjumlahan saldo kantong.
  const latestMonthly = useMemo(
    () =>
      hydrated
        ? [...monthly].sort((a, b) => a.month.localeCompare(b.month)).pop()
        : undefined,
    [monthly, hydrated],
  );
  const potTotal = hydrated ? Object.values(saldoPer).reduce((a, b) => a + b, 0) : 0;
  const total = latestMonthly ? latestMonthly.amount : potTotal;
  const totalTarget = hydrated ? pots.reduce((a, p) => a + (p.target || 0), 0) : 0;
  const pct = totalTarget ? Math.min(100, Math.round((total / totalTarget) * 100)) : 0;

  const recent = useMemo(
    () => [...txs].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8),
    [txs],
  );

  return (
    <>
      <section className="animate-rise card-cinema mb-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              Total tersimpan
            </p>
            <p className="mt-1 font-serif text-4xl">{hydrated ? rupiah(total) : "Rp —"}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {latestMonthly ? `per ${monthLabel(latestMonthly.month)} · ` : ""}
              dari target {hydrated ? rupiah(totalTarget) : "—"}
            </p>
          </div>
          <span className="grid size-11 place-items-center rounded-2xl bg-white/[0.06] hairline">
            <Wallet className="size-5 text-gold" strokeWidth={1.75} />
          </span>
        </div>
        <div className="mt-5 h-2 overflow-hidden rounded-full bg-white/[0.08]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{pct}% dari semua tujuan</p>
      </section>

      <div className="animate-rise mb-4 flex items-center justify-between">
        <h2 className="font-serif text-2xl">Kantong tabungan</h2>
        <button
          onClick={() => {
            setEditingPot(null);
            setForm({ name: "", target: "", note: "" });
            setOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_20px_-6px_oklch(0.62_0.11_195/0.5)] active:scale-95"
        >
          <Plus className="size-4" strokeWidth={2.5} /> Kantong Baru
        </button>
      </div>

      {hydrated && pots.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Belum ada kantong tabungan"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {pots.map((p) => {
            const saldo = hydrated ? saldoPer[p.id] || 0 : 0;
            const pp = p.target ? Math.min(100, Math.round((saldo / p.target) * 100)) : 0;
            return (
              <div key={p.id} className="card-cinema group p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{p.name}</p>
                    {p.note && (
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{p.note}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => {
                        setEditingPot(p.id);
                        setForm({
                          name: p.name,
                          target: String(p.target ?? ""),
                          note: p.note ?? "",
                        });
                        setOpen(true);
                      }}
                      className="text-muted-foreground transition hover:text-foreground"
                      aria-label={`Ubah ${p.name}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => removePot(p.id)}
                      className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                      aria-label={`Hapus ${p.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                <p className="mt-4 font-serif text-2xl">{hydrated ? rupiah(saldo) : "Rp —"}</p>
                <p className="text-[11px] text-muted-foreground">
                  target {rupiah(p.target)} · {pp}%
                </p>

                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] transition-all duration-700"
                    style={{ width: `${pp}%` }}
                  />
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => {
                      setMove({ amount: "", note: "", dir: "in" });
                      setMoveFor(p.id);
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-white/[0.06] px-3 py-2 text-xs hairline hover:bg-white/[0.1]"
                  >
                    <ArrowUpRight className="size-3.5" /> Setor
                  </button>
                  <button
                    onClick={() => {
                      setMove({ amount: "", note: "", dir: "out" });
                      setMoveFor(p.id);
                    }}
                    className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-white/[0.06] px-3 py-2 text-xs hairline hover:bg-white/[0.1]"
                  >
                    <ArrowDownRight className="size-3.5" /> Tarik
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <MonthlyLog hydrated={hydrated} />

      {hydrated && recent.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 font-serif text-2xl">Riwayat terakhir</h2>
          <ul className="card-cinema divide-y divide-white/[0.06] p-2">
            {recent.map((t) => {
              const pot = pots.find((p) => p.id === t.potId);
              return (
                <li key={t.id} className="flex items-center justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{t.note || (t.amount >= 0 ? "Setoran" : "Penarikan")}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {pot?.name ?? "Kantong terhapus"} · {t.date}
                    </p>
                  </div>
                  <span
                    className={[
                      "shrink-0 text-sm tabular-nums",
                      t.amount >= 0 ? "text-gold" : "text-red-400",
                    ].join(" ")}
                  >
                    {t.amount >= 0 ? "+" : "−"}
                    {rupiah(t.amount)}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Dialog kantong — dipakai untuk membuat maupun mengubah */}
      {open && (
        <Dialog title={editingPot ? "Ubah kantong" : "Kantong baru"} onClose={() => setOpen(false)}>
          <Field label="Nama kantong">
            <input
              className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Dana darurat"
            />
          </Field>
          <Field label="Target (Rp)">
            <input
              className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
              inputMode="numeric"
              value={form.target}
              onChange={(e) => setForm({ ...form, target: e.target.value.replace(/\D/g, "") })}
              placeholder="30000000"
            />
          </Field>
          <Field label="Catatan (opsional)">
            <input
              className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="6 bulan biaya hidup"
            />
          </Field>
          <DialogActions
            onCancel={() => setOpen(false)}
            onSubmit={() => {
              if (!form.name.trim()) return;
              const payload = {
                name: form.name.trim(),
                target: Number(form.target || 0),
                note: form.note.trim() || undefined,
              };
              if (editingPot) updatePot(editingPot, payload);
              else addPot(payload);
              setForm({ name: "", target: "", note: "" });
              setEditingPot(null);
              setOpen(false);
            }}
            submitLabel={editingPot ? "Simpan perubahan" : "Simpan kantong"}
          />
        </Dialog>
      )}

      {/* Dialog setor/tarik */}
      {moveFor && (
        <Dialog
          title={move.dir === "in" ? "Setor ke kantong" : "Tarik dari kantong"}
          onClose={() => setMoveFor(null)}
        >
          <Field label="Jumlah (Rp)">
            <input
              className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
              inputMode="numeric"
              autoFocus
              value={move.amount}
              onChange={(e) => setMove({ ...move, amount: e.target.value.replace(/\D/g, "") })}
              placeholder="500000"
            />
          </Field>
          <Field label="Catatan (opsional)">
            <input
              className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
              value={move.note}
              onChange={(e) => setMove({ ...move, note: e.target.value })}
              placeholder="Nabung bulanan"
            />
          </Field>
          <DialogActions
            onCancel={() => setMoveFor(null)}
            onSubmit={() => {
              const n = Number(move.amount || 0);
              if (!n) return;
              addTx({
                potId: moveFor,
                amount: move.dir === "in" ? n : -n,
                note: move.note.trim() || undefined,
                date: todayKey(),
              });
              if (move.dir === "in") celebrate();
              setMoveFor(null);
            }}
            submitLabel={move.dir === "in" ? "Setor" : "Tarik"}
          />
        </Dialog>
      )}
    </>
  );
}

/* ----------------------------- Tabungan bulanan ----------------------------- */

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

const monthKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const monthLabel = (m: string) => {
  const [y, mm] = m.split("-");
  return `${MONTH_NAMES[Number(mm) - 1] ?? mm} ${y?.slice(2) ?? ""}`;
};

/** Catatan total tabungan di akhir tiap bulan, plus grafik pertumbuhannya. */
function MonthlyLog({ hydrated }: { hydrated: boolean }) {
  const rows = useStore((s) => s.monthlySavings);
  const upsert = useStore((s) => s.upsertMonthlySaving);
  const remove = useStore((s) => s.removeMonthlySaving);
  const setDialogOpen = useUIStore((s) => s.setDialogOpen);

  const [open, setOpen] = useState(false);
  /** Bulan asal saat mengedit — dipakai untuk membuang baris lama kalau bulannya diganti. */
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [form, setForm] = useState({ month: monthKey(), amount: "", note: "" });

  useEffect(() => {
    setDialogOpen(open);
    return () => setDialogOpen(false);
  }, [open, setDialogOpen]);

  const sorted = useMemo(
    () => (hydrated ? [...rows].sort((a, b) => a.month.localeCompare(b.month)) : []),
    [rows, hydrated],
  );
  const points = sorted.map((r) => ({ label: monthLabel(r.month), value: r.amount }));
  const latest = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const growth = latest && prev ? latest.amount - prev.amount : null;

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="font-serif text-2xl">Setoran akhir bulan</h2>
        <button
          onClick={() => {
            const current = monthKey();
            const existing = rows.find((r) => r.month === current);
            setEditingMonth(existing ? current : null);
            setForm({
              month: current,
              amount: existing ? String(existing.amount) : "",
              note: existing?.note ?? "",
            });
            setOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_20px_-6px_oklch(0.62_0.11_195/0.5)] active:scale-95"
        >
          <Plus className="size-4" strokeWidth={2.5} /> Catat bulan ini
        </button>
      </div>

      {sorted.length === 0 ? (
        <EmptyState icon={Wallet} title="Belum ada setoran akhir bulan" />
      ) : (
        <>
          {points.length >= 2 && (
            <div className="card-cinema animate-rise mb-4 p-5">
              <TrendChart points={points} format={rupiah} />
            </div>
          )}

          {latest && (
            <div className="card-cinema animate-rise mb-4 p-5">
              <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                {monthLabel(latest.month)}
              </p>
              <p className="mt-1 font-serif text-3xl">{rupiah(latest.amount)}</p>
              {growth !== null && (
                <p
                  className={[
                    "mt-1 text-xs tabular-nums",
                    growth < 0 ? "text-red-400" : "text-gold",
                  ].join(" ")}
                >
                  {growth < 0 ? "−" : "+"}
                  {rupiah(Math.abs(growth))} dari {monthLabel(prev!.month)}
                </p>
              )}
            </div>
          )}

          <ul className="card-cinema divide-y divide-white/[0.06] p-2">
            {[...sorted].reverse().map((r, i, arr) => {
              const before = arr[i + 1];
              const delta = before ? r.amount - before.amount : null;
              return (
                <li key={r.id} className="group flex items-center justify-between gap-3 px-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm">{monthLabel(r.month)}</p>
                    {r.note && (
                      <p className="truncate text-[11px] text-muted-foreground">{r.note}</p>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm tabular-nums">{rupiah(r.amount)}</p>
                      {delta !== null && (
                        <p
                          className={[
                            "text-[11px] tabular-nums",
                            delta < 0 ? "text-red-400" : "text-muted-foreground",
                          ].join(" ")}
                        >
                          {delta < 0 ? "−" : "+"}
                          {rupiah(Math.abs(delta))}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setEditingMonth(r.month);
                        setForm({
                          month: r.month,
                          amount: String(r.amount),
                          note: r.note ?? "",
                        });
                        setOpen(true);
                      }}
                      className="text-muted-foreground transition hover:text-foreground"
                      aria-label={`Ubah setoran ${monthLabel(r.month)}`}
                    >
                      <Pencil className="size-4" />
                    </button>
                    <button
                      onClick={() => remove(r.id)}
                      className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                      aria-label={`Hapus setoran ${monthLabel(r.month)}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {open && (
        <Dialog
          title={editingMonth ? "Ubah setoran akhir bulan" : "Catat setoran akhir bulan"}
          onClose={() => setOpen(false)}
        >
          <Field label="Bulan">
            <input
              type="month"
              className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline"
              value={form.month}
              onChange={(e) => setForm({ ...form, month: e.target.value })}
            />
          </Field>

          <Field label="Total tabungan (Rp)">
            <input
              className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
              inputMode="numeric"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, "") })}
              placeholder="12500000"
            />
          </Field>

          <Field label="Catatan">
            <input
              className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Opsional"
            />
          </Field>

          <DialogActions
            onCancel={() => setOpen(false)}
            onSubmit={() => {
              const amount = Number(form.amount || 0);
              if (!form.month || !amount) return;
              // Bulan diganti saat mengedit — buang baris lamanya dulu.
              if (editingMonth && editingMonth !== form.month) {
                const old = rows.find((r) => r.month === editingMonth);
                if (old) remove(old.id);
              }
              upsert(form.month, amount, form.note.trim() || undefined);
              setOpen(false);
            }}
            submitLabel="Simpan"
          />
        </Dialog>
      )}
    </section>
  );
}

/* ------------------------------- Jurnal trading ------------------------------ */

const emptyTrade = {
  date: todayKey(),
  ticker: "",
  style: "swing" as "scalping" | "swing",
  amount: "",
  buy: "",
  sell: "",
  reason: "",
  emotion: "tenang" as (typeof emotions)[number],
  status: "sold" as "hold" | "sold",
  notes: "",
};

function Trading({ hydrated }: { hydrated: boolean }) {
  const trades = useStore((s) => s.trades);
  const addTrade = useStore((s) => s.addTrade);
  const updateTrade = useStore((s) => s.updateTrade);
  const removeTrade = useStore((s) => s.removeTrade);
  const setDialogOpen = useUIStore((s) => s.setDialogOpen);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyTrade });

  useEffect(() => {
    setDialogOpen(open);
    return () => setDialogOpen(false);
  }, [open, setDialogOpen]);

  // Winrate dihitung dari semua posisi yang sudah dijual; nilai rupiah hanya
  // dari posisi yang modalnya ikut dicatat.
  const returns = hydrated ? trades.map(tradeReturn).filter((r): r is number => r !== null) : [];
  const winrate = returns.length
    ? Math.round((returns.filter((r) => r > 0).length / returns.length) * 100)
    : 0;
  const holding = hydrated ? trades.filter((t) => t.status === "hold").length : 0;

  const pnls = hydrated ? trades.map(tradePnl).filter((p): p is number => p !== null) : [];
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);
  const net = pnls.reduce((a, p) => a + p, 0);
  const avgWin = wins.length ? wins.reduce((a, p) => a + p, 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((a, p) => a + p, 0) / losses.length) : 0;

  // Kurva akumulasi cuan, diurutkan dari trade terlama.
  const equity = useMemo(() => {
    const closed = trades
      .filter((t) => tradePnl(t) !== null)
      .sort((a, b) => a.date.localeCompare(b.date));
    let running = 0;
    const series = closed.map((t) => {
      running += tradePnl(t)!;
      return { label: t.date.slice(5), value: running };
    });
    return series.length >= 2 ? [{ label: "mulai", value: 0 }, ...series] : [];
  }, [trades]);

  const sorted = useMemo(
    () => [...trades].sort((a, b) => b.date.localeCompare(a.date)),
    [trades],
  );

  return (
    <>
      <section className="animate-rise mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="P/L bersih"
          value={hydrated ? (net < 0 ? "−" : "+") + rupiah(Math.abs(net)) : "—"}
          tone={net < 0 ? "down" : "up"}
          sub={holding > 0 ? `${holding} masih hold` : undefined}
        />
        <Stat
          label="Winrate"
          value={`${winrate}%`}
          sub={`${returns.filter((r) => r > 0).length}W · ${returns.filter((r) => r < 0).length}L`}
        />
        <Stat label="Rata-rata untung" value={hydrated ? rupiah(avgWin) : "—"} tone="up" />
        <Stat label="Rata-rata rugi" value={hydrated ? rupiah(avgLoss) : "—"} tone="down" />
      </section>

      {hydrated && equity.length >= 2 && (
        <section className="card-cinema animate-rise mb-6 p-5">
          <p className="mb-4 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
            Akumulasi cuan
          </p>
          <TrendChart points={equity} format={(n) => (n < 0 ? "−" : "+") + rupiah(Math.abs(n))} />
        </section>
      )}

      <div className="animate-rise mb-4 flex items-center justify-between">
        <h2 className="font-serif text-2xl">Catatan posisi</h2>
        <button
          onClick={() => {
            setEditingId(null);
            setForm({ ...emptyTrade, date: todayKey() });
            setOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_20px_-6px_oklch(0.62_0.11_195/0.5)] active:scale-95"
        >
          <Plus className="size-4" strokeWidth={2.5} /> Catat Trade
        </button>
      </div>

      {hydrated && sorted.length === 0 ? (
        <EmptyState
          icon={CandlestickChart}
          title="Jurnal trading masih kosong"
        />
      ) : (
        <ul className="space-y-3">
          {sorted.map((t) => (
            <TradeCard
              key={t.id}
              trade={t}
              onRemove={() => removeTrade(t.id)}
              onEdit={() => {
                setEditingId(t.id);
                setForm({
                  date: t.date,
                  ticker: t.ticker,
                  style: t.style,
                  amount: t.amount !== undefined ? String(t.amount) : "",
                  buy: String(t.buy),
                  sell: t.sell !== undefined ? String(t.sell) : "",
                  reason: t.reason ?? "",
                  emotion: t.emotion,
                  status: t.status,
                  notes: t.notes ?? "",
                });
                setOpen(true);
              }}
            />
          ))}
        </ul>
      )}

      {open && (
        <Dialog title={editingId ? "Ubah trade" : "Catat trade"} onClose={() => setOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal">
              <input
                type="date"
                className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <Field label="Saham">
              <input
                className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] uppercase outline-none hairline placeholder:normal-case placeholder:text-muted-foreground"
                value={form.ticker}
                onChange={(e) => setForm({ ...form, ticker: e.target.value })}
                placeholder="BBCA"
              />
            </Field>
          </div>

          <Field label="Gaya">
            <div className="flex gap-2">
              {(["scalping", "swing"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setForm({ ...form, style: s })}
                  className={[
                    "flex-1 rounded-full px-3 py-2 text-xs transition",
                    form.style === s
                      ? "bg-gold text-white"
                      : "bg-white/[0.06] text-muted-foreground hairline",
                  ].join(" ")}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Buy">
              <input
                className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
                inputMode="decimal"
                value={form.buy}
                onChange={(e) => setForm({ ...form, buy: e.target.value })}
                placeholder="4250"
              />
            </Field>
            <Field label={form.status === "hold" ? "Sell (belum ada)" : "Sell"}>
              <input
                className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground disabled:opacity-40"
                inputMode="decimal"
                disabled={form.status === "hold"}
                value={form.status === "hold" ? "" : form.sell}
                onChange={(e) => setForm({ ...form, sell: e.target.value })}
                placeholder="4480"
              />
            </Field>
          </div>

          <Field label="Modal yang dipakai (Rp)">
            <input
              className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
              inputMode="numeric"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/\D/g, "") })}
              placeholder="4250000"
            />
          </Field>

          <Field label="Alasan masuk">
            <input
              className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="Breakout resistance, volume naik"
            />
          </Field>

          <Field label="Emosi saat trading">
            <div className="flex flex-wrap gap-1.5">
              {emotions.map((em) => (
                <button
                  key={em}
                  onClick={() => setForm({ ...form, emotion: em })}
                  className={[
                    "rounded-full px-3 py-1.5 text-xs transition",
                    form.emotion === em
                      ? "bg-gold text-white"
                      : "bg-white/[0.06] text-muted-foreground hairline",
                  ].join(" ")}
                >
                  {em}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Status">
            <div className="flex gap-2">
              {(["sold", "hold"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setForm({ ...form, status: s })}
                  className={[
                    "flex-1 rounded-full px-3 py-2 text-xs transition",
                    form.status === s
                      ? "bg-gold text-white"
                      : "bg-white/[0.06] text-muted-foreground hairline",
                  ].join(" ")}
                >
                  {s === "sold" ? "Sudah jual" : "Masih hold"}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Catatan / pembelajaran">
            <textarea
              className="w-full min-h-20 resize-none rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Apa yang berjalan baik, apa yang mau diperbaiki besok?"
            />
          </Field>

          <DialogActions
            onCancel={() => setOpen(false)}
            onSubmit={() => {
              const ticker = form.ticker.trim().toUpperCase();
              const buy = Number(form.buy || 0);
              if (!ticker || !buy) return;
              const sold = form.status === "sold";
              const sell = sold && form.sell ? Number(form.sell) : undefined;
              const payload = {
                date: form.date,
                ticker,
                style: form.style,
                amount: form.amount ? Number(form.amount) : undefined,
                buy,
                sell,
                reason: form.reason.trim() || undefined,
                emotion: form.emotion,
                status: form.status,
                notes: form.notes.trim() || undefined,
              };
              if (editingId) {
                updateTrade(editingId, payload);
              } else {
                addTrade(payload);
                if (sell !== undefined && sell > buy) celebrate();
              }
              setOpen(false);
            }}
            submitLabel={editingId ? "Simpan perubahan" : "Simpan trade"}
          />
        </Dialog>
      )}
    </>
  );
}

function TradeCard({
  trade,
  onRemove,
  onEdit,
}: {
  trade: Trade;
  onRemove: () => void;
  onEdit: () => void;
}) {
  const ret = tradeReturn(trade);
  const pnl = tradePnl(trade);
  const win = ret !== null && ret > 0;
  const flat = ret === null || ret === 0;
  return (
    <li className="card-cinema group p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={[
              "grid size-10 place-items-center rounded-2xl hairline",
              win ? "bg-[oklch(0.62_0.11_195/0.12)]" : flat ? "bg-white/[0.06]" : "bg-red-500/10",
            ].join(" ")}
          >
            {flat ? (
              <Minus className="size-4 text-muted-foreground" strokeWidth={1.75} />
            ) : win ? (
              <TrendingUp className="size-4 text-gold" strokeWidth={1.75} />
            ) : (
              <TrendingDown className="size-4 text-red-400" strokeWidth={1.75} />
            )}
          </span>
          <div>
            <p className="font-medium">
              {trade.ticker}{" "}
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {trade.style}
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {trade.date}
              {trade.reason ? ` · ${trade.reason}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {trade.status === "hold" ? (
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-muted-foreground hairline">
              masih hold
            </span>
          ) : (
            <span
              className={[
                "text-right text-sm tabular-nums",
                win ? "text-gold" : flat ? "text-muted-foreground" : "text-red-400",
              ].join(" ")}
            >
              {ret === null
                ? "—"
                : `${ret > 0 ? "+" : ret < 0 ? "−" : ""}${Math.abs(ret).toFixed(1)}%`}
              {pnl !== null && (
                <span className="block text-[11px] opacity-80">
                  {pnl < 0 ? "−" : "+"}
                  {rupiah(Math.abs(pnl))}
                </span>
              )}
            </span>
          )}
          <button
            onClick={onEdit}
            className="text-muted-foreground transition hover:text-foreground"
            aria-label={`Ubah trade ${trade.ticker}`}
          >
            <Pencil className="size-4" />
          </button>
          <button
            onClick={onRemove}
            className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-red-400"
            aria-label="Hapus trade"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] text-muted-foreground">
        <Chip>buy {trade.buy}</Chip>
        {trade.sell !== undefined && <Chip>sell {trade.sell}</Chip>}
        {trade.amount !== undefined && <Chip>modal {rupiah(trade.amount)}</Chip>}
        <Chip>emosi · {trade.emotion}</Chip>
      </div>

      {trade.notes && (
        <p className="mt-3 border-l-2 border-white/10 pl-3 text-sm leading-relaxed text-muted-foreground">
          {trade.notes}
        </p>
      )}
    </li>
  );
}

/* --------------------------------- Potongan UI -------------------------------- */

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-white/[0.05] px-2.5 py-1 hairline">{children}</span>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down";
}) {
  return (
    <div className="card-cinema p-4">
      <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{label}</p>
      <p
        className={[
          "mt-1.5 font-serif text-xl",
          tone === "up" ? "text-gold" : tone === "down" ? "text-red-400" : "",
        ].join(" ")}
      >
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted-foreground">{sub}</p>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1.5 block text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-md md:items-center md:p-6"
      onClick={onClose}
    >
      <div
        className="animate-rise max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] card-cinema p-6 md:rounded-[28px]"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 font-serif text-2xl">{title}</h3>
        {children}
      </div>
    </div>
  );
}

function DialogActions({
  onCancel,
  onSubmit,
  submitLabel,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  return (
    <div className="mt-5 flex gap-2">
      <button
        onClick={onCancel}
        className="flex-1 rounded-full bg-white/[0.06] px-4 py-2.5 text-sm hairline hover:bg-white/[0.1]"
      >
        Batal
      </button>
      <button
        onClick={onSubmit}
        className="flex-1 rounded-full bg-gradient-to-br from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] px-4 py-2.5 text-sm font-medium text-white active:scale-95"
      >
        {submitLabel}
      </button>
    </div>
  );
}