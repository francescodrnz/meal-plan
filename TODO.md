# Da fare

Solo azioni aperte. Quando una è fatta si cancella: l'esito va nel README
dell'unità o in una decisione, e la cronaca resta nel commit. Regole in
CONVENZIONI.md, idee non urgenti in BACKLOG.md.

## Notion

- [S] Quando i valori calcolati ti convincono (decisione 0007): in "Ricette"
  cancellare a mano "Kcal/porzione" e "Proteine/porzione (g)". Lo script
  regge la mancanza; da lì una ricetta con un prodotto senza valori mostra
  "?" invece dei numeri scritti a mano.

- [S] A mano, perché il connettore non può farlo da solo: in "Ingredienti"
  cancellare la vista "Lista spesa" e le proprietà "In lista" e "Porzioni da
  fare (ricetta)"; poi in "Ricette" la proprietà "Porzioni da fare". Nessuna
  serve più: la formula "Porzioni" usa solo le porzioni base, e lo script
  dell'Action non le legge.
