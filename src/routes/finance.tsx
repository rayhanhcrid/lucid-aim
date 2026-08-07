import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Trash2,
  PiggyBank,
  CandlestickChart,
  TrendingUp,
  TrendingDown,
  ArrowDownRight,
  ArrowUpRight,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { EmptyState } from "@/components/EmptyState";
import { useHydrated, useStore, todayKey, type Trade } from "@/lib/store";
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
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Simpan pelan-pelan, catat setiap posisi. Dua kebiasaan kecil yang menentukan angka besar
          nanti.
        </p>
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
  const addPot = useStore((s) => s.addPot);
  const removePot = useStore((s) => s.removePot);
  const addTx = useStore((s) => s.addSavingTx);
  const setDialogOpen = useUIStore((s) => s.setDialogOpen);

  const [open, setOpen] = useState(false);
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

  const total = hydrated ? Object.values(saldoPer).reduce((a, b) => a + b, 0) : 0;
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
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_20px_-6px_oklch(0.62_0.11_195/0.5)] active:scale-95"
        >
          <Plus className="size-4" strokeWidth={2.5} /> Kantong Baru
        </button>
      </div>

      {hydrated && pots.length === 0 ? (
        <EmptyState
          icon={PiggyBank}
          title="Belum ada kantong tabungan"
          description="Buat satu kantong dulu — dana darurat, modal trading, atau tabungan liburan."
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
                  <button
                    onClick={() => removePot(p.id)}
                    className="text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                    aria-label={`Hapus ${p.name}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
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

      {/* Dialog kantong baru */}
      {open && (
        <Dialog title="Kantong baru" onClose={() => setOpen(false)}>
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
              addPot({
                name: form.name.trim(),
                target: Number(form.target || 0),
                note: form.note.trim() || undefined,
              });
              setForm({ name: "", target: "", note: "" });
              setOpen(false);
            }}
            submitLabel="Simpan kantong"
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

/* ------------------------------- Jurnal trading ------------------------------ */

const emptyTrade = {
  date: todayKey(),
  pair: "",
  side: "long" as "long" | "short",
  entry: "",
  exit: "",
  size: "",
  pnl: "",
  rr: "",
  setup: "",
  emotion: "tenang" as (typeof emotions)[number],
  notes: "",
  status: "closed" as "open" | "closed",
};

function Trading({ hydrated }: { hydrated: boolean }) {
  const trades = useStore((s) => s.trades);
  const addTrade = useStore((s) => s.addTrade);
  const removeTrade = useStore((s) => s.removeTrade);
  const setDialogOpen = useUIStore((s) => s.setDialogOpen);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyTrade });

  useEffect(() => {
    setDialogOpen(open);
    return () => setDialogOpen(false);
  }, [open, setDialogOpen]);

  const closed = hydrated ? trades.filter((t) => t.status === "closed") : [];
  const wins = closed.filter((t) => t.pnl > 0);
  const losses = closed.filter((t) => t.pnl < 0);
  const net = closed.reduce((a, t) => a + t.pnl, 0);
  const winrate = closed.length ? Math.round((wins.length / closed.length) * 100) : 0;
  const avgWin = wins.length ? wins.reduce((a, t) => a + t.pnl, 0) / wins.length : 0;
  const avgLoss = losses.length
    ? Math.abs(losses.reduce((a, t) => a + t.pnl, 0) / losses.length)
    : 0;

  const sorted = useMemo(
    () => [...trades].sort((a, b) => b.date.localeCompare(a.date)),
    [trades],
  );

  return (
    <>
      <section className="animate-rise mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label="P/L bersih"
          value={hydrated ? (net < 0 ? "−" : "+") + rupiah(net) : "—"}
          tone={net < 0 ? "down" : "up"}
        />
        <Stat label="Winrate" value={`${winrate}%`} sub={`${wins.length}W · ${losses.length}L`} />
        <Stat label="Rata-rata profit" value={hydrated ? rupiah(avgWin) : "—"} tone="up" />
        <Stat label="Rata-rata rugi" value={hydrated ? rupiah(avgLoss) : "—"} tone="down" />
      </section>

      <div className="animate-rise mb-4 flex items-center justify-between">
        <h2 className="font-serif text-2xl">Catatan posisi</h2>
        <button
          onClick={() => {
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
          description="Catat posisi hari ini — pair, arah, hasil, dan yang paling penting: emosi kamu saat masuk."
        />
      ) : (
        <ul className="space-y-3">
          {sorted.map((t) => (
            <TradeCard key={t.id} trade={t} onRemove={() => removeTrade(t.id)} />
          ))}
        </ul>
      )}

      {open && (
        <Dialog title="Catat trade" onClose={() => setOpen(false)}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Tanggal">
              <input
                type="date"
                className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <Field label="Pair / aset">
              <input
                className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
                value={form.pair}
                onChange={(e) => setForm({ ...form, pair: e.target.value })}
                placeholder="BTCUSDT"
              />
            </Field>
          </div>

          <Field label="Arah">
            <div className="flex gap-2">
              {(["long", "short"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setForm({ ...form, side: s })}
                  className={[
                    "flex-1 rounded-full px-3 py-2 text-xs uppercase tracking-widest transition",
                    form.side === s
                      ? "bg-gold text-white"
                      : "bg-white/[0.06] text-muted-foreground hairline",
                  ].join(" ")}
                >
                  {s}
                </button>
              ))}
            </div>
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Entry">
              <input
                className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
                inputMode="decimal"
                value={form.entry}
                onChange={(e) => setForm({ ...form, entry: e.target.value })}
              />
            </Field>
            <Field label="Exit">
              <input
                className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
                inputMode="decimal"
                value={form.exit}
                onChange={(e) => setForm({ ...form, exit: e.target.value })}
              />
            </Field>
            <Field label="Ukuran">
              <input
                className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
                value={form.size}
                onChange={(e) => setForm({ ...form, size: e.target.value })}
                placeholder="0.5 lot"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Hasil (Rp, minus untuk rugi)">
              <input
                className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
                inputMode="text"
                value={form.pnl}
                onChange={(e) => setForm({ ...form, pnl: e.target.value.replace(/[^\d-]/g, "") })}
                placeholder="-250000"
              />
            </Field>
            <Field label="R:R">
              <input
                className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
                inputMode="decimal"
                value={form.rr}
                onChange={(e) => setForm({ ...form, rr: e.target.value })}
                placeholder="2"
              />
            </Field>
          </div>

          <Field label="Setup / alasan masuk">
            <input
              className="w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground"
              value={form.setup}
              onChange={(e) => setForm({ ...form, setup: e.target.value })}
              placeholder="Break & retest H1"
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
              {(["closed", "open"] as const).map((s) => (
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
                  {s === "closed" ? "Sudah ditutup" : "Masih jalan"}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Catatan / pelajaran">
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
              if (!form.pair.trim()) return;
              const pnl = Number(form.pnl || 0);
              addTrade({
                date: form.date,
                pair: form.pair.trim().toUpperCase(),
                side: form.side,
                entry: form.entry ? Number(form.entry) : undefined,
                exit: form.exit ? Number(form.exit) : undefined,
                size: form.size.trim() || undefined,
                pnl: form.status === "open" ? 0 : pnl,
                rr: form.rr ? Number(form.rr) : undefined,
                setup: form.setup.trim() || undefined,
                emotion: form.emotion,
                notes: form.notes.trim() || undefined,
                status: form.status,
              });
              if (form.status === "closed" && pnl > 0) celebrate();
              setOpen(false);
            }}
            submitLabel="Simpan trade"
          />
        </Dialog>
      )}
    </>
  );
}

