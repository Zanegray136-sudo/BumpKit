/* Offline support.
 * - The page itself (index.html) is fetched from the network first, so a new version shows
 *   up on the very next visit. If there is no connection, the last copy is used.
 * - Built files have fingerprinted names that never change, so they are served from the
 *   cache first and fetched once.
 * - Everything else is served from the cache and refreshed in the background. */
const CACHE = "pixelpatch-v2";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const cacheable = (url) =>
  url.origin === self.location.origin ||
  url.hostname === "fonts.googleapis.com" ||
  url.hostname === "fonts.gstatic.com";

const store = (cache, key, res) => {
  if (res && (res.ok || res.type === "opaque")) cache.put(key, res.clone());
  return res;
};

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!cacheable(url)) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // The page: network first, cache when offline.
      if (req.mode === "navigate") {
        const key = new Request(self.registration.scope);
        try {
          return store(cache, key, await fetch(req));
        } catch {
          return (await cache.match(key)) || Response.error();
        }
      }

      const cached = await cache.match(req);
      // Fingerprinted build files never change, so the cache copy is always right.
      if (cached && url.pathname.includes("/assets/")) return cached;

      const fresh = fetch(req)
        .then((res) => store(cache, req, res))
        .catch(() => undefined);
      if (cached) {
        event.waitUntil(fresh);
        return cached;
      }
      return (await fresh) || Response.error();
    })
  );
});
