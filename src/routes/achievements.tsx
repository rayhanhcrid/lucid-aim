import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { currentStreak, longestStreak, useHydrated, useStore } from "@/lib/store";

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: "Pencapaian · Aura" },
      { name: "description", content: "Tonggak-tonggak tenang untuk diri yang sedang kamu tuju." },
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
    { title: "Cahaya pertama", hint: "Tuntaskan kebiasaan pertamamu", unlocked: totalDone >= 1 },
    { title: "Tujuh hari", hint: "Runtutan 7 hari", unlocked: bestStreak >= 7, progress: Math.min(1, bestStreak / 7) },
    { title: "Tiga puluh hari", hint: "Runtutan 30 hari", unlocked: bestStreak >= 30, progress: Math.min(1, bestStreak / 30) },
    { title: "Seratus hari", hint: "Runtutan 100 hari", unlocked: bestStreak >= 100, progress: Math.min(1, bestStreak / 100) },
    { title: "Klub seratus", hint: "100 kebiasaan tuntas", unlocked: totalDone >= 100, progress: Math.min(1, totalDone / 100) },
    { title: "Penjaga jurnal", hint: "Catatan pertama tersimpan", unlocked: journal.length >= 1 },
    { title: "Penuntas tujuan", hint: "Tuntaskan tujuan pertamamu", unlocked: goalsDone >= 1 },
    { title: "Api yang tenang", hint: "Runtutan aktif 14+ hari", unlocked: currStreak >= 14, progress: Math.min(1, currStreak / 14) },
    { title: "Penjaga hening", hint: "5 catatan jurnal", unlocked: journal.length >= 5, progress: Math.min(1, journal.length / 5) },
  ];

  return (
    <AppShell>
      <header className="animate-rise mb-8">
        <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Tonggak tenang
        </p>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">Pencapaian</h1>
      </header>

      <div className="animate-rise grid grid-cols-2 gap-3 md:grid-cols-3">
        {badges.map((b) => (
          <div
            key={b.title}
            className={[
              "rounded-[20px] p-5 transition",
              b.unlocked ? "card-cinema" : "bg-white/[0.02] hairline opacity-70",
            ].join(" ")}
          >
            <div
              className={[
                "mb-4 grid size-11 place-items-center rounded-full font-serif text-lg",
                b.unlocked ? "bg-gradient-to-br from-[oklch(0.82_0.12_75)] to-[oklch(0.55_0.15_35)] text-canvas shadow-[0_8px_20px_-6px_oklch(0.82_0.12_75/0.5)]" : "bg-white/[0.05] text-muted-foreground",
              ].join(" ")}
            >
              ✦
            </div>
            <p className="font-serif text-lg leading-tight">{b.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{b.hint}</p>
            {typeof b.progress === "number" && !b.unlocked && (
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
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