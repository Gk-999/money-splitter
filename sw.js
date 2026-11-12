/* PantherSplits service worker — lets the site open and work with no internet.
   Pages: network first (so updates show immediately when online), cached copy when offline.
   CSS / icons / fonts: served from cache instantly and refreshed in the background.
   Bump VERSION only if you need to force-clear old caches. */
const VERSION = "ps-1";
const CORE = [
  "./",
  "index.html",
  "trip-expense-calculator.html",
  "shared-pot-calculator.html",
  "flatmate-expense-splitter.html",
  "splitwise-alternative.html",
  "guides.css",
  "site.webmanifest",
  "icon-192.png",
  "icon-512.png",
  "apple-touch-icon.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(VERSION).then(cache => cache.addAll(CORE)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const isFont = url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com";
  if (url.origin !== self.location.origin && !isFont) return; // leave WhatsApp etc. alone

  // Page loads: network first, fall back to the cached page (ignoring ?mode=… and similar)
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
          return res;
        })
        .catch(() =>
          caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match("./"))
        )
    );
    return;
  }

  // Everything else: cache first, refresh in the background
  event.respondWith(
    caches.match(req).then(hit => {
      const refresh = fetch(req)
        .then(res => {
          if (res && (res.ok || res.type === "opaque")) {
            const copy = res.clone();
            caches.open(VERSION).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || refresh;
    })
  );
});
