# 0009 — Scheda palestra A/B scritta nella pagina

Stato: decisa il 2026-11-04
Unità: app

## Contesto
Nuova scheda palestra a rotazione A/B, 5 esercizi per sessione con 2 o 3
serie, al posto dei 5 esercizi fissi × 2 serie di `workout.html`. Bisognava
decidere dove tenerla, come si sceglie la sessione e quante serie mostrare
(nelle sessioni 1–3 di rientro la scheda ne prevede 2 per tutti).

## Alternative
- A) Scheda in `SCHEDE` dentro `workout.html`; sessione proposta = quella dopo
  l'ultima salvata, cambiabile a mano; serie sempre quelle della scheda, tutte
  da spuntare per concludere.
- B) Come A, ma serie automatiche (2 nelle sessioni 1–3) e "Concludi" anche con
  serie non fatte.
- C) Scheda su Notion come le ricette: più flessibile, ma un'Action e un file
  in più per una lista che cambia di rado.

## Scelta
A — scelta dell'utente sulle serie; la scheda cambia ogni qualche mese, e
toccare una costante costa meno di un'altra copia da Notion.

## Conseguenze verificate
- Le sessioni salvate hanno in più `scheda: 'A'|'B'`; il nome dell'esercizio
  resta la chiave dello storico, quindi non va rinominato.
- `workout_active` senza `scheda` (formato vecchio, anche da un codice
  importato) tiene cronometro e note e rifà le serie.
- Provato con Playwright a 390 px: migrazione da dati vecchi, alternanza
  A→B→A con precompilazione, conferma al cambio, import di un codice vecchio.
