import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { todayKey, useHydrated, useStore } from "@/lib/store";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar · Aura" },
      { name: "description", content: "Rituals, milestones, and reflections in one calm view." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const hydrated = useHydrated();
  const habits = useStore((s) => s.habits);
  const completions = useStore((s) => s.completions);
  const goals = useStore((s) => s.goals);
  const journal = useStore((s) => s.journal);

  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState<string>(todayKey());

  const first = new Date(cursor.y, cursor.m, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const monthLabel = first.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const cells: (null | { key: string; day: number; ratio: number; hasGoal: boolean; hasJournal: boolean })[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = todayKey(new Date(cursor.y, cursor.m, d));
    const done = habits.filter((h) => (completions[h.id] || []).includes(key)).length;
    const ratio = habits.length ? done / habits.length : 0;
    const hasGoal = goals.some((g) => g.deadline === key);
    const hasJournal = journal.some((j) => j.date === key);
    cells.push({ key, day: d, ratio, hasGoal, hasJournal });
  }

  const selectedItems = {
    habits: habits.map((h) => ({
      h,
      done: (completions[h.id] || []).includes(selected),
    })),
    goals: goals.filter((g) => g.deadline === selected),
    journal: journal.find((j) => j.date === selected),
  };

  return (
    <AppShell>
      <header className="animate-rise mb-8">
        <p className="mb-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          The month
        </p>
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-4xl leading-tight md:text-5xl">{monthLabel}</h1>
          <div className="flex items-center gap-1">
            <button
              onClick={() =>
                setCursor((c) => ({
                  y: c.m === 0 ? c.y - 1 : c.y,
                  m: c.m === 0 ? 11 : c.m - 1,
                }))
              }
              className="grid size-9 place-items-center rounded-full bg-surface text-muted-foreground hairline hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              onClick={() =>
                setCursor((c) => ({
                  y: c.m === 11 ? c.y + 1 : c.y,
                  m: c.m === 11 ? 0 : c.m + 1,
                }))
              }
              className="grid size-9 place-items-center rounded-full bg-surface text-muted-foreground hairline hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="animate-rise mb-6 rounded-[24px] bg-surface p-4 hairline md:p-6">
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <div key={i}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((c, i) =>
            c === null ? (
              <div key={i} />
            ) : (
              <button
                key={c.key}
                onClick={() => setSelected(c.key)}
                className={[
                  "relative aspect-square rounded-xl p-1.5 text-left transition",
                  selected === c.key
                    ? "bg-foreground text-canvas"
                    : "hover:bg-white/[0.04]",
                ].join(" ")}
              >
                <span className="text-[13px]">{c.day}</span>
                {hydrated && c.ratio > 0 && (
                  <div className="absolute inset-x-1.5 bottom-1.5 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={[
                        "h-full rounded-full",
                        selected === c.key ? "bg-canvas" : "bg-foreground/80",
                      ].join(" ")}
                      style={{ width: `${c.ratio * 100}%` }}
                    />
                  </div>
                )}
                <div className="absolute right-1.5 top-1.5 flex gap-0.5">
                  {c.hasGoal && <span className="size-1 rounded-full bg-amber-400/70" />}
                  {c.hasJournal && <span className="size-1 rounded-full bg-emerald-400/70" />}
                </div>
              </button>
            ),
          )}
        </div>
      </div>

      <div className="animate-rise rounded-[24px] bg-surface p-5 hairline">
        <p className="mb-1 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          {new Date(selected).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h3 className="font-serif text-2xl">The day at a glance</h3>
        <div className="mt-4 space-y-2">
          {selectedItems.goals.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-2 rounded-xl bg-amber-500/5 px-3 py-2 text-sm"
            >
              <span className="size-1.5 rounded-full bg-amber-400" />
              Deadline · {g.title}
            </div>
          ))}
          {selectedItems.habits.map(({ h, done }) => (
            <div
              key={h.id}
              className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm"
            >
              <span aria-hidden>{h.emoji}</span>
              <span
                className={done ? "text-muted-foreground line-through" : "text-foreground"}
              >
                {h.name}
              </span>
            </div>
          ))}
          {selectedItems.journal && (
            <div className="rounded-xl bg-emerald-500/5 px-3 py-3 text-sm">
              <p className="mb-1 text-[10px] uppercase tracking-widest text-emerald-400/80">
                Journal
              </p>
              <p className="text-foreground/90">{selectedItems.journal.reflection}</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}