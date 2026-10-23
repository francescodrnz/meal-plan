# Da fare

Solo azioni aperte. Quando una è fatta si cancella: l'esito va nel README
dell'unità o in una decisione, e la cronaca resta nel commit. Regole in
CONVENZIONI.md, idee non urgenti in BACKLOG.md.

## Service worker

- [S] Dopo il push della `v11`: dal telefono aprire `.../meal-plan/` e
  l'app installata, e controllare che arrivi la versione nuova (decisione
  0002, conseguenze da verificare).

## Ricette su Notion, l'app come tasca (decisione 0001)

In quest'ordine: ogni passo serve al successivo.

- [S] Notion: casella "In rotazione" su Ricette; database Prodotti (nome,
  reparto, unità, confezione, si conta in dispensa) collegato a
  Ingredienti; "Standard ricette" aggiornato (Prodotti, ml per olio e
  salse, cucchiai solo per le spezie).
- [S] Convertire al nuovo standard le ricette già su Notion.
- [S] Portare su Notion le 10 ricette dell'app (`recipesData` +
  `recipeIngredients`), con lo standard nuovo.
- [M] GitHub Action che genera `ricette.json` da Notion, di notte e a mano:
  integrazione Notion, token nei secret, formato di `ricette.json`.
- [L] Rework del piano pasti sul modello del mockup della decisione 0001,
  con migrazione della dispensa e import dei vecchi codici. Piano in
  `lavori/` prima di iniziare.
