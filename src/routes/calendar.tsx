import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { HabitIcon } from "@/components/HabitIcon";
import { todayKey, useHydrated, useStore } from "@/lib/store";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Kalender · Rayhan" },
      { name: "description", content: "Ritual, milestone, dan refleksi dalam satu tampilan yang tenang." },
    ],
  }),
  component: CalendarPage,
});

function CalendarPage() {
  const hydrated = useHydrated();
  const habits = useStore((s) => s.habits);
  const completions = useStore((s) => s.completions);
  const toggleHabit = useStore((s) => s.toggleHabit);
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
  const monthLabel = first.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

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
  const selectedDone = selectedItems.habits.filter((x) => x.done).length;
  const selectedTotal = selectedItems.habits.length || 1;
  const selectedPct = Math.round((selectedDone / selectedTotal) * 100);
  const isFuture = selected > todayKey();

  return (
    <AppShell>
      <header className="animate-rise mb-8">
        <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          This Month
        </p>
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-4xl leading-tight capitalize md:text-5xl">{monthLabel}</h1>
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

      <div className="animate-rise card-cinema mb-6 p-4 md:p-6">
        <div className="mb-2 grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-widest text-muted-foreground">
          {["M", "S", "S", "R", "K", "J", "S"].map((d, i) => (
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
                    ? "bg-gradient-to-br from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] text-canvas shadow-[0_8px_20px_-6px_oklch(0.62_0.11_195/0.5)]"
                    : "hover:bg-black/[0.05]",
                ].join(" ")}
              >
                <span className="text-[13px]">{c.day}</span>
                {hydrated && c.ratio > 0 && (
                  <div className="absolute inset-x-1.5 bottom-1.5 h-1 overflow-hidden rounded-full bg-black/10">
                    <div
                      className={[
                        "h-full rounded-full",
                        selected === c.key ? "bg-canvas" : "bg-gold/80",
                      ].join(" ")}
                      style={{ width: `${c.ratio * 100}%` }}
                    />
                  </div>
                )}
                <div className="absolute right-1.5 top-1.5 flex gap-0.5">
                  {c.hasGoal && <span className="size-1 rounded-full bg-gold" />}
                  {c.hasJournal && <span className="size-1 rounded-full bg-emerald-400/70" />}
                </div>
              </button>
            ),
          )}
        </div>
      </div>

      <div className="animate-rise card-cinema p-5">
        <p className="mb-1 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          {new Date(selected).toLocaleDateString("id-ID", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h3 className="font-serif text-2xl">Today at a Glance</h3>

        {/* Progress bar with percentage */}
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-widest text-muted-foreground">
            <span>Habit Progress</span>
            <span className="tabular-nums text-foreground">
              {hydrated ? `${selectedDone}/${selectedItems.habits.length} · ${selectedPct}%` : "—"}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] transition-all duration-700"
              style={{ width: `${hydrated ? selectedPct : 0}%` }}
            />
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {selectedItems.goals.map((g) => (
            <div
              key={g.id}
              className="flex items-center gap-2 rounded-xl bg-gold/[0.06] px-3 py-2 text-sm hairline-gold"
            >
              <span className="size-1.5 rounded-full bg-gold" />
              Deadline · {g.title}
            </div>
          ))}

          <p className="pt-2 text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Habit Checklist
          </p>
          {selectedItems.habits.map(({ h, done }) => (
            <button
              key={h.id}
              disabled={isFuture}
              onClick={() => toggleHabit(h.id, selected)}
              className={[
                "flex w-full items-center gap-3 rounded-xl bg-black/[0.02] px-3 py-2.5 text-left text-sm transition hairline",
                isFuture ? "opacity-50" : "hover:bg-black/[0.05]",
              ].join(" ")}
            >
              <span
                className={[
                  "grid size-5 shrink-0 place-items-center rounded-md transition",
                  done
                    ? "bg-gold text-canvas"
                    : "ring-1 ring-black/20",
                ].join(" ")}
              >
                {done && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-black/[0.03] text-gold">
                <HabitIcon name={h.emoji} className="size-3.5" strokeWidth={1.75} />
              </span>
              <span
                className={[
                  "flex-1",
                  done ? "text-muted-foreground line-through" : "text-foreground",
                ].join(" ")}
              >
                {h.name}
              </span>
              {h.duration && (
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {h.duration}
                </span>
              )}
            </button>
          ))}
          {selectedItems.journal && (
            <div className="mt-3 rounded-xl bg-emerald-500/[0.06] px-3 py-3 text-sm hairline">
              <p className="mb-1 text-[10px] uppercase tracking-widest text-emerald-400/80">
                Jurnal
              </p>
              <p className="text-foreground/90">{selectedItems.journal.reflection}</p>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}