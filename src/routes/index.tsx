import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, ArrowUpRight, Flame } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ProgressRing } from "@/components/ProgressRing";
import { currentStreak, todayKey, useHydrated, useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  component: Index,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Still awake";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  if (h < 21) return "Good evening";
  return "Good night";
}

function Index() {
  const hydrated = useHydrated();
  const name = useStore((s) => s.name);
  const habits = useStore((s) => s.habits);
  const completions = useStore((s) => s.completions);
  const toggleHabit = useStore((s) => s.toggleHabit);
  const todaysFocus = useStore((s) => s.todaysFocus);
  const becoming = useStore((s) => s.becoming);
  const vision = useStore((s) => s.vision);
  const visionYear = useStore((s) => s.visionYear);

  const today = todayKey();
  const doneToday = habits.filter((h) => (completions[h.id] || []).includes(today)).length;
  const total = habits.length || 1;
  const pct = Math.round((doneToday / total) * 100);

  const overallStreak = Math.max(
    0,
    ...habits.map((h) => currentStreak(completions[h.id] || [])),
  );

  const dateLabel = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <AppShell>
      <header className="animate-rise mb-10">
        <p className="mb-3 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          {dateLabel}
        </p>
        <h1 className="font-serif text-4xl leading-tight text-balance md:text-5xl">
          {greeting()}, {name}.
        </h1>
        <p className="mt-3 max-w-[52ch] text-pretty text-muted-foreground">
          The day is unwritten. A single intention is enough.
        </p>
      </header>

      {/* Focus + Ring */}
      <section className="animate-rise mb-10 grid grid-cols-1 gap-6 md:grid-cols-[1fr_auto] md:gap-10">
        <div>
          <p className="mb-4 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            Today's focus
          </p>
          <ul className="space-y-2.5">
            {todaysFocus.map((f, i) => (
              <li key={i} className="flex items-center gap-3 text-[15px] text-foreground/90">
                <span className="size-1.5 rounded-full bg-foreground/40" />
                {f}
              </li>
            ))}
          </ul>
          {overallStreak > 0 && (
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 hairline">
              <Flame className="size-3.5 text-foreground/70" />
              <span className="text-xs text-muted-foreground">
                {overallStreak} day streak · keep the flame
              </span>
            </div>
          )}
        </div>
        <div className="flex md:block">
          <ProgressRing
            value={hydrated ? pct : 0}
            label={`${hydrated ? pct : 0}%`}
            sub={`${doneToday} of ${habits.length}`}
          />
        </div>
      </section>

      {/* Vision cards */}
      <section className="animate-rise mb-10 grid grid-cols-1 gap-4 md:grid-cols-2">
        <VisionCard title="Who I'm becoming" items={becoming.map((b) => b.label)} />
        <VisionCard
          title={`${visionYear} vision`}
          items={vision.map((v) => v.label)}
          dashed
        />
      </section>

      {/* Habits */}
      <section className="animate-rise">
        <div className="mb-4 flex items-end justify-between">
          <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            Daily rituals
          </p>
          <Link
            to="/habits"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            All habits <ArrowUpRight className="size-3" />
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
                  done ? "bg-surface/40 hairline" : "bg-surface hairline hover:bg-surface/80",
                ].join(" ")}
              >
                <div className="flex min-w-0 items-center gap-3.5">
                  <span
                    className={[
                      "grid size-9 shrink-0 place-items-center rounded-xl text-base transition-colors",
                      done ? "bg-white/[0.04]" : "bg-white/[0.03]",
                    ].join(" ")}
                  >
                    <span aria-hidden>{h.emoji}</span>
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
                      ? "bg-foreground text-canvas scale-100"
                      : "ring-2 ring-white/15 group-hover:ring-white/30",
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
        "rounded-[28px] p-6",
        dashed
          ? "border border-dashed border-white/10 bg-white/[0.02]"
          : "bg-surface hairline",
      ].join(" ")}
    >
      <p className="mb-6 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-2">
        {items.map((label, i) => (
          <li
            key={i}
            className={[
              "text-[15px] leading-tight",
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
