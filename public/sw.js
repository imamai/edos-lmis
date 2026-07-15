// Minimal service worker: caches the app shell for resilience on flaky
// connections. The actual offline write-capture (specimen collection, result
// entry) is handled client-side via IndexedDB in lib/offline/*, not through
// fetch interception here — Next.js Server Actions are awkward to replay
// reliably from inside a service worker, so the IndexedDB queue + the
// browser's online/offline events is the source of truth for sync.
const CACHE_NAME = "edoslmis-shell-v1";
const SHELL_URLS = ["/"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_URLS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
