# 0008 — Contorno rosso: quando la dispensa non basta per una ricetta

Stato: decisa il 2026-10-25
Unità: app (piano pasti)

## Contesto
Nelle schede Ricette e Piano si vuole vedere a colpo d'occhio quali ricette
non si possono cucinare con la dispensa di adesso. "Non basta" si può
intendere in più modi: per quante porzioni, contando o no gli altri piatti
del piano, e cosa fare con le cose di casa che non hanno una quantità.

## Alternative
- Porzioni: A1) quelle del piano per un piatto del piano, le base fuori
  piano; A2) sempre le base (più semplice, ma un piatto con più porzioni può
  risultare verde e poi non bastare).
- Confronto: B1) ogni ricetta da sola contro tutta la dispensa ("posso
  cucinarla adesso?"); B2) la dispensa divisa fra i piatti del piano
  nell'ordine della lista (gli ultimi diventano rossi, ma l'ordine è
  casuale).
- Cose di casa: C1) contano se non facoltative e segnate "manca"; C2) contano
  solo i prodotti con quantità.

## Scelta
A1, B1, C1. Il contorno segue quello che si cucinerebbe davvero; quanto
manca per tutto il piano lo dice già la Spesa. "Ogni giorno" non conta, e
nemmeno facoltativi, q.b. e unità diverse da quella del prodotto.

## Conseguenze verificate
Provato in locale con Playwright a 390 px: dispensa vuota → 33 ricette su 33
rosse; dispensa piena → nessuna; ceci a un grammo sotto il necessario → rosse
solo le 3 ricette che ne chiedono almeno tanto; porzioni del piano +0,1 →
il piatto diventa rosso; aglio "manca" → rosse le 19 ricette che lo usano.
Da tenere d'occhio: con la dispensa vuota (primo avvio, import senza
dispensa) è quasi tutto rosso, e il contorno non dice cosa manca.
