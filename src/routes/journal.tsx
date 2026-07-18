import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { todayKey, useHydrated, useStore } from "@/lib/store";

export const Route = createFileRoute("/journal")({
  head: () => ({
    meta: [
      { title: "Jurnal · Aura" },
      { name: "description", content: "Halaman pribadi untuk hari ini — mood, syukur, dan apa yang esok minta darimu." },
    ],
  }),
  component: JournalPage,
});

function JournalPage() {
  const hydrated = useHydrated();
  const journal = useStore((s) => s.journal);
  const upsert = useStore((s) => s.upsertJournal);

  const today = todayKey();
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
          Halaman hari ini
        </p>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">Jurnal hari ini</h1>
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
          <Scale label="Energi" value={form.energy} onChange={(v) => setForm({ ...form, energy: v })} />
        </div>

        <JournalField label="Syukur" placeholder="Hal apa yang aku syukuri hari ini?" value={form.gratitude} onChange={(v) => setForm({ ...form, gratitude: v })} />
        <JournalField label="Refleksi" placeholder="Hari ini aku menyadari…" value={form.reflection} onChange={(v) => setForm({ ...form, reflection: v })} />
        <JournalField label="Kemenangan hari ini" placeholder="Satu kemenangan kecil." value={form.winToday} onChange={(v) => setForm({ ...form, winToday: v })} />
        <JournalField label="Fokus untuk esok" placeholder="Satu hal terpenting untuk esok." value={form.tomorrowFocus} onChange={(v) => setForm({ ...form, tomorrowFocus: v })} />

        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {saved ? "Tersimpan · terima kasih sudah hadir" : "Halaman ini pribadi, hanya di perangkatmu."}
          </span>
          <button
            onClick={() => {
              upsert({ date: today, ...form });
              setSaved(true);
              setTimeout(() => setSaved(false), 2400);
            }}
            className="rounded-full bg-gradient-to-br from-[oklch(0.62_0.11_195)] to-[oklch(0.48_0.12_205)] px-5 py-2 text-sm font-medium text-canvas shadow-[0_8px_20px_-6px_oklch(0.62_0.11_195/0.5)] active:scale-95"
          >
            Simpan
          </button>
        </div>

        {hydrated && journal.length > 0 && (
          <div className="mt-10">
            <p className="mb-3 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              Catatan sebelumnya
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
              n <= value ? "bg-gradient-to-t from-[oklch(0.48_0.12_205)] to-[oklch(0.62_0.11_195)]" : "bg-black/[0.06] hover:bg-black/[0.1]",
            ].join(" ")}
            aria-label={`${label} ${n}`}
          />
        ))}
      </div>
    </div>
  );
}