/**
 * Web Push — pengingat yang dikirim dari server, jadi tetap sampai ke HP
 * walaupun aplikasi/tab-nya sudah ditutup.
 *
 * Alur: browser bikin langganan push → disimpan di tabel `push_subscriptions`
 * → Edge Function `send-reminders` (dipanggil pg_cron tiap menit) yang kirim
 * notifikasinya sesuai jadwal di halaman Profil.
 */
import { registerServiceWorker, serviceWorkerBlockReason } from "./pwa";
import { supabase } from "./supabase";

/** Kunci publik VAPID — memang dirancang untuk terekspos di klien. */
const VAPID_PUBLIC_KEY =
  (import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined) ||
  "BN9IDy0PZf1BjONvG3ZBy8z3-K_P6R18uBhww0TWHg2MEWZW5bdb57FZjiSXYfkGUafqKLNl-l0ShnkQpS8E9w0";

export type PushState =
  | "unsupported" // browser/OS tidak mendukung push
  | "no-sw" // service worker belum aktif (dev / preview / belum di-install)
  | "denied" // izin notifikasi ditolak
  | "off" // didukung tapi belum berlangganan
  | "on"; // aktif

function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + "=".repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(padded);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function keyToB64url(key: ArrayBuffer | null) {
  if (!key) return "";
  const bytes = new Uint8Array(key);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/**
 * iOS hanya mengizinkan push kalau aplikasi sudah di-install ke Home Screen.
 */
export function needsInstallForPush() {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (!isIOS) return false;
  return !window.matchMedia("(display-mode: standalone)").matches;
}

async function getRegistration() {
  if (!pushSupported()) return null;
  // Kalau konteksnya diblokir (dev/iframe/preview), sw.js memang tidak pernah
  // didaftarkan — jangan buang waktu menunggu `ready` yang takkan resolve.
  if (serviceWorkerBlockReason()) return null;

  const existing = await navigator.serviceWorker.getRegistration();
  if (existing?.active) return existing;

  // Belum aktif: pastikan sudah didaftarkan, lalu tunggu sampai aktif.
  await registerServiceWorker();
  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), 10_000)),
  ]);
}

/** Kenapa push tidak tersedia di sesi ini — untuk pesan yang spesifik di UI. */
export function pushBlockReason() {
  return serviceWorkerBlockReason();
}

export async function getPushState(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const reg = await getRegistration();
  if (!reg?.pushManager) return "no-sw";
  const sub = await reg.pushManager.getSubscription();
  return sub ? "on" : "off";
}

async function saveSubscription(sub: PushSubscription) {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const json = sub.toJSON();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? keyToB64url(sub.getKey("p256dh")),
      auth: json.keys?.auth ?? keyToB64url(sub.getKey("auth")),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Jakarta",
      label: navigator.userAgent.slice(0, 120),
      last_seen: new Date().toISOString(),
    },
    { onConflict: "endpoint" },
  );
  if (error) throw new Error(error.message);
}

export async function enablePush(): Promise<PushState> {
  if (!pushSupported()) return "unsupported";

  const permission =
    Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";

  const reg = await getRegistration();
  if (!reg?.pushManager) return "no-sw";

  const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY);
  let sub = await reg.pushManager.getSubscription();

  // Kalau langganan lama dibuat dengan kunci VAPID berbeda, buat ulang.
  if (sub && keyToB64url(sub.options.applicationServerKey) !== VAPID_PUBLIC_KEY) {
    await removeSubscription(sub);
    sub = null;
  }

  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: appServerKey as BufferSource,
    });
  }

  await saveSubscription(sub);
  return "on";
}

async function removeSubscription(sub: PushSubscription) {
  try {
    if (supabase) await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  } finally {
    await sub.unsubscribe();
  }
}

export async function disablePush(): Promise<PushState> {
  const reg = await getRegistration();
  const sub = await reg?.pushManager?.getSubscription();
  if (sub) await removeSubscription(sub);
  return "off";
}

/** Kirim satu notifikasi uji lewat server (bukan notifikasi lokal). */
export async function sendTestPush() {
  if (!supabase) throw new Error("Supabase belum dikonfigurasi.");
  const { data, error } = await supabase.functions.invoke("send-reminders", {
    body: { test: true },
  });
  if (error) throw error;
  return data as { sent: number; checked: number };
}

/**
 * Dipanggil tiap aplikasi dibuka: menyegarkan zona waktu & last_seen, dan
 * memulihkan baris langganan kalau sempat terhapus dari server.
 */
export async function syncPushSubscription() {
  if (!pushSupported() || Notification.permission !== "granted") return;
  const reg = await getRegistration();
  const sub = await reg?.pushManager?.getSubscription();
  if (!sub) return;
  try {
    await saveSubscription(sub);
  } catch {
    /* offline — coba lagi lain kali */
  }
}
