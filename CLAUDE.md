# Meal Plan

PWA personale per uso mobile: piano pasti vegano per due persone, con
dispensa e lista della spesa (`index.html` + `script.js`), più una pagina
per gli allenamenti (`workout.html`, con lo script dentro la pagina).
Interfaccia in italiano.

Metodo di lavoro in `CONVENZIONI.md`, stato attuale in `STATO.md`, cosa
manca in `TODO.md`.

## Vincoli

- **Niente build.** HTML, CSS e JS vanilla serviti così come sono. Unica
  dipendenza esterna è Chart.js da CDN in `workout.html` (più i Google Fonts).
  Non si aggiungono framework, bundler o `package.json` senza una decisione.
- **Hosting:** GitHub Pages dal branch `main`, cartella radice. Un push su
  `main` è un rilascio.
- **Dati solo sul dispositivo**, in `localStorage`, senza server. Le chiavi
  sono `mealplan_bulk_v1`, `workout_sessions`, `workout_active` e
  `body_weight_log`. Per spostare i dati da un dispositivo all'altro si usano
  i codici di import/export.

## Regole vincolanti

- **Cache del service worker:** `sw.js` serve tutto con la strategia
  cache-first tranne `index.html`. Quindi **ogni modifica** a un file in
  `ASSETS` richiede di aumentare `CACHE_NAME` (`mealplan-vN` → `vN+1`),
  altrimenti i telefoni continuano a usare la versione vecchia. Anche un
  file nuovo da servire va aggiunto ad `ASSETS`.
- **Non perdere i dati salvati:** non si rinomina una chiave di
  `localStorage` e non si cambia la forma dei dati senza una migrazione che
  legga il formato vecchio. Un codice di export generato con una versione
  precedente deve restare importabile.
- **Mobile prima di tutto:** ogni modifica all'interfaccia si prova alla
  larghezza di un telefono.
- Si committa e si fa push solo quando lo chiede l'utente.

## Verifica

- In locale: `python3 -m http.server 8000` dalla radice, poi si apre
  `http://localhost:8000`. Dal telefono si usa l'IP del PC sulla stessa rete.
- Il service worker in locale tiene la cache: per vedere le modifiche si
  aumenta `CACHE_NAME`, oppure si usa DevTools › Application › Update on
  reload.
- Test automatici non ce ne sono: si verifica provando la pagina.
