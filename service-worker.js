const CACHE = "abel-v2";

const FILES = [
  "/ABEL-STUDY-PLANNER/",
  "/ABEL-STUDY-PLANNER/index.html",
  "/ABEL-STUDY-PLANNER/stud.css",
  "/ABEL-STUDY-PLANNER/stud.js",
  "/ABEL-STUDY-PLANNER/db.js",
  "/ABEL-STUDY-PLANNER/manifest.json",
  "/ABEL-STUDY-PLANNER/images/logo.png",
  "/ABEL-STUDY-PLANNER/images/icon-192.png",
  "/ABEL-STUDY-PLANNER/images/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE).map(key => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
