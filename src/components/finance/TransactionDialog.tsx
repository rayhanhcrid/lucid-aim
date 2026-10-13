import { useMemo, useState } from "react";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { todayKey, useStore, type FinTransaction, type FinTxType } from "@/lib/store";
import {
  accountBalances,
  draftToTx,
  rupiah,
  txEffects,
  validateTx,
  type TxDraft,
  type TxErrors,
} from "@/lib/finance";
import { CategoryIcon } from "./icons";
import { SmartEntry } from "./SmartEntry";
import {
  Dialog,
  DialogActions,
  Field,
  MoneyInput,
  Segmented,
  inputClass,
  type SegmentOption,
} from "./ui";

const TYPE_OPTIONS: SegmentOption<FinTxType>[] = [
  { id: "expense", label: "Pengeluaran", icon: ArrowUpRight },
  { id: "income", label: "Pemasukan", icon: ArrowDownLeft },
  { id: "transfer", label: "Transfer", icon: ArrowLeftRight },
];

/** Akun yang terakhir dipakai — biar form berikutnya langsung terisi. */
let lastAccountId = "";

export type TxEditorTarget = {
  /** Transaksi yang diedit; kosong berarti mencatat yang baru. */
  tx?: FinTransaction;
  /** Isian awal untuk transaksi baru, mis. akun yang sedang dibuka. */
  preset?: Partial<Pick<TxDraft, "type" | "accountId">>;
};

export function TransactionDialog({
  target,
  onClose,
}: {
  target: TxEditorTarget;
  onClose: () => void;
}) {
  const accounts = useStore((s) => s.finAccounts);
  const categories = useStore((s) => s.finCategories);
  const txs = useStore((s) => s.finTransactions);
  const add = useStore((s) => s.addFinTransaction);
  const update = useStore((s) => s.updateFinTransaction);
  const remove = useStore((s) => s.removeFinTransaction);
  const restore = useStore((s) => s.restoreFinance);

  const editing = target.tx;
  const [draft, setDraft] = useState<TxDraft>(() => {
    if (editing) {
      return {
        type: editing.type,
        amount: String(editing.amount),
        date: editing.date,
        accountId: editing.accountId,
        toAccountId: editing.toAccountId ?? "",
        categoryId: editing.categoryId ?? "",
        description: editing.description ?? "",
      };
    }
    const fallback = accounts.some((a) => a.id === lastAccountId)
      ? lastAccountId
      : (accounts[0]?.id ?? "");
    return {
      type: target.preset?.type ?? "expense",
      amount: "",
      date: todayKey(),
      accountId: target.preset?.accountId ?? fallback,
      toAccountId: "",
      categoryId: "",
      description: "",
    };
  });
  // Error baru ditampilkan setelah sekali mencoba simpan, supaya form tidak
  // langsung merah sebelum diisi.
  const [submitted, setSubmitted] = useState(false);
  const errors: TxErrors = submitted ? validateTx(draft, accounts, categories) : {};

  // Isi cepat bisa menghasilkan beberapa transaksi sekaligus: yang pertama
  // tampil di form, sisanya antre dan muncul bergiliran setelah disimpan/dilewati.
  const [queue, setQueue] = useState<TxDraft[]>([]);
  const [step, setStep] = useState<{ index: number; total: number; saved: number } | null>(null);

  const hasErrors = (d: TxDraft) => Object.keys(validateTx(d, accounts, categories)).length > 0;

  /** Tampilkan draf hasil isi cepat; kolom yang belum ketemu langsung ditandai. */
  const showDraft = (d: TxDraft) => {
    setDraft(d);
    setSubmitted(hasErrors(d));
  };

  const applyParsed = (drafts: TxDraft[]) => {
    const [first, ...rest] = drafts;
    if (!first) return;
    showDraft(first);
    setQueue(rest);
    setStep({ index: 1, total: drafts.length, saved: 0 });
  };

  /** Lanjut ke draf berikutnya; `false` kalau antrean sudah habis. */
  const advance = () => {
    const [next, ...rest] = queue;
    if (!next) return false;
    showDraft(next);
    setQueue(rest);
    setStep((s) => s && { ...s, index: s.index + 1 });
    return true;
  };

  const set = <K extends keyof TxDraft>(key: K, value: TxDraft[K]) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const typeCategories = useMemo(
    () => categories.filter((c) => c.type === draft.type),
    [categories, draft.type],
  );

  // Saldo akun sumber sesudah transaksi ini — transaksi yang sedang diedit
  // dikeluarkan dulu supaya tidak terhitung dua kali.
  const balanceAfter = useMemo(() => {
    const others = editing ? txs.filter((t) => t.id !== editing.id) : txs;
    const balances = accountBalances(accounts, others);
    const base = balances.get(draft.accountId);
    if (base === undefined || !Number(draft.amount)) return null;
    const preview = draftToTx(draft);
    const delta = txEffects({ ...preview, id: "", createdAt: "" })
      .filter(([id]) => id === draft.accountId)
      .reduce((a, [, d]) => a + d, 0);
    return base + delta;
  }, [accounts, txs, editing, draft]);

  const save = () => {
    setSubmitted(true);
    if (Object.keys(validateTx(draft, accounts, categories)).length > 0) return;
    const data = draftToTx(draft);
    lastAccountId = draft.accountId;
    if (editing) {
      update(editing.id, data);
      toast.success("Transaksi diperbarui.");
    } else {
      add(data);
      const batch = step && step.total > 1;
      const saved = (step?.saved ?? 0) + 1;
      // Masih ada antrean: jangan munculkan toast — di HP toast menutupi tombol
      // Simpan untuk transaksi berikutnya. Progresnya cukup di banner.
      if (batch) setStep((s) => s && { ...s, saved });
      if (advance()) return;
      toast.success(
        batch
          ? `${saved} transaksi tercatat.`
          : data.type === "transfer"
            ? `Transfer ${rupiah(data.amount)} tercatat.`
            : `${data.type === "income" ? "Pemasukan" : "Pengeluaran"} ${rupiah(data.amount)} tercatat.`,
      );
    }
    onClose();
  };

  const destroy = () => {
    if (!editing) return;
    remove(editing.id);
    toast("Transaksi dihapus.", {
      action: { label: "Urungkan", onClick: () => restore({ transactions: [editing] }) },
    });
    onClose();
  };

  return (
    <Dialog title={editing ? "Ubah transaksi" : "Catat transaksi"} onClose={onClose}>
      {!editing && <SmartEntry fallbackAccountId={draft.accountId} onParsed={applyParsed} />}

      {step && step.total > 1 && (
        <div className="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-[oklch(0.62_0.11_var(--acc-h1)/0.12)] px-4 py-2.5 text-sm hairline">
          <span>
            Transaksi <span className="tabular-nums">{step.index}</span> dari{" "}
            <span className="tabular-nums">{step.total}</span>
            {step.saved > 0 && (
              <span className="text-muted-foreground"> · {step.saved} tersimpan</span>
            )}
          </span>
          {queue.length > 0 && (
            <button
              type="button"
              onClick={advance}
              className="text-xs text-muted-foreground transition hover:text-foreground"
            >
              Lewati
            </button>
          )}
        </div>
      )}

      <div className="mb-4">
        <Segmented
          label="Jenis transaksi"
          options={TYPE_OPTIONS}
          value={draft.type}
          onChange={(type) => setDraft((d) => ({ ...d, type, categoryId: "" }))}
          stretch
        />
      </div>

      <Field label="Jumlah" error={errors.amount}>
        <MoneyInput
          value={draft.amount}
          onChange={(v) => set("amount", v)}
          large
          invalid={!!errors.amount}
        />
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tanggal" error={errors.date}>
          <input
            type="date"
            className={inputClass}
            value={draft.date}
            onChange={(e) => set("date", e.target.value)}
          />
        </Field>
        <Field label={draft.type === "transfer" ? "Dari akun" : "Akun"} error={errors.accountId}>
          <AccountSelect value={draft.accountId} onChange={(v) => set("accountId", v)} />
        </Field>
      </div>

      {balanceAfter !== null && !errors.accountId && (
        <p
          className={[
            "-mt-1 mb-3 text-xs",
            balanceAfter < 0 ? "text-red-300" : "text-muted-foreground",
          ].join(" ")}
        >
          Saldo akun ini jadi {balanceAfter < 0 ? "−" : ""}
          {rupiah(balanceAfter)}
          {balanceAfter < 0 ? " — lebih dari saldonya." : "."}
        </p>
      )}

      {draft.type === "transfer" ? (
        <Field label="Ke akun" error={errors.toAccountId}>
          <AccountSelect
            value={draft.toAccountId}
            onChange={(v) => set("toAccountId", v)}
            exclude={draft.accountId}
          />
        </Field>
      ) : (
        <Field label="Kategori" error={errors.categoryId} group>
          <div className="flex flex-wrap gap-1.5">
            {typeCategories.map((c) => {
              const active = c.id === draft.categoryId;
              return (
                <button
                  key={c.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => set("categoryId", c.id)}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition",
                    active
                      ? "bg-gold text-white"
                      : "bg-white/[0.06] text-muted-foreground hairline hover:text-foreground",
                  ].join(" ")}
                >
                  <CategoryIcon icon={c.icon} className="size-3.5" />
                  {c.name}
                </button>
              );
            })}
            {typeCategories.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Belum ada kategori {draft.type === "income" ? "pemasukan" : "pengeluaran"} — tambah
                lewat "Kategori" di tab Transaksi.
              </p>
            )}
          </div>
        </Field>
      )}

      <Field label="Catatan (opsional)">
        <input
          className={inputClass}
          value={draft.description}
          onChange={(e) => set("description", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder={
            draft.type === "income"
              ? "Gaji Oktober"
              : draft.type === "transfer"
                ? "Isi saldo GoPay"
                : "Makan siang"
          }
          maxLength={120}
        />
      </Field>

      <DialogActions
        onCancel={onClose}
        onSubmit={save}
        submitLabel={editing ? "Simpan perubahan" : "Simpan"}
        extra={
          editing && (
            <button
              type="button"
              onClick={destroy}
              className="grid size-[42px] shrink-0 place-items-center rounded-full bg-white/[0.06] text-muted-foreground hairline transition hover:text-red-300"
              aria-label="Hapus transaksi"
            >
              <Trash2 className="size-4" />
            </button>
          )
        }
      />
    </Dialog>
  );
}

function AccountSelect({
  value,
  onChange,
  exclude,
}: {
  value: string;
  onChange: (id: string) => void;
  exclude?: string;
}) {
  const accounts = useStore((s) => s.finAccounts);
  return (
    <select
      className={`${inputClass} appearance-none bg-[var(--surface)]`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="" disabled>
        Pilih akun
      </option>
      {accounts
        .filter((a) => a.id !== exclude)
        .map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
    </select>
  );
}
