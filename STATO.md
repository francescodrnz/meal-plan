# Stato del progetto

Aggiornato il 2026-10-24.

App pubblicata su GitHub Pages da `main`
(https://francescodrnz.github.io/meal-plan/). Cache del service worker:
`mealplan-v12`, col rework del piano pasti; da controllare che sia arrivata
sul telefono e che la dispensa risulti migrata.

- **Piano pasti** (`index.html`, `script.js`): rifatto sulla decisione 0001.
  Legge `ricette.json`; schede Ricette, Piano, Spesa; dispensa stimata per
  prodotto Notion, migrata da quella vecchia; codici di backup `MP2_` /
  `MP2D_`, e i vecchi si importano ancora. Provato in locale con Playwright,
  compreso l'aggiornamento dalla v11 con i dati veri del telefono.
- **Allenamenti** (`workout.html`): sessioni, peso corporeo e grafici con
  Chart.js; invariato dal rework.
- **Service worker:** pagine e `ricette.json` network-first (decisione
  0002), il resto cache-first; all'installazione scarica con
  `cache: 'reload'`.
- **Notion** (decisione 0001): 33 ricette, 10 in rotazione, e 62 prodotti
  (aggiunta Frutta, per "Ogni giorno").
- **`ricette.json`:** lo genera ogni notte la GitHub Action "ricette da
  notion"; il bot committa su `main` solo se il file cambia.

Prossimo passo: controllare l'aggiornamento sul telefono e provare il backup
`MP2D_` col bot Telegram vero (prima voce di `TODO.md`).
