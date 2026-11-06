# 0012 — Piano senza porzioni, nella ricetta solo per vedere

Stato: decisa il 2026-11-06
Unità: app (piano pasti)
Supera: la parte di 0005 che toglie un piatto portando le porzioni a 0 dal −/+

## Contesto
Il −/+ delle porzioni nella scheda Piano non si usava mai, e per togliere un
piatto serviva arrivare a 0 a passi di 0,1. L'utente lo vuole sostituire con un
tasto per togliere. Il −/+ dentro la ricetta, però, per un piatto del piano
cambiava il piano e quindi la spesa: senza il −/+ nel Piano quella modifica non
si sarebbe più vista da nessuna parte.

## Alternative
- A) **Nella ricetta solo per vedere:** il −/+ cambia le quantità mostrate e quelle
  tolte da "Cucinata", non piano e spesa; riaprendo si riparte dal piano. È quello
  che serve (vedere le quantità per porzioni diverse da 2), e una prova non sporca
  la spesa. Del piano resta da togliere solo il −/+.
- B) **Come prima, cambia il piano:** meno codice toccato, ma una modifica fatta per
  guardare resta salvata e gonfia la spesa; andrebbe mostrata nella riga del Piano
  con "· N porzioni".

## Scelta
A, scelta dall'utente. Nel Piano una ✕ toglie il piatto con un tocco, senza
conferma come il tasto nella ricetta: si rimette da "+ Aggiungi piatto". Aggiungere
un piatto dalla ricetta lo mette alle porzioni base, anche se se ne stavano
guardando altre. La forma dei dati non cambia: `porzioni` si legge come prima e una
tolta resta a 0, quindi non serve migrazione e i codici di backup restano `v: 2`.

## Conseguenze verificate
Provato in locale con Playwright a 390 px, partendo dalla v19 con porzioni diverse
già salvate: `localStorage` e Spesa identici dopo l'aggiornamento, porzioni salvate
rispettate, un codice `MP2_` della v19 si importa ancora. Quelle porzioni si
azzerano solo togliendo e rimettendo il piatto. La prova sul telefono resta da fare.
