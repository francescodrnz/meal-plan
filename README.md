# Meal Plan

## A cosa serve

PWA personale da usare sul telefono. Ha due pagine collegate fra loro:
- il piano pasti vegano per una persona, con dispensa e lista della spesa;
- il registro degli allenamenti e del peso corporeo.

Funziona offline e tiene i dati solo sul dispositivo.

## Com'è fatto

File tutti nella radice, serviti da GitHub Pages senza build. `style.css`,
`sw.js`, `manifest.json` e le icone sono condivisi fra le due pagine.

**Piano pasti** (`index.html` + `script.js`). Schede Ricette, Lista Spesa,
Dispensa, Info.
- `recipesData` contiene le ricette come si vedono a schermo (ingredienti in
  testo, macro, preparazione).
- `recipeIngredients` contiene le stesse ricette in grammi per id di prodotto:
  da qui si calcola il fabbisogno.
- `shopData` elenca i prodotti per categoria (frigo, secchi, liquidi).
- `applyBulkToShopData()` calcola il fabbisogno: somma gli ingredienti delle
  ricette, aggiunge il latte di soia della colazione (2500 g) e, in modalità
  Bulk, aggiunge i delta di `bulkOverrides`.
- La lista della spesa è il fabbisogno meno quello che c'è in dispensa.
- `Store` tiene la dispensa e i prodotti extra creati dall'utente.

**Allenamenti** (`workout.html`, script nella pagina). Schede Allenamento,
Peso, Storico, Info. Registra le sessioni, il peso corporeo e i grafici con
Chart.js.

**Service worker** (`sw.js`):
- Le pagine (ogni navigazione: `/meal-plan/`, `index.html`, `workout.html`)
  sono network-first: la versione nuova arriva appena c'è rete. In cache
  finiscono solo le risposte riuscite; offline si usa la copia della pagina,
  altrimenti `index.html`.
- Tutto il resto è cache-first: i file in `ASSETS` più quelli presi dalla rete
  al primo uso, cioè Chart.js e i Google Fonts.
- All'attivazione cancella le cache con nome diverso da `CACHE_NAME`.

**Ricette da Notion** (`.github/scripts/ricette.py` +
`.github/workflows/ricette.yml`). Ogni notte alle 3:17 UTC, o a mano da
Actions › "ricette da notion" › Run workflow, lo script legge i database
Notion Ricette, Ingredienti e Prodotti e scrive `ricette.json` nella radice.
Il bot committa su `main` solo se il file è cambiato. L'app non lo legge
ancora: lo farà il rework della decisione 0001.
- Accesso: connessione Notion interna `meal-plan`, in sola lettura, collegata
  ai tre database. Il suo token sta nel secret `NOTION_TOKEN` del repo e, in
  locale, in `.env` nella radice (ignorato da git).
- `ricette.json` non è in `ASSETS` né ha una regola sua in `sw.js`: diventa
  network-first col rework.
- Se una richiesta fallisce, o Notion non restituisce ricette o prodotti, lo
  script esce con errore e il file resta quello di prima. Gli avvisi
  (ingrediente senza prodotto, ricetta senza passi, blocchi non esportati)
  finiscono nel riepilogo del run.
