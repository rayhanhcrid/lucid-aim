import { useEffect } from "react";
import { toast } from "sonner";
import { useStore } from "./store";

/**
 * Batas minggu terakhir yang sudah lewat: Senin 03:00 waktu perangkat.
 * Senin jam 01:00 masih dianggap "minggu lalu" — resetnya baru jam 3 pagi.
 */
export function lastWeeklyBoundary(now: Date = new Date()): Date {
  const d = new Date(now);
  const daysSinceMonday = (d.getDay() + 6) % 7; // Minggu=6, Senin=0, Selasa=1, ...
  d.setDate(d.getDate() - daysSinceMonday);
  d.setHours(3, 0, 0, 0);
  if (d.getTime() > now.getTime()) d.setDate(d.getDate() - 7);
  return d;
}

/** Senin 03:00 berikutnya — dipakai buat label "reset berikutnya". */
export function nextWeeklyBoundary(now: Date = new Date()): Date {
  const next = new Date(lastWeeklyBoundary(now));
  next.setDate(next.getDate() + 7);
  return next;
}

/**
 * Tujuan mingguan dikosongkan progresnya tiap Senin 03:00 — judul & milestone-nya
 * tetap, cuma centangnya yang dilepas.
 *
 * Nggak ada server yang jalan terus, jadi pengecekannya di sisi klien: tiap tick
 * dibandingkan penanda `weeklyResetAt` dengan batas Senin terakhir. Kalau app
 * ditutup semalaman (atau seminggu), resetnya nyusul begitu app dibuka lagi.
 * Penanda ikut tersinkron ke cloud supaya perangkat lain nggak reset dua kali.
 */
export function useWeeklyGoalReset() {
  useEffect(() => {
    const check = () => {
      const boundary = lastWeeklyBoundary();
      const marked = useStore.getState().weeklyResetAt;
      const markedAt = marked ? new Date(marked).getTime() : NaN;

      // Penanda hilang/rusak (mis. data cloud dari versi lama): tandai saja tanpa
      // menghapus progres yang sedang jalan.
      if (Number.isNaN(markedAt)) {
        useStore.setState({ weeklyResetAt: new Date().toISOString() });
        return;
      }
      if (markedAt >= boundary.getTime()) return;

      const hadProgress = useStore
        .getState()
        .goals.some((g) => g.horizon === "weekly" && (g.progress > 0 || g.milestones.some((m) => m.done)));

      useStore.getState().resetWeeklyGoals(boundary.toISOString());
      if (hadProgress) {
        toast("Minggu baru dimulai", {
          description: "Tujuan mingguanmu sudah direset. Pelan-pelan aja, mulai dari satu milestone.",
        });
      }
    };

    check();
    // Tick pendek supaya kalau data cloud sempat menimpa hasil reset (mis. baris
    // cloud masih versi sebelum Senin), keadaannya benar lagi dalam hitungan detik.
    const id = setInterval(check, 30_000);
    return () => clearInterval(id);
  }, []);
}
