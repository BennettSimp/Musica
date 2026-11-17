// Red primero; si no hay conexión, usa la última copia guardada de la página.
// Solo se guardan respuestas OK: antes un 404 (p. ej. /styles.css, que no
// existe) tambien se cacheaba y quedaba servido como si fuera valido.
const V = 'v6', BASE = ['/', '/index.html', '/js/colores.js', '/js/api.js', '/app.js', '/css/tailwind.min.css',
    '/fonts/chakra-petch-500-latin.woff2', '/fonts/chakra-petch-500-latin-ext.woff2',
    '/fonts/chakra-petch-700-latin.woff2', '/fonts/chakra-petch-700-latin-ext.woff2',
    '/fonts/jetbrains-mono-400-latin.woff2', '/fonts/jetbrains-mono-400-latin-ext.woff2', '/fonts/jetbrains-mono-400-cyrillic.woff2',
    '/fonts/jetbrains-mono-700-latin.woff2', '/fonts/jetbrains-mono-700-latin-ext.woff2', '/fonts/jetbrains-mono-700-cyrillic.woff2',
    '/manifest.webmanifest', '/icon-192.png', '/icon-512.png']; // v6 (ronda 5): módulo js/api.js en precache; el cambio de versión invalida la caché v5
self.addEventListener('install', e => e.waitUntil(caches.open(V).then(c => Promise.all(BASE.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== V).map(x => caches.delete(x)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
    const r = e.request;
    if (r.method !== 'GET' || new URL(r.url).origin !== location.origin) return;
    e.respondWith(fetch(r).then(res => { if (res.ok) { const c = res.clone(); caches.open(V).then(x => x.put(r, c)); } return res; }).catch(() => caches.match(r).then(cached => {
        if (cached) { console.warn('[Evaluador] sw: sin red, sirviendo desde caché:', r.url); return cached; }
        // Ronda 5 (ChatGPT): sin red y sin caché, caches.match() devuelve
        // undefined, que NO es una Response válida para respondWith()
        // (daba error). Se devuelve una Response 503 válida.
        return new Response('Sin conexión', { status: 503, statusText: 'Sin conexión', headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    })));
});
