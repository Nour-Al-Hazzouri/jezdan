const CACHE_NAME = "jezdan-cache-v2";
const ASSETS_TO_CACHE = ["./", "./index.html", "./main.js", "./manifest.json"];

self.addEventListener("install", (event) => {
  // ponytail: skipWaiting forces the new SW to activate immediately.
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }),
  );
});

self.addEventListener("activate", (event) => {
  // ponytail: claim clients immediately and delete old caches so updates apply cleanly.
  event.waitUntil(self.clients.claim());
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
});

self.addEventListener("fetch", (event) => {
  // ponytail: Stale-While-Revalidate strategy.
  // Instantly loads from cache (offline-first), while fetching updates in the background.
  // Next time the user opens the app, they get the updated version automatically.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            // Only cache successful GET responses
            if (
              networkResponse &&
              networkResponse.ok &&
              event.request.method === "GET"
            ) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // Offline: ignore network failure, we have cachedResponse
          });

        return cachedResponse || fetchPromise;
      });
    }),
  );
});
