import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profil · Aura" },
      { name: "description", content: "Bentuk identitas dan visi yang hari-harimu layani." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const name = useStore((s) => s.name);
  const setName = useStore((s) => s.setName);
  const becoming = useStore((s) => s.becoming);
  const addBecoming = useStore((s) => s.addBecoming);
  const removeBecoming = useStore((s) => s.removeBecoming);
  const vision = useStore((s) => s.vision);
  const addVision = useStore((s) => s.addVision);
  const removeVision = useStore((s) => s.removeVision);
  const visionYear = useStore((s) => s.visionYear);
  const setVisionYear = useStore((s) => s.setVisionYear);
  const todaysFocus = useStore((s) => s.todaysFocus);
  const setTodaysFocus = useStore((s) => s.setTodaysFocus);
  const todaysSchedule = useStore((s) => s.todaysSchedule);
  const addScheduleItem = useStore((s) => s.addScheduleItem);
  const removeScheduleItem = useStore((s) => s.removeScheduleItem);

  return (
    <AppShell>
      <header className="animate-rise mb-8">
        <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">Kamu</p>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">Profil</h1>
      </header>

      <div className="animate-rise space-y-4">
        <label className="block rounded-2xl card-cinema p-4">
          <span className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Namamu
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent font-serif text-2xl outline-none"
          />
        </label>

        <label className="block rounded-2xl card-cinema p-4">
          <span className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Tahun visi
          </span>
          <input
            value={visionYear}
            onChange={(e) => setVisionYear(e.target.value)}
            className="w-full bg-transparent font-serif text-2xl outline-none"
          />
        </label>

        <TagList title="Diri yang aku tuju" items={becoming} onAdd={addBecoming} onRemove={removeBecoming} placeholder="Tambah identitas" />

        <TagList title={`Visi ${visionYear}`} items={vision} onAdd={addVision} onRemove={removeVision} placeholder="Tambah item visi" />

        <FocusList items={todaysFocus} onChange={setTodaysFocus} />

        <ScheduleList items={todaysSchedule} onAdd={addScheduleItem} onRemove={removeScheduleItem} />
      </div>
    </AppShell>
  );
}

function TagList({
  title,
  items,
  onAdd,
  onRemove,
  placeholder,
}: {
  title: string;
  items: { id: string; label: string }[];
  onAdd: (v: string) => void;
  onRemove: (id: string) => void;
  placeholder: string;
}) {
  const [v, setV] = useState("");
  return (
    <div className="rounded-2xl card-cinema p-5">
      <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{title}</p>
      <ul className="mb-3 flex flex-wrap gap-1.5">
        {items.map((i) => (
          <li key={i.id} className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.05] px-3 py-1.5 text-sm">
            {i.label}
            <button onClick={() => onRemove(i.id)} className="text-muted-foreground hover:text-foreground" aria-label={`Hapus ${i.label}`}>
              <X className="size-3" />
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!v.trim()) return;
          onAdd(v.trim());
          setV("");
        }}
        className="flex items-center gap-2 rounded-full bg-black/[0.03] px-3 py-2"
      >
        <Plus className="size-4 text-muted-foreground" />
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </form>
    </div>
  );
}

function FocusList({ items, onChange }: { items: string[]; onChange: (list: string[]) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="rounded-2xl card-cinema p-5">
      <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Fokus hari ini</p>
      <ul className="mb-3 space-y-2">
        {items.map((f, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <span className="size-1.5 rounded-full bg-gold" />
            <span className="flex-1">{f}</span>
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-foreground" aria-label="Hapus">
              <X className="size-3" />
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!v.trim()) return;
          onChange([...items, v.trim()]);
          setV("");
        }}
        className="flex items-center gap-2 rounded-full bg-black/[0.03] px-3 py-2"
      >
        <Plus className="size-4 text-muted-foreground" />
        <input
          value={v}
          onChange={(e) => setV(e.target.value)}
          placeholder="Tambah fokus untuk hari ini"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </form>
    </div>
  );
}

function ScheduleList({
  items,
  onAdd,
  onRemove,
}: {
  items: { id: string; time: string; label: string }[];
  onAdd: (time: string, label: string) => void;
  onRemove: (id: string) => void;
}) {
  const [time, setTime] = useState("08:00");
  const [label, setLabel] = useState("");
  return (
    <div className="rounded-2xl card-cinema p-5">
      <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Jadwal hari ini</p>
      <ul className="mb-3 space-y-1.5">
        {items.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded-xl bg-black/[0.03] px-3 py-2 text-sm">
            <span className="w-12 font-serif text-base tabular-nums text-gold">{s.time}</span>
            <span className="flex-1">{s.label}</span>
            <button onClick={() => onRemove(s.id)} className="text-muted-foreground hover:text-foreground" aria-label="Hapus">
              <X className="size-3" />
            </button>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!label.trim()) return;
          onAdd(time, label.trim());
          setLabel("");
        }}
        className="flex items-center gap-2 rounded-full bg-black/[0.03] px-3 py-2"
      >
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="w-20 bg-transparent text-sm tabular-nums outline-none"
        />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Tambah agenda"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button type="submit" className="text-gold hover:opacity-80" aria-label="Tambah">
          <Plus className="size-4" />
        </button>
      </form>
    </div>
  );
}