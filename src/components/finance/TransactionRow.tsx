import { ArrowLeftRight } from "lucide-react";
import type { FinAccount, FinCategory, FinTransaction } from "@/lib/store";
import { dayLabel, rupiah } from "@/lib/finance";
import { CategoryIcon } from "./icons";
import { useFinanceActions } from "./context";

/** Satu baris transaksi; diketuk untuk mengubah atau menghapusnya. */
export function TransactionRow({
  tx,
  accounts,
  categories,
  showDate,
}: {
  tx: FinTransaction;
  accounts: Map<string, FinAccount>;
  categories: Map<string, FinCategory>;
  showDate?: boolean;
}) {
  const { editTx } = useFinanceActions();
  const category = tx.categoryId ? categories.get(tx.categoryId) : undefined;
  const from = accounts.get(tx.accountId)?.name ?? "Akun terhapus";
  const transfer = tx.type === "transfer";

  const title = tx.description || (transfer ? "Transfer" : (category?.name ?? "Tanpa kategori"));
  const meta = transfer
    ? `${from} → ${(tx.toAccountId && accounts.get(tx.toAccountId)?.name) ?? "Akun terhapus"}`
    : [tx.description ? (category?.name ?? "Tanpa kategori") : null, from]
        .filter(Boolean)
        .join(" · ");

  return (
    <li>
      <button
        type="button"
        onClick={() => editTx(tx)}
        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/[0.04] focus-visible:bg-white/[0.04] focus-visible:outline-none"
      >
        <span
          className={[
            "grid size-10 shrink-0 place-items-center rounded-2xl hairline",
            tx.type === "income"
              ? "bg-[oklch(0.62_0.11_var(--acc-h1)/0.14)] text-gold"
              : "bg-white/[0.06] text-muted-foreground",
          ].join(" ")}
        >
          {transfer ? (
            <ArrowLeftRight className="size-4" strokeWidth={1.75} />
          ) : (
            <CategoryIcon icon={category?.icon} />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm">{title}</span>
          <span className="block truncate text-[11px] text-muted-foreground">
            {showDate ? `${dayLabel(tx.date)} · ${meta}` : meta}
          </span>
        </span>
        <span
          className={[
            "shrink-0 text-sm tabular-nums",
            tx.type === "income"
              ? "text-gold"
              : transfer
                ? "text-muted-foreground"
                : "text-foreground",
          ].join(" ")}
        >
          {tx.type === "income" ? "+" : tx.type === "expense" ? "−" : ""}
          {rupiah(tx.amount)}
        </span>
      </button>
    </li>
  );
}
