import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useStore, type FinCategory, type FinCategoryType } from "@/lib/store";
import { CATEGORY_ICONS } from "./icon-map";
import { CategoryIcon } from "./icons";
import { Dialog, Field, Segmented, btnGhost, btnPrimary, inputClass } from "./ui";

const emptyForm = { id: "", name: "", icon: "more" };

/** Kelola kategori: tambah, ganti nama/ikon, hapus (dengan urungkan). */
export function CategoryManager({ onClose }: { onClose: () => void }) {
  const categories = useStore((s) => s.finCategories);
  const budgets = useStore((s) => s.finBudgets);
  const txs = useStore((s) => s.finTransactions);
  const addCategory = useStore((s) => s.addFinCategory);
  const updateCategory = useStore((s) => s.updateFinCategory);
  const removeCategory = useStore((s) => s.removeFinCategory);
  const restore = useStore((s) => s.restoreFinance);

  const [type, setType] = useState<FinCategoryType>("expense");
  const [form, setForm] = useState(emptyForm);
  const [submitted, setSubmitted] = useState(false);

  const list = categories.filter((c) => c.type === type);
  const editing = form.id ? categories.find((c) => c.id === form.id) : undefined;
  const trimmed = form.name.trim();
  const duplicate = list.some(
    (c) => c.id !== form.id && c.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const nameError = !submitted
    ? undefined
    : !trimmed
      ? "Beri nama kategorinya."
      : duplicate
        ? "Nama ini sudah dipakai."
        : undefined;

  const reset = () => {
    setForm(emptyForm);
    setSubmitted(false);
  };

  const save = () => {
    setSubmitted(true);
    if (!trimmed || duplicate) return;
    if (editing) updateCategory(editing.id, { name: trimmed, icon: form.icon });
    else addCategory({ name: trimmed, icon: form.icon, type });
    reset();
  };

  const destroy = (c: FinCategory) => {
    const used = txs.filter((t) => t.categoryId === c.id).length;
    const ownBudgets = budgets.filter((b) => b.categoryId === c.id);
    removeCategory(c.id);
    if (form.id === c.id) reset();
    toast(
      used > 0
        ? `Kategori ${c.name} dihapus. ${used} transaksinya jadi "tanpa kategori".`
        : `Kategori ${c.name} dihapus.`,
      {
        action: {
          label: "Urungkan",
          onClick: () => restore({ categories: [c], budgets: ownBudgets }),
        },
      },
    );
  };

  return (
    <Dialog title="Kategori" onClose={onClose}>
      <div className="mb-4">
        <Segmented
          label="Jenis kategori"
          stretch
          value={type}
          onChange={(t) => {
            setType(t);
            reset();
          }}
          options={[
            { id: "expense", label: "Pengeluaran" },
            { id: "income", label: "Pemasukan" },
          ]}
        />
      </div>

      <ul className="mb-5 divide-y divide-white/[0.06] rounded-2xl bg-white/[0.03] hairline">
        {list.map((c) => (
          <li
            key={c.id}
            className={[
              "flex items-center gap-3 px-3 py-2.5",
              c.id === form.id ? "bg-white/[0.05]" : "",
            ].join(" ")}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-gold">
              <CategoryIcon icon={c.icon} />
            </span>
            <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
            <button
              type="button"
              onClick={() => {
                setForm({ id: c.id, name: c.name, icon: c.icon });
                setSubmitted(false);
              }}
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:text-foreground"
              aria-label={`Ubah ${c.name}`}
            >
              <Pencil className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => destroy(c)}
              className="grid size-8 place-items-center rounded-full text-muted-foreground transition hover:text-red-300"
              aria-label={`Hapus ${c.name}`}
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
        {list.length === 0 && (
          <li className="px-4 py-5 text-center text-sm text-muted-foreground">
            Belum ada kategori di sini.
          </li>
        )}
      </ul>

      <p className="mb-3 font-serif text-lg">
        {editing ? `Ubah "${editing.name}"` : "Tambah kategori"}
      </p>
      <Field label="Nama" error={nameError}>
        <input
          className={inputClass}
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder={type === "expense" ? "Kopi, Langganan, Kos…" : "Freelance, Dividen…"}
          maxLength={32}
        />
      </Field>
      <Field label="Ikon" group>
        <div className="grid grid-cols-8 gap-1.5">
          {Object.keys(CATEGORY_ICONS).map((key) => {
            const active = key === form.icon;
            return (
              <button
                key={key}
                type="button"
                aria-pressed={active}
                aria-label={`Ikon ${key}`}
                onClick={() => setForm({ ...form, icon: key })}
                className={[
                  "grid aspect-square place-items-center rounded-xl transition",
                  active
                    ? "bg-gold text-white"
                    : "bg-white/[0.05] text-muted-foreground hairline hover:text-foreground",
                ].join(" ")}
              >
                <CategoryIcon icon={key} />
              </button>
            );
          })}
        </div>
      </Field>

      <div className="mt-5 flex gap-2">
        {editing ? (
          <button type="button" onClick={reset} className={`${btnGhost} flex-1 py-2.5`}>
            Batal ubah
          </button>
        ) : (
          <button type="button" onClick={onClose} className={`${btnGhost} flex-1 py-2.5`}>
            Selesai
          </button>
        )}
        <button type="button" onClick={save} className={`${btnPrimary} flex-1 py-2.5 shadow-none`}>
          {editing ? (
            "Simpan"
          ) : (
            <>
              <Plus className="size-4" strokeWidth={2.5} /> Tambah
            </>
          )}
        </button>
      </div>
    </Dialog>
  );
}
