/* Offline support. Pages and files are cached as they are used, and served from the
 * cache first so the app opens with no connection. A fresh copy is fetched in the
 * background, so an update shows up the next time the app is opened. */
const CACHE = "open-av-toolkit-v1";

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

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (!cacheable(url)) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const key = req.mode === "navigate" ? new Request(self.registration.scope) : req;
      const cached = await cache.match(key);
      const fresh = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === "opaque")) cache.put(key, res.clone());
          return res;
        })
        .catch(() => undefined);
      if (cached) {
        event.waitUntil(fresh);
        return cached;
      }
      return (await fresh) || Response.error();
    })
  );
});
