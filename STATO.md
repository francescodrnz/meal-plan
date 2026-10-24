# Stato del progetto

Aggiornato il 2026-10-24.

App pubblicata su GitHub Pages da `main`
(https://francescodrnz.github.io/meal-plan/). Cache del service worker:
`mealplan-v15`, con l'interfaccia nuova del piano pasti; da controllare che
sia arrivata sul telefono.

- **Piano pasti** (`index.html`, `script.js`, `piano.css`): grafica e flussi
  del mockup della decisione 0001 (`decisioni/0001-mockup.html`). Schede
  Ricette (raggruppata "Nel piano" / altre, decisione 0006), Piano, Spesa
  in basso, emoji delle ricette da Notion. Piano = rotazione più le
  modifiche dal telefono (decisione 0005): "Aggiungi piatto", porzioni a 0
  per togliere. Spesa "A casa" (da comprare e ce l'hai già divise per
  reparto) / "Al super" con "Aggiungi altro". Dispensa stimata, migrazione
  e codici `MP2_` / `MP2D_` invariati. Provato in locale con Playwright a 390 px, chiaro e scuro,
  compreso l'aggiornamento dalla v12 con dati e codici vecchi.
- **Allenamenti** (`workout.html`): sessioni, peso corporeo e grafici con
  Chart.js; invariato, usa ancora `style.css`.
- **Service worker:** pagine e `ricette.json` network-first (decisione
  0002), il resto cache-first; all'installazione scarica con
  `cache: 'reload'`.
- **Notion** (decisione 0001): 33 ricette, 10 in rotazione, tutte con
  l'icona emoji, e 62 prodotti.
- **`ricette.json`:** lo genera ogni notte la GitHub Action "ricette da
  notion" (ora anche con `icona`); il bot committa su `main` solo se il file
  cambia.

Prossimo passo: controllare l'interfaccia nuova sul telefono e provare il
backup `MP2D_` col bot Telegram vero (prima voce di `TODO.md`).
