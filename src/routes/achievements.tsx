import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { currentStreak, longestStreak, useHydrated, useStore } from "@/lib/store";

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: "Pencapaian · Rayhan" },
      { name: "description", content: "Kemenangan kecil yang menandai perjalanan kamu." },
    ],
  }),
  component: AchievementsPage,
});

type Badge = { title: string; hint: string; unlocked: boolean; progress?: number };

function AchievementsPage() {
  const hydrated = useHydrated();
  const habits = useStore((s) => s.habits);
  const completions = useStore((s) => s.completions);
  const goals = useStore((s) => s.goals);
  const journal = useStore((s) => s.journal);

  const bestStreak = hydrated ? Math.max(0, ...habits.map((h) => longestStreak(completions[h.id] || []))) : 0;
  const currStreak = hydrated ? Math.max(0, ...habits.map((h) => currentStreak(completions[h.id] || []))) : 0;
  const totalDone = Object.values(completions).flat().length;
  const goalsDone = goals.filter((g) => g.progress >= 100).length;

  const badges: Badge[] = [
    { title: "Langkah Pertama", hint: "Tuntaskan kebiasaan pertama kamu", unlocked: totalDone >= 1 },
    { title: "Runtutan 7 Hari", hint: "Konsisten 7 hari berturut-turut", unlocked: bestStreak >= 7, progress: Math.min(1, bestStreak / 7) },
    { title: "Runtutan 30 Hari", hint: "Konsisten 30 hari berturut-turut", unlocked: bestStreak >= 30, progress: Math.min(1, bestStreak / 30) },
    { title: "Runtutan 100 Hari", hint: "Konsisten 100 hari berturut-turut", unlocked: bestStreak >= 100, progress: Math.min(1, bestStreak / 100) },
    { title: "Klub 100", hint: "100 kebiasaan tuntas", unlocked: totalDone >= 100, progress: Math.min(1, totalDone / 100) },
    { title: "Penjaga Jurnal", hint: "Catatan pertama tersimpan", unlocked: journal.length >= 1 },
    { title: "Penakluk Tujuan", hint: "Tuntaskan tujuan pertama kamu", unlocked: goalsDone >= 1 },
    { title: "Api yang Tenang", hint: "Runtutan aktif 14 hari lebih", unlocked: currStreak >= 14, progress: Math.min(1, currStreak / 14) },
    { title: "Penulis Setia", hint: "5 catatan jurnal tersimpan", unlocked: journal.length >= 5, progress: Math.min(1, journal.length / 5) },
  ];

  return (
    <AppShell>
      <header className="animate-rise mb-8">
        <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Kemenangan kecil
        </p>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">Pencapaian</h1>
      </header>

      <div className="animate-rise grid grid-cols-2 gap-3 md:grid-cols-3">
        {badges.map((b) => (
          <div
            key={b.title}
            className={[
              "rounded-[20px] p-5 transition",
              b.unlocked ? "card-cinema" : "bg-white/[0.03] hairline opacity-70",
            ].join(" ")}
          >
            <div
              className={[
                "mb-4 grid size-11 place-items-center rounded-full font-serif text-lg",
                b.unlocked ? "bg-gradient-to-br from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] text-white shadow-[0_8px_20px_-6px_oklch(0.62_0.11_195/0.5)]" : "bg-white/[0.06] text-muted-foreground",
              ].join(" ")}
            >
              ✦
            </div>
            <p className="font-serif text-lg leading-tight">{b.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{b.hint}</p>
            {typeof b.progress === "number" && !b.unlocked && (
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-gold/70"
                  style={{ width: `${Math.round(b.progress * 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </AppShell>
  );
}