import { useMemo } from "react";
import { History, Pencil, Plus, Wallet } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { useStore, useToday, type FinAccount } from "@/lib/store";
import {
  ACCOUNT_TYPES,
  accountBalances,
  accountTypeLabel,
  inMonth,
  netWorth,
  rupiah,
  txEffects,
} from "@/lib/finance";
import { useFinanceActions } from "./context";
import { AccountIcon } from "./icons";
import { Eyebrow, btnPrimary } from "./ui";

/** Tab Akun: total kekayaan, rincian per jenis, dan kartu tiap akun. */
export function Accounts({ hydrated }: { hydrated: boolean }) {
  const accounts = useStore((s) => s.finAccounts);
  const txs = useStore((s) => s.finTransactions);
  const actions = useFinanceActions();
  const month = useToday().slice(0, 7);

  const balances = useMemo(() => accountBalances(accounts, txs), [accounts, txs]);

  // Uang masuk & keluar tiap akun bulan ini — transfer ikut dihitung karena
  // dari sisi akun, transfer memang uang yang datang atau pergi.
  const flows = useMemo(() => {
    const m = new Map<string, { in: number; out: number }>();
    for (const t of txs) {
      if (!inMonth(t, month)) continue;
      for (const [id, delta] of txEffects(t)) {
        const f = m.get(id) ?? { in: 0, out: 0 };
        if (delta > 0) f.in += delta;
        else f.out -= delta;
        m.set(id, f);
      }
    }
    return m;
  }, [txs, month]);

  const byType = useMemo(
    () =>
      ACCOUNT_TYPES.map((t) => {
        const list = accounts.filter((a) => a.type === t.id);
        const total = list.reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);
        return { ...t, count: list.length, total };
      }).filter((t) => t.count > 0),
    [accounts, balances],
  );

  if (!hydrated) return <CardSkeleton rows={3} />;

  if (accounts.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="Belum ada akun"
        description="Tambahkan rekening bank, e-wallet, uang tunai, atau investasi untuk mulai melacak saldo."
        action={
          <button onClick={actions.addAccount} className={btnPrimary}>
            <Plus className="size-4" strokeWidth={2.5} /> Tambah akun
          </button>
        }
      />
    );
  }

  const worth = netWorth(balances);
  const positiveTotal = byType.reduce((s, t) => s + Math.max(0, t.total), 0) || 1;
  const sorted = [...accounts].sort(
    (a, b) => (balances.get(b.id) ?? 0) - (balances.get(a.id) ?? 0),
  );

  return (
    <div className="space-y-6">
      <section className="animate-rise card-cinema p-6">
        <Eyebrow>Kekayaan bersih</Eyebrow>
        <p
          className={[
            "mt-1 font-serif text-4xl leading-tight",
            worth < 0 ? "text-red-300" : "",
          ].join(" ")}
        >
          {worth < 0 ? "−" : ""}
          {rupiah(worth)}
        </p>
        <p className="text-[11px] text-muted-foreground">jumlah saldo {accounts.length} akun</p>

        <ul className="mt-5 space-y-3 border-t border-white/[0.07] pt-4">
          {byType.map((t) => (
            <li key={t.id}>
              <div className="mb-1.5 flex items-center gap-2.5 text-sm">
                <span className="grid size-7 place-items-center rounded-lg bg-white/[0.06] text-muted-foreground">
                  <AccountIcon type={t.id} className="size-3.5" />
                </span>
                <span className="flex-1">
                  {t.label}{" "}
                  <span className="text-[11px] text-muted-foreground">· {t.count} akun</span>
                </span>
                <span className="tabular-nums">
                  {t.total < 0 ? "−" : ""}
                  {rupiah(t.total)}
                </span>
              </div>
              <div className="ml-[38px] h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent-1)] to-[var(--accent-2)] transition-all duration-700"
                  style={{ width: `${(Math.max(0, t.total) / positiveTotal) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <div className="animate-rise flex items-center justify-between">
        <h2 className="font-serif text-2xl">Semua akun</h2>
        <button onClick={actions.addAccount} className={btnPrimary}>
          <Plus className="size-4" strokeWidth={2.5} /> Akun baru
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {sorted.map((a) => (
          <AccountCard
            key={a.id}
            account={a}
            balance={balances.get(a.id) ?? 0}
            flow={flows.get(a.id)}
          />
        ))}
      </div>
    </div>
  );
}

function AccountCard({
  account,
  balance,
  flow,
}: {
  account: FinAccount;
  balance: number;
  flow?: { in: number; out: number };
}) {
  const actions = useFinanceActions();
  return (
    <div className="animate-rise card-cinema p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-gold hairline">
            <AccountIcon type={account.type} />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{account.name}</p>
            <p className="text-[11px] text-muted-foreground">{accountTypeLabel(account.type)}</p>
          </div>
        </div>
        <button
          onClick={() => actions.editAccount(account)}
          className="grid size-8 shrink-0 place-items-center rounded-full text-muted-foreground transition hover:text-foreground"
          aria-label={`Ubah ${account.name}`}
        >
          <Pencil className="size-4" />
        </button>
      </div>

      <p className={["mt-4 font-serif text-2xl", balance < 0 ? "text-red-300" : ""].join(" ")}>
        {balance < 0 ? "−" : ""}
        {rupiah(balance)}
      </p>
      <p className="text-[11px] text-muted-foreground">
        {flow ? (
          <>
            bulan ini
            {flow.in > 0 && <span className="text-gold"> +{rupiah(flow.in)}</span>}
            {flow.in > 0 && flow.out > 0 && " ·"}
            {flow.out > 0 && ` −${rupiah(flow.out)}`}
          </>
        ) : (
          "belum ada transaksi bulan ini"
        )}
      </p>

      <div className="mt-4 flex gap-2">
        <button
          onClick={() => actions.addTx({ accountId: account.id })}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-white/[0.06] px-3 py-2 text-xs hairline hover:bg-white/[0.1]"
        >
          <Plus className="size-3.5" /> Catat
        </button>
        <button
          onClick={() => actions.showTransactions(account.id)}
          className="inline-flex flex-1 items-center justify-center gap-1 rounded-full bg-white/[0.06] px-3 py-2 text-xs hairline hover:bg-white/[0.1]"
        >
          <History className="size-3.5" /> Riwayat
        </button>
      </div>
    </div>
  );
}
