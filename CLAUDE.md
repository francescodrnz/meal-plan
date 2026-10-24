# Meal Plan

PWA personale per uso mobile: piano pasti vegano per una persona (due
porzioni a ricetta, pranzo e cena), con dispensa e lista della spesa
(`index.html` + `script.js`), più una pagina per gli allenamenti
(`workout.html`, con lo script dentro la pagina).
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
  sono `mealplan_piano_v2`, `mealplan_dispensa_v2`, `mealplan_custom_v1`
  (prodotti extra), `mealplan_cucina_v2`, `mealplan_spesa_v2`,
  `workout_sessions`, `workout_active` e `body_weight_log`; le vecchie
  `mealplan_shop_v1` (letta solo per migrare) e `mealplan_bulk_v1` restano e
  non si cancellano. Per spostare i dati da un dispositivo all'altro si usano
  i codici di import/export.
- **Ricette su Notion** (decisione 0001): una GitHub Action le copia ogni
  notte in `ricette.json`, che l'app legge all'avvio. Per scrivere su Notion
  si usa il connettore MCP; per leggere, e per lanciare lo script in locale,
  il token in sola lettura in `.env` nella radice (ignorato da git; su GitHub
  è il secret `NOTION_TOKEN`). Il valore del token non va mai in un file
  tracciato.

## Regole vincolanti

- **Cache del service worker:** `sw.js` serve tutto con la strategia
  cache-first tranne le pagine HTML e `ricette.json` (network-first, fuori da
  `ASSETS` perché lo cambia il bot ogni notte). Quindi **ogni modifica** a un file in
  `ASSETS` richiede di aumentare `CACHE_NAME` (`mealplan-vN` → `vN+1`),
  altrimenti i telefoni continuano a usare la versione vecchia. Anche un
  file nuovo da servire va aggiunto ad `ASSETS`.
- **Non perdere i dati salvati:** non si rinomina una chiave di
  `localStorage` e non si cambia la forma dei dati senza una migrazione che
  legga il formato vecchio. Un codice di export generato con una versione
  precedente deve restare importabile.
- **Mobile prima di tutto:** ogni modifica all'interfaccia si prova alla
  larghezza di un telefono.
- Si committa e si fa push solo quando lo chiede l'utente. Unica eccezione:
  il bot dell'Action committa `ricette.json` su `main` da solo, quindi
  **`git pull` prima di lavorare e prima di pushare**.

## Verifica

- In locale: `python3 -m http.server 8000` dalla radice, poi si apre
  `http://localhost:8000`. Il service worker parte solo su `localhost` o
  HTTPS: da un altro dispositivo l'IP del PC carica la pagina ma non il
  service worker, quindi serve un tunnel SSH (`ssh -L 8000:localhost:8000`).
- Il service worker in locale tiene la cache: per vedere le modifiche si
  aumenta `CACHE_NAME`, oppure si usa DevTools › Application › Update on
  reload.
- Test automatici non ce ne sono: si verifica provando la pagina.
