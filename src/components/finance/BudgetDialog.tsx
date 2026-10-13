import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { budgetFor, monthLongLabel, monthSummary, rupiah } from "@/lib/finance";
import { CategoryIcon } from "./icons";
import { Dialog, DialogActions, MoneyInput } from "./ui";

/**
 * Atur batas belanja per kategori. Angka yang diisi berlaku mulai `month`
 * dan terus terbawa ke bulan berikutnya sampai diubah lagi.
 */
export function BudgetDialog({ month, onClose }: { month: string; onClose: () => void }) {
  const categories = useStore((s) => s.finCategories);
  const budgets = useStore((s) => s.finBudgets);
  const txs = useStore((s) => s.finTransactions);
  const setBudget = useStore((s) => s.setFinBudget);

  const expenseCats = useMemo(() => categories.filter((c) => c.type === "expense"), [categories]);
  // Nilai awal cukup dibaca sekali saat dialog dibuka.
  const [initial] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      expenseCats.map((c) => {
        const limit = budgetFor(budgets, c.id, month);
        return [c.id, limit > 0 ? String(limit) : ""];
      }),
    ),
  );
  const [values, setValues] = useState(initial);

  const spentBy = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of txs) {
      if (t.type === "expense" && t.categoryId && t.date.startsWith(month)) {
        m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + t.amount);
      }
    }
    return m;
  }, [txs, month]);

  const total = Object.values(values).reduce((a, v) => a + Number(v || 0), 0);
  const income = monthSummary(txs, month).income;

  const save = () => {
    let changed = 0;
    for (const c of expenseCats) {
      const next = Number(values[c.id] || 0);
      if (next !== Number(initial[c.id] || 0)) {
        setBudget(c.id, month, next);
        changed++;
      }
    }
    if (changed > 0) toast.success("Anggaran disimpan.");
    onClose();
  };

  return (
    <Dialog title={`Anggaran ${monthLongLabel(month)}`} onClose={onClose}>
      <p className="-mt-2 mb-4 text-sm text-muted-foreground">
        Kosongkan kategori yang tidak perlu dibatasi. Angkanya terbawa ke bulan-bulan berikutnya
        sampai kamu ubah lagi.
      </p>

      <ul className="space-y-2.5">
        {expenseCats.map((c) => {
          const spent = spentBy.get(c.id) ?? 0;
          return (
            <li key={c.id} className="flex items-center gap-3">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-gold">
                <CategoryIcon icon={c.icon} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm">{c.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {spent > 0 ? `terpakai ${rupiah(spent)}` : "belum ada pengeluaran"}
                </p>
              </div>
              <div className="w-40 shrink-0">
                <MoneyInput
                  value={values[c.id] ?? ""}
                  onChange={(v) => setValues((s) => ({ ...s, [c.id]: v }))}
                  placeholder="—"
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-5 flex items-baseline justify-between border-t border-white/[0.07] pt-4 text-sm">
        <span className="text-muted-foreground">Total anggaran</span>
        <span className="tabular-nums">{rupiah(total)}</span>
      </div>
      {income > 0 && (
        <p className="mt-1 text-right text-[11px] text-muted-foreground">
          {Math.round((total / income) * 100)}% dari pemasukan bulan ini ({rupiah(income)})
        </p>
      )}

      <DialogActions onCancel={onClose} onSubmit={save} submitLabel="Simpan anggaran" />
    </Dialog>
  );
}
