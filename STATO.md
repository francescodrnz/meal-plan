# Stato del progetto

Aggiornato il 2026-10-23.

App in uso, pubblicata su GitHub Pages da `main`
(https://francescodrnz.github.io/meal-plan/). Cache del service worker:
`mealplan-v11`, pubblicata e arrivata sul telefono.

- **Piano pasti** (`index.html`, `script.js`): ricette, dispensa, prodotti
  extra, lista della spesa e import/export funzionano, ma oggi si usa solo
  per le quantità delle ricette: la dispensa non è più aggiornata.
- **Allenamenti** (`workout.html`): sessioni, peso corporeo e grafici con
  Chart.js.
- **Service worker:** le pagine sono network-first, compresa la radice
  `/meal-plan/` (decisione 0002); il resto è cache-first.
- **Notion** (decisione 0001): Ricette ha la casella "In rotazione"; c'è il
  database Prodotti (reparto, unità, confezione, tipo confezione, si conta
  in dispensa) collegato a Ingredienti; "Standard ricette" descrive le
  regole nuove. Le ricette già su Notion non sono ancora convertite.
- **Documentazione:** il metodo è in uso; `README.md` segue le sezioni fisse
  e descrive com'è fatta l'app, chiavi e formati di export compresi.

Prossimo passo: convertire al nuovo standard le ricette già su Notion,
prima voce del gruppo 0001 in `TODO.md`.
