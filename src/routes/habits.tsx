import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Plus, Trash2, Flame } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { HabitIcon, ICON_KEYS } from "@/components/HabitIcon";
import { currentStreak, longestStreak, todayKey, useHydrated, useStore } from "@/lib/store";

export const Route = createFileRoute("/habits")({
  head: () => ({
    meta: [
      { title: "Kebiasaan · Aura" },
      { name: "description", content: "Ritual harianmu — tenang, konsisten, dan berbunga perlahan." },
    ],
  }),
  component: HabitsPage,
});

const categories = ["Pikiran", "Tubuh", "Fokus", "Karya", "Uang", "Cinta"];

function HabitsPage() {
  const hydrated = useHydrated();
  const habits = useStore((s) => s.habits);
  const completions = useStore((s) => s.completions);
  const toggle = useStore((s) => s.toggleHabit);
  const remove = useStore((s) => s.removeHabit);
  const add = useStore((s) => s.addHabit);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    name: string;
    emoji: string;
    category: string;
    priority: "low" | "med" | "high";
    duration: string;
  }>({ name: "", emoji: "meditation", category: "Pikiran", priority: "med", duration: "" });

  const today = todayKey();

  return (
    <AppShell>
      <header className="animate-rise mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
            Susunan hari
          </p>
          <h1 className="font-serif text-4xl leading-tight md:text-5xl">Ritual harian</h1>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-br from-[oklch(0.82_0.12_75)] to-[oklch(0.55_0.15_35)] px-4 py-2 text-sm font-medium text-canvas shadow-[0_8px_20px_-6px_oklch(0.82_0.12_75/0.5)] transition-transform active:scale-95"
        >
          <Plus className="size-4" strokeWidth={2.5} /> Baru
        </button>
      </header>

      <div className="animate-rise space-y-2.5">
        {habits.map((h) => {
          const dates = completions[h.id] || [];
          const done = hydrated && dates.includes(today);
          const streak = hydrated ? currentStreak(dates) : 0;
          const best = hydrated ? longestStreak(dates) : 0;
          return (
            <div key={h.id} className="card-cinema p-4">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggle(h.id, today)}
                  className={[
                    "grid size-7 shrink-0 place-items-center rounded-full transition-all",
                    done
                      ? "bg-gold text-canvas"
                      : "ring-2 ring-white/15 hover:ring-gold/60",
                  ].join(" ")}
                  aria-label={done ? "Batalkan" : "Selesaikan"}
                >
                  {done && <Check className="size-4" strokeWidth={3} />}
                </button>
                <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-white/[0.07] to-white/[0.02] text-gold">
                  <HabitIcon name={h.emoji} className="size-4.5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p
                    className={[
                      "truncate text-[15px] font-medium",
                      done ? "text-muted-foreground line-through" : "text-foreground",
                    ].join(" ")}
                  >
                    {h.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {h.category}
                    {h.duration && ` · ${h.duration}`} · {h.priority}
                  </p>
                </div>
                <button
                  onClick={() => remove(h.id)}
                  className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition hover:bg-white/[0.04] hover:text-foreground group-hover:opacity-100 md:opacity-60"
                  aria-label="Hapus kebiasaan"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <div className="mt-4 flex items-center justify-between gap-4">
                <MiniHeatmap dates={dates} />
                <div className="flex items-center gap-3 text-[11px] uppercase tracking-widest text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <Flame className="size-3 text-gold" /> {streak}h
                  </span>
                  <span>Rekor {best}h</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 backdrop-blur-md md:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-[28px] card-cinema p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="mb-1 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              Ritual baru
            </p>
            <h2 className="font-serif text-2xl">Rancang kebiasaanmu</h2>

            <div className="mt-5 space-y-4">
              <Field label="Nama">
                <input
                  autoFocus
                  className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
                  placeholder="Meditasi pagi"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </Field>

              <Field label="Ikon">
                <div className="grid grid-cols-8 gap-1.5">
                  {ICON_KEYS.map((k) => (
                    <button
                      key={k}
                      onClick={() => setForm({ ...form, emoji: k })}
                      className={[
                        "grid size-9 place-items-center rounded-xl transition",
                        form.emoji === k
                          ? "bg-gold text-canvas"
                          : "bg-white/[0.03] text-foreground/80 hover:bg-white/[0.08] hover:text-gold",
                      ].join(" ")}
                      aria-label={k}
                    >
                      <HabitIcon name={k} className="size-4" strokeWidth={1.75} />
                    </button>
                  ))}
                </div>
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Kategori">
                  <select
                    className="w-full bg-transparent text-[15px] outline-none"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  >
                    {categories.map((c) => (
                      <option key={c} value={c} className="bg-canvas">
                        {c}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Durasi">
                  <input
                    className="w-full bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
                    placeholder="10 mnt"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                  />
                </Field>
              </div>

              <Field label="Prioritas">
                <div className="flex gap-1.5">
                  {(["low", "med", "high"] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setForm({ ...form, priority: p })}
                      className={[
                        "flex-1 rounded-xl px-3 py-2 text-xs uppercase tracking-widest transition",
                        form.priority === p
                          ? "bg-gold text-canvas"
                          : "bg-white/[0.03] text-muted-foreground hover:bg-white/[0.06]",
                      ].join(" ")}
                    >
                      {p === "low" ? "rendah" : p === "med" ? "sedang" : "tinggi"}
                    </button>
                  ))}
                </div>
              </Field>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => setOpen(false)}
                className="rounded-full px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  if (!form.name.trim()) return;
                  add(form);
                  setForm({ name: "", emoji: "meditation", category: "Pikiran", priority: "med", duration: "" });
                  setOpen(false);
                }}
                className="rounded-full bg-gradient-to-br from-[oklch(0.82_0.12_75)] to-[oklch(0.55_0.15_35)] px-4 py-2 text-sm font-medium text-canvas"
              >
                Tambah ritual
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block rounded-2xl bg-white/[0.03] px-4 py-3">
      <span className="mb-1 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function MiniHeatmap({ dates }: { dates: string[] }) {
  const days: { key: string; done: boolean }[] = [];
  for (let i = 27; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = todayKey(d);
    days.push({ key: k, done: dates.includes(k) });
  }
  return (
    <div className="flex flex-1 gap-[3px]">
      {days.map((d) => (
        <div
          key={d.key}
          className={[
            "h-4 flex-1 rounded-[3px]",
            d.done ? "bg-gold/80" : "bg-white/[0.05]",
          ].join(" ")}
          title={d.key}
        />
      ))}
    </div>
  );
}