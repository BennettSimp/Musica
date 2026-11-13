// Red primero; si no hay conexión, usa la última copia guardada de la página.
const V = 'v1', BASE = ['/', '/styles.css', '/app.js'];
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => Promise.all(BASE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
    const r = e.request;
    if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); return res; }).catch(() => caches.match(r)));
});
