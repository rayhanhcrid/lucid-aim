import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, X, Clock, Sparkles } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { todayKey, useHydrated, useStore } from "@/lib/store";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Jurnal · Rayhan" },
      { name: "description", content: "Catat mood, rasa grateful, dan satu fokus buat besok." },
    ],
  }),
  component: JournalPage,
});

function JournalPage() {
  const hydrated = useHydrated();
  const journal = useStore((s) => s.journal);
  const upsert = useStore((s) => s.upsertJournal);
  const schedules = useStore((s) => s.schedules);
  const addScheduleItem = useStore((s) => s.addScheduleItem);
  const removeScheduleItem = useStore((s) => s.removeScheduleItem);
  const focusItems = useStore((s) => s.focusItems);
  const addFocusItem = useStore((s) => s.addFocusItem);
  const removeFocusItem = useStore((s) => s.removeFocusItem);

  const today = todayKey();
  const tomorrow = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return todayKey(d);
  })();
  const tomorrowLabel = new Date(Date.now() + 86400000).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const tomorrowSchedule = schedules[tomorrow] || [];
  const tomorrowFocusItems = focusItems[tomorrow] || [];
  const existing = journal.find((j) => j.date === today);

  const [form, setForm] = useState({
    mood: (existing?.mood ?? 3) as 1 | 2 | 3 | 4 | 5,
    energy: (existing?.energy ?? 3) as 1 | 2 | 3 | 4 | 5,
    gratitude: existing?.gratitude ?? "",
    reflection: existing?.reflection ?? "",
    winToday: existing?.winToday ?? "",
    tomorrowFocus: existing?.tomorrowFocus ?? "",
  });
  const [saved, setSaved] = useState(false);

  return (
    <AppShell>
      <header className="animate-rise mb-8">
        <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Today's Catatan
        </p>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">Today's Jurnal</h1>
        <p className="mt-2 text-muted-foreground">
          {new Date().toLocaleDateString("id-ID", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
      </header>

      <div className="animate-rise space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Scale label="Mood" value={form.mood} onChange={(v) => setForm({ ...form, mood: v })} />
          <Scale label="Energy" value={form.energy} onChange={(v) => setForm({ ...form, energy: v })} />
        </div>

        <JournalField label="Gratitude" placeholder="What am I grateful for today?" value={form.gratitude} onChange={(v) => setForm({ ...form, gratitude: v })} />
        <JournalField label="Reflection" placeholder="Today aku realized…" value={form.reflection} onChange={(v) => setForm({ ...form, reflection: v })} />
        <JournalField label="Today's Win" placeholder="One small win." value={form.winToday} onChange={(v) => setForm({ ...form, winToday: v })} />
        <JournalField label="Tomorrow's Fokus" placeholder="The one thing that matters most for tomorrow." value={form.tomorrowFocus} onChange={(v) => setForm({ ...form, tomorrowFocus: v })} />

        <TomorrowFocus
          label={tomorrowLabel}
          items={hydrated ? tomorrowFocusItems : []}
          onAdd={(l) => addFocusItem(tomorrow, l)}
          onRemove={(id) => removeFocusItem(tomorrow, id)}
        />

        <TomorrowSchedule
          date={tomorrow}
          label={tomorrowLabel}
          items={hydrated ? tomorrowSchedule : []}
          onAdd={(t, l) => addScheduleItem(tomorrow, t, l)}
          onRemove={(id) => removeScheduleItem(tomorrow, id)}
        />

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {saved ? "Saved · thanks for showing up" : "Auto-saved ke cloud — bisa dibuka dari device manapun, tanpa login."}
          </span>
          <button
            onClick={() => {
              upsert({ date: today, ...form });
              setSaved(true);
              setTimeout(() => setSaved(false), 2400);
            }}
            className="rounded-full bg-gradient-to-br from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] px-5 py-2 text-sm font-medium text-white shadow-[0_8px_20px_-6px_oklch(0.62_0.11_195/0.5)] active:scale-95"
          >
            Save
          </button>
        </div>

        {hydrated && journal.length > 0 && (
          <div className="mt-10">
            <p className="mb-3 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              Previous Catatan
            </p>
            <div className="space-y-2">
              {[...journal]
                .filter((j) => j.date !== today)
                .sort((a, b) => (a.date < b.date ? 1 : -1))
                .slice(0, 10)
                .map((j) => (
                  <div key={j.id} className="rounded-2xl card-cinema p-4">
                    <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">
                      {new Date(j.date).toLocaleDateString("id-ID", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    <p className="text-sm text-foreground/90">
                      {j.reflection || j.gratitude || j.winToday}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function JournalField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="block rounded-2xl card-cinema p-4">
      <span className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <textarea
        rows={2}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full resize-none bg-transparent font-serif text-xl italic leading-snug outline-none placeholder:not-italic placeholder:font-sans placeholder:text-base placeholder:text-muted-foreground/50"
      />
    </label>
  );
}

function Scale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: 1 | 2 | 3 | 4 | 5;
  onChange: (v: 1 | 2 | 3 | 4 | 5) => void;
}) {
  return (
    <div className="rounded-2xl card-cinema p-4">
      <span className="mb-3 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        {label}
      </span>
      <div className="flex gap-1.5">
        {([1, 2, 3, 4, 5] as const).map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={[
              "h-8 flex-1 rounded-lg transition",
              n <= value ? "bg-gradient-to-t from-[oklch(0.48_0.12_205)] to-[oklch(0.62_0.11_195)]" : "bg-white/[0.06] hover:bg-white/[0.1]",
            ].join(" ")}
            aria-label={`${label} ${n}`}
          />
        ))}
      </div>
    </div>
  );
}

function TomorrowFocus({
  label,
  items,
  onAdd,
  onRemove,
}: {
  label: string;
  items: { id: string; label: string; done: boolean }[];
  onAdd: (label: string) => void;
  onRemove: (id: string) => void;
}) {
  const [text, setText] = useState("");
  return (
    <div className="rounded-2xl card-cinema p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Sparkles className="size-3" /> Tomorrow's Fokus
        </span>
        <span className="text-[10px] uppercase tracking-widest text-gold">{label}</span>
      </div>
      {items.length > 0 ? (
        <ul className="mb-3 space-y-1.5">
          {items.map((f) => (
            <li
              key={f.id}
              className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2 text-sm hairline"
            >
              <span className="flex-1">{f.label}</span>
              <button
                onClick={() => onRemove(f.id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Hapus"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm italic text-muted-foreground">
          Add satu atau beberapa fokus for tomorrow — bakal langsung muncul di beranda pas hari berganti.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onAdd(text.trim());
          setText("");
        }}
        className="flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-2 hairline"
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Fokus for tomorrow…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button type="submit" className="text-gold hover:opacity-80" aria-label="Tambah">
          <Plus className="size-4" />
        </button>
      </form>
    </div>
  );
}

function TomorrowSchedule({
  date,
  label,
  items,
  onAdd,
  onRemove,
}: {
  date: string;
  label: string;
  items: { id: string; time: string; label: string }[];
  onAdd: (time: string, label: string) => void;
  onRemove: (id: string) => void;
}) {
  const [time, setTime] = useState("08:00");
  const [text, setText] = useState("");
  return (
    <div className="rounded-2xl card-cinema p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          <Clock className="size-3" /> Tomorrow's Jadwal
        </span>
        <span className="text-[10px] uppercase tracking-widest text-gold">{label}</span>
      </div>
      {items.length > 0 ? (
        <ul className="mb-3 space-y-1.5">
          {items.map((s) => (
            <li
              key={s.id}
              className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3 py-2 text-sm hairline"
            >
              <span className="w-12 font-serif text-base tabular-nums text-gold">{s.time}</span>
              <span className="flex-1">{s.label}</span>
              <button
                onClick={() => onRemove(s.id)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Hapus"
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm italic text-muted-foreground">
          Tulis rencana for tomorrow — bakal langsung muncul di beranda pas hari berganti.
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          onAdd(time, text.trim());
          setText("");
        }}
        className="flex items-center gap-2 rounded-full bg-white/[0.04] px-3 py-2 hairline"
      >
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-20 bg-transparent text-sm tabular-nums outline-none"
        />
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Agenda for tomorrow…"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button type="submit" className="text-gold hover:opacity-80" aria-label="Tambah">
          <Plus className="size-4" />
        </button>
      </form>
      <span className="sr-only">{date}</span>
    </div>
  );
}