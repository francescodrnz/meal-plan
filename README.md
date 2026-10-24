# Meal Plan

## A cosa serve

PWA personale da usare sul telefono. Ha due pagine collegate fra loro:
- il piano pasti vegano per una persona, con dispensa e lista della spesa;
- il registro degli allenamenti e del peso corporeo.

Funziona offline e tiene i dati solo sul dispositivo.

## Com'è fatto

File tutti nella radice, serviti da GitHub Pages senza build. `sw.js`,
`manifest.json` e le icone sono condivisi fra le due pagine; la grafica no:
`piano.css` è del piano pasti, `style.css` degli allenamenti.

**Piano pasti** (`index.html` + `script.js` + `piano.css`). Legge le ricette
da `ricette.json` (generato da Notion); niente ricette scritte nel codice.
Grafica e flussi sono quelli del mockup `decisioni/0001-mockup.html`.
- Header col titolo della scheda e ⋮ (menu dal basso: Backup, Prodotti extra,
  Allenamenti); schede Ricette, Piano, Spesa in basso, la scheda attiva in
  `location.hash`. Il badge su Spesa conta le righe ancora da prendere.
  Ricette: "Nel piano" (gli stessi piatti della scheda Piano, decisione
  0006), poi le altre, con l'emoji dell'icona della pagina Notion (🍽️ se
  manca).
- In `script.js` la logica (piano, fabbisogno, dispensa, lista, migrazione,
  import/export) sta sopra; l'interfaccia sotto, con i pulsanti che dicono
  cosa fanno in `data-azione` e un solo gestore di click (`AZIONI`). Pagine a
  tutto schermo (scheda ricetta, Backup, Prodotti extra) e fogli dal basso
  passano dalla cronologia: il tasto indietro li chiude.
- **Piano** = la rotazione di Notion più le modifiche (decisione 0005): ogni
  piatto con le sue porzioni (passi di 0,1); a 0 esce dal piano e torna in
  "+ Aggiungi piatto", che offre anche le ricette fuori rotazione
  (`aggiunte`). Kcal a pasto = `kcal × porzioni / ricetta.porzioni`. Giorni =
  somma di `ricetta.porzioni / 2` sui piatti del piano. "Ogni giorno" (di
  partenza latte di soia 250 ml e frutta 2 pz) si moltiplica per i giorni;
  ammette solo prodotti con `siConta`, e a 0 la riga si toglie.
- **Fabbisogno**: `quantita × porzioni` degli ingredienti che contano (con
  prodotto e quantità, non facoltativi, prodotto con `siConta` e stessa unità
  del prodotto; con unità diversa l'ingrediente si salta e la scheda lo
  segna ⚠) più "Ogni giorno".
