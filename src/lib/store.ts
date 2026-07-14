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

type State = {
  name: string;
  becoming: Identity[];
  vision: VisionItem[];
  visionYear: string;
  todaysFocus: string[];
  habits: Habit[];
  completions: Record<string, string[]>; // habitId -> [yyyy-mm-dd]
  goals: Goal[];
  journal: JournalEntry[];

  setName: (n: string) => void;
  setTodaysFocus: (items: string[]) => void;
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
};

const uid = () => Math.random().toString(36).slice(2, 10);

export const todayKey = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const seed: Pick<
  State,
  "name" | "becoming" | "vision" | "visionYear" | "todaysFocus" | "habits" | "completions" | "goals" | "journal"
> = {
  name: "Syams",
  visionYear: "2026",
  becoming: [
    { id: uid(), label: "Investor" },
    { id: uid(), label: "Content Creator" },
    { id: uid(), label: "Entrepreneur" },
    { id: uid(), label: "Lifelong Learner" },
    { id: uid(), label: "Healthy Partner" },
  ],
  vision: [
    { id: uid(), label: "Graduate with honors" },
    { id: uid(), label: "Save 500M" },
    { id: uid(), label: "100K followers" },
    { id: uid(), label: "Ship the company" },
    { id: uid(), label: "Travel to Japan" },
  ],
  todaysFocus: ["Finish skripsi chapter", "Upload one video", "Gym session", "Read 20 pages"],
  habits: [
    { id: "h1", name: "Morning meditation", emoji: "🧘", category: "Mind", priority: "high", duration: "10 min", createdAt: new Date().toISOString() },
    { id: "h2", name: "Deep work session", emoji: "💻", category: "Focus", priority: "high", duration: "90 min", createdAt: new Date().toISOString() },
    { id: "h3", name: "Hydration target", emoji: "💧", category: "Body", priority: "med", duration: "2L", createdAt: new Date().toISOString() },
    { id: "h4", name: "Read 20 pages", emoji: "📖", category: "Mind", priority: "med", duration: "30 min", createdAt: new Date().toISOString() },
    { id: "h5", name: "Evening walk", emoji: "🚶", category: "Body", priority: "low", duration: "20 min", createdAt: new Date().toISOString() },
    { id: "h6", name: "Journal reflection", emoji: "✍️", category: "Mind", priority: "med", duration: "15 min", createdAt: new Date().toISOString() },
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
      id: "g1",
      title: "Graduate with honors",
      description: "Finish thesis, defend, and walk the stage.",
      horizon: "yearly",
      deadline: "2026-07-01",
      progress: 62,
      milestones: [
        { id: uid(), title: "Finish chapter 1–3", done: true },
        { id: uid(), title: "Complete chapter 4", done: true },
        { id: uid(), title: "Chapter 5 & conclusion", done: false },
        { id: uid(), title: "Thesis defense", done: false },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: "g2",
      title: "Ship the studio launch",
      horizon: "quarterly",
      deadline: "2026-03-31",
      progress: 28,
      milestones: [
        { id: uid(), title: "Brand identity", done: true },
        { id: uid(), title: "Website live", done: false },
        { id: uid(), title: "First 3 clients", done: false },
      ],
      createdAt: new Date().toISOString(),
    },
    {
      id: "g3",
      title: "Read 24 books",
      horizon: "yearly",
      deadline: "2026-12-31",
      progress: 45,
      milestones: [
        { id: uid(), title: "Q1 · 6 books", done: true },
        { id: uid(), title: "Q2 · 6 books", done: false },
      ],
      createdAt: new Date().toISOString(),
    },
  ],
  journal: [],
};

export const useStore = create<State>()(
  persist(
    (set) => ({
      ...seed,
      setName: (name) => set({ name }),
      setTodaysFocus: (todaysFocus) => set({ todaysFocus }),
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
    }),
    { name: "aura-life-os" },
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

export function useHydrated() {
  // consumers can wait for hydration via zustand persist
  return typeof window !== "undefined";
}