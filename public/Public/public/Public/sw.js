// FDM 2026 — minimal service worker, required for "Add to Home Screen" installability on Android/Chrome.
// Does not cache anything; just needs to exist and respond to fetch events.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Pass-through — always go to network, no offline caching.
  event.respondWith(fetch(event.request));
});
