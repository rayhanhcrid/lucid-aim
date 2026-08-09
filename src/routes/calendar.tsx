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
  const focusItems = useStore((s) => s.focusItems);
  const toggleFocusItem = useStore((s) => s.toggleFocusItem);

  const [cursor, setCursor] = useState(() => {
    const d = nowDay();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState<string>(todayKey());

  const first = new Date(cursor.y, cursor.m, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const monthLabel = first.toLocaleDateString("id-ID", { month: "long", year: "numeric" });

  const focusRatioOf = (key: string) => {
    const list = focusItems[key] || [];
    if (!list.length) return null;
    return list.filter((f) => f.done).length / list.length;
  };

  const cells: (
    | null
    | {
        key: string;
        day: number;
        ratio: number;
        focusRatio: number | null;
        hasGoal: boolean;
        hasJournal: boolean;
      }
  )[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = todayKey(new Date(cursor.y, cursor.m, d));
    const done = habits.filter((h) => (completions[h.id] || []).includes(key)).length;
    const ratio = habits.length ? done / habits.length : 0;
    const hasGoal = goals.some((g) => g.deadline === key);
    const hasJournal = journal.some((j) => j.date === key);
    cells.push({ key, day: d, ratio, focusRatio: focusRatioOf(key), hasGoal, hasJournal });
  }

  // Jejak 14 hari terakhir untuk "fokus hari ini"
  const trail = Array.from({ length: 14 }, (_, i) => {
    const d = nowDay();
    d.setDate(d.getDate() - (13 - i));
    const key = todayKey(d);
    const list = focusItems[key] || [];
    const doneCount = list.filter((f) => f.done).length;
    return {
      key,
      day: d.getDate(),
      label: d.toLocaleDateString("id-ID", { weekday: "narrow" }),
      total: list.length,
      done: doneCount,
      pct: list.length ? Math.round((doneCount / list.length) * 100) : null,
    };
  });
  const trailDays = trail.filter((t) => t.pct !== null);
  const trailAvg = trailDays.length
    ? Math.round(trailDays.reduce((s, t) => s + (t.pct || 0), 0) / trailDays.length)
    : 0;

  const selectedItems = {
    habits: habits.map((h) => ({
      h,
      done: (completions[h.id] || []).includes(selected),
    })),
    goals: goals.filter((g) => g.deadline === selected),
    journal: journal.find((j) => j.date === selected),
    focus: focusItems[selected] || [],
  };
  const selectedDone = selectedItems.habits.filter((x) => x.done).length;
  const selectedTotal = selectedItems.habits.length || 1;
  const selectedPct = Math.round((selectedDone / selectedTotal) * 100);
  const selectedFocusDone = selectedItems.focus.filter((f) => f.done).length;
  const selectedFocusPct = selectedItems.focus.length
    ? Math.round((selectedFocusDone / selectedItems.focus.length) * 100)
    : 0;
  const isFuture = selected > todayKey();

  return (
    <AppShell>
      <header className="animate-rise mb-8">
        <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Bulan ini
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
                    ? "bg-gradient-to-br from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] text-white shadow-[0_8px_20px_-6px_oklch(0.62_0.11_195/0.5)]"
                    : "hover:bg-white/[0.06]",
                ].join(" ")}
              >
                <span className="text-[13px]">{c.day}</span>
                {hydrated && c.ratio > 0 && (
                  <div className="absolute inset-x-1.5 bottom-1.5 h-1 overflow-hidden rounded-full bg-white/15">
                    <div
                      className={[
                        "h-full rounded-full",
                        selected === c.key ? "bg-white" : "bg-gold/80",
                      ].join(" ")}
                      style={{ width: `${c.ratio * 100}%` }}
                    />
                  </div>
                )}
                <div className="absolute right-1.5 top-1.5 flex gap-0.5">
                  {c.hasGoal && <span className="size-1 rounded-full bg-gold" />}
                  {c.hasJournal && <span className="size-1 rounded-full bg-emerald-400/70" />}
                </div>
                {hydrated && c.focusRatio !== null && (
                  <div className="absolute inset-x-1.5 bottom-3 h-1 overflow-hidden rounded-full bg-white/10">
                    <div
                      className={[
                        "h-full rounded-full",
                        selected === c.key ? "bg-white/80" : "bg-[oklch(0.62_0.11_195)]",
                      ].join(" ")}
                      style={{ width: `${c.focusRatio * 100}%` }}
                    />
                  </div>
                )}
              </button>
            ),
          )}
        </div>
      </div>

      {/* Jejak fokus 14 hari */}
      <div className="animate-rise card-cinema mb-6 p-5">
        <div className="mb-4 flex items-end justify-between">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Jejak fokus · 14 hari
          </p>
          <span className="text-xs text-muted-foreground">
            rata-rata{" "}
            <span className="font-serif text-base text-foreground tabular-nums">
              {hydrated ? `${trailAvg}%` : "—"}
            </span>
          </span>
        </div>
        <div className="flex items-end justify-between gap-1">
          {trail.map((t) => (
            <button
              key={t.key}
              onClick={() => setSelected(t.key)}
              title={t.pct === null ? "Belum ada fokus" : `${t.done}/${t.total} · ${t.pct}%`}
              className="group flex flex-1 flex-col items-center gap-1.5"
            >
              <span className="text-[9px] tabular-nums text-muted-foreground opacity-0 transition group-hover:opacity-100">
                {hydrated && t.pct !== null ? `${t.pct}%` : ""}
              </span>
              <span className="flex h-16 w-full items-end justify-center">
                <span className="relative h-full w-2 overflow-hidden rounded-full bg-white/[0.08]">
                  <span
                    className="absolute inset-x-0 bottom-0 rounded-full bg-gradient-to-t from-[oklch(0.48_0.12_205)] to-[oklch(0.62_0.11_195)] transition-all duration-700"
                    style={{ height: `${hydrated ? (t.pct ?? 0) : 0}%` }}
                  />
                </span>
              </span>
              <span
                className={[
                  "text-[10px] tabular-nums",
                  selected === t.key ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                {t.day}
              </span>
            </button>
          ))}
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
            <span>Progres kebiasaan</span>
            <span className="tabular-nums text-foreground">
              {hydrated ? `${selectedDone}/${selectedItems.habits.length} · ${selectedPct}%` : "—"}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] transition-all duration-700"
              style={{ width: `${hydrated ? selectedPct : 0}%` }}
            />
          </div>
        </div>

        <div className="mt-5 space-y-2">
          {selectedItems.focus.length > 0 && (
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-widest text-muted-foreground">
                <span>Fokus hari itu</span>
                <span className="tabular-nums text-foreground">
                  {hydrated
                    ? `${selectedFocusDone}/${selectedItems.focus.length} · ${selectedFocusPct}%`
                    : "—"}
                </span>
              </div>
              <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.08]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] transition-all duration-700"
                  style={{ width: `${hydrated ? selectedFocusPct : 0}%` }}
                />
              </div>
              <div className="space-y-1.5">
                {selectedItems.focus.map((f) => (
                  <button
                    key={f.id}
                    disabled={isFuture}
                    onClick={() => toggleFocusItem(selected, f.id)}
                    className={[
                      "flex w-full items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2 text-left text-sm transition hairline",
                      isFuture ? "opacity-50" : "hover:bg-white/[0.06]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "grid size-5 shrink-0 place-items-center rounded-full transition",
                        f.done
                          ? "bg-gradient-to-br from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] text-white"
                          : "ring-1 ring-white/20",
                      ].join(" ")}
                    >
                      {f.done && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <span className={f.done ? "text-muted-foreground line-through" : ""}>
                      {f.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
            Daftar kebiasaan
          </p>
          {selectedItems.habits.map(({ h, done }) => (
            <button
              key={h.id}
              disabled={isFuture}
              onClick={() => toggleHabit(h.id, selected)}
              className={[
                "flex w-full items-center gap-3 rounded-xl bg-white/[0.03] px-3 py-2.5 text-left text-sm transition hairline",
                isFuture ? "opacity-50" : "hover:bg-white/[0.06]",
              ].join(" ")}
            >
              <span
                className={[
                  "grid size-5 shrink-0 place-items-center rounded-md transition",
                  done
                    ? "bg-gold text-white"
                    : "ring-1 ring-white/20",
                ].join(" ")}
              >
                {done && <Check className="size-3" strokeWidth={3} />}
              </span>
              <span className="grid size-7 place-items-center rounded-lg bg-white/[0.04] text-gold">
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