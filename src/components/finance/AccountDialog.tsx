import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStore, type FinAccount, type FinAccountType } from "@/lib/store";
import { ACCOUNT_TYPES, rupiah } from "@/lib/finance";
import { AccountIcon } from "./icons";
import { Dialog, DialogActions, Field, MoneyInput, inputClass } from "./ui";

/**
 * Tambah / ubah akun. Saat mengedit, yang diisi adalah saldo *sekarang*;
 * selisihnya diserap ke saldo awal supaya riwayat transaksi tetap utuh.
 */
export function AccountDialog({
  account,
  balance = 0,
  intro,
  onClose,
}: {
  account?: FinAccount;
  /** Saldo berjalan akun yang diedit. */
  balance?: number;
  /** Kalimat pembuka, mis. saat diminta membuat akun sebelum mencatat transaksi. */
  intro?: string;
  onClose: () => void;
}) {
  const txs = useStore((s) => s.finTransactions);
  const addAccount = useStore((s) => s.addFinAccount);
  const updateAccount = useStore((s) => s.updateFinAccount);
  const removeAccount = useStore((s) => s.removeFinAccount);
  const restore = useStore((s) => s.restoreFinance);

  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<FinAccountType>(account?.type ?? "bank");
  const [amount, setAmount] = useState(() =>
    account && Math.round(balance) !== 0 ? String(Math.abs(Math.round(balance))) : "",
  );
  const [negative, setNegative] = useState(account ? balance < 0 : false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const nameError = submitted && !name.trim() ? "Beri nama akunnya." : undefined;
  const related = account
    ? txs.filter((t) => t.accountId === account.id || t.toAccountId === account.id)
    : [];

  const save = () => {
    setSubmitted(true);
    if (!name.trim()) return;
    const value = (negative ? -1 : 1) * Number(amount || 0);
    if (account) {
      updateAccount(account.id, {
        name: name.trim(),
        type,
        openingBalance: account.openingBalance + (value - balance),
      });
      toast.success("Akun diperbarui.");
    } else {
      addAccount({ name: name.trim(), type, openingBalance: value });
      toast.success(`Akun ${name.trim()} ditambahkan.`);
    }
    onClose();
  };

  const destroy = () => {
    if (!account) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    removeAccount(account.id);
    toast(`Akun ${account.name} dihapus.`, {
      action: {
        label: "Urungkan",
        onClick: () => restore({ accounts: [account], transactions: related }),
      },
    });
    onClose();
  };

  return (
    <Dialog title={account ? "Ubah akun" : "Akun baru"} onClose={onClose}>
      {intro && <p className="-mt-2 mb-4 text-sm text-muted-foreground">{intro}</p>}

      <Field label="Nama akun" error={nameError}>
        <input
          className={inputClass}
          value={name}
          autoFocus={!account}
          onChange={(e) => setName(e.target.value)}
          placeholder="BCA, GoPay, Dompet, Reksadana…"
          maxLength={40}
        />
      </Field>

      <Field label="Jenis" group>
        <div className="grid grid-cols-4 gap-1.5">
          {ACCOUNT_TYPES.map((t) => {
            const active = t.id === type;
            return (
              <button
                key={t.id}
                type="button"
                aria-pressed={active}
                onClick={() => setType(t.id)}
                className={[
                  "flex flex-col items-center gap-1 rounded-2xl px-2 py-2.5 text-[11px] transition",
                  active
                    ? "bg-gold text-white"
                    : "bg-white/[0.06] text-muted-foreground hairline hover:text-foreground",
                ].join(" ")}
              >
                <AccountIcon type={t.id} />
                {t.label}
              </button>
            );
          })}
        </div>
      </Field>

      <Field
        label={account ? "Saldo saat ini" : "Saldo awal"}
        hint={
          account
            ? "Mengubah angka ini hanya menyesuaikan saldo, tidak membuat transaksi baru."
            : "Isi saldo yang ada sekarang. Transaksi berikutnya akan menambah/menguranginya."
        }
      >
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setNegative((n) => !n)}
            aria-pressed={negative}
            aria-label={
              negative ? "Saldo minus — ketuk untuk plus" : "Saldo plus — ketuk untuk minus"
            }
            className={[
              "w-12 shrink-0 rounded-2xl text-lg hairline transition",
              negative ? "bg-red-500/15 text-red-300" : "bg-white/[0.04] text-muted-foreground",
            ].join(" ")}
          >
            {negative ? "−" : "+"}
          </button>
          <div className="flex-1">
            <MoneyInput value={amount} onChange={setAmount} />
          </div>
        </div>
      </Field>

      {confirmDelete && account && (
        <p role="alert" className="mt-2 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {related.length > 0
            ? `${related.length} transaksi di akun ini ikut terhapus. `
            : "Akun ini belum punya transaksi. "}
          Ketuk ikon hapus sekali lagi untuk memastikan.
          {balance > 0 && ` Kekayaan bersih berkurang ${rupiah(balance)}.`}
        </p>
      )}

      <DialogActions
        onCancel={onClose}
        onSubmit={save}
        submitLabel={account ? "Simpan perubahan" : "Simpan akun"}
        extra={
          account && (
            <button
              type="button"
              onClick={destroy}
              className={[
                "grid size-[42px] shrink-0 place-items-center rounded-full hairline transition",
                confirmDelete
                  ? "bg-red-500/20 text-red-200"
                  : "bg-white/[0.06] text-muted-foreground hover:text-red-300",
              ].join(" ")}
              aria-label={confirmDelete ? "Ya, hapus akun" : "Hapus akun"}
            >
              <Trash2 className="size-4" />
            </button>
          )
        }
      />
    </Dialog>
  );
}
