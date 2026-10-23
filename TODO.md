# Da fare

Solo azioni aperte. Quando una è fatta si cancella: l'esito va nel README
dell'unità o in una decisione, e la cronaca resta nel commit. Regole in
CONVENZIONI.md, idee non urgenti in BACKLOG.md.

## Ricette su Notion, l'app come tasca (decisione 0001)

In quest'ordine: ogni passo serve al successivo.

- [S] Portare su Notion le 10 ricette dell'app (`recipesData` +
  `recipeIngredients`), con lo standard nuovo. Serve il connettore MCP: il
  token in `.env` legge soltanto.
- [L] Rework del piano pasti sul modello del mockup della decisione 0001:
  legge `ricette.json` (network-first in `sw.js`), migra la dispensa e
  importa i vecchi codici. Piano in `lavori/` prima di iniziare.
- [S] Dopo il rework: togliere da Notion "Porzioni da fare", la vista
  "Lista spesa" e la sezione "Come si usa" di "Standard ricette".
