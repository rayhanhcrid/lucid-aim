import { useMemo, useState, type ReactNode } from "react";
import { useStore, type FinAccount } from "@/lib/store";
import { accountBalances } from "@/lib/finance";
import { AccountDialog } from "./AccountDialog";
import { BudgetDialog } from "./BudgetDialog";
import { CategoryManager } from "./CategoryManager";
import { TransactionDialog, type TxEditorTarget } from "./TransactionDialog";
import { FinanceActionsContext, type FinanceActions } from "./context";

type Open =
  | { kind: "tx"; target: TxEditorTarget }
  | { kind: "account"; account?: FinAccount; intro?: string }
  | { kind: "categories" }
  | { kind: "budget"; month: string }
  | null;

/**
 * Pemilik semua dialog keuangan. Tab-tab cukup memanggil aksi lewat
 * `useFinanceActions()`; hanya satu dialog yang terbuka dalam satu waktu.
 */
export function FinanceDialogs({
  children,
  onShowTransactions,
  onShowAccounts,
}: {
  children: ReactNode;
  onShowTransactions: (accountId?: string) => void;
  onShowAccounts: () => void;
}) {
  const [open, setOpen] = useState<Open>(null);
  const accounts = useStore((s) => s.finAccounts);
  const txs = useStore((s) => s.finTransactions);

  const actions = useMemo<FinanceActions>(
    () => ({
      addTx: (preset) => {
        // Transaksi butuh akun — arahkan bikin akun dulu kalau belum ada.
        if (useStore.getState().finAccounts.length === 0) {
          setOpen({
            kind: "account",
            intro:
              "Tambahkan satu akun dulu — misalnya rekening atau dompet — sebelum mencatat transaksi.",
          });
          return;
        }
        setOpen({ kind: "tx", target: { preset } });
      },
      editTx: (tx) => setOpen({ kind: "tx", target: { tx } }),
      addAccount: () => setOpen({ kind: "account" }),
      editAccount: (account) => setOpen({ kind: "account", account }),
      manageCategories: () => setOpen({ kind: "categories" }),
      editBudget: (month) => setOpen({ kind: "budget", month }),
      showTransactions: onShowTransactions,
      showAccounts: onShowAccounts,
    }),
    [onShowTransactions, onShowAccounts],
  );

  const close = () => setOpen(null);
  const editedBalance = useMemo(
    () =>
      open?.kind === "account" && open.account
        ? (accountBalances(accounts, txs).get(open.account.id) ?? 0)
        : 0,
    [open, accounts, txs],
  );

  return (
    <FinanceActionsContext.Provider value={actions}>
      {children}

      {open?.kind === "tx" && <TransactionDialog target={open.target} onClose={close} />}
      {open?.kind === "account" && (
        <AccountDialog
          account={open.account}
          balance={editedBalance}
          intro={open.intro}
          onClose={close}
        />
      )}
      {open?.kind === "categories" && <CategoryManager onClose={close} />}
      {open?.kind === "budget" && <BudgetDialog month={open.month} onClose={close} />}
    </FinanceActionsContext.Provider>
  );
}
