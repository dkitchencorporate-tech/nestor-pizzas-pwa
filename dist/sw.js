self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  return self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Let the browser do its default thing, but respond to fetch event
  // to fully satisfy PWA requirements and Lighthouse.
  event.respondWith(
    fetch(event.request).catch((err) => {
      console.log('Fetch failed, offline mode?:', err);
      return new Response('Offline - No connection');
    })
  );
});
