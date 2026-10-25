# 0007 — Kcal e macro calcolati dai prodotti

Stato: decisa il 2026-10-25
Unità: trasversale (Notion, script, app)

## Contesto
Kcal e proteine erano due numeri scritti a mano su ogni ricetta Notion
("Kcal/porzione", "Proteine/porzione (g)"): si disallineavano appena cambiava
una quantità, e carboidrati e grassi mancavano.

## Alternative
- A) **Valori sui prodotti, calcolo nell'app**: kcal, proteine, carboidrati,
  grassi per 100 g/ml (e peso per pezzo) sui Prodotti; l'app somma le
  quantità per porzione degli ingredienti. Una sola fonte.
- B) **Calcolo solo dove manca il numero a mano**: meno sorprese subito, ma
  due fonti che col tempo divergono.
- C) **Mostrare tutti e due**: utile per controllare, confonde nell'uso.
- D) **Calcolo con formule e rollup su Notion**: si vede anche lì, ma le
  conversioni di unità in una formula Notion sono scomode e il connettore
  non legge le formule.

## Scelta
A, scelta dall'utente, con kcal + proteine, carboidrati e grassi. I numeri a
mano restano solo come ripiego finché a un ingrediente mancano i valori, poi
si cancellano. I valori iniziali li ha scritti Claude da tabelle standard.

## Conseguenze verificate
- 2026-10-25: 44 prodotti con i valori (tutti tranne le 18 spezie); le 33
  ricette si calcolano tutte per intero, fra 958 e 1206 kcal a porzione,
  da −8% a +11% rispetto ai valori a mano.
- 2026-10-25, Playwright a 390 px, chiaro e scuro: scheda ricetta con i
  quattro riquadri, lista e Piano con i valori calcolati; togliendo i valori
  al Tofu la scheda ripiega sui numeri a mano e lo segnala.
- Da tenere d'occhio: i valori sono tipici, non quelli delle etichette dei
  prodotti comprati.
