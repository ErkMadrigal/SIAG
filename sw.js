/* Service worker del panel SIAG (PWA).
 * - La pantalla (index.html) siempre se pide a la red primero, así una versión nueva se ve de inmediato;
 *   sin internet se muestra la última copia guardada.
 * - Los archivos de assets/ (con hash en el nombre) se guardan y se sirven desde caché.
 * - NUNCA se guardan llamadas al API ni otros dominios: los datos siempre vienen frescos. */
const CACHE = 'siag-pwa-v1';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;           // API y CDNs: directo a la red

  // Navegación (abrir/recargar el panel): red primero, caché como respaldo
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copia = res.clone();
        caches.open(CACHE).then(c => c.put('./', copia)).catch(() => {});
        return res;
      }).catch(() => caches.match('./').then(r => r || Response.error()))
    );
    return;
  }

  // Archivos estáticos con hash: caché primero
  if (url.pathname.includes('/assets/') || url.pathname.includes('/icons/') || url.pathname.includes('/models/')) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copia = res.clone(); caches.open(CACHE).then(c => c.put(req, copia)).catch(() => {}); }
        return res;
      }))
    );
  }
});
