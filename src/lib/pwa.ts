/**
 * Registrasi service worker yang dijaga ketat: tidak pernah aktif di dev,
 * iframe, atau preview Lovable — hanya di aplikasi yang sudah dipublish.
 */
const SW_URL = "/sw.js";

/** Alasan service worker dimatikan — `null` berarti boleh jalan. */
export type SwBlockReason = "unsupported" | "dev" | "iframe" | "disabled" | "preview" | null;

export function serviceWorkerBlockReason(): SwBlockReason {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return "unsupported";
  if (!import.meta.env.PROD) return "dev";
  if (window.self !== window.top) return "iframe";
  if (new URL(window.location.href).searchParams.get("sw") === "off") return "disabled";

  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return "preview";
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return "preview";
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com"))
    return "preview";
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return "preview";
  return null;
}

function isBlockedContext() {
  return serviceWorkerBlockReason() !== null;
}

async function unregisterAppWorker() {
  if (!("serviceWorker" in navigator)) return;
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.allSettled(
    registrations
      .filter((r) => (r.active?.scriptURL ?? r.installing?.scriptURL ?? "").endsWith(SW_URL))
      .map((r) => r.unregister()),
  );
}

export async function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  if (isBlockedContext()) {
    await unregisterAppWorker();
    return;
  }
  try {
    const { registerSW } = await import("virtual:pwa-register");
    registerSW({ immediate: true });
  } catch (error) {
    console.warn("service worker registration skipped:", error);
  }
}