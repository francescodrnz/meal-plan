const CACHE_NAME = 'mealplan-v2'; // Incrementato a v2
const ASSETS = [
  'index.html',
  'manifest.json'
];

// Installazione: metti in cache i file necessari
self.addEventListener('install', (event) => {
  // Forza il Service Worker a diventare attivo immediatamente
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Attivazione: pulizia vecchie cache
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Cancellazione vecchia cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
});

// Strategia: prova dalla cache, altrimenti scarica dalla rete
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
