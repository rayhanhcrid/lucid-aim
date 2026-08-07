import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  AlertCircle,
  Target,
  BookOpen,
  Loader2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { HabitIcon } from "@/components/HabitIcon";
import { EmptyState } from "@/components/EmptyState";
import { CardSkeleton } from "@/components/Skeleton";
import { todayKey, useHydrated, useStore } from "@/lib/store";
import { buildWeeklyReview, fallbackAdvice, summarizeForAI } from "@/lib/review";
import { getWeeklyAdvice } from "@/lib/review.functions";
import { useCountUp } from "@/lib/use-count-up";

export const Route = createFileRoute("/review")({
  head: () => ({
    meta: [
      { title: "Rekap Mingguan · Rayhan" },
      {
        name: "description",
        content:
          "Rekap tujuh hari terakhir: skor kebiasaan, mood, progres tujuan, dan saran fokus buat minggu depan.",
      },
      { property: "og:title", content: "Rekap Mingguan · Rayhan" },
      {
        property: "og:description",
        content: "Lihat ritme mingguanmu dan dapat saran fokus untuk minggu depan.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReviewPage,
});

function ReviewPage() {
  const hydrated = useHydrated();
  const habits = useStore((s) => s.habits);
  const completions = useStore((s) => s.completions);
  const goals = useStore((s) => s.goals);
  const journal = useStore((s) => s.journal);
  const upsertJournal = useStore((s) => s.upsertJournal);

  const review = useMemo(
    () => buildWeeklyReview({ habits, completions, goals, journal }),
    [habits, completions, goals, journal],
  );

  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const score = useCountUp(hydrated ? review.score : 0, 1000);

  async function generateAdvice() {
    setLoading(true);
    try {
      const res = await getWeeklyAdvice({ data: summarizeForAI(review) });
      if (res.advice) {
        setAdvice(res.advice);
      } else {
        if (res.error === "RATE_LIMIT") toast.error("Lagi ramai — coba lagi sebentar lagi ya.");
        else if (res.error === "NO_CREDITS") toast.error("Kredit AI habis. Tambah kredit untuk saran otomatis.");
        setAdvice(fallbackAdvice(review));
      }
    } catch {
      setAdvice(fallbackAdvice(review));
    } finally {
      setLoading(false);
    }
  }

  function saveToJournal() {
    const text = advice || fallbackAdvice(review);
    const date = todayKey();
    const existing = journal.find((j) => j.date === date);
    upsertJournal({
      id: existing?.id,
      date,
      mood: existing?.mood ?? 3,
      energy: existing?.energy ?? 3,
      gratitude: existing?.gratitude ?? "",
      winToday: existing?.winToday ?? "",
      tomorrowFocus: existing?.tomorrowFocus ?? "",
      reflection: [
        existing?.reflection?.trim(),
        `Rekap ${review.rangeLabel} — skor ${review.score}%. ${text}`,
      ]
        .filter(Boolean)
        .join("\n\n"),
    });
    toast.success("Rekap tersimpan di jurnal hari ini.");
  }

  const DeltaIcon = review.delta > 0 ? TrendingUp : review.delta < 0 ? TrendingDown : Minus;

  return (
    <AppShell>
      <header className="animate-rise mb-8">
        <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          7 hari terakhir · {review.rangeLabel}
        </p>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">Rekap Mingguan</h1>
      </header>

      {!hydrated ? (
        <CardSkeleton rows={3} />
      ) : habits.length === 0 ? (
        <EmptyState
          icon={Sparkles}
          title="Belum ada yang bisa direkap"
        />
      ) : (
        <div className="space-y-4">
          {/* Skor */}
          <section className="card-cinema animate-rise p-6">
            <div className="flex items-end justify-between gap-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  Skor minggu ini
                </p>
                <p className="mt-1 font-serif text-6xl leading-none tabular-nums">{score}%</p>
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-3 py-1 text-xs text-muted-foreground hairline">
                  <DeltaIcon
                    className={[
                      "size-3.5",
                      review.delta > 0 ? "text-gold" : review.delta < 0 ? "text-destructive" : "",
                    ].join(" ")}
                  />
                  {review.delta === 0
                    ? "Sama seperti minggu lalu"
                    : `${review.delta > 0 ? "+" : ""}${review.delta} poin dari minggu lalu`}
                </p>
              </div>
              <p className="text-right text-xs text-muted-foreground">
                {review.totalDone}/{review.totalPossible}
                <br />
                centang
              </p>
            </div>

            <div className="mt-6 flex items-end justify-between gap-2">
              {review.days.map((d, i) => (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-24 w-full items-end justify-center rounded-xl bg-white/[0.04] p-1">
                    <div
                      className="w-full rounded-lg bg-gradient-to-t from-[oklch(0.48_0.12_205)] to-[oklch(0.62_0.11_195)] transition-[height] duration-700 ease-out"
                      style={{
                        height: `${Math.max(4, d.pct)}%`,
                        transitionDelay: `${i * 60}ms`,
                      }}
                      title={`${d.done}/${d.total}`}
                    />
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {d.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Paling konsisten & yang bolong */}
          <div className="grid gap-4 md:grid-cols-2">
            <section className="card-cinema animate-rise p-5">
              <p className="mb-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                <Flame className="size-3.5 text-gold" /> Paling konsisten
              </p>
              {review.best.length === 0 ? (
                <p className="text-sm text-muted-foreground">Belum ada centang minggu ini.</p>
              ) : (
                <ul className="space-y-3">
                  {review.best.map((h) => (
                    <li key={h.id} className="flex items-center gap-3">
                      <span className="grid size-8 place-items-center rounded-xl bg-white/[0.06] text-gold">
                        <HabitIcon name={h.emoji} className="size-4" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">{h.name}</span>
                      <span className="text-xs tabular-nums text-muted-foreground">{h.done}/7</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="card-cinema animate-rise p-5">
              <p className="mb-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                <AlertCircle className="size-3.5" /> Yang bolong
              </p>
              {review.weakest.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Semua kebiasaan penuh minggu ini. Luar biasa.
                </p>
              ) : (
                <ul className="space-y-3">
                  {review.weakest.map((h) => (
                    <li key={h.id}>
                      <div className="flex items-center gap-3">
                        <span className="grid size-8 place-items-center rounded-xl bg-white/[0.06] text-muted-foreground">
                          <HabitIcon name={h.emoji} className="size-4" strokeWidth={1.75} />
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm">{h.name}</span>
                        <span className="text-xs tabular-nums text-muted-foreground">{h.done}/7</span>
                      </div>
                      {h.missedDays.length > 0 && (
                        <p className="mt-1 pl-11 text-[11px] text-muted-foreground">
                          Terlewat: {h.missedDays.join(", ")}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Mood & energi */}
          <section className="card-cinema animate-rise p-5">
            <p className="mb-4 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <BookOpen className="size-3.5" /> Mood & energi
            </p>
            {review.journalCount === 0 ? (
              <p className="text-sm text-muted-foreground">Belum ada jurnal minggu ini.</p>
            ) : (
              <>
                <div className="flex gap-8">
                  <div>
                    <p className="font-serif text-3xl leading-none">{review.avgMood ?? "—"}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Rata mood
                    </p>
                  </div>
                  <div>
                    <p className="font-serif text-3xl leading-none">{review.avgEnergy ?? "—"}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Rata energi
                    </p>
                  </div>
                  <div>
                    <p className="font-serif text-3xl leading-none">{review.journalCount}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                      Jurnal terisi
                    </p>
                  </div>
                </div>
                <MoodSpark days={review.days} />
                {review.moodLink && (
                  <p className="mt-4 text-pretty text-sm text-muted-foreground">{review.moodLink}</p>
                )}
              </>
            )}
          </section>

          {/* Tujuan */}
          <section className="card-cinema animate-rise p-5">
            <p className="mb-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <Target className="size-3.5" /> Progres tujuan
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="text-foreground">{review.milestonesDone}</span> milestone sudah dicentang
              secara keseluruhan.
            </p>
            {review.openWeeklyGoals.length > 0 && (
              <ul className="mt-4 space-y-3">
                {review.openWeeklyGoals.map((g) => (
                  <li key={g.title}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="truncate">{g.title}</span>
                      <span className="tabular-nums text-muted-foreground">{g.progress}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] transition-[width] duration-700 ease-out"
                        style={{ width: `${g.progress}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Saran AI */}
          <section className="card-cinema animate-rise p-6">
            <p className="mb-3 inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              <Sparkles className="size-3.5 text-gold" /> Fokus minggu depan
            </p>
            {advice ? (
              <p className="text-pretty font-serif text-xl italic leading-relaxed">{advice}</p>
            ) : (
              <p className="text-pretty text-sm text-muted-foreground">
                Buat ringkasan singkat berdasarkan angka minggu ini — cuma statistik yang dikirim,
                bukan isi jurnalmu.
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                onClick={generateAdvice}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] px-4 py-2 text-sm font-medium text-white shadow-[0_8px_20px_-6px_oklch(0.62_0.11_195/0.5)] transition-transform active:scale-95 disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                {advice ? "Buat ulang" : "Buatkan saran"}
              </button>
              {advice && (
                <button
                  onClick={saveToJournal}
                  className="inline-flex items-center gap-2 rounded-full bg-white/[0.05] px-4 py-2 text-sm hairline transition hover:bg-white/[0.09]"
                >
                  <Check className="size-4" /> Simpan ke jurnal
                </button>
              )}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}

function MoodSpark({ days }: { days: { key: string; label: string; mood: number | null }[] }) {
  const points = days.map((d, i) => {
    const x = (i / Math.max(1, days.length - 1)) * 100;
    const y = d.mood ? 100 - ((d.mood - 1) / 4) * 100 : null;
    return { x, y, label: d.label };
  });
  const path = points
    .filter((p) => p.y !== null)
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");

  return (
    <div className="mt-5">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-20 w-full">
        <path
          d={path}
          fill="none"
          stroke="oklch(0.62 0.11 195)"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {points
          .filter((p) => p.y !== null)
          .map((p) => (
            <circle key={p.label + p.x} cx={p.x} cy={p.y as number} r="1.6" fill="oklch(0.62 0.11 195)" />
          ))}
      </svg>
      <div className="mt-1 flex justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
        {days.map((d) => (
          <span key={d.key}>{d.label}</span>
        ))}
      </div>
    </div>
  );
}