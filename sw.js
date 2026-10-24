const CACHE_NAME = 'mealplan-v15'; // Incrementato per forzare l'aggiornamento
const ASSETS = [
  'index.html',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
  'piano.css',
  'script.js',
  'style.css',
  'workout.html'
];
const RICETTE = 'ricette.json';

// Installazione: metti in cache i file necessari, presi dalla rete e non dalla cache HTTP
// (con max-age il browser potrebbe dare la versione vecchia e congelarla nella cache nuova)
const dallaRete = (url) => new Request(url, { cache: 'reload' });

self.addEventListener('install', (event) => {
  self.skipWaiting(); // Forza l'attivazione immediata del nuovo SW
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll(ASSETS.map(dallaRete))
        // ricette.json non è in ASSETS: lo cambia il bot ogni notte. Si prova a
        // metterlo in cache per l'offline, ma senza rete l'installazione va avanti.
        .then(() => cache.add(dallaRete(RICETTE)).catch(() => {}))
    )
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

// Strategia: Network First per le pagine e per ricette.json, Cache First per il resto
self.addEventListener('fetch', (event) => {
  const isPage = event.request.mode === 'navigate';
  const isRicette = new URL(event.request.url).pathname.endsWith('/' + RICETTE);
  if (isPage || isRicette) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Solo risposte buone: un errore o un redirect non sostituiscono la copia in cache
          if (response.ok) {
            const clonedResponse = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clonedResponse)));
          }
          // ricette.json: un errore del server (404, 5xx) non deve nascondere la copia buona in cache
          if (isRicette && !response.ok) return caches.match(event.request).then((cached) => cached || response);
          return response;
        })
        // Offline: la copia in cache; per le pagine, altrimenti index.html (es. /meal-plan/ o indirizzi con ?parametri)
        .catch(() => caches.match(event.request).then((cached) =>
          cached || (isPage ? caches.match('index.html') : Response.error())))
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
