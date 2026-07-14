import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { currentStreak, longestStreak, useHydrated, useStore } from "@/lib/store";

export const Route = createFileRoute("/achievements")({
  head: () => ({
    meta: [
      { title: "Achievements · Aura" },
      { name: "description", content: "Quiet milestones for the person you're becoming." },
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
    { title: "First light", hint: "Complete your first habit", unlocked: totalDone >= 1 },
    { title: "Seven days", hint: "7-day streak", unlocked: bestStreak >= 7, progress: Math.min(1, bestStreak / 7) },
    { title: "Thirty days", hint: "30-day streak", unlocked: bestStreak >= 30, progress: Math.min(1, bestStreak / 30) },
    { title: "Hundred days", hint: "100-day streak", unlocked: bestStreak >= 100, progress: Math.min(1, bestStreak / 100) },
    { title: "Century club", hint: "100 habits completed", unlocked: totalDone >= 100, progress: Math.min(1, totalDone / 100) },
    { title: "Journal keeper", hint: "First journal entry", unlocked: journal.length >= 1 },
    { title: "Goal finisher", hint: "Complete your first goal", unlocked: goalsDone >= 1 },
    { title: "Steady flame", hint: "Currently on a 14+ day streak", unlocked: currStreak >= 14, progress: Math.min(1, currStreak / 14) },
    { title: "Quiet keeper", hint: "5 journal entries", unlocked: journal.length >= 5, progress: Math.min(1, journal.length / 5) },
  ];

  return (
    <AppShell>
      <header className="animate-rise mb-8">
        <p className="mb-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          Quiet milestones
        </p>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">Achievements</h1>
      </header>

      <div className="animate-rise grid grid-cols-2 gap-3 md:grid-cols-3">
        {badges.map((b) => (
          <div
            key={b.title}
            className={[
              "rounded-[20px] p-5 hairline transition",
              b.unlocked ? "bg-surface" : "bg-white/[0.02] opacity-70",
            ].join(" ")}
          >
            <div
              className={[
                "mb-4 grid size-11 place-items-center rounded-full font-serif text-lg",
                b.unlocked ? "bg-foreground text-canvas" : "bg-white/[0.05] text-muted-foreground",
              ].join(" ")}
            >
              ✦
            </div>
            <p className="font-serif text-lg leading-tight">{b.title}</p>
            <p className="mt-1 text-xs text-muted-foreground">{b.hint}</p>
            {typeof b.progress === "number" && !b.unlocked && (
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-foreground/70"
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