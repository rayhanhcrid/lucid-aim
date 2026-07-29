import { useEffect } from "react";
import { todayKey, useStore } from "./store";

const FIRED_KEY = "rayhan-reminders-fired";

function todayStamp(kind: string, time: string) {
  const d = new Date();
  return `${d.toDateString()}|${kind}|${time}`;
}

function alreadyFired(stamp: string) {
  try {
    return (localStorage.getItem(FIRED_KEY) || "").split(",").includes(stamp);
  } catch {
    return false;
  }
}

function markFired(stamp: string) {
  try {
    const list = (localStorage.getItem(FIRED_KEY) || "").split(",").filter(Boolean);
    localStorage.setItem(FIRED_KEY, [...list.slice(-8), stamp].join(","));
  } catch {
    /* ignore */
  }
}

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!notificationsSupported()) return "unsupported" as const;
  return Notification.requestPermission();
}

export function showReminder(title: string, body: string) {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  try {
    new Notification(title, { body, icon: "/icon-192.png", badge: "/icon-192.png", tag: title });
    return true;
  } catch {
    return false;
  }
}

/**
 * Penjadwal pengingat sisi-browser. Hanya berjalan selama aplikasi terbuka
 * (atau tab masih hidup di latar). Untuk pengingat yang tetap sampai saat
 * aplikasi tertutup, dibutuhkan web push + backend.
 */
export function useReminderScheduler() {
  const reminders = useStore((s) => s.reminders);

  useEffect(() => {
    if (!reminders?.enabled || !notificationsSupported()) return;

    const tick = () => {
      if (Notification.permission !== "granted") return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

      const checks: { kind: string; time: string; title: string; body: string }[] = [
        {
          kind: "habit",
          time: reminders.habitTime,
          title: "Waktunya ritual harian",
          body: "Buka Rayhan dan centang kebiasaan pertamamu hari ini.",
        },
        {
          kind: "journal",
          time: reminders.journalTime,
          title: "Refleksi malam",
          body: "Catat mood, satu kemenangan hari ini, dan jadwal buat besok.",
        },
      ];

      for (const c of checks) {
        if (!c.time) continue;
        if (hhmm !== c.time) continue;
        const stamp = todayStamp(c.kind, c.time);
        if (alreadyFired(stamp)) continue;
        if (showReminder(c.title, c.body)) markFired(stamp);
      }

      // Pengingat berkala untuk fokus hari ini yang belum beres.
      if (reminders.focusEnabled !== false) {
        const every = Math.max(1, Number(reminders.focusEveryHours) || 3);
        const start = toMinutes(reminders.focusStart || "08:00");
        const end = toMinutes(reminders.focusEnd || "22:00");
        const nowMin = now.getHours() * 60 + now.getMinutes();
        if (nowMin >= start && nowMin <= end) {
          const sinceStart = nowMin - start;
          const slot = Math.floor(sinceStart / (every * 60));
          const slotMin = start + slot * every * 60;
          // hanya picu dalam 5 menit pertama tiap slot
          if (nowMin - slotMin < 5) {
            const stamp = todayStamp("focus", String(slotMin));
            if (!alreadyFired(stamp)) {
              const pending = (useStore.getState().focusItems[todayKey()] || []).filter((f) => !f.done);
              if (pending.length > 0) {
                const ok = showReminder(
                  `${pending.length} fokus belum beres`,
                  pending.slice(0, 3).map((f) => `• ${f.label}`).join("\n"),
                );
                if (ok) markFired(stamp);
              } else {
                markFired(stamp);
              }
            }
          }
        }
      }
    };

    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [
    reminders?.enabled,
    reminders?.habitTime,
    reminders?.journalTime,
    reminders?.focusEnabled,
    reminders?.focusEveryHours,
    reminders?.focusStart,
    reminders?.focusEnd,
  ]);
}

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}