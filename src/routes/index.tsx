import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ArrowUpRight, Flame, Clock, Sparkles, Plus, X, Target } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProgressRing } from "@/components/ProgressRing";
import { HabitIcon } from "@/components/HabitIcon";
import { currentStreak, todayKey, useHydrated, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: Index,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 5)  return "Masih terjaga";
  if (h < 11) return "Selamat pagi";
  if (h < 15) return "Selamat siang";
  if (h < 18) return "Selamat sore";
  if (h < 22) return "Selamat malam";
  return "Sudah larut";
}

function Index() {
  const hydrated = useHydrated();
  const name = useStore((s) => s.name);
  const habits = useStore((s) => s.habits);
  const completions = useStore((s) => s.completions);
  const toggleHabit = useStore((s) => s.toggleHabit);
  const todaysFocus = useStore((s) => s.todaysFocus);
  const schedules = useStore((s) => s.schedules);
  const addScheduleItem = useStore((s) => s.addScheduleItem);
  const removeScheduleItem = useStore((s) => s.removeScheduleItem);
  const goals = useStore((s) => s.goals);
  const becoming = useStore((s) => s.becoming);
  const vision = useStore((s) => s.vision);
  const visionYear = useStore((s) => s.visionYear);

  const today = todayKey();
  const todaysSchedule = schedules[today] || [];
  const weeklyGoals = goals.filter((g) => g.horizon === "weekly");
  const weeklyPct = weeklyGoals.length
    ? Math.round(weeklyGoals.reduce((s, g) => s + g.progress, 0) / weeklyGoals.length)
    : 0;
  const doneToday = habits.filter((h) => (completions[h.id] || []).includes(today)).length;
  const total = habits.length || 1;
  const pct = Math.round((doneToday / total) * 100);

  const overallStreak = Math.max(
    0,
    ...habits.map((h) => currentStreak(completions[h.id] || [])),
  );

  const dateLabel = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const nowHHmm = new Date().toTimeString().slice(0, 5);
  const nextScheduleIdx = todaysSchedule.findIndex((s) => s.time >= nowHHmm);

  return (
    <AppShell>
      <header className="animate-rise mb-10">
        <p className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          <span className="inline-block size-1 rounded-full bg-gold animate-breathe" />
          {dateLabel}
        </p>
        <h1 className="font-serif text-5xl leading-[1.05] text-balance md:text-6xl">
          {greeting()},{" "}
          <span className="shimmer-text italic">{name}.</span>
        </h1>
        <p className="mt-4 max-w-[52ch] text-pretty text-muted-foreground">
          Hari ini belum ditulis. Satu niat sudah cukup untuk memulainya.
        </p>
      </header>

      {/* Focus + Ring */}
      <section className="animate-rise mb-10 grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto] md:gap-10">
        <div>
          <p className="mb-4 flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            <Sparkles className="size-3 text-gold animate-breathe" />
            Fokus hari ini
          </p>
          <ul className="space-y-2">
            {todaysFocus.map((f, i) => (
              <li
                key={i}
                className="group flex items-center gap-3 rounded-2xl bg-surface/50 px-3.5 py-2.5 text-[15px] text-foreground/90 hairline transition hover:bg-surface animate-float-y"
                style={{ animationDelay: `${i * 0.25}s` }}
              >
                <span className="relative grid size-2 place-items-center">
                  <span className="absolute inset-0 rounded-full bg-gold/40 blur-[3px] animate-breathe" />
                  <span className="relative size-1.5 rounded-full bg-gold" />
                </span>
                <span className="flex-1">{f}</span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 opacity-0 transition group-hover:opacity-100">
                  #{i + 1}
                </span>
              </li>
            ))}
          </ul>
          {overallStreak > 0 && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-surface/70 px-3 py-1.5 hairline-gold">
              <Flame className="size-3.5 text-gold" />
              <span className="text-xs text-muted-foreground">
                Beruntun {overallStreak} hari · jaga apinya
              </span>
            </div>
          )}
        </div>
        <div className="flex md:block">
          <ProgressRing
            value={hydrated ? pct : 0}
            label={`${hydrated ? pct : 0}%`}
            sub={`${doneToday} dari ${habits.length}`}
          />
        </div>
      </section>

      {/* Today's schedule */}
      <ScheduleSection
        date={today}
        items={todaysSchedule}
        nextIdx={nextScheduleIdx}
        nowHHmm={nowHHmm}
        hydrated={hydrated}
        onAdd={(t, l) => addScheduleItem(today, t, l)}
        onRemove={(id) => removeScheduleItem(today, id)}
      />

      {/* Weekly goals */}
      {weeklyGoals.length > 0 && (
        <section className="animate-rise mb-10">
          <div className="mb-4 flex items-end justify-between">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              <Target className="size-3" />
              Tujuan minggu ini
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="font-serif text-base text-foreground tabular-nums">{weeklyPct}%</span>
              <span>rata-rata</span>
            </div>
          </div>
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-black/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] transition-all duration-1000"
              style={{ width: `${hydrated ? weeklyPct : 0}%` }}
            />
          </div>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
            {weeklyGoals.map((g, i) => {
              const done = g.milestones.filter((m) => m.done).length;
              return (
                <Link
                  key={g.id}
                  to="/goals"
                  className="card-cinema group animate-float-y block p-4 transition hover:-translate-y-0.5"
                  style={{ animationDelay: `${i * 0.28}s` }}
                >
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <p className="font-serif text-lg leading-tight">{g.title}</p>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {g.progress}%
                    </span>
                  </div>
                  <div className="h-1 w-full overflow-hidden rounded-full bg-black/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] transition-all duration-700"
                      style={{ width: `${hydrated ? g.progress : 0}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {done} / {g.milestones.length} tonggak
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Vision cards */}
      <section className="animate-rise mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        <VisionCard title="Diri yang aku tuju" items={becoming.map((b) => b.label)} />
        <VisionCard
          title={`Visi ${visionYear}`}
          items={vision.map((v) => v.label)}
          dashed
        />
      </section>

      {/* Habits */}
      <section className="animate-rise">
        <div className="mb-4 flex items-end justify-between">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Ritual harian
          </p>
          <Link
            to="/habits"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Semua <ArrowUpRight className="size-3" />
          </Link>
        </div>

        <div className="space-y-2.5">
          {habits.map((h) => {
            const done = hydrated && (completions[h.id] || []).includes(today);
            return (
              <button
                key={h.id}
                onClick={() => toggleHabit(h.id, today)}
                className={[
                  "group flex w-full items-center justify-between rounded-[20px] p-4 text-left transition-all active:scale-[0.99]",
                  done ? "bg-surface/40 hairline" : "card-cinema hover:bg-surface/90",
                ].join(" ")}
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span
                    className={[
                      "grid size-10 shrink-0 place-items-center rounded-xl transition-colors",
                      done
                        ? "bg-black/[0.04] text-muted-foreground"
                        : "bg-gradient-to-br from-black/[0.07] to-black/[0.02] text-gold",
                    ].join(" ")}
                  >
                    <HabitIcon name={h.emoji} className="size-5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <p
                      className={[
                        "truncate text-[15px] font-medium transition-colors",
                        done ? "text-muted-foreground line-through" : "text-foreground",
                      ].join(" ")}
                    >
                      {h.name}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {h.duration ? `${h.duration} · ` : ""}
                      {h.category}
                    </p>
                  </div>
                </div>
                <span
                  className={[
                    "grid size-6 shrink-0 place-items-center rounded-full transition-all",
                    done
                      ? "bg-gold text-canvas scale-100"
                      : "ring-2 ring-black/15 group-hover:ring-gold/60",
                  ].join(" ")}
                >
                  {done && <Check className="size-3.5" strokeWidth={3} />}
                </span>
              </button>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}

function VisionCard({
  title,
  items,
  dashed,
}: {
  title: string;
  items: string[];
  dashed?: boolean;
}) {
  return (
    <div
      className={[
        "rounded-[28px] p-6 transition hover:translate-y-[-2px]",
        dashed
          ? "border border-dashed border-gold/25 bg-gradient-to-br from-[oklch(0.96_0.02_195)]/40 to-transparent"
          : "card-cinema",
      ].join(" ")}
    >
      <p className="mb-6 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-2">
        {items.map((label, i) => (
          <li
            key={i}
            className={[
              "font-serif text-lg leading-snug",
              i === 0 ? "text-foreground" : "text-muted-foreground",
            ].join(" ")}
          >
            {label}
          </li>
        ))}
      </ul>
    </div>
  );
}
