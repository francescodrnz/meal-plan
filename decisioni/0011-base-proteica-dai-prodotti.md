# 0011 — Base proteica ricavata dai prodotti

Stato: decisa il 2026-11-06
Unità: trasversale (app, Notion)

## Contesto
La scheda Ricette deve mostrare e filtrare la base proteica (tofu, fagioli,
ceci, lenticchie), ma il dato non esisteva: su Notion c'era solo "Base", quella
del cereale, scritta a mano su ogni ricetta. Le ricette crescono (33 → 40 in due
settimane), quindi conta quanto costa tenere il dato giusto su quelle nuove.

## Alternative
- A) **Sui prodotti:** proprietà select "Base proteica" su Prodotti; una ricetta
  prende le basi dei suoi prodotti non facoltativi. Si compila su 6 prodotti, le
  ricette nuove sono già a posto e l'etichetta segue gli ingredienti. Non ammette
  eccezioni per ricetta: conta anche un ingrediente in piccola quantità.
- B) **Sulle ricette:** multi-select come "Base", compilata su 40 ricette. Si
  decide ricetta per ricetta, ma va ricompilata a ogni ricetta nuova, e se si
  dimentica la ricetta sparisce quando si filtra.

## Scelta
A, scelta dall'utente. Il calcolo sta nell'app (`basiProteiche`), al caricamento
come i valori nutrizionali della 0007; lo script esporta solo il campo del
prodotto. Oltre ai quattro valori detti dall'utente c'è "Soia", perché 6 ricette
si reggono sui medaglioni. Latte di soia, salsa di soia e piselli restano vuoti:
sarebbero soltanto rumore. Nel filtro, con più scelte, basta averne una.

## Conseguenze verificate
Provato in locale con Playwright a 390 px, in chiaro e scuro: 34 ricette con una
base, 5 con due (burrito e pasta chili: fagioli e tofu; ragù: lenticchie e tofu;
curry di ceci e stufato: ceci e lenticchie), 1 senza (lasagna zucca e funghi),
che con un filtro attivo sparisce. Ceci 10 + Fagioli 10 = 20 ricette. Curry e
stufato sono "Lenticchie" per 40 g: da tenere d'occhio se dà fastidio nel filtro.
Con un `ricette.json` vecchio in cache il campo manca e non ci sono etichette né
filtro, senza errori.
