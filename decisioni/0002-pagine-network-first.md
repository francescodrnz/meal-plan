# 0002 — Tutte le pagine network-first nel service worker

Stato: decisa il 2026-10-23
Unità: app (`sw.js`)

## Contesto
`sw.js` era network-first solo per `index.html` e il percorso esatto `/`. Su
GitHub Pages la radice è `/meal-plan/`, quindi chi apriva l'app da lì
riceveva la pagina dalla cache. Lo stesso succedeva sempre con `workout.html`.

## Alternative
- A) **Ogni navigazione** (`request.mode === 'navigate'`) network-first.
  Copre `/meal-plan/`, `index.html`, `workout.html` e gli indirizzi con
  `?parametri` con un controllo solo. Cambia però `workout.html`, che prima
  era cache-first.
- B) **Solo la radice e `index.html`** (il percorso finisce con `/` o con
  `index.html`). È la correzione minima: `workout.html` resta cache-first.

## Scelta
A. Ripara tutta la categoria di bug con il controllo più semplice. JS, CSS,
icone e Chart.js restano cache-first. In cache vanno solo le risposte
riuscite, e offline si ripiega su `index.html`. La regola di aumentare
`CACHE_NAME` a ogni modifica resta: tiene allineate le pagine con i JS e i
CSS in cache.

## Conseguenze verificate
2026-10-23, in Chrome su `localhost:8001/meal-plan/`:
- il passaggio da `v10` a `v11` si è ricaricato da solo, e la cache `v10` è
  stata cancellata;
- le pagine arrivano dalla rete, `script.js` e `style.css` dalla cache;
- offline si aprono `/meal-plan/`, `workout.html` e `/meal-plan/?x=1`.

Resta da provare l'aggiornamento su un telefono vero, dopo il push.
