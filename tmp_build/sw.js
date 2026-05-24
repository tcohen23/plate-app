const CACHE_NAME = "plate-v13";

// Install: skip waiting immediately so the new SW takes over right away
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

// Activate: wipe all old caches, claim clients, then tell every open tab to reload
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: "SW_UPDATED" }));
        })
      )
  );
});

// Fetch: network-first always — no stale JS/CSS ever served
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  if (e.request.method !== "GET") return;
  if (url.hostname.includes("convex")) return;
  if (url.pathname.startsWith("/api")) return;

  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request).then((cached) => cached || new Response("Offline", { status: 503 })))
  );
});
