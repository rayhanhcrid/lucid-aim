import { useState } from "react";
import { Check, ChevronDown, Copy, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { CLOUD_ROW_ID, supabase } from "@/lib/supabase";
import { buildWidgetScript } from "@/lib/widget/build-script";
import { btnGhost, btnPrimary } from "./ui";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Kartu pemasangan widget saldo iPhone. iOS tidak mengizinkan web app punya
 * widget, jadi jalurnya lewat app Scriptable: salin skrip → tempel → pasang.
 */
export function WidgetSetup() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  /** Skrip untuk disalin manual kalau browser menolak akses clipboard. */
  const [manual, setManual] = useState<string | null>(null);

  const ready = !!supabase && !!SUPABASE_URL && !!ANON_KEY;

  const copy = () => {
    if (!SUPABASE_URL || !ANON_KEY) return;
    const script = buildWidgetScript({
      supabaseUrl: SUPABASE_URL,
      anonKey: ANON_KEY,
      rowId: CLOUD_ROW_ID,
      appUrl: window.location.origin,
    });
    if (!navigator.clipboard) {
      setManual(script);
      return;
    }
    // writeText dipanggil langsung di handler ketukan — Safari iOS menolak
    // akses clipboard kalau sudah lewat dari gestur pengguna.
    navigator.clipboard.writeText(script).then(
      () => {
        setCopied(true);
        setManual(null);
        toast.success("Skrip widget tersalin. Tempel di Scriptable.");
        setTimeout(() => setCopied(false), 2500);
      },
      () => setManual(script),
    );
  };

  return (
    <section className="animate-rise card-cinema p-5 md:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-gold hairline">
          <Smartphone className="size-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="font-serif text-xl">Widget saldo di iPhone</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Tampilkan kekayaan bersih di Home Screen atau lock screen lewat app gratis{" "}
            <a
              href="https://scriptable.app"
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline underline-offset-4"
            >
              Scriptable
            </a>
            .
          </p>
        </div>
      </div>

      {ready ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <button onClick={copy} className={btnPrimary}>
            {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
            {copied ? "Tersalin" : "Salin skrip widget"}
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            className={`${btnGhost} text-xs`}
          >
            Cara pasang
            <ChevronDown className={["size-3.5 transition", open ? "rotate-180" : ""].join(" ")} />
          </button>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          Sinkron cloud belum aktif, jadi widget belum bisa membaca saldo.
        </p>
      )}

      {manual && (
        <div className="mt-4">
          <p className="mb-1.5 text-xs text-muted-foreground">
            Browser menolak menyalin otomatis. Tahan teks di bawah → Pilih Semua → Salin.
          </p>
          <textarea
            readOnly
            value={manual}
            onFocus={(e) => e.currentTarget.select()}
            className="h-32 w-full resize-none rounded-2xl bg-white/[0.04] p-3 font-mono text-[11px] text-muted-foreground outline-none hairline"
          />
        </div>
      )}

      {open && (
        <ol className="mt-5 list-decimal space-y-2.5 border-t border-white/[0.07] pt-4 pl-5 text-sm text-muted-foreground marker:text-gold">
          <li>
            Pasang <span className="text-foreground">Scriptable</span> dari App Store.
          </li>
          <li>
            Buka halaman ini <span className="text-foreground">di iPhone</span>, lalu ketuk{" "}
            <span className="text-foreground">Salin skrip widget</span>.
          </li>
          <li>
            Buka Scriptable → ketuk <span className="text-foreground">+</span> → tempel → ketuk
            judul di atas dan ganti jadi <span className="text-foreground">Saldo</span> →{" "}
            <span className="text-foreground">Done</span>.
          </li>
          <li>
            <span className="text-foreground">Home Screen:</span> tahan layar kosong → Edit → tambah
            widget → Scriptable → pilih ukuran → ketuk widget-nya → Script:{" "}
            <span className="text-foreground">Saldo</span>.
          </li>
          <li>
            <span className="text-foreground">Lock screen:</span> tahan lock screen → Sesuaikan →
            ketuk kotak widget → Scriptable → ketuk widget-nya → Script:{" "}
            <span className="text-foreground">Saldo</span>, Parameter:{" "}
            <code className="rounded bg-white/[0.08] px-1.5 py-0.5 text-foreground">privat</code>{" "}
            supaya nominalnya tersamar saat HP terkunci.
          </li>
          <li className="list-none pt-1 text-xs">
            Angkanya diperbarui sendiri tiap ±15–30 menit (iPhone yang mengatur jadwalnya). Skrip
            ini berisi kunci akses data cloud-mu — jangan dibagikan ke orang lain.
          </li>
        </ol>
      )}
    </section>
  );
}
