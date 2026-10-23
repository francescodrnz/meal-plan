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
- `index.html` (e il percorso `/`) è network-first: la versione nuova arriva
  appena c'è rete.
- Tutto il resto è cache-first: i file in `ASSETS` più quelli presi dalla rete
  al primo uso, cioè Chart.js e i Google Fonts.
- All'attivazione cancella le cache con nome diverso da `CACHE_NAME`.

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

- 2026-10-23: 10 ricette, fra 1085 e 1100 kcal ciascuna; cache `mealplan-v10`.

## Limiti e comportamenti noti

- **Le ricette stanno in due posti** (`recipesData` e `recipeIngredients`):
  se cambi una ricetta devi cambiarle tutte e due, altrimenti quello che vedi
  e la lista della spesa non coincidono più. Se cambia la proteina di una
  ricetta, va aggiornato anche `bulkOverrides`.
- **Un aggiornamento non arriva se non aumenti `CACHE_NAME`**: tutto tranne
  `index.html` è cache-first.
- **Network-first vale solo con il percorso esatto.** Il controllo è su
  `pathname === '/'`, ma su GitHub Pages la radice è `/meal-plan/`. Aprendo
  `.../meal-plan/` senza `index.html`, quindi, anche la pagina viene servita
  dalla cache. L'app installata non ha il problema perché parte da
  `start_url: index.html`.
- La modalità Bulk non passa con i codici di export: va riattivata a mano su
  ogni dispositivo.
- Il commento in `sw.js` dice "Network First per index.html e manifest", ma
  `manifest.json` è cache-first.

## Comandi utili

```sh
python3 -m http.server 8000   # dalla radice, poi http://localhost:8000
```

In locale il service worker tiene la cache: per vedere le modifiche aumenta
`CACHE_NAME`, oppure usa DevTools › Application › Update on reload.

## Decisioni collegate

- [0001](decisioni/0001-ricette-su-notion-app-come-tasca.md) — ricette su
  Notion, l'app come tasca. Supera i limiti delle ricette in due posti e
  della modalità Bulk: il rework è in `TODO.md`.
