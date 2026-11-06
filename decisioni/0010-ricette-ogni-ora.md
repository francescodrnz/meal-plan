# 0010 — Ricette da Notion ogni ora

Stato: decisa il 2026-11-06
Unità: trasversale (Action, Notion)

## Contesto
La 0001 rigenerava `ricette.json` ogni notte, con il cron alle 3:17 UTC. GitHub
però avviava il giro fra le 9:36 e le 11:00 UTC (fine ottobre, inizio
novembre). Una modifica fatta la sera su Notion arrivava quindi a fine
mattinata del giorno dopo, tardi per mettere in ammollo o per cucinare a pranzo.

## Alternative
- A) **Cron ogni ora.** Una riga da cambiare. Repo pubblico, quindi minuti di
  Actions gratis; circa 40 s a giro. GitHub non garantisce l'orario: può
  ritardare o saltare dei giri.
- B) **Automazione di Notion che lancia l'Action alla modifica.** Quasi
  immediata, ma richiede un token GitHub con permessi di scrittura fuori dal
  repo, partirebbe a ogni modifica e, per quel che ne so, serve un piano Notion
  a pagamento (non verificato).
- C) **Tasto nell'app.** Il token finirebbe in una pagina pubblica (lo stesso
  motivo per cui l'app non chiama Notion, vedi 0001). Escluso.
- D) **Cron su una macchina propria o un servizio esterno che lancia l'Action.**
  Puntuale, ma è un pezzo in più da tenere in piedi per un'app personale.

## Scelta
A — è la più semplice, e il lancio a mano da Actions › Run workflow resta per
quando una modifica serve subito.

## Conseguenze verificate
Il lancio a mano del 2026-11-06 è durato meno di un minuto. Il giro orario va
ancora osservato: non è detto che GitHub rispetti l'ora meglio di quanto
rispettava il cron notturno.
