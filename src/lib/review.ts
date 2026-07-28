import { todayKey, type Goal, type Habit, type JournalEntry } from "./store";

export type DayStat = {
  key: string;
  label: string;
  done: number;
  total: number;
  pct: number;
  mood: number | null;
  energy: number | null;
};

export type HabitStat = {
  id: string;
  name: string;
  emoji: string;
  done: number;
  pct: number;
  missedDays: string[];
};

export type WeeklyReview = {
  rangeLabel: string;
  score: number;
  prevScore: number;
  delta: number;
  days: DayStat[];
  best: HabitStat[];
  weakest: HabitStat[];
  avgMood: number | null;
  avgEnergy: number | null;
  moodLink: string | null;
  journalCount: number;
  milestonesDone: number;
  openWeeklyGoals: { title: string; progress: number }[];
  totalDone: number;
  totalPossible: number;
};

const DAY_LABEL = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

export function lastNDays(n: number, offset = 0): string[] {
  const out: string[] = [];
  for (let i = n - 1 + offset; i >= offset; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    out.push(todayKey(d));
  }
  return out;
}

function completionRate(
  habits: Habit[],
  completions: Record<string, string[]>,
  dates: string[],
) {
  const total = habits.length * dates.length;
  if (!total) return { done: 0, total: 0, pct: 0 };
  let done = 0;
  for (const h of habits) {
    const list = completions[h.id] || [];
    for (const d of dates) if (list.includes(d)) done++;
  }
  return { done, total, pct: Math.round((done / total) * 100) };
}

export function buildWeeklyReview(input: {
  habits: Habit[];
  completions: Record<string, string[]>;
  goals: Goal[];
  journal: JournalEntry[];
}): WeeklyReview {
  const { habits, completions, goals, journal } = input;
  const week = lastNDays(7);
  const prevWeek = lastNDays(7, 7);

  const cur = completionRate(habits, completions, week);
  const prev = completionRate(habits, completions, prevWeek);

  const days: DayStat[] = week.map((key) => {
    const done = habits.filter((h) => (completions[h.id] || []).includes(key)).length;
    const total = habits.length;
    const entry = journal.find((j) => j.date === key);
    const d = new Date(`${key}T00:00:00`);
    return {
      key,
      label: DAY_LABEL[d.getDay()],
      done,
      total,
      pct: total ? Math.round((done / total) * 100) : 0,
      mood: entry ? entry.mood : null,
      energy: entry ? entry.energy : null,
    };
  });

  const habitStats: HabitStat[] = habits.map((h) => {
    const list = completions[h.id] || [];
    const hit = week.filter((d) => list.includes(d));
    return {
      id: h.id,
      name: h.name,
      emoji: h.emoji,
      done: hit.length,
      pct: Math.round((hit.length / 7) * 100),
      missedDays: week
        .filter((d) => !list.includes(d))
        .map((d) => DAY_LABEL[new Date(`${d}T00:00:00`).getDay()]),
    };
  });

  const sorted = [...habitStats].sort((a, b) => b.done - a.done);
  const best = sorted.slice(0, 3).filter((h) => h.done > 0);
  const weakest = [...sorted].reverse().slice(0, 2).filter((h) => h.done < 7);

  const entries = journal.filter((j) => week.includes(j.date));
  const avg = (arr: number[]) =>
    arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null;
  const avgMood = avg(entries.map((e) => e.mood));
  const avgEnergy = avg(entries.map((e) => e.energy));

  // Kaitan mood <-> penyelesaian habit
  let moodLink: string | null = null;
  const withMood = days.filter((d) => d.mood !== null && d.total > 0);
  if (withMood.length >= 3) {
    const high = withMood.filter((d) => (d.mood as number) >= 4);
    const low = withMood.filter((d) => (d.mood as number) <= 2);
    if (high.length && low.length) {
      const hp = Math.round(high.reduce((s, d) => s + d.pct, 0) / high.length);
      const lp = Math.round(low.reduce((s, d) => s + d.pct, 0) / low.length);
      moodLink = `Di hari dengan mood tinggi kamu menyelesaikan rata-rata ${hp}% kebiasaan, sementara di hari mood rendah cuma ${lp}%.`;
    }
  }

  const milestonesDone = goals.reduce(
    (s, g) => s + g.milestones.filter((m) => m.done).length,
    0,
  );
  const openWeeklyGoals = goals
    .filter((g) => g.horizon === "weekly" && g.progress < 100)
    .map((g) => ({ title: g.title, progress: g.progress }));

  const fmt = (k: string) =>
    new Date(`${k}T00:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short" });

  return {
    rangeLabel: `${fmt(week[0])} – ${fmt(week[6])}`,
    score: cur.pct,
    prevScore: prev.pct,
    delta: cur.pct - prev.pct,
    days,
    best,
    weakest,
    avgMood,
    avgEnergy,
    moodLink,
    journalCount: entries.length,
    milestonesDone,
    openWeeklyGoals,
    totalDone: cur.done,
    totalPossible: cur.total,
  };
}

/** Ringkasan angka yang aman dikirim ke AI — tanpa isi jurnal mentah. */
export function summarizeForAI(r: WeeklyReview) {
  return {
    skorMingguIni: r.score,
    skorMingguLalu: r.prevScore,
    kebiasaanTerkuat: r.best.map((h) => `${h.name} (${h.done}/7)`),
    kebiasaanTerlemah: r.weakest.map((h) => `${h.name} (${h.done}/7)`),
    rataMood: r.avgMood,
    rataEnergi: r.avgEnergy,
    jumlahJurnal: r.journalCount,
    tujuanMingguanBelumSelesai: r.openWeeklyGoals.map((g) => `${g.title} (${g.progress}%)`),
    polaHarian: r.days.map((d) => `${d.label}:${d.pct}%`),
  };
}

export function fallbackAdvice(r: WeeklyReview): string {
  const parts: string[] = [];
  if (r.delta > 3) parts.push(`Minggu ini naik ${r.delta} poin dari minggu lalu — ritmenya lagi bagus, jaga saja.`);
  else if (r.delta < -3) parts.push(`Minggu ini turun ${Math.abs(r.delta)} poin. Nggak apa-apa, turunin dulu targetnya biar gampang dimulai lagi.`);
  else parts.push("Ritme kamu stabil minggu ini. Stabil itu sudah kemenangan kecil.");

  if (r.weakest.length) {
    parts.push(
      `Minggu depan fokus benerin satu hal saja: ${r.weakest[0].name}. Pasang versi paling kecilnya, cukup 2 menit, biar rantainya nyambung lagi.`,
    );
  } else if (r.best.length) {
    parts.push(`${r.best[0].name} jadi jangkar kamu — pakai itu sebagai pemicu kebiasaan lain.`);
  }

  if (r.journalCount < 3) parts.push("Coba isi jurnal minimal 3 malam supaya polanya makin kebaca.");
  return parts.join(" ");
}