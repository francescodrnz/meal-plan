const CACHE_NAME = 'mealplan-v11'; // Incrementato per forzare l'aggiornamento
const ASSETS = [
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'script.js',
  'style.css',
  'workout.html'
];

// Installazione: metti in cache i file necessari
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forza l'attivazione immediata del nuovo SW
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
    }).then(() => self.clients.claim()) // Prendi subito il controllo delle pagine aperte
  );
});

// Strategia: Network First per le pagine, Cache First per il resto
self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Solo risposte buone: un errore o un redirect non sostituiscono la copia in cache
          if (response.ok) {
            const clonedResponse = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clonedResponse)));
          }
          return response;
        })
        // Offline: la copia della pagina, altrimenti index.html (es. /meal-plan/ o indirizzi con ?parametri)
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('index.html')))
    );
  } else {
    event.respondWith(
      caches.match(event.request).then((response) => {
        return response || fetch(event.request).then((fetchRes) => {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, fetchRes.clone());
            return fetchRes;
          });
        });
      })
    );
  }
});
