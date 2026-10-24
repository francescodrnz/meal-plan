# Stato del progetto

Aggiornato il 2026-10-24.

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
- **Notion** (decisione 0001): 33 ricette al nuovo standard (ogni
  ingrediente ha il suo Prodotto, tranne l'acqua) e 61 prodotti. In
  rotazione ci sono le 10 ricette dell'app, portate con le stesse dosi e i
  legumi in pentola a pressione; le altre 23 sono nuove e non ancora in
  rotazione.
- **`ricette.json`:** lo genera ogni notte la GitHub Action "ricette da
  notion", provata a mano e verde; il bot committa su `main` solo se il file
  cambia. L'app non lo legge ancora.
- **Documentazione:** il metodo è in uso; `README.md` segue le sezioni fisse
  e descrive com'è fatta l'app, chiavi, formati di export e `ricette.json`.

Prossimo passo: il piano del rework del piano pasti (taglia L, piano in
`lavori/`), prima voce di `TODO.md`.
