import { useMemo } from "react";
import { CircleAlert, Plus, Target, Wallet } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Shimmer } from "@/components/Skeleton";
import { useStore, useToday } from "@/lib/store";
import {
  accountBalances,
  budgetSummary,
  byNewest,
  cashflowTrend,
  categoryBreakdown,
  daysLeftInMonth,
  monthLabel,
  monthLongLabel,
  monthSummary,
  netWorth,
  rupiah,
  shiftMonth,
  type BudgetLine,
} from "@/lib/finance";
import { CashflowChart, CategoryBars } from "./charts";
import { useFinanceActions } from "./context";
import { CategoryIcon } from "./icons";
import { TransactionRow } from "./TransactionRow";
import { Eyebrow, btnGhost, btnPrimary } from "./ui";

/** Tab Ringkasan: kekayaan bersih, arus kas bulan ini, anggaran, dan tren. */
export function Overview({ hydrated }: { hydrated: boolean }) {
  const accounts = useStore((s) => s.finAccounts);
  const categories = useStore((s) => s.finCategories);
  const txs = useStore((s) => s.finTransactions);
  const budgets = useStore((s) => s.finBudgets);
  const actions = useFinanceActions();

  const month = useToday().slice(0, 7);
  const prevMonth = shiftMonth(month, -1);

  const balances = useMemo(() => accountBalances(accounts, txs), [accounts, txs]);
  const summary = useMemo(() => monthSummary(txs, month), [txs, month]);
  const prev = useMemo(() => monthSummary(txs, prevMonth), [txs, prevMonth]);
  const trend = useMemo(() => cashflowTrend(txs, month, 6), [txs, month]);
  const slices = useMemo(
    () => categoryBreakdown(txs, categories, month, "expense"),
    [txs, categories, month],
  );
  const budget = useMemo(
    () => budgetSummary(budgets, categories, txs, month),
    [budgets, categories, txs, month],
  );
  const recent = useMemo(() => [...txs].sort(byNewest).slice(0, 5), [txs]);
  const accountMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  if (!hydrated) return <OverviewSkeleton />;

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Mulai dari akun pertamamu"
        description="Catat rekening, e-wallet, dompet, atau investasi beserta saldonya sekarang. Setelah itu tiap transaksi otomatis memperbarui saldo."
        action={
          <button onClick={actions.addAccount} className={btnPrimary}>
            <Plus className="size-4" strokeWidth={2.5} /> Tambah akun
          </button>
        }
      />
    );
  }

  const worth = netWorth(balances);
  const prevLabel = monthLabel(prevMonth).split(" ")[0];

  return (
    <div className="space-y-6">
      {/* Kekayaan bersih + arus kas bulan ini */}
      <section className="animate-rise card-cinema p-6">
        <Eyebrow>Kekayaan bersih</Eyebrow>
        <p
          className={[
            "mt-1 font-serif text-4xl leading-tight md:text-5xl",
            worth < 0 ? "text-red-300" : "",
          ].join(" ")}
        >
          {worth < 0 ? "−" : ""}
          {rupiah(worth)}
        </p>
        <button
          onClick={actions.showAccounts}
          className="mt-1 text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          di {accounts.length} akun · lihat rincian
        </button>

        {/* Di HP selisihnya turun ke baris sendiri supaya nominal panjang tetap muat. */}
        <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-4 border-t border-white/[0.07] pt-4 sm:grid-cols-3">
          <FlowStat
            label="Pemasukan"
            value={rupiah(summary.income)}
            delta={deltaText(summary.income, prev.income, prevLabel)}
            good={summary.income >= prev.income}
          />
          <FlowStat
            label="Pengeluaran"
            value={rupiah(summary.expense)}
            delta={deltaText(summary.expense, prev.expense, prevLabel)}
            good={summary.expense <= prev.expense}
          />
          <FlowStat
            label="Selisih"
            value={(summary.net < 0 ? "−" : "+") + rupiah(summary.net)}
            delta={
              summary.income <= 0
                ? undefined
                : summary.net >= 0
                  ? `${Math.round((summary.net / summary.income) * 100)}% tersisa`
                  : "keluar > masuk"
            }
            className="col-span-2 sm:col-span-1"
            good={summary.net >= 0}
          />
        </div>
      </section>

      <BudgetCard month={month} summary={budget} onEdit={() => actions.editBudget(month)} />

      <section className="animate-rise card-cinema p-5 md:p-6">
        <div className="mb-5 flex items-baseline justify-between gap-3">
          <div>
            <h2 className="font-serif text-xl">Pengeluaran per kategori</h2>
            <p className="text-[11px] text-muted-foreground">
              {monthLongLabel(month)} · total {rupiah(summary.expense)}
            </p>
          </div>
        </div>
        {slices.length > 0 ? (
          <CategoryBars rows={slices} />
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Belum ada pengeluaran bulan ini.
          </p>
        )}
      </section>

      <section className="animate-rise card-cinema p-5 md:p-6">
        <h2 className="font-serif text-xl">Pemasukan vs pengeluaran</h2>
        <p className="mb-5 text-[11px] text-muted-foreground">6 bulan terakhir</p>
        <CashflowChart data={trend} current={month} />
      </section>

      <section className="animate-rise">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="font-serif text-2xl">Transaksi terakhir</h2>
          {recent.length > 0 && (
            <button
              onClick={() => actions.showTransactions()}
              className="text-xs text-muted-foreground transition hover:text-foreground"
            >
              Lihat semua
            </button>
          )}
        </div>
        {recent.length > 0 ? (
          <ul className="card-cinema p-2">
            {recent.map((t) => (
              <TransactionRow
                key={t.id}
                tx={t}
                accounts={accountMap}
                categories={categoryMap}
                showDate
              />
            ))}
          </ul>
        ) : (
          <div className="card-cinema flex flex-col items-center gap-3 px-6 py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Belum ada transaksi. Catat pengeluaran pertamamu hari ini.
            </p>
            <button onClick={() => actions.addTx()} className={btnPrimary}>
              <Plus className="size-4" strokeWidth={2.5} /> Catat transaksi
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

/** "12% dari Sep" — dibandingkan bulan lalu; kosong kalau bulan lalu nol. */
function deltaText(now: number, before: number, prevLabel: string) {
  if (before <= 0) return undefined;
  const pct = Math.round(((now - before) / before) * 100);
  if (pct === 0) return `sama dengan ${prevLabel}`;
  return `${pct > 0 ? "▲" : "▼"} ${Math.abs(pct)}% dari ${prevLabel}`;
}

function FlowStat({
  label,
  value,
  delta,
  good,
  className = "",
}: {
  label: string;
  value: string;
  delta?: string;
  good: boolean;
  className?: string;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <Eyebrow>{label}</Eyebrow>
      <p className="mt-1 truncate font-serif text-lg sm:text-xl">{value}</p>
      {delta && (
        <p
          className={[
            "mt-0.5 truncate text-[11px]",
            good ? "text-muted-foreground" : "text-red-300",
          ].join(" ")}
        >
          {delta}
        </p>
      )}
    </div>
  );
}

function BudgetCard({
  month,
  summary,
  onEdit,
}: {
  month: string;
  summary: ReturnType<typeof budgetSummary>;
  onEdit: () => void;
}) {
  if (summary.lines.length === 0) {
    return (
      <section className="animate-rise card-cinema flex items-center gap-4 p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-gold hairline">
          <Target className="size-5" strokeWidth={1.75} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm">Belum ada anggaran bulanan</p>
          <p className="text-[11px] text-muted-foreground">
            Batasi kategori seperti makan atau belanja, lalu pantau sisanya di sini.
          </p>
        </div>
        <button onClick={onEdit} className={`${btnGhost} shrink-0 text-xs`}>
          Atur
        </button>
      </section>
    );
  }

  const over = summary.remaining < 0;
  const days = daysLeftInMonth();
  const perDay = over ? 0 : summary.remaining / days;
  const pct = Math.min(100, (summary.spent / summary.limit) * 100);

  return (
    <section className="animate-rise card-cinema p-5 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <Eyebrow>Sisa anggaran {monthLongLabel(month)}</Eyebrow>
          <p className={["mt-1 font-serif text-3xl", over ? "text-red-300" : ""].join(" ")}>
            {over ? "−" : ""}
            {rupiah(summary.remaining)}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            terpakai {rupiah(summary.spent)} dari {rupiah(summary.limit)}
          </p>
        </div>
        <button onClick={onEdit} className={`${btnGhost} shrink-0 text-xs`}>
          Atur
        </button>
      </div>

      <Meter ratio={summary.spent / summary.limit} pct={pct} className="mt-4 h-2" />

      <p className="mt-2 text-[11px] text-muted-foreground">
        {over
          ? "Anggaran bulan ini sudah terlewati."
          : `${days} hari lagi · aman ${rupiah(perDay)} per hari`}
      </p>

      <ul className="mt-5 space-y-3.5 border-t border-white/[0.07] pt-4">
        {summary.lines.slice(0, 5).map((l) => (
          <BudgetRow key={l.category.id} line={l} />
        ))}
      </ul>
      {summary.lines.length > 5 && (
        <button
          onClick={onEdit}
          className="mt-3 text-[11px] text-muted-foreground transition hover:text-foreground"
        >
          +{summary.lines.length - 5} kategori lainnya
        </button>
      )}
    </section>
  );
}

function BudgetRow({ line }: { line: BudgetLine }) {
  const over = line.remaining < 0;
  return (
    <li>
      <div className="mb-1.5 flex items-center gap-2.5">
        <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-muted-foreground">
          <CategoryIcon icon={line.category.icon} className="size-3.5" />
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">{line.category.name}</span>
        {over ? (
          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-red-300">
            <CircleAlert className="size-3.5" /> lewat {rupiah(line.remaining)}
          </span>
        ) : (
          <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
            sisa {rupiah(line.remaining)}
          </span>
        )}
      </div>
      <Meter
        ratio={line.ratio}
        pct={Math.min(100, line.ratio * 100)}
        className="ml-[38px] h-1.5"
        label={`${line.category.name}: terpakai ${rupiah(line.spent)} dari ${rupiah(line.limit)}`}
      />
    </li>
  );
}

/** Meter anggaran: warnanya ikut tingkat bahaya, lintasannya selalu terlihat. */
function Meter({
  ratio,
  pct,
  className = "",
  label,
}: {
  ratio: number;
  pct: number;
  className?: string;
  label?: string;
}) {
  const fill =
    ratio > 1
      ? "bg-[oklch(0.65_0.18_25)]"
      : ratio >= 0.8
        ? "bg-[oklch(0.8_0.14_75)]"
        : "bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-2)]";
  return (
    <div
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(ratio * 100)}
      aria-label={label ?? "Anggaran terpakai"}
      className={`overflow-hidden rounded-full bg-white/[0.08] ${className}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-700 ${fill}`}
        style={{ width: `${Math.max(pct, ratio > 0 ? 2 : 0)}%` }}
      />
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Memuat ringkasan keuangan">
      <div className="card-cinema space-y-3 p-6">
        <Shimmer className="h-3 w-28" />
        <Shimmer className="h-10 w-56" />
        <div className="grid grid-cols-3 gap-3 pt-4">
          <Shimmer className="h-10" />
          <Shimmer className="h-10" />
          <Shimmer className="h-10" />
        </div>
      </div>
      <div className="card-cinema space-y-3 p-6">
        <Shimmer className="h-3 w-40" />
        <Shimmer className="h-8 w-44" />
        <Shimmer className="h-2 w-full" />
      </div>
      <div className="card-cinema p-6">
        <Shimmer className="h-40 w-full" />
      </div>
    </div>
  );
}
