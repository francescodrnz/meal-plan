# 0005 — Piano modificabile: la rotazione più le modifiche

Stato: decisa il 2026-10-24
Unità: app (piano pasti)
Supera: la parte di 0001 e 0004 che dice "il piano è la rotazione"

## Contesto
Con la 0001 e la 0004 il piano era esattamente la rotazione di Notion: si
potevano solo cambiare le porzioni, e a 0 il piatto restava in lista come
saltato. Il mockup concordato (`0001-mockup.html`) aveva però "+ Aggiungi
piatto", e l'interfaccia rifatta sul mockup deve poter aggiungere e togliere
piatti dal telefono.

## Alternative
- A) **Elenco libero sul telefono**: il piano diventa una lista salvata,
  riempita con la rotazione solo la prima volta. È il mockup alla lettera, ma
  dopo il primo avvio "In rotazione" su Notion non conta più, e serve una
  forma nuova dei dati, con migrazione e un codice di backup nuovo.
- B) **Rotazione più le modifiche**: il piano resta la rotazione di Notion; il
  telefono ricorda solo le differenze. Una ricetta tolta ha porzioni 0 (come
  prima), una fuori rotazione aggiunta sta in `aggiunte`. I cambi di
  rotazione su Notion arrivano da soli; un piatto tolto a mano resta tolto
  anche se torna in rotazione.

## Scelta
B, scelta dall'utente. `mealplan_piano_v2` prende il campo `aggiunte`, senza
migrazione: un piano senza il campo vale `[]`, e i codici di backup restano
`v: 2`. Un piatto a 0 porzioni non si vede più nel piano: torna disponibile
in "Aggiungi piatto". Restano dalla 0001: "Cucinata" non toglie il piatto,
niente "sempre in casa".

## Conseguenze verificate
- 2026-10-24, in locale con Playwright: con un piano salvato dalla v12 l'app
  mostra i 10 piatti e le porzioni di prima; aggiungere una ricetta fuori
  rotazione la scrive in `aggiunte` e fa salire i giorni (10 → 11,5); portare
  un piatto a 0 lo toglie e lo rimette in "Aggiungi piatto". Un codice `MP2_`
  della v12 si importa, e un export nuovo si reimporta con le aggiunte.
