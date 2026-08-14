const CACHE_NAME = 'nestor-pwa-v10.1.0';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/custom.css',
  './js/products.js',
  './js/app.js',
  './js/i18n/translations.js',
  './js/i18n/catalog.js',
  './js/i18n/switcher.js',
  './manifest.json',
  './manifest-admin.json',
  './assets/brand/icon-192x192.png',
  './assets/brand/icon-512x512.png',
  './assets/brand/admin-icon-192x192.png',
  './assets/brand/admin-icon-512x512.png'
];

// Instalación — precarga inmediata con bypass total de caché HTTP
self.addEventListener('install', (event) => {
  console.log('[SW Néstor] Instalando v8.0.0 — forzando bypass de caché HTTP...');
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usar cache: 'reload' para siempre buscar archivos frescos del servidor
      return Promise.all(
        ASSETS_TO_CACHE.map(url => {
          return fetch(url, { cache: 'reload' })
            .then(response => {
              if (response.ok) {
                return cache.put(url, response);
              }
            })
            .catch(() => {});
        })
      );
    })
  );
});

// Activación — eliminar TODAS las cachés antiguas y tomar control inmediato
self.addEventListener('activate', (event) => {
  console.log('[SW Néstor] Activado v8.0.0 — eliminando cachés antiguas...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW Néstor] Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Estrategia Network-First: siempre intenta red primero, fallback a caché solo sin conexión
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    // Network-first con bypass de caché HTTP del navegador
    fetch(event.request, { cache: 'no-store' })
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Sin conexión: servir desde caché SW
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return new Response('Offline: Recurso no disponible.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
  );
});
