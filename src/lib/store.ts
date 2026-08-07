import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Habit = {
  id: string;
  name: string;
  emoji: string;
  category: string;
  priority: "low" | "med" | "high";
  duration?: string;
  createdAt: string;
};

export type Goal = {
  id: string;
  title: string;
  description?: string;
  horizon: "weekly" | "monthly" | "quarterly" | "yearly" | "lifetime";
  deadline?: string;
  progress: number;
  milestones: { id: string; title: string; done: boolean }[];
  createdAt: string;
};

export type JournalEntry = {
  id: string;
  date: string; // yyyy-mm-dd
  mood: 1 | 2 | 3 | 4 | 5;
  energy: 1 | 2 | 3 | 4 | 5;
  gratitude: string;
  reflection: string;
  winToday: string;
  tomorrowFocus: string;
};

export type Identity = { id: string; label: string };
export type VisionItem = { id: string; label: string };
export type FocusItem = { id: string; label: string; done: boolean };

export type Reminders = {
  enabled: boolean;
  habitTime: string; // HH:mm
  journalTime: string; // HH:mm
  focusEnabled: boolean;
  focusEveryHours: number; // interval jam untuk pengingat fokus
  focusStart: string; // HH:mm mulai jendela pengingat
  focusEnd: string; // HH:mm akhir jendela pengingat
};

export type SavingPot = {
  id: string;
  name: string;
  target: number;
  note?: string;
  createdAt: string;
};

export type SavingTx = {
  id: string;
  potId: string;
  amount: number; // positif = setor, negatif = tarik
  note?: string;
  date: string; // yyyy-mm-dd
};

/** Satu posisi saham IHSG. Hasilnya diturunkan dari harga buy & sell. */
export type Trade = {
  id: string;
  date: string; // yyyy-mm-dd
  ticker: string; // kode saham, mis. BBCA
  style: "scalping" | "swing";
  amount?: number; // modal rupiah yang dipakai
  buy: number; // harga beli per lembar
  sell?: number; // harga jual — kosong selama masih hold
  reason?: string; // alasan masuk
  emotion: "tenang" | "sabar" | "serakah" | "takut" | "balas dendam";
  status: "hold" | "sold";
  notes?: string;
};

/** Return posisi dalam persen; null kalau belum dijual. */
export function tradeReturn(t: Trade): number | null {
  if (t.status !== "sold" || t.sell === undefined || !t.buy) return null;
  return ((t.sell - t.buy) / t.buy) * 100;
}

/** Hasil dalam rupiah; null kalau belum dijual atau modalnya belum dicatat. */
export function tradePnl(t: Trade): number | null {
  const ret = tradeReturn(t);
  if (ret === null || !t.amount) return null;
  return (ret / 100) * t.amount;
}

/** Total tabungan pada akhir sebuah bulan. */
export type MonthlySaving = {
  id: string;
  month: string; // yyyy-mm
  amount: number;
  note?: string;
};

export type State = {
  name: string;
  becoming: Identity[];
  vision: VisionItem[];
  visionYear: string;
  focusItems: Record<string, FocusItem[]>; // dateKey -> focus items
  schedules: Record<string, { id: string; time: string; label: string }[]>;
  habits: Habit[];
  completions: Record<string, string[]>; // habitId -> [yyyy-mm-dd]
  goals: Goal[];
  journal: JournalEntry[];
  reminders: Reminders;
  pots: SavingPot[];
  savingTx: SavingTx[];
  monthlySavings: MonthlySaving[];
  trades: Trade[];

  setName: (n: string) => void;
  setReminders: (patch: Partial<Reminders>) => void;
  addFocusItem: (date: string, label: string) => void;
  removeFocusItem: (date: string, id: string) => void;
  toggleFocusItem: (date: string, id: string) => void;
  addScheduleItem: (date: string, time: string, label: string) => void;
  removeScheduleItem: (date: string, id: string) => void;
  updateScheduleItem: (date: string, id: string, patch: { time?: string; label?: string }) => void;
  setSchedule: (date: string, items: { id: string; time: string; label: string }[]) => void;
  addBecoming: (label: string) => void;
  removeBecoming: (id: string) => void;
  addVision: (label: string) => void;
  removeVision: (id: string) => void;
  setVisionYear: (y: string) => void;

  addHabit: (h: Omit<Habit, "id" | "createdAt">) => void;
  removeHabit: (id: string) => void;
  toggleHabit: (id: string, date: string) => void;

  addGoal: (g: Omit<Goal, "id" | "createdAt" | "progress" | "milestones"> & { milestones?: string[] }) => void;
  removeGoal: (id: string) => void;
  toggleMilestone: (goalId: string, milestoneId: string) => void;
  addMilestone: (goalId: string, title: string) => void;

  upsertJournal: (entry: Omit<JournalEntry, "id"> & { id?: string }) => void;

  addPot: (p: { name: string; target: number; note?: string }) => void;
  updatePot: (id: string, patch: { name?: string; target?: number; note?: string }) => void;
  removePot: (id: string) => void;
  addSavingTx: (tx: Omit<SavingTx, "id">) => void;
  /** Satu catatan per bulan — mengisi bulan yang sama akan menimpanya. */
  upsertMonthlySaving: (month: string, amount: number, note?: string) => void;
  removeMonthlySaving: (id: string) => void;
  removeSavingTx: (id: string) => void;

  addTrade: (t: Omit<Trade, "id">) => void;
  updateTrade: (id: string, patch: Partial<Omit<Trade, "id">>) => void;
  removeTrade: (id: string) => void;
};

const uid = () => Math.random().toString(36).slice(2, 10);

export const todayKey = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const SYNCED_KEYS = [
  "name",
  "becoming",
  "vision",
  "visionYear",
  "focusItems",
  "schedules",
  "habits",
  "completions",
  "goals",
  "journal",
  "reminders",
  "pots",
  "savingTx",
  "monthlySavings",
  "trades",
] as const;

