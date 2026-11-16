// Red primero; si no hay conexión, usa la última copia guardada de la página.
// Solo se guardan respuestas OK: antes un 404 (p. ej. /styles.css, que no
// existe) tambien se cacheaba y quedaba servido como si fuera valido.
const V = 'v3', BASE = ['/', '/index.html', '/app.js', '/manifest.webmanifest', '/icon-192.png', '/icon-512.png'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => Promise.all(BASE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
    const r = e.request;
    if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
    e.respondWith(fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); } return res; }).catch(() => caches.match(r).then(cached => { if (cached) console.warn('[Evaluador] sw: sin red, sirviendo desde caché:', r.url); return cached; })));
});
