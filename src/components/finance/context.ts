import { createContext, useContext } from "react";
import type { FinAccount, FinTransaction } from "@/lib/store";
import type { TxEditorTarget } from "./TransactionDialog";

/** Aksi yang bisa dipanggil dari tab mana pun di halaman Keuangan. */
export type FinanceActions = {
  addTx: (preset?: TxEditorTarget["preset"]) => void;
  editTx: (tx: FinTransaction) => void;
  addAccount: () => void;
  editAccount: (account: FinAccount) => void;
  manageCategories: () => void;
  editBudget: (month: string) => void;
  /** Pindah ke tab Transaksi, opsional langsung tersaring ke satu akun. */
  showTransactions: (accountId?: string) => void;
  showAccounts: () => void;
};

export const FinanceActionsContext = createContext<FinanceActions | null>(null);

export function useFinanceActions() {
  const ctx = useContext(FinanceActionsContext);
  if (!ctx) throw new Error("useFinanceActions harus dipakai di dalam <FinanceDialogs>.");
  return ctx;
}