- **Spesa**: lista = fabbisogno meno dispensa, arrotondata a confezioni; i
  prodotti senza `siConta` compaiono solo se segnati "manca"; gli extra
  quando sono sotto la scorta minima; più le cose scritte a mano.
  - "A casa": da comprare (servono, compra, −/+ della dispensa) e ce l'hai
    già, divise per reparto come "Al super"; spezie e cose di casa (c'è/manca), "Tutta la dispensa" a
    scomparsa, le note solo se ce ne sono.
  - "Al super" (si apre lì se c'è già qualcosa spuntato): barra di
    avanzamento, righe per reparto nell'ordine di `ORDINE_REPARTI`, "Nel
    carrello", "Aggiungi altro". "Spesa fatta, metti in dispensa" aggiunge
    le righe spuntate e toglie le cose a mano spuntate.
  - Il −/+ della dispensa va al multiplo successivo del passo (`aPasso`): a
    quarti per pacco, bottiglia e vasetto, interi per panetto, lattina e pz.
- **Scheda ricetta**: per un piatto del piano le porzioni sono quelle del
  piano (cambiarle qui le cambia lì); fuori piano valgono solo nella scheda.
  Quantità scalate, spunte di ingredienti e passi (il primo non fatto è
  evidenziato; il pezzo prima del primo punto è il titolo del passo),
  schermo acceso (Wake Lock). Nel piano: "Cucinata" e "Togli dal piano";
  fuori: "Aggiungi al piano" e "Cucinata fuori piano". "Cucinata" toglie gli
  ingredienti e `ricetta.porzioni / 2` giorni di "Ogni giorno", e il piatto
  resta nel piano.
- **Migrazione** dalla dispensa vecchia (`mealplan_shop_v1`, grammi per id):
  `migraInventarioV1` la traduce per nome di prodotto Notion (`MAPPA_V1`,
  olio e latte da g a ml 1:1). Tutte le scritture passano da
  `assicuraMigrazione()`: se serve migrare e `ricette.json` non c'è, la
  scrittura si rifiuta e non si scrive nessuna chiave.

**Allenamenti** (`workout.html`, script nella pagina). Schede Allenamento,
Peso, Storico, Info. Registra le sessioni, il peso corporeo e i grafici con
Chart.js.

**Service worker** (`sw.js`):
- Le pagine (ogni navigazione: `/meal-plan/`, `index.html`, `workout.html`)
  sono network-first: la versione nuova arriva appena c'è rete. In cache
  finiscono solo le risposte riuscite; offline si usa la copia della pagina,
  altrimenti `index.html`.
- Anche `ricette.json` è network-first (vedi sotto).
- All'installazione i file si scaricano con `cache: 'reload'`, saltando la
  cache HTTP: altrimenti il SW nuovo poteva congelare lo `script.js` vecchio.
- Tutto il resto è cache-first: i file in `ASSETS` più quelli presi dalla rete
  al primo uso, cioè Chart.js e i Google Fonts.
- All'attivazione cancella le cache con nome diverso da `CACHE_NAME`.

**Ricette da Notion** (`.github/scripts/ricette.py` +
`.github/workflows/ricette.yml`). Ogni notte alle 3:17 UTC, o a mano da
Actions › "ricette da notion" › Run workflow, lo script legge i database
Notion Ricette, Ingredienti e Prodotti e scrive `ricette.json` nella radice.
Il bot committa su `main` solo se il file è cambiato. L'app lo legge
all'avvio.
- Accesso: connessione Notion interna `meal-plan`, in sola lettura, collegata
  ai tre database. Il suo token sta nel secret `NOTION_TOKEN` del repo e, in
  locale, in `.env` nella radice (ignorato da git).
- `ricette.json` non è in `ASSETS` (lo cambia il bot ogni notte): in `sw.js`
  è network-first come le pagine, e si mette in cache anche
  all'installazione. Con un errore del server si usa la copia in cache.
- Se una richiesta fallisce, o Notion non restituisce ricette o prodotti, lo
  script esce con errore e il file resta quello di prima. Gli avvisi
  (ingrediente senza prodotto, ricetta senza passi, blocchi non esportati)
  finiscono nel riepilogo del run.
- Formato: `{versione: 1, prodotti, ricette}`, ordinati per nome, senza data
  di generazione, così un giro senza modifiche dà un file identico.
  - prodotto: `id`, `nome`, `reparto`, `unita`, `confezione`,
    `tipoConfezione`, `siConta`. Unità e confezione sono `null` per i
    prodotti che si segnano solo come presenti (spezie, aglio, limone…).
  - ricetta: `id`, `nome`, `icona` (emoji della pagina, o `null`),
    `rotazione`, `provata`, `porzioni`, `kcal`,
    `proteine`, `base`, `descrizione`, `ingredienti`, `passi`, `note`.
  - ingrediente: `nome`, `quantita` **per porzione** (`null` se `q.b.`),
    `unita`, `prodotto` (id, `null` per l'acqua), `tipo`, `facoltativo`,
    `nota`.
  - `passi` e `note`: `{testo, sotto?}`, presi dal corpo della pagina sotto i
    titoli "Procedimento" e "Note"; `sotto` sono i sotto-punti, un livello.

**Dati in `localStorage`:**

| Chiave | Pagina | Contenuto |
|---|---|---|
| `mealplan_piano_v2` | piano pasti | `{porzioni: {idRicetta: n}, aggiunte: [idRicetta], ogniGiorno: [{prodotto, quantita}]}`; porzioni solo se diverse dalla ricetta, 0 = tolta; `aggiunte` può mancare |
| `mealplan_dispensa_v2` | piano pasti | `{quantita: {idProdotto: n o true/false, "custom_<id>": n}, note}`; senza `siConta` manca solo se `false` |
| `mealplan_custom_v1` | piano pasti | prodotti extra `[{id, name, unit, storeSize, need, category}]` |
| `mealplan_cucina_v2` | piano pasti | spunte della scheda ricetta, fino a "Cucinata" |
| `mealplan_spesa_v2` | piano pasti | righe spuntate della lista, fino a "Spesa fatta" |
| `mealplan_altro_v1` | piano pasti | cose scritte a mano nella lista `[{chiave, nome}]`, fino a "Spesa fatta"; non vanno nel backup |
| `mealplan_shop_v1` | piano pasti | dispensa vecchia: si legge solo per migrare, mai scritta |
| `mealplan_bulk_v1` | piano pasti | vecchia modalità Bulk: non più usata, non cancellata |
| `workout_sessions` | allenamenti | storico delle sessioni |
| `workout_active` | allenamenti | sessione in corso |
| `body_weight_log` | allenamenti | pesate |

**Codici di import/export** (piano pasti: menu › Backup; allenamenti:
scheda Info):
- Piano pasti: `{v: 2, piano, dispensa, customs}`, come `MP2_` + base64 di
  `encodeURIComponent(JSON)` ("Copia codice") o `MP2D_` + base64 del deflate
  (Telegram). L'app vecchia li rifiuta senza toccare niente (`_` non è
  base64). Si importano anche i codici vecchi `{inventory, customs, v: 1}`
  (base64, anche senza `encodeURIComponent`, e `DEFLATE_`): passano dalla
  migrazione e lasciano il piano com'è; senza `ricette.json` si rifiutano.
  Un codice che non è del piano pasti si rifiuta prima della conferma.
- Allenamenti: `{workout_sessions, workout_active, body_weight_log}`, in
  base64 di `encodeURIComponent(JSON)` o `DEFLATE_<base64>`.

Il backup su Telegram: il pulsante apre `t.me/botchecontaimessaggibot` con il
codice pronto da inviare, con il comando `/backup_mealplan` o
`/backup_workout`.

## Come si usa

- Indirizzo: https://francescodrnz.github.io/meal-plan/
- Installazione su Android (Chrome): menu › "Installa app".
- Installazione su iOS (Safari): Condividi › "Aggiungi alla schermata Home".
- Per spostare i dati su un altro dispositivo: menu › Backup › Copia codice
  (allenamenti: Info), poi sull'altro dispositivo incolla il codice e
  Importa. L'import del piano pasti sovrascrive dispensa ed extra (e il piano,
  con un codice v2), dopo una conferma.

## Misure

- 2026-10-23: 10 ricette nell'app, fra 1085 e 1100 kcal ciascuna; cache
  `mealplan-v11`.
- 2026-10-23: lo script `ricette.py` ci mette circa 25 s.
- 2026-10-24: `ricette.json` da Notion: 33 ricette (10 in rotazione), 62
  prodotti, 184 KB.
- 2026-10-24: `ricette.json` con le icone: 33 ricette su 33 hanno l'emoji.
- 2026-10-24: piano standard (10 piatti a 2 porzioni) = 10 giorni; fabbisogno
  di esempio: ceci secchi 1670 g (4 pacchi), latte di soia 2750 ml.

## Limiti e comportamenti noti

- **Un piatto tolto a mano resta tolto**: le sue porzioni a 0 restano anche
  se su Notion lo togli e lo rimetti in rotazione. Si rimette da "Aggiungi
  piatto".
- **Le porzioni della scheda ricetta, per un piatto del piano, sono quelle
  del piano**: cucinarne di più una volta cambia il piano, finché non le
  rimetti.

- **Un aggiornamento non arriva se non aumenti `CACHE_NAME`**: tutto tranne
  le pagine HTML e `ricette.json` è cache-first, e una pagina nuova con JS o
  CSS vecchi può rompersi. Per un attimo, all'aggiornamento, l'HTML nuovo
  gira con il JS vecchio: il ricaricamento su `controllerchange` lo sistema.
- **La dispensa è una stima**: la tengono aggiornata "Spesa fatta",
  "Cucinata" e i −/+. Gli ingredienti facoltativi non contano.
- **Nomi e id dei prodotti su Notion**: la migrazione cerca i prodotti per
  nome; se un prodotto viene ricreato (id nuovo), la sua quantità in
  dispensa sparisce.
- Senza `ricette.json` (primo avvio offline) l'app mostra solo un avviso, e
  dispensa, extra, import ed export si rifiutano finché la migrazione non è
  fatta.
- Tolti con il rework: modalità Bulk, "ultima ricetta", "Azzera dispensa",
  "Consigliati", la scheda Info con le medie.
- **Il bot committa su `main`**: prima di lavorare e di pushare in locale
  serve `git pull`.
- GitHub sospende i workflow pianificati dopo 60 giorni senza attività sul
  repo: se succede, si riattiva da Actions.
- **Scrivere una ricetta su Notion col connettore MCP:** `create-view` con
  `parent_page_id` aggiunge la vista degli ingredienti in fondo alla pagina.
  Quindi prima si crea la pagina solo con "## Ingredienti" e la sua riga,
  poi la vista, poi Procedimento e Note con `insert_content`. Due
  ordinamenti vanno in un solo `SORT BY "Facoltativo" ASC, "Tipo" ASC`: con
  due `SORT BY` resta solo l'ultimo.
- Le 10 ricette portate dall'app su Notion hanno l'acqua stimata a tavolino
  e i legumi passati in pentola a pressione: alla prima volta che si
  cucinano, le dosi d'acqua vanno controllate.

## Comandi utili

Prove senza Chrome collegato: Playwright con `uv run --with playwright
python …` (o in un venv), con il browser scaricato in una cartella temporanea:
`PLAYWRIGHT_BROWSERS_PATH=<cartella> python -m playwright install chromium`
(circa 120 MB). Al primo avvio la pagina si ricarica da sola quando il SW si
installa: aspettare un paio di secondi prima di toccarla. Se la porta 8000 è
già occupata (risponde 404 a tutto), usarne un'altra. Con `color_scheme='dark'` nel contesto si prova il tema
scuro; per provare un aggiornamento del SW si serve una cartella con un link
`meal-plan` che prima punta a `git archive HEAD` estratto e poi al repo.

```sh
python3 -m http.server 8000   # dalla radice, poi http://localhost:8000
set -a; . ./.env; set +a; python3 .github/scripts/ricette.py   # ricette.json in locale
```

In locale il service worker tiene la cache: per vedere le modifiche aumenta
`CACHE_NAME`, oppure usa DevTools › Application › Update on reload.

`python3 -m http.server` non manda `Cache-Control` e risponde 304 in base alla
data del file: per provare un aggiornamento del SW i file nuovi devono essere
più recenti di quelli già serviti, oppure serve un server con `no-cache`.

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
  Notion, l'app come tasca. Il rework del piano pasti la realizza.
- [0002](decisioni/0002-pagine-network-first.md) — tutte le pagine
  network-first nel service worker, non solo la radice.
- [0003](decisioni/0003-accesso-a-notion.md) — token Notion in sola lettura
  in `.env` per leggere, connettore MCP per scrivere.
- [0004](decisioni/0004-ricette-tutte-piano-rotazione.md) — la scheda Ricette
  mostra tutte le ricette.
- [0005](decisioni/0005-piano-modificabile.md) — il piano è la rotazione più
  le modifiche fatte dal telefono (`aggiunte`, porzioni a 0).
- [0006](decisioni/0006-ricette-raggruppate-come-il-piano.md) — la scheda
  Ricette raggruppa per "Nel piano", non per la casella di Notion.
