# Stato del progetto

Aggiornato il 2026-10-25.

App pubblicata su GitHub Pages da `main`
(https://francescodrnz.github.io/meal-plan/). Cache del service worker:
`mealplan-v17`. L'interfaccia nuova del piano pasti e il backup `MP2D_` col
bot Telegram sono stati provati sul telefono; i valori nutrizionali solo in
locale con Playwright.

- **Piano pasti** (`index.html`, `script.js`, `piano.css`): grafica e flussi
  del mockup della decisione 0001 (`decisioni/0001-mockup.html`). Schede
  Ricette (raggruppata "Nel piano" / altre, decisione 0006), Piano, Spesa
  in basso, emoji delle ricette da Notion. Piano = rotazione più le
  modifiche dal telefono (decisione 0005): "Aggiungi piatto", porzioni a 0
  per togliere. Spesa "A casa" (da comprare e ce l'hai già divise per
  reparto) / "Al super" con "Aggiungi altro". Dispensa stimata, migrazione
  e codici `MP2_` / `MP2D_` invariati. Kcal, proteine, carboidrati e grassi
  a porzione calcolati dai valori dei prodotti (decisione 0007), con i
  numeri scritti a mano solo come ripiego. Provato in locale con Playwright a 390 px, chiaro e scuro,
  compreso l'aggiornamento dalla v12 con dati e codici vecchi.
- **Allenamenti** (`workout.html`): sessioni, peso corporeo e grafici con
  Chart.js; `style.css` ora contiene solo le sue classi.
- **Service worker:** pagine e `ricette.json` network-first (decisione
  0002), il resto cache-first; all'installazione scarica con
  `cache: 'reload'`.
- **Notion** (decisione 0001): 33 ricette, 10 in rotazione, tutte con
  l'icona emoji, e 62 prodotti; 44 con kcal e macro per 100 g/ml (le spezie
  no), valori tipici da tabelle. Le quantità nelle pagine sono per le
  porzioni base: "Porzioni da fare" non è più usata, restano da cancellare a
  mano la proprietà, le due colonne che ne dipendono e la vista "Lista
  spesa". In "Standard ricette" curcuma, paprika dolce e alloro sono segnate
  come da comprare.
- **`ricette.json`:** lo genera ogni notte la GitHub Action "ricette da
  notion" (con `icona` e i valori nutrizionali dei prodotti); il bot committa su `main` solo se il file
  cambia.

Prossimo passo: guardare sul telefono i valori calcolati e, se convincono,
la pulizia a mano su Notion (le due voci di `TODO.md`).
