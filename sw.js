// Offline support: keeps a copy of the game on the phone. Bump VERSION whenever a file changes.
// Paths are relative to this file, so the game works at a domain root (Vercel) or in a subfolder (GitHub Pages).
const VERSION = 'goblinhaven-v11';
const FILES = ['./', 'index.html', 'style.css', 'more.css', 'core.js', 'town.js', 'meta.js', 'art.js', 'more.js', 'play.js', 'sound.js', 'world.js', 'app.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png',
  'fonts/pixelify-400.woff2', 'fonts/pixelify-600.woff2', 'fonts/barlow-500.woff2', 'fonts/barlow-700.woff2'];
const INDEX = new URL('index.html', self.location).href;
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION)
    .then((cache) => cache.addAll(FILES.map((f) => new Request(f, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  if (req.mode === 'navigate') {
    event.respondWith(caches.match(INDEX).then((hit) => hit || fetch(req)));
    return;
  }
  event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
    return res;
  })));
});
