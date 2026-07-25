const CACHE_NAME = 'comecome-v2';
const urlsToCache = [
  './',                // index.html
  './index.html',
  './styles.css',
  './script.js',
  './pacman-icon.png',
  './manifest.json'
];

// Instalación: guarda los recursos en la caché
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
      .then(() => self.skipWaiting())
  );
});

// Activación: limpia cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
    .then(() => self.clients.claim())
  );
});

// Estrategia: Network First con fallback a caché
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clona la respuesta y la guarda en caché para futuras visitas
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });
        return response;
      })
      .catch(() => {
        // Si falla la red, busca en caché
        return caches.match(event.request);
      })
  );
});
