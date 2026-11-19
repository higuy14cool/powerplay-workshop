/* POWERPLAY Workshop service worker — makes the workshop installable and
   keeps the shell working offline. Games carry their own workers. */
const CACHE = "powerplay-workshop-v13";
const SHELL = [
  "./",
  "./index.html",
  "./app.html",
  "./app.webmanifest",
  "./assets/styles.css",
  "./assets/app.js",
  "./assets/app-mode.js",
  "./assets/accounts.js",
  "./assets/autosave.js",
  "./assets/fullscreen.js",
  "./assets/accounts-data.js",
  "./assets/games-data.js",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(SHELL.map((url) => c.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  if (new URL(req.url).pathname.startsWith("/games/")) return; // each game runs its own worker
  // Network first everywhere: a fresh deploy wins, and the cache only steps in offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        caches.match(req).then((hit) => {
          if (hit) return hit;
          return req.mode === "navigate" ? caches.match("./index.html") : Response.error();
        })
      )
  );
});
