import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { currentStreak, longestStreak, todayKey, useHydrated, useStore } from "@/lib/store";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Analitik · Aura" },
      { name: "description", content: "Angka-angka tenang dari bulan yang dihidupi dengan baik." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const hydrated = useHydrated();
  const habits = useStore((s) => s.habits);
  const completions = useStore((s) => s.completions);

  const allDates = Object.values(completions).flat();
  const streak = hydrated ? Math.max(0, ...habits.map((h) => currentStreak(completions[h.id] || []))) : 0;
  const best = hydrated ? Math.max(0, ...habits.map((h) => longestStreak(completions[h.id] || []))) : 0;
  const totalDone = allDates.length;

  const trend: { day: string; ratio: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const k = todayKey(d);
    const done = habits.filter((h) => (completions[h.id] || []).includes(k)).length;
    trend.push({ day: k, ratio: habits.length ? done / habits.length : 0 });
  }
  const avg = trend.reduce((a, b) => a + b.ratio, 0) / (trend.length || 1);

  const dow = [0, 1, 2, 3, 4, 5, 6].map((wd) => {
    const days = trend.filter((t) => new Date(t.day).getDay() === wd);
    const avg = days.length ? days.reduce((a, b) => a + b.ratio, 0) / days.length : 0;
    return { wd, avg };
  });
  const bestDow = [...dow].sort((a, b) => b.avg - a.avg)[0];
  const dowLabel = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

  const weeks: { key: string; ratio: number }[][] = [];
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 20 * 7);
  const startWd = startDate.getDay();
  startDate.setDate(startDate.getDate() - startWd);
  for (let w = 0; w < 20; w++) {
    const col: { key: string; ratio: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const dt = new Date(startDate);
      dt.setDate(startDate.getDate() + w * 7 + d);
      const k = todayKey(dt);
      const done = habits.filter((h) => (completions[h.id] || []).includes(k)).length;
      col.push({ key: k, ratio: habits.length ? done / habits.length : 0 });
    }
    weeks.push(col);
  }

  return (
    <AppShell>
      <header className="animate-rise mb-8">
        <p className="mb-2 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Angka-angka
        </p>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">Analitik</h1>
      </header>

      <div className="animate-rise mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Runtutan kini" value={`${streak}h`} />
        <Stat label="Rekor runtutan" value={`${best}h`} />
        <Stat label="Kebiasaan tuntas" value={String(totalDone)} />
        <Stat label="Rata-rata 30h" value={`${Math.round(avg * 100)}%`} />
      </div>

      <section className="animate-rise card-cinema mb-6 p-5 md:p-6">
        <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Ritme 30 hari
        </p>
        <div className="flex h-32 items-end gap-1">
          {trend.map((t) => (
            <div
              key={t.day}
              className="flex-1 rounded-t-md bg-gradient-to-t from-[oklch(0.48_0.12_205)] to-[oklch(0.62_0.11_195)]"
              style={{ height: `${Math.max(4, t.ratio * 100)}%`, opacity: 0.35 + t.ratio * 0.65 }}
              title={`${t.day} · ${Math.round(t.ratio * 100)}%`}
            />
          ))}
        </div>
      </section>

      <section className="animate-rise card-cinema mb-6 p-5 md:p-6">
        <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Peta konsistensi
        </p>
        <div className="flex gap-1 overflow-x-auto">
          {weeks.map((col, i) => (
            <div key={i} className="flex flex-col gap-1">
              {col.map((d) => (
                <div
                  key={d.key}
                  className="size-3 rounded-[3px]"
                  style={{ backgroundColor: `oklch(0.62_0.11_195 / ${0.06 + d.ratio * 0.85})` }}
                  title={`${d.key} · ${Math.round(d.ratio * 100)}%`}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="animate-rise card-cinema p-5 md:p-6">
        <p className="mb-4 text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
          Insight
        </p>
        <p className="font-serif text-2xl italic leading-snug text-balance">
          Kamu paling produktif di hari{" "}
          <span className="text-gold not-italic">{dowLabel[bestDow.wd]}</span>. Jaga jendela itu —
          di sanalah bunga majemuknya tumbuh.
        </p>
      </section>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card-cinema p-5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-3xl tabular-nums">{value}</p>
    </div>
  );
}