/**
 * Service worker Rayhan — file statis, bukan hasil generate.
 *
 * Sengaja ditaruh di public/ karena artefak build vite-plugin-pwa tidak ikut
 * ter-deploy (dulu /sw.js selalu 404 di produksi, jadi push mustahil jalan),
 * sementara isi public/ terbukti terlayani — manifest & ikon selalu termuat.
 *
 * Isinya sengaja minimalis: handler push + fallback navigasi saat offline.
 * Tidak ada precache aset supaya rilis baru tidak pernah tersangkut versi lama.
 */

const OFFLINE_CACHE = "rayhan-nav-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((n) => n !== OFFLINE_CACHE).map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

/**
 * Hanya navigasi yang disentuh: coba jaringan dulu, pakai salinan terakhir
 * kalau sedang offline. Aset lain dibiarkan lewat apa adanya.
 */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        const cache = await caches.open(OFFLINE_CACHE);
        cache.put("/", fresh.clone());
        return fresh;
      } catch {
        const cached = await caches.match("/", { cacheName: OFFLINE_CACHE });
        return cached ?? Response.error();
      }
    })(),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: "Rayhan", body: event.data ? event.data.text() : "" };
  }

  const title = payload.title || "Rayhan";
  const options = {
    body: payload.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    tag: payload.tag || "rayhan",
    renotify: true,
    data: { url: payload.url || "/" },
    vibrate: [80, 40, 80],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data && event.notification.data.url) || "/",
    self.location.origin,
  ).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && "focus" in client) {
          client.navigate?.(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
