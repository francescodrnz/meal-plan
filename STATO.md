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
- **Notion** (decisione 0001): 23 ricette, tutte nuove e al nuovo standard
  (ogni ingrediente ha il suo Prodotto, tranne l'acqua), nessuna ancora "In
  rotazione"; 55 prodotti. Le 10 ricette dell'app non ci sono ancora.
- **`ricette.json`:** lo genera ogni notte la GitHub Action "ricette da
  notion", provata a mano e verde; il bot committa su `main` solo se il file
  cambia. L'app non lo legge ancora.
- **Documentazione:** il metodo è in uso; `README.md` segue le sezioni fisse
  e descrive com'è fatta l'app, chiavi, formati di export e `ricette.json`.

Prossimo passo: portare su Notion le 10 ricette dell'app col connettore MCP,
prima voce di `TODO.md`; poi il piano del rework.
