import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Check, Trash2 } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useHydrated, useStore } from "@/lib/store";

export const Route = createFileRoute("/goals")({
  head: () => ({
    meta: [
      { title: "Goals · Aura" },
      { name: "description", content: "Break the vision into weeks, months, and quiet steps." },
    ],
  }),
  component: GoalsPage,
});

const horizons = ["weekly", "monthly", "quarterly", "yearly", "lifetime"] as const;

function GoalsPage() {
  const hydrated = useHydrated();
  const goals = useStore((s) => s.goals);
  const addGoal = useStore((s) => s.addGoal);
  const remove = useStore((s) => s.removeGoal);
  const toggleMilestone = useStore((s) => s.toggleMilestone);
  const addMilestone = useStore((s) => s.addMilestone);

  const [filter, setFilter] = useState<(typeof horizons)[number] | "all">("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    description: string;
    horizon: (typeof horizons)[number];
    deadline: string;
    milestones: string;
  }>({ title: "", description: "", horizon: "quarterly", deadline: "", milestones: "" });

  const filtered = filter === "all" ? goals : goals.filter((g) => g.horizon === filter);

  return (
    <AppShell>
      <header className="animate-rise mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
            The path
          </p>
          <h1 className="font-serif text-4xl leading-tight md:text-5xl">Goals</h1>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-sm font-medium text-canvas active:scale-95"
        >
          <Plus className="size-4" strokeWidth={2.5} /> New goal
        </button>
      </header>

      <div className="animate-rise mb-6 flex flex-wrap gap-1.5">
        {(["all", ...horizons] as const).map((h) => (
          <button
            key={h}
            onClick={() => setFilter(h)}
            className={[
              "rounded-full px-3 py-1.5 text-xs uppercase tracking-widest transition",
              filter === h
                ? "bg-foreground text-canvas"
                : "bg-surface text-muted-foreground hairline hover:text-foreground",
            ].join(" ")}
          >
            {h}
          </button>
        ))}
      </div>

      <div className="animate-rise space-y-4">
        {(hydrated ? filtered : []).map((g) => (
          <div key={g.id} className="rounded-[24px] bg-surface p-5 hairline">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-1 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
                  {g.horizon}
                  {g.deadline && ` · ${new Date(g.deadline).toLocaleDateString()}`}
                </p>
                <h3 className="font-serif text-2xl leading-tight">{g.title}</h3>
                {g.description && (
                  <p className="mt-1 text-sm text-muted-foreground">{g.description}</p>
                )}
              </div>
              <button
                onClick={() => remove(g.id)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>

            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-[11px] uppercase tracking-widest text-muted-foreground">
                <span>Progress</span>
                <span>{g.progress}%</span>
              </div>
              <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full bg-foreground transition-all duration-700"
                  style={{ width: `${g.progress}%` }}
                />
              </div>
            </div>

            <div className="mt-5 space-y-2">
              {g.milestones.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggleMilestone(g.id, m.id)}
                  className="group flex w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-white/[0.03]"
                >
                  <span
                    className={[
                      "grid size-5 shrink-0 place-items-center rounded-md transition",
                      m.done
                        ? "bg-foreground text-canvas"
                        : "ring-1 ring-white/20 group-hover:ring-white/40",
                    ].join(" ")}
                  >
                    {m.done && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <span
                    className={[
                      "text-sm",
                      m.done ? "text-muted-foreground line-through" : "text-foreground",
                    ].join(" ")}
                  >
                    {m.title}
                  </span>
                </button>
              ))}
              <MilestoneAdd onAdd={(t) => addMilestone(g.id, t)} />
            </div>
          </div>
        ))}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-md md:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md space-y-4 rounded-[28px] bg-surface p-6 hairline"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-serif text-2xl">A new goal</h2>
            <label className="block rounded-2xl bg-white/[0.03] px-4 py-3">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Title
              </span>
              <input
                autoFocus
                className="w-full bg-transparent text-[15px] outline-none"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </label>
            <label className="block rounded-2xl bg-white/[0.03] px-4 py-3">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Description
              </span>
              <textarea
                rows={2}
                className="w-full resize-none bg-transparent text-[15px] outline-none"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block rounded-2xl bg-white/[0.03] px-4 py-3">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Horizon
                </span>
                <select
                  className="w-full bg-transparent text-[15px] outline-none"
                  value={form.horizon}
                  onChange={(e) =>
                    setForm({ ...form, horizon: e.target.value as (typeof horizons)[number] })
                  }
                >
                  {horizons.map((h) => (
                    <option key={h} value={h} className="bg-canvas">
                      {h}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block rounded-2xl bg-white/[0.03] px-4 py-3">
                <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  Deadline
                </span>
                <input
                  type="date"
                  className="w-full bg-transparent text-[15px] outline-none"
                  value={form.deadline}
                  onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                />
              </label>
            </div>
            <label className="block rounded-2xl bg-white/[0.03] px-4 py-3">
              <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Milestones (one per line)
              </span>
              <textarea
                rows={3}
                className="w-full resize-none bg-transparent text-[15px] outline-none"
                value={form.milestones}
                onChange={(e) => setForm({ ...form, milestones: e.target.value })}
              />
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!form.title.trim()) return;
                  addGoal({
                    title: form.title,
                    description: form.description || undefined,
                    horizon: form.horizon,
                    deadline: form.deadline || undefined,
                    milestones: form.milestones
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  });
                  setForm({ title: "", description: "", horizon: "quarterly", deadline: "", milestones: "" });
                  setOpen(false);
                }}
                className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-canvas"
              >
                Add goal
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function MilestoneAdd({ onAdd }: { onAdd: (t: string) => void }) {
  const [v, setV] = useState("");
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!v.trim()) return;
        onAdd(v.trim());
        setV("");
      }}
      className="flex items-center gap-3 rounded-xl px-2 py-1.5 opacity-60 focus-within:opacity-100"
    >
      <span className="grid size-5 shrink-0 place-items-center rounded-md ring-1 ring-dashed ring-white/20">
        <Plus className="size-3" />
      </span>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="Add a milestone"
        className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </form>
  );
}