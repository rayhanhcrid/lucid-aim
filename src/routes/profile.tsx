import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { todayKey, useStore } from "@/lib/store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profil · Rayhan" },
      { name: "description", content: "Atur identitas dan visi yang jadi arah hidup kamu." },
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
  const focusItems = useStore((s) => s.focusItems);
  const addFocusItem = useStore((s) => s.addFocusItem);
  const removeFocusItem = useStore((s) => s.removeFocusItem);
  const today = todayKey();
  const todaysFocus = focusItems[today] || [];

  return (
    <AppShell>
      <header className="animate-rise mb-8">
        <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">You</p>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">Profil</h1>
      </header>

      <div className="animate-rise space-y-4">
        <label className="block rounded-2xl card-cinema p-4">
          <span className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Your Name
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent font-serif text-2xl outline-none"
          />
        </label>

        <label className="block rounded-2xl card-cinema p-4">
          <span className="mb-2 block text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            Vision Year
          </span>
          <input
            value={visionYear}
            onChange={(e) => setVisionYear(e.target.value)}
            className="w-full bg-transparent font-serif text-2xl outline-none"
          />
        </label>

        <TagList title="Who I'm Becoming" items={becoming} onAdd={addBecoming} onRemove={removeBecoming} placeholder="Add identity" />

        <TagList title={`Vision ${visionYear}`} items={vision} onAdd={addVision} onRemove={removeVision} placeholder="Add vision item" />

        <FocusList
          items={todaysFocus}
          onAdd={(label) => addFocusItem(today, label)}
          onRemove={(id) => removeFocusItem(today, id)}
        />
        <p className="rounded-2xl bg-black/[0.03] px-4 py-3 text-xs text-muted-foreground hairline">
          Jadwal for tomorrow is now set directly di halaman <span className="text-foreground">Jurnal</span>, and bisa disesuaikan lagi dari halaman <span className="text-foreground">Beranda</span>.
        </p>
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

function FocusList({
  items,
  onAdd,
  onRemove,
}: {
  items: { id: string; label: string; done: boolean }[];
  onAdd: (label: string) => void;
  onRemove: (id: string) => void;
}) {
  const [v, setV] = useState("");
  return (
    <div className="rounded-2xl card-cinema p-5">
      <p className="mb-3 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Today's Fokus</p>
      <ul className="mb-3 space-y-2">
        {items.map((f) => (
          <li key={f.id} className="flex items-center gap-3 text-sm">
            <span className={["size-1.5 rounded-full", f.done ? "bg-black/20" : "bg-gold"].join(" ")} />
            <span className={["flex-1", f.done && "text-muted-foreground line-through"].filter(Boolean).join(" ")}>
              {f.label}
            </span>
            <button onClick={() => onRemove(f.id)} className="text-muted-foreground hover:text-foreground" aria-label="Hapus">
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
          placeholder="Add fokus for today"
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </form>
    </div>
  );
}

