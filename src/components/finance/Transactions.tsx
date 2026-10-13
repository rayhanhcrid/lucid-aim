import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, ReceiptText, Search, Tags, X } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { useStore, useToday, type FinTransaction, type FinTxType } from "@/lib/store";
import {
  byNewest,
  dayLabel,
  inMonth,
  monthLongLabel,
  monthSummary,
  rupiah,
  shiftMonth,
} from "@/lib/finance";
import { useFinanceActions } from "./context";
import { TransactionRow } from "./TransactionRow";
import { Eyebrow, Segmented, btnGhost, btnPrimary, inputClass } from "./ui";

type TypeFilter = "all" | FinTxType;

/** Tab Transaksi: riwayat per bulan dengan saringan jenis, akun, dan kata kunci. */
export function Transactions({
  hydrated,
  accountId,
  onAccountChange,
}: {
  hydrated: boolean;
  /** Saringan akun dari URL (`?akun=`), supaya bisa dibuka langsung dari tab Akun. */
  accountId?: string;
  onAccountChange: (id: string | undefined) => void;
}) {
  const accounts = useStore((s) => s.finAccounts);
  const categories = useStore((s) => s.finCategories);
  const txs = useStore((s) => s.finTransactions);
  const actions = useFinanceActions();

  const current = useToday().slice(0, 7);
  const [month, setMonth] = useState(current);
  // Boleh maju sampai bulan transaksi terakhir, kalau ada yang dicatat di depan.
  const lastMonth = useMemo(
    () => txs.reduce((m, t) => (t.date.slice(0, 7) > m ? t.date.slice(0, 7) : m), current),
    [txs, current],
  );
  const [type, setType] = useState<TypeFilter>("all");
  const [query, setQuery] = useState("");

  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  // Saringan akun yang akunnya sudah dihapus diabaikan saja.
  const account = accountId ? accountMap.get(accountId) : undefined;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return txs
      .filter((t) => {
        if (!inMonth(t, month)) return false;
        if (type !== "all" && t.type !== type) return false;
        if (account && t.accountId !== account.id && t.toAccountId !== account.id) return false;
        if (!q) return true;
        const haystack = [
          t.description,
          t.categoryId && categoryMap.get(t.categoryId)?.name,
          accountMap.get(t.accountId)?.name,
          t.toAccountId && accountMap.get(t.toAccountId)?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort(byNewest);
  }, [txs, month, type, account, query, accountMap, categoryMap]);

  const groups = useMemo(() => {
    const out: { date: string; items: FinTransaction[]; net: number }[] = [];
    for (const t of filtered) {
      let g = out[out.length - 1];
      if (!g || g.date !== t.date) {
        g = { date: t.date, items: [], net: 0 };
        out.push(g);
      }
      g.items.push(t);
      if (t.type === "income") g.net += t.amount;
      else if (t.type === "expense") g.net -= t.amount;
    }
    return out;
  }, [filtered]);

  const summary = useMemo(() => monthSummary(filtered, month), [filtered, month]);
  const filtering = type !== "all" || !!account || !!query.trim();

  if (!hydrated) return <CardSkeleton rows={4} />;

  return (
    <div>
      <div className="animate-rise mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth((m) => shiftMonth(m, -1))}
            className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground"
            aria-label="Bulan sebelumnya"
          >
            <ChevronLeft className="size-4" />
          </button>
          <h2 className="min-w-[9.5rem] text-center font-serif text-xl" aria-live="polite">
            {monthLongLabel(month)}
          </h2>
          <button
            onClick={() => setMonth((m) => shiftMonth(m, 1))}
            disabled={month >= lastMonth}
            className="grid size-9 place-items-center rounded-full text-muted-foreground transition hover:bg-white/[0.06] hover:text-foreground disabled:pointer-events-none disabled:opacity-30"
            aria-label="Bulan berikutnya"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <button onClick={actions.manageCategories} className={`${btnGhost} text-xs`}>
          <Tags className="size-3.5" /> Kategori
        </button>
      </div>

      {/* Saringan — satu baris di atas semua yang dipengaruhinya. */}
      <div className="animate-rise mb-4 space-y-2">
        <div className="-mx-1 overflow-x-auto px-1 pb-1">
          <Segmented
            label="Saring jenis transaksi"
            value={type}
            onChange={setType}
            options={[
              { id: "all", label: "Semua" },
              { id: "expense", label: "Keluar" },
              { id: "income", label: "Masuk" },
              { id: "transfer", label: "Transfer" },
            ]}
          />
        </div>
        <div className="flex gap-2">
          <select
            className={`${inputClass} w-auto max-w-[45%] appearance-none bg-[var(--surface)] py-2.5 text-sm`}
            value={account?.id ?? ""}
            onChange={(e) => onAccountChange(e.target.value || undefined)}
            aria-label="Saring akun"
          >
            <option value="">Semua akun</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <label className="relative flex-1">
            <span className="sr-only">Cari transaksi</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              className={`${inputClass} py-2.5 pl-10 pr-9 text-sm`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari catatan, kategori…"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground hover:text-foreground"
                aria-label="Hapus pencarian"
              >
                <X className="size-3.5" />
              </button>
            )}
          </label>
        </div>
      </div>

      <section className="animate-rise card-cinema mb-6 grid grid-cols-3 gap-3 p-4">
        <div>
          <Eyebrow>Masuk</Eyebrow>
          <p className="mt-1 truncate text-sm tabular-nums text-gold">{rupiah(summary.income)}</p>
        </div>
        <div>
          <Eyebrow>Keluar</Eyebrow>
          <p className="mt-1 truncate text-sm tabular-nums">{rupiah(summary.expense)}</p>
        </div>
        <div>
          <Eyebrow>Selisih</Eyebrow>
          <p
            className={[
              "mt-1 truncate text-sm tabular-nums",
              summary.net < 0 ? "text-red-300" : "",
            ].join(" ")}
          >
            {summary.net < 0 ? "−" : "+"}
            {rupiah(summary.net)}
          </p>
        </div>
      </section>

      {groups.length === 0 ? (
        <EmptyState
          icon={ReceiptText}
          title={filtering ? "Tidak ada yang cocok" : "Belum ada transaksi"}
          description={
            filtering
              ? "Coba longgarkan saringannya atau ganti bulan."
              : `Belum ada catatan di ${monthLongLabel(month)}.`
          }
          action={
            filtering ? (
              <button
                onClick={() => {
                  setType("all");
                  setQuery("");
                  onAccountChange(undefined);
                }}
                className={btnGhost}
              >
                Hapus saringan
              </button>
            ) : (
              <button onClick={() => actions.addTx()} className={btnPrimary}>
                <Plus className="size-4" strokeWidth={2.5} /> Catat transaksi
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.date} className="animate-rise">
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h3 className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                  {dayLabel(g.date)}
                </h3>
                {g.net !== 0 && (
                  <span className="text-[11px] tabular-nums text-muted-foreground">
                    {g.net < 0 ? "−" : "+"}
                    {rupiah(g.net)}
                  </span>
                )}
              </div>
              <ul className="card-cinema p-2">
                {g.items.map((t) => (
                  <TransactionRow
                    key={t.id}
                    tx={t}
                    accounts={accountMap}
                    categories={categoryMap}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
