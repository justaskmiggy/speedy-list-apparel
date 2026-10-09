/* Speedy List AI – Apparel service worker: own cache name, precache app shell, network-first pages, cache-first static. */
const VER = 'speedy-list-apparel-v3';
const SHELL = [
  './', 'index.html', 'privacy.html', 'manifest.webmanifest',
  'css/app.css', 'css/apparel.css', 'js/categories.js', 'js/markets.js', 'js/app.js',
  'assets/brand/roadrunner-tile.png', 'assets/brand/roadrunner-tile-64.png', 'assets/brand/roadrunner-icon-192.png',
  'assets/brand/roadrunner-icon-512.png', 'assets/brand/roadrunner-maskable-512.png', 'assets/brand/roadrunner-apple-touch-180.png',
  'assets/brand/roadrunner-favicon-32.png',
  'assets/fonts/Barlow-SemiBold.woff2', 'assets/fonts/Barlow-Bold.woff2', 'assets/fonts/Barlow-ExtraBold.woff2', 'assets/fonts/OpenSans-var.woff2',
  'img/sample-jacket.jpg'
];
self.addEventListener('install', e => { e.waitUntil(caches.open(VER).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  // Only clear this app's old caches (other Speedy List apps share the github.io origin).
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('speedy-list-apparel-') && k !== VER).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request; const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin || !url.pathname.startsWith(new URL('./', self.registration.scope).pathname)) return;
  if (req.mode === 'navigate' || /\.(js|css|html)$/.test(url.pathname)) {
    e.respondWith(fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)); } return r; })
      .catch(() => caches.match(req, { ignoreSearch: true }).then(h => h || caches.match('index.html'))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(r => {
    if (r.ok) { const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)); } return r; })));
});