const seed: Pick<State, (typeof SYNCED_KEYS)[number]> = {
  name: "Syams",
  visionYear: "2026",
  becoming: [
    { id: uid(), label: "Investor" },
    { id: uid(), label: "Kreator Konten" },
    { id: uid(), label: "Wirausahawan" },
    { id: uid(), label: "Pembelajar Sepanjang Hayat" },
    { id: uid(), label: "Pasangan yang Sehat" },
  ],
  vision: [
    { id: uid(), label: "Lulus dengan cumlaude" },
    { id: uid(), label: "Menabung 500 juta" },
    { id: uid(), label: "100rb pengikut" },
    { id: uid(), label: "Meluncurkan perusahaan" },
    { id: uid(), label: "Berlibur ke Jepang" },
  ],
  focusItems: {
    [todayKey()]: [
      "Selesaikan satu bab skripsi",
      "Upload satu video",
      "Sesi gym",
      "Baca 20 halaman",
    ].map((label) => ({ id: uid(), label, done: false })),
  },
  schedules: {
    [todayKey()]: [
      { id: uid(), time: "06:00", label: "Meditasi & jurnal pagi" },
      { id: uid(), time: "09:00", label: "Deep work — skripsi" },
      { id: uid(), time: "13:00", label: "Editing video" },
      { id: uid(), time: "17:30", label: "Latihan di gym" },
      { id: uid(), time: "21:00", label: "Baca & refleksi" },
    ],
  },
  habits: [
    { id: "h1", name: "Meditasi pagi",        emoji: "meditation", category: "Pikiran", priority: "high", duration: "10 mnt", createdAt: new Date().toISOString() },
    { id: "h2", name: "Sesi deep work",       emoji: "work",       category: "Fokus",   priority: "high", duration: "90 mnt", createdAt: new Date().toISOString() },
    { id: "h3", name: "Target hidrasi",       emoji: "water",      category: "Tubuh",   priority: "med",  duration: "2L",     createdAt: new Date().toISOString() },
    { id: "h4", name: "Baca 20 halaman",      emoji: "book",       category: "Pikiran", priority: "med",  duration: "30 mnt", createdAt: new Date().toISOString() },
    { id: "h5", name: "Jalan sore",           emoji: "walk",       category: "Tubuh",   priority: "low",  duration: "20 mnt", createdAt: new Date().toISOString() },
    { id: "h6", name: "Refleksi jurnal",      emoji: "journal",    category: "Pikiran", priority: "med",  duration: "15 mnt", createdAt: new Date().toISOString() },
  ],
  completions: (() => {
    // seed some past completions for a nicer initial dashboard
    const c: Record<string, string[]> = {};
    const habits = ["h1", "h2", "h3", "h4", "h5", "h6"];
    for (let i = 30; i >= 1; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const k = todayKey(d);
      habits.forEach((h) => {
        if (Math.random() > 0.35) {
          c[h] = c[h] || [];
          c[h].push(k);
        }
      });
    }
    const today = todayKey();
    c["h2"] = [...(c["h2"] || []), today];
    c["h3"] = [...(c["h3"] || []), today];
    return c;
  })(),
  goals: [
    {
      id: "gw1",
      title: "Selesai bab 5 skripsi",
      horizon: "weekly",
      progress: 40,
      milestones: [
        { id: uid(), title: "Kerangka bab 5", done: true },
        { id: uid(), title: "Draft pembahasan", done: false },
        { id: uid(), title: "Simpulan awal", done: false },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: "gw2",
      title: "Rekam 2 video panjang",
      horizon: "weekly",
      progress: 50,
      milestones: [
        { id: uid(), title: "Naskah video A", done: true },
        { id: uid(), title: "Naskah video B", done: true },
        { id: uid(), title: "Rekam video A", done: false },
        { id: uid(), title: "Rekam video B", done: false },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: "g1",
      title: "Lulus dengan cumlaude",
      description: "Selesaikan skripsi, sidang, dan wisuda dengan tenang.",
      horizon: "yearly",
      deadline: "2026-07-01",
      progress: 62,
      milestones: [
        { id: uid(), title: "Selesai bab 1–3", done: true },
        { id: uid(), title: "Selesai bab 4", done: true },
        { id: uid(), title: "Bab 5 & kesimpulan", done: false },
        { id: uid(), title: "Sidang skripsi", done: false },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: "g2",
      title: "Luncurkan studio",
      horizon: "quarterly",
      deadline: "2026-03-31",
      progress: 28,
      milestones: [
        { id: uid(), title: "Identitas brand", done: true },
        { id: uid(), title: "Website live", done: false },
        { id: uid(), title: "3 klien pertama", done: false },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: "g3",
      title: "Baca 24 buku",
      horizon: "yearly",
      deadline: "2026-12-31",
      progress: 45,
      milestones: [
        { id: uid(), title: "Q1 · 6 buku", done: true },
        { id: uid(), title: "Q2 · 6 buku", done: false },
      ],
      createdAt: new Date().toISOString(),
    },
  ],
  journal: [],
  reminders: { enabled: false, habitTime: "08:00", journalTime: "21:00", focusEnabled: true, focusEveryHours: 3, focusStart: "08:00", focusEnd: "22:00" },
  pots: [
    { id: "p1", name: "Dana darurat", target: 30000000, note: "6 bulan biaya hidup", createdAt: new Date().toISOString() },
    { id: "p2", name: "Modal trading", target: 50000000, note: "Modal yang siap dirisikokan", createdAt: new Date().toISOString() },
    { id: "p3", name: "Liburan Jepang", target: 25000000, createdAt: new Date().toISOString() },
  ],
  savingTx: [
    { id: uid(), potId: "p1", amount: 12000000, note: "Setoran awal", date: todayKey() },
    { id: uid(), potId: "p2", amount: 20000000, note: "Modal awal", date: todayKey() },
    { id: uid(), potId: "p3", amount: 4500000, note: "Nabung bulanan", date: todayKey() },
  ],
  monthlySavings: [],
  trades: [],
};

export const useStore = create<State>()(
  persist(
    (set) => ({
      ...seed,
      setName: (name) => set({ name }),
      setReminders: (patch) => set((s) => ({ reminders: { ...s.reminders, ...patch } })),
      addFocusItem: (date, label) =>
        set((s) => ({
          focusItems: {
            ...s.focusItems,
            [date]: [...(s.focusItems[date] || []), { id: uid(), label, done: false }],
          },
        })),
      removeFocusItem: (date, id) =>
        set((s) => ({
          focusItems: {
            ...s.focusItems,
            [date]: (s.focusItems[date] || []).filter((f) => f.id !== id),
          },
        })),
      toggleFocusItem: (date, id) =>
        set((s) => ({
          focusItems: {
            ...s.focusItems,
            [date]: (s.focusItems[date] || []).map((f) =>
              f.id === id ? { ...f, done: !f.done } : f,
            ),
          },
        })),
      addScheduleItem: (date, time, label) =>
        set((s) => {
          const list = s.schedules[date] || [];
          const next = [...list, { id: uid(), time, label }].sort((a, b) =>
            a.time.localeCompare(b.time),
          );
          return { schedules: { ...s.schedules, [date]: next } };
        }),
      removeScheduleItem: (date, id) =>
        set((s) => ({
          schedules: {
            ...s.schedules,
            [date]: (s.schedules[date] || []).filter((i) => i.id !== id),
          },
        })),
      updateScheduleItem: (date, id, patch) =>
        set((s) => ({
          schedules: {
            ...s.schedules,
            [date]: (s.schedules[date] || [])
              .map((i) => (i.id === id ? { ...i, ...patch } : i))
              .sort((a, b) => a.time.localeCompare(b.time)),
          },
        })),
      setSchedule: (date, items) =>
        set((s) => ({ schedules: { ...s.schedules, [date]: items } })),
      addBecoming: (label) =>
        set((s) => ({ becoming: [...s.becoming, { id: uid(), label }] })),
      removeBecoming: (id) =>
        set((s) => ({ becoming: s.becoming.filter((b) => b.id !== id) })),
      addVision: (label) =>
        set((s) => ({ vision: [...s.vision, { id: uid(), label }] })),
      removeVision: (id) => set((s) => ({ vision: s.vision.filter((v) => v.id !== id) })),
      setVisionYear: (visionYear) => set({ visionYear }),

      addHabit: (h) =>
        set((s) => ({
          habits: [...s.habits, { ...h, id: uid(), createdAt: new Date().toISOString() }],
        })),
      removeHabit: (id) =>
        set((s) => {
          const { [id]: _, ...rest } = s.completions;
          return { habits: s.habits.filter((h) => h.id !== id), completions: rest };
        }),
      toggleHabit: (id, date) =>
        set((s) => {
          const list = s.completions[id] || [];
          const has = list.includes(date);
          return {
            completions: {
              ...s.completions,
              [id]: has ? list.filter((d) => d !== date) : [...list, date],
            },
          };
        }),

      addGoal: (g) =>
        set((s) => ({
          goals: [
            ...s.goals,
            {
              ...g,
              id: uid(),
              progress: 0,
              milestones: (g.milestones || []).map((t) => ({
                id: uid(),
                title: t,
                done: false,
              })),
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      removeGoal: (id) => set((s) => ({ goals: s.goals.filter((g) => g.id !== id) })),
      toggleMilestone: (goalId, milestoneId) =>
        set((s) => ({
          goals: s.goals.map((g) => {
            if (g.id !== goalId) return g;
            const milestones = g.milestones.map((m) =>
              m.id === milestoneId ? { ...m, done: !m.done } : m,
            );
            const done = milestones.filter((m) => m.done).length;
            const progress = milestones.length
              ? Math.round((done / milestones.length) * 100)
              : g.progress;
            return { ...g, milestones, progress };
          }),
        })),
      addMilestone: (goalId, title) =>
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === goalId
              ? { ...g, milestones: [...g.milestones, { id: uid(), title, done: false }] }
              : g,
          ),
        })),

      upsertJournal: (entry) =>
        set((s) => {
          const existing = s.journal.find((j) => j.date === entry.date);
          if (existing) {
            return {
              journal: s.journal.map((j) =>
                j.date === entry.date ? { ...existing, ...entry, id: existing.id } : j,
              ),
            };
          }
          return { journal: [...s.journal, { ...entry, id: entry.id || uid() }] };
        }),

      addPot: (p) =>
        set((s) => ({
          pots: [...s.pots, { ...p, id: uid(), createdAt: new Date().toISOString() }],
        })),
      updatePot: (id, patch) =>
        set((s) => ({
          pots: s.pots.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      removePot: (id) =>
        set((s) => ({
          pots: s.pots.filter((p) => p.id !== id),
          savingTx: s.savingTx.filter((t) => t.potId !== id),
        })),
      addSavingTx: (tx) => set((s) => ({ savingTx: [...s.savingTx, { ...tx, id: uid() }] })),
      upsertMonthlySaving: (month, amount, note) =>
        set((s) => {
          const rest = s.monthlySavings.filter((m) => m.month !== month);
          return {
            monthlySavings: [...rest, { id: uid(), month, amount, note }].sort((a, b) =>
              a.month.localeCompare(b.month),
            ),
          };
        }),
      removeMonthlySaving: (id) =>
        set((s) => ({ monthlySavings: s.monthlySavings.filter((m) => m.id !== id) })),
      removeSavingTx: (id) =>
        set((s) => ({ savingTx: s.savingTx.filter((t) => t.id !== id) })),

      addTrade: (t) => set((s) => ({ trades: [...s.trades, { ...t, id: uid() }] })),
      updateTrade: (id, patch) =>
        set((s) => ({
          trades: s.trades.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        })),
      removeTrade: (id) => set((s) => ({ trades: s.trades.filter((t) => t.id !== id) })),
    }),
    {
      name: "aura-life-os",
      version: 7,
      migrate: (persisted: any, _version) => {
        if (!persisted) return persisted;
        persisted.reminders = { ...({ enabled: false, habitTime: "08:00", journalTime: "21:00", focusEnabled: true, focusEveryHours: 3, focusStart: "08:00", focusEnd: "22:00" }), ...(persisted.reminders || {}) };
        if (!persisted.schedules) persisted.schedules = {};
        if (persisted.todaysSchedule && Object.keys(persisted.schedules).length === 0) {
          persisted.schedules[todayKey()] = persisted.todaysSchedule;
        }
        delete persisted.todaysSchedule;
        if (Array.isArray(persisted.todaysFocus)) {
          const list = persisted.todaysFocus.map((f: unknown) =>
            typeof f === "string" ? { id: uid(), label: f, done: false } : f,
          );
          persisted.focusItems = { ...(persisted.focusItems || {}), [todayKey()]: list };
        }
        delete persisted.todaysFocus;
        if (!persisted.focusItems) persisted.focusItems = {};
        if (!Array.isArray(persisted.pots)) persisted.pots = [];
        if (!Array.isArray(persisted.savingTx)) persisted.savingTx = [];
        if (!Array.isArray(persisted.monthlySavings)) persisted.monthlySavings = [];
        if (!Array.isArray(persisted.trades)) persisted.trades = [];
        // Jurnal trading lama (pair/side/entry/exit/pnl) → format saham IHSG.
        persisted.trades = persisted.trades.map((t: any) => {
          if (!t || t.ticker !== undefined) return t;
          return {
            id: t.id,
            date: t.date,
            ticker: String(t.pair ?? "").toUpperCase(),
            style: "swing",
            buy: Number(t.entry ?? 0),
            sell: t.exit !== undefined ? Number(t.exit) : undefined,
            reason: t.setup,
            emotion: t.emotion ?? "tenang",
            status: t.status === "open" ? "hold" : "sold",
            notes: t.notes,
          };
        });
        return persisted;
      },
      merge: (persisted: any, current) => ({
        ...current,
        ...(persisted || {}),
        focusItems: {
          ...(current.focusItems || {}),
          ...((persisted && persisted.focusItems) || {}),
        },
        schedules: {
          ...(current.schedules || {}),
          ...((persisted && persisted.schedules) || {}),
        },
      }),
    },
  ),
);

// Derived helpers
export function currentStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const set = new Set(dates);
  let streak = 0;
  const d = new Date();
  while (set.has(todayKey(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function longestStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = [...dates].sort();
  let best = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const now = new Date(sorted[i]);
    prev.setDate(prev.getDate() + 1);
    if (todayKey(prev) === todayKey(now)) cur++;
    else cur = 1;
    if (cur > best) best = cur;
  }
  return best;
}

import { useEffect, useState } from "react";
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => setH(true), []);
  return h;
}