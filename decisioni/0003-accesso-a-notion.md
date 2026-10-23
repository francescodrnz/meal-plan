# 0003 — Come si accede a Notion: token in sola lettura e connettore MCP

Stato: decisa il 2026-10-23
Unità: trasversale

## Contesto
La GitHub Action della decisione 0001 legge Notion con il token di una
connessione interna (`meal-plan`), in sola lettura. Il connettore MCP di
Notion che usa Claude a volte si blocca per rate limit, e le sessioni
future devono poter leggere i dati e lanciare lo script in locale.

## Alternative
- A) **Solo il connettore MCP**: niente segreti sul disco, ma quando è
  limitato non si legge nulla e lo script non si prova in locale.
- B) **Solo il token in `.env`**: rate limit separato, script in locale; ma
  il token legge soltanto, quindi non serve per inserire o correggere
  ricette.
- C) **Tutti e due**, ognuno per il suo uso.

## Scelta
C. Il connettore MCP per scrivere su Notion; il token in `.env` (ignorato da
git, permessi 600) per leggere e per lo script. Un token che può solo
leggere ricette già pubbliche nel repo costa poco se esce.

## Conseguenze verificate
- Il token legge i tre database (23 ricette, 55 prodotti) e lo script gira
  in locale; `git check-ignore` conferma che `.env` resta fuori da git.
- Il token è passato una volta in chiaro nella chat della sessione: si può
  rigenerare dalla scheda Configuration della connessione, poi va
  aggiornato in `.env` e nel secret `NOTION_TOKEN`.
