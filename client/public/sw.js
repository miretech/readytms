/* ReadyTMS Driver PWA service worker.
 * Strategy:
 *  - /api/*  and non-GET  -> never touched (always live network; auth/session safe)
 *  - navigations           -> network-first, fall back to cached shell, then offline.html
 *  - same-origin assets     -> stale-while-revalidate
 * Bump CACHE_VERSION to force clients onto a new shell.
 */
const CACHE_VERSION = "rtms-driver-v1";
const APP_SHELL = `${CACHE_VERSION}-shell`;
const RUNTIME = `${CACHE_VERSION}-runtime`;

const PRECACHE = [
  "/",
  "/offline.html",
  "/manifest.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(APP_SHELL)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => !k.startsWith(CACHE_VERSION))
            .map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// Allow the page to trigger an immediate activation after an update.
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Only handle same-origin GET. Everything else (API, POST/PATCH, cross-origin) goes straight to network.
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // App navigations: network-first so drivers always get fresh data when online.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(APP_SHELL).then((c) => c.put("/", copy));
          return res;
        })
        .catch(async () => {
          const cached = await caches.match("/");
          return cached || caches.match("/offline.html");
        })
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(RUNTIME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
