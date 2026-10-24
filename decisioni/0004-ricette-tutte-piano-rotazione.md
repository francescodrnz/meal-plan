# 0004 — Ricette: si vedono tutte, il piano resta la rotazione

Stato: decisa il 2026-10-24 (il raggruppamento: superata da 0006)
Unità: app (piano pasti)

## Contesto
La 0001 diceva che la scheda Ricette mostra solo le ricette con "In
rotazione" spuntato, e che il piano è la rotazione. Così una ricetta fuori
rotazione non si poteva aprire dall'app, e "Cucinata fuori piano" valeva
solo per un piatto del piano messo a 0 porzioni.

## Alternative
- A) **Solo la rotazione**, come nella 0001: "fuori piano" vuol dire porzioni
  a 0.
- B) **Tutte le ricette**: prima quelle in rotazione, poi le altre. Il piano
  resta fatto dalla rotazione; le altre si cucinano "fuori piano".

## Scelta
B, scelta dall'utente durante il piano del rework. Il resto della 0001 non
cambia.

## Conseguenze verificate
- 2026-10-24, in locale: la scheda Ricette mostra 10 ricette in rotazione e
  23 altre; una ricetta fuori rotazione mostra "Cucinata fuori piano".