function TradeCard({ trade, onRemove }: { trade: Trade; onRemove: () => void }) {
  const win = trade.pnl > 0;
  const flat = trade.pnl === 0;
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
            {trade.side === "long" ? (
              <TrendingUp className="size-4 text-gold" strokeWidth={1.75} />
            ) : (
              <TrendingDown className="size-4 text-red-400" strokeWidth={1.75} />
            )}
          </span>
          <div>
            <p className="font-medium">
              {trade.pair}{" "}
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {trade.side}
              </span>
            </p>
            <p className="text-[11px] text-muted-foreground">
              {trade.date}
              {trade.setup ? ` · ${trade.setup}` : ""}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {trade.status === "open" ? (
            <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[11px] text-muted-foreground hairline">
              masih jalan
            </span>
          ) : (
            <span
              className={[
                "text-sm tabular-nums",
                win ? "text-gold" : flat ? "text-muted-foreground" : "text-red-400",
              ].join(" ")}
            >
              {win ? "+" : trade.pnl < 0 ? "−" : ""}
              {rupiah(trade.pnl)}
            </span>
          )}
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
        {trade.entry !== undefined && <Chip>entry {trade.entry}</Chip>}
        {trade.exit !== undefined && <Chip>exit {trade.exit}</Chip>}
        {trade.size && <Chip>{trade.size}</Chip>}
        {trade.rr !== undefined && <Chip>R:R {trade.rr}</Chip>}
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