import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Sparkles } from "lucide-react";
import { VoiceInput } from "@/components/VoiceInput";
import { todayKey, useStore } from "@/lib/store";
import type { TxDraft } from "@/lib/finance";
import { normalizeParsed, parseLocally, type ParsedTx } from "@/lib/finance-parse";
import { parseTransactionText } from "@/lib/finance-ai.functions";

const AI_TIMEOUT_MS = 15_000;

const AI_DOWN: Record<string, string> = {
  RATE_LIMIT: "AI lagi ramai",
  NO_CREDITS: "Kredit AI habis",
};

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error("TIMEOUT")), ms);
    p.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      },
    );
  });
}

/**
 * "Isi cepat": ketik atau ucapkan transaksi dalam kalimat biasa, lalu form di
 * bawahnya terisi sendiri. AI dulu; kalau AI tidak tersedia, pengenal sederhana
 * di perangkat yang mengisi — hasilnya tetap dicek pengguna sebelum disimpan.
 */
export function SmartEntry({
  fallbackAccountId,
  onParsed,
}: {
  fallbackAccountId: string;
  onParsed: (drafts: TxDraft[]) => void;
}) {
  const accounts = useStore((s) => s.finAccounts);
  const categories = useStore((s) => s.finCategories);

  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<{ tone: "ok" | "warn" | "error"; message: string } | null>(
    null,
  );
  // Hasil yang datang setelah dialog ditutup diabaikan. Di-set ulang tiap
  // terpasang karena StrictMode (dev) memasang–melepas–memasang efek sekali.
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function run(input: string) {
    const sentence = input.trim();
    if (!sentence || busy) return;
    setBusy(true);
    setStatus(null);

    const today = todayKey();
    const accountRefs = accounts.map(({ id, name, type }) => ({ id, name, type }));
    const categoryRefs = categories.map(({ id, name, type }) => ({ id, name, type }));

    let items: ParsedTx[] = [];
    let aiProblem: string | null = null;
    try {
      const res = await withTimeout(
        parseTransactionText({
          data: { text: sentence, today, accounts: accountRefs, categories: categoryRefs },
        }),
        AI_TIMEOUT_MS,
      );
      if (res.error) aiProblem = res.error;
      else items = res.items;
    } catch (e) {
      aiProblem = e instanceof Error ? e.message : "UNKNOWN";
    }
    if (!alive.current) return;

    // AI gagal, atau tidak menemukan nominal → coba pengenal lokal.
    const usedLocal = aiProblem !== null || items.length === 0;
    if (usedLocal) {
      items = parseLocally(sentence, accountRefs, categoryRefs, today).filter(
        (it) => it.amount !== undefined,
      );
    }

    setBusy(false);
    if (items.length === 0) {
      setStatus({
        tone: "error",
        message: 'Belum ketemu nominalnya. Coba sebut jumlahnya, mis. "kopi 25rb pakai gopay".',
      });
      return;
    }

    onParsed(normalizeParsed(items, { accounts, categories, today, fallbackAccountId }));
    const many = items.length > 1 ? ` ${items.length} transaksi` : "";
    setStatus(
      usedLocal && aiProblem
        ? {
            tone: "warn",
            message: `${AI_DOWN[aiProblem] ?? "AI sedang tidak tersedia"} — terisi${many} pakai pengenal sederhana. Cek dulu sebelum simpan.`,
          }
        : { tone: "ok", message: `Terisi otomatis${many}. Cek dulu, lalu simpan.` },
    );
  }

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 rounded-2xl bg-white/[0.04] py-1.5 pl-3.5 pr-1.5 hairline focus-within:ring-2 focus-within:ring-[var(--gold)]/50">
        <Sparkles className="size-4 shrink-0 text-gold" strokeWidth={1.75} aria-hidden="true" />
        <input
          className="min-w-0 flex-1 bg-transparent py-1.5 text-[15px] outline-none placeholder:text-muted-foreground"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void run(text);
            }
          }}
          placeholder="kopi 25rb pakai gopay"
          aria-label="Isi cepat: tulis transaksi dalam kalimat biasa"
          enterKeyHint="go"
          maxLength={500}
          disabled={busy}
          autoFocus
        />
        <VoiceInput
          label="Ucapkan transaksi"
          onText={(t) => {
            setText(t);
            void run(t);
          }}
        />
        <button
          type="button"
          onClick={() => void run(text)}
          disabled={busy || !text.trim()}
          className="grid size-8 shrink-0 place-items-center rounded-full bg-gold text-white transition active:scale-95 disabled:opacity-30"
          aria-label="Isi otomatis"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
        </button>
      </div>
      <p
        aria-live="polite"
        className={[
          "mt-1.5 min-h-4 px-1 text-[11px]",
          status?.tone === "error"
            ? "text-red-300"
            : status?.tone === "warn"
              ? "text-[oklch(0.83_0.12_80)]"
              : "text-muted-foreground",
        ].join(" ")}
      >
        {busy
          ? "Membaca…"
          : (status?.message ??
            "Ketik atau tekan mikrofon lalu bicara. Bisa beberapa sekaligus: makan 20rb, parkir 5rb kemarin.")}
      </p>
    </div>
  );
}
