# 0006 — Scheda Ricette raggruppata come il piano

Stato: decisa il 2026-10-24
Unità: app (piano pasti)
Supera: la parte di 0004 che mette prima le ricette in rotazione

## Contesto
Con la 0005 il piano è la rotazione più le modifiche dal telefono, ma la
scheda Ricette raggruppava ancora per la casella "In rotazione" di Notion. Un
piatto tolto dal piano restava sotto "In rotazione", uno aggiunto finiva in
"Altre ricette": le due schede sembravano non sincronizzate.

## Alternative
- A) **Gruppi dal piano**: "Nel piano" (stessi piatti e ordine della scheda
  Piano) e "Altre ricette". La casella di Notion resta il punto di partenza
  del piano.
- B) **L'app scrive la rotazione su Notion**: sincronia vera, ma serve un
  token in scrittura dentro una pagina pubblica, o un server. Esclusa.
- C) **Solo il titolo** ("In rotazione su Notion"): costa meno, le due liste
  restano diverse.

## Scelta
A, scelta dall'utente: sul telefono conta il piano, Notion decide da dove
parte. Niente cambia nei dati né nei codici di backup.

## Conseguenze verificate
- 2026-10-24, in locale con Playwright a 390 px: con un piatto della
  rotazione a 0 porzioni e una ricetta fuori rotazione in `aggiunte`, il
  primo sta in "Altre ricette" e la seconda in "Nel piano"; "Nel piano" ha
  10 piatti, gli stessi e nello stesso ordine della scheda Piano.