- Formato: `{versione: 1, prodotti, ricette}`, ordinati per nome, senza data
  di generazione, così un giro senza modifiche dà un file identico.
  - prodotto: `id`, `nome`, `reparto`, `unita`, `confezione`,
    `tipoConfezione`, `siConta`. Unità e confezione sono `null` per i
    prodotti che si segnano solo come presenti (spezie, aglio, limone…).
  - ricetta: `id`, `nome`, `rotazione`, `provata`, `porzioni`, `kcal`,
    `proteine`, `base`, `descrizione`, `ingredienti`, `passi`, `note`.
  - ingrediente: `nome`, `quantita` **per porzione** (`null` se `q.b.`),
    `unita`, `prodotto` (id, `null` per l'acqua), `tipo`, `facoltativo`,
    `nota`.
  - `passi` e `note`: `{testo, sotto?}`, presi dal corpo della pagina sotto i
    titoli "Procedimento" e "Note"; `sotto` sono i sotto-punti, un livello.

**Dati in `localStorage`:**

| Chiave | Pagina | Contenuto |
|---|---|---|
| `mealplan_shop_v1` | piano pasti | dispensa: quantità per id di prodotto |
| `mealplan_custom_v1` | piano pasti | prodotti extra |
| `mealplan_bulk_v1` | piano pasti | modalità Bulk attiva (`"true"`/`"false"`) |
| `workout_sessions` | allenamenti | storico delle sessioni |
| `workout_active` | allenamenti | sessione in corso |
| `body_weight_log` | allenamenti | pesate |

**Codici di import/export** (scheda Info di ciascuna pagina):
- Piano pasti: `{inventory, customs, v: 1}`. Non contiene la modalità Bulk.
- Allenamenti: `{workout_sessions, workout_active, body_weight_log}`.

L'export produce base64 di `encodeURIComponent(JSON)`. L'import accetta
anche il formato compresso `DEFLATE_<base64>`, che è quello prodotto dal
backup su Telegram: il pulsante apre `t.me/botchecontaimessaggibot` con il
codice pronto da inviare, con il comando `/backup_mealplan` o
`/backup_workout`.

## Come si usa

- Indirizzo: https://francescodrnz.github.io/meal-plan/
- Installazione su Android (Chrome): menu › "Installa app".
- Installazione su iOS (Safari): Condividi › "Aggiungi alla schermata Home".
- Per spostare i dati su un altro dispositivo: Info › esporta, poi sull'altro
  dispositivo Info › incolla il codice e importa. L'import del piano pasti
  sovrascrive la dispensa, dopo una conferma.

## Misure

- 2026-10-23: 10 ricette nell'app, fra 1085 e 1100 kcal ciascuna; cache
  `mealplan-v11`.
- 2026-10-23: `ricette.json` da Notion: 23 ricette, 55 prodotti, 150 KB; lo
  script ci mette circa 25 s.

## Limiti e comportamenti noti

- **Le ricette stanno in due posti** (`recipesData` e `recipeIngredients`):
  se cambi una ricetta devi cambiarle tutte e due, altrimenti quello che vedi
  e la lista della spesa non coincidono più. Se cambia la proteina di una
  ricetta, va aggiornato anche `bulkOverrides`.
- **Un aggiornamento non arriva se non aumenti `CACHE_NAME`**: tutto tranne
  le pagine HTML è cache-first, e una pagina nuova con JS o CSS vecchi può
  rompersi.
- La modalità Bulk non passa con i codici di export: va riattivata a mano su
  ogni dispositivo.
- **Il bot committa su `main`**: prima di lavorare e di pushare in locale
  serve `git pull`.
- GitHub sospende i workflow pianificati dopo 60 giorni senza attività sul
  repo: se succede, si riattiva da Actions.

## Comandi utili

```sh
python3 -m http.server 8000   # dalla radice, poi http://localhost:8000
set -a; . ./.env; set +a; python3 .github/scripts/ricette.py   # ricette.json in locale
```

In locale il service worker tiene la cache: per vedere le modifiche aumenta
`CACHE_NAME`, oppure usa DevTools › Application › Update on reload.

Per provare il service worker con lo stesso percorso di GitHub Pages
(`/meal-plan/`), servi una cartella che contiene un link al repo:

```sh
mkdir -p /tmp/www && ln -sfn "$PWD" /tmp/www/meal-plan
python3 -m http.server 8001 --bind 127.0.0.1 -d /tmp/www   # http://localhost:8001/meal-plan/
```

Il service worker parte solo su `localhost` o HTTPS. Da un'altra macchina si
passa da un tunnel SSH (`ssh -L 8001:localhost:8001 <host>`) e si apre
`localhost` lì. In DevTools › Network le richieste fatte dal service worker
verso la rete hanno l'icona ⚙.

## Decisioni collegate

- [0001](decisioni/0001-ricette-su-notion-app-come-tasca.md) — ricette su
  Notion, l'app come tasca. Supera i limiti delle ricette in due posti e
  della modalità Bulk: il rework è in `TODO.md`.
- [0002](decisioni/0002-pagine-network-first.md) — tutte le pagine
  network-first nel service worker, non solo la radice.
- [0003](decisioni/0003-accesso-a-notion.md) — token Notion in sola lettura
  in `.env` per leggere, connettore MCP per scrivere.
