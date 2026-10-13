/**
 * Potongan UI yang dipakai bersama oleh semua tab di halaman Keuangan:
 * dialog/bottom-sheet, label isian, tombol, kolom rupiah, dan pilihan segmen.
 */

import { useEffect, useId, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { LucideIcon } from "lucide-react";
import { useUIStore } from "@/lib/ui-store";
import { groupDigits } from "@/lib/finance";

export const inputClass =
  "w-full rounded-2xl bg-white/[0.04] px-4 py-3 text-[15px] outline-none hairline placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-[var(--gold)]/50";

export const btnPrimary =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-gradient-to-br from-[var(--accent-1)] to-[var(--accent-2)] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_20px_-6px_oklch(0.62_0.11_var(--acc-h1)/0.5)] transition active:scale-95 disabled:opacity-50";

export const btnGhost =
  "inline-flex items-center justify-center gap-1.5 rounded-full bg-white/[0.06] px-4 py-2 text-sm hairline transition hover:bg-white/[0.1]";

/** Warna seri arus kas — divalidasi buta-warna terhadap permukaan kartu gelap. */
export const INCOME_COLOR = "oklch(0.66 0.11 189)";
export const EXPENSE_COLOR = "oklch(0.65 0.16 28)";

/**
 * Render langsung ke <body>. Pembungkus halaman (`.route-shift`) menyisakan
 * transform dari animasi masuknya, dan transform membuat `position: fixed` di
 * dalamnya menempel ke kotak konten — bukan ke layar. Dialog & tombol melayang
 * harus lewat sini supaya benar-benar menempel di layar.
 */
export function Portal({ children }: { children: ReactNode }) {
  return typeof document === "undefined" ? null : createPortal(children, document.body);
}

/**
 * Berapa dialog yang sedang terbuka. Navigasi bawah di HP baru boleh muncul
 * lagi kalau semuanya sudah tertutup, bukan begitu salah satunya tutup.
 */
let openDialogs = 0;

export function Dialog({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const titleId = useId();
  const setDialogOpen = useUIStore((s) => s.setDialogOpen);

  useEffect(() => {
    openDialogs++;
    setDialogOpen(true);
    return () => {
      openDialogs--;
      setDialogOpen(openDialogs > 0);
    };
  }, [setDialogOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <Portal>
      <div
        className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-md md:items-center md:p-6"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="animate-rise max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-[28px] card-cinema p-6 md:rounded-[28px]"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 id={titleId} className="mb-4 font-serif text-2xl">
            {title}
          </h3>
          {children}
        </div>
      </div>
    </Portal>
  );
}

/**
 * Label + isian. Pakai `group` untuk sekumpulan tombol pilihan — `<label>`
 * yang membungkus tombol akan "mengklik" tombol pertama tiap labelnya disentuh.
 */
export function Field({
  label,
  error,
  hint,
  group,
  children,
}: {
  label: string;
  error?: string;
  hint?: ReactNode;
  group?: boolean;
  children: ReactNode;
}) {
  const body = (
    <>
      <span className="mb-1.5 block text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      {children}
      {error ? (
        <span role="alert" className="mt-1.5 block text-xs text-red-300">
          {error}
        </span>
      ) : (
        hint && <span className="mt-1.5 block text-xs text-muted-foreground">{hint}</span>
      )}
    </>
  );
  return group ? (
    <div role="group" aria-label={label} className="mb-3 block">
      {body}
    </div>
  ) : (
    <label className="mb-3 block">{body}</label>
  );
}

export function DialogActions({
  onCancel,
  onSubmit,
  submitLabel,
  extra,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel: string;
  /** Tombol tambahan di kiri, mis. "Hapus" saat mengedit. */
  extra?: ReactNode;
}) {
  return (
    <div className="mt-5 flex gap-2">
      {extra}
      <button onClick={onCancel} className={`${btnGhost} flex-1 py-2.5`}>
        Batal
      </button>
      <button onClick={onSubmit} className={`${btnPrimary} flex-1 py-2.5 shadow-none`}>
        {submitLabel}
      </button>
    </div>
  );
}

/** Kolom rupiah yang otomatis diberi titik ribuan. `value` tetap digit polos. */
export function MoneyInput({
  value,
  onChange,
  placeholder = "0",
  autoFocus,
  large,
  invalid,
}: {
  value: string;
  onChange: (digits: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  large?: boolean;
  invalid?: boolean;
}) {
  return (
    <div className="relative">
      <span
        className={[
          "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground",
          large ? "text-lg" : "text-[15px]",
        ].join(" ")}
      >
        Rp
      </span>
      <input
        className={[
          inputClass,
          "tabular-nums",
          large ? "py-4 pl-12 font-serif text-3xl" : "pl-11",
          invalid ? "ring-1 ring-red-400/60" : "",
        ].join(" ")}
        inputMode="numeric"
        autoComplete="off"
        autoFocus={autoFocus}
        aria-invalid={invalid || undefined}
        value={groupDigits(value)}
        onChange={(e) =>
          onChange(e.target.value.replace(/\D/g, "").replace(/^0+/, "").slice(0, 13))
        }
        placeholder={placeholder}
      />
    </div>
  );
}

export type SegmentOption<T extends string> = { id: T; label: string; icon?: LucideIcon };

/** Pilihan tunggal berbentuk pil — gaya yang sama dengan tab di halaman lain. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  stretch,
}: {
  options: SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  stretch?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={[
        "gap-1 rounded-full bg-white/[0.05] p-1 hairline",
        stretch ? "flex w-full" : "inline-flex",
      ].join(" ")}
    >
      {options.map(({ id, label: text, icon: Icon }) => {
        const active = id === value;
        return (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(id)}
            className={[
              "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-xs transition",
              stretch ? "flex-1" : "",
              active
                ? "bg-gradient-to-br from-[var(--accent-1)] to-[var(--accent-2)] text-white"
                : "text-muted-foreground hover:text-foreground",
            ].join(" ")}
          >
            {Icon && <Icon className="size-3.5" />}
            {text}
          </button>
        );
      })}
    </div>
  );
}

/** Label kecil berhuruf kapital di atas angka — dipakai di semua kartu ringkasan. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{children}</p>
  );
}
