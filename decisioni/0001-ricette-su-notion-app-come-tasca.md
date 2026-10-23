# 0001 — Ricette su Notion, l'app come tasca

Stato: decisa il 2026-10-23
Unità: trasversale (app, Notion, repo)

## Contesto
L'app ormai si usa solo per le quantità. La dispensa non si aggiorna più,
perché a mano è troppa fatica. Le ricette sono scritte nel codice in due
strutture, quindi aggiungerne una è faticoso. Le ricette nuove nascono in
chat con Claude e finiscono nel database Notion "Ricette": ingredienti per
porzione in un database a parte, regole nella pagina "Standard ricette".
Serve un solo posto per le ricette, e la lista della spesa in tasca.

## Alternative
- A) **Solo Notion**: il piano pasti dell'app va in pensione. Zero codice,
  ma Notion non somma lo stesso ingrediente fra ricette diverse, è lento e
  va male senza rete, e spuntare vuol dire modificare il database.
- B) **Notion come fonte, l'app come tasca**: l'app legge una copia
  `ricette.json` generata da Notion e fa piano, dispensa, spesa e cucina.
  L'app non può chiamare l'API di Notion: non c'è CORS, e il token
  finirebbe in una pagina pubblica.
- C) **App come fonte**: Claude in chat produce un codice da importare.
  Le ricette vivono in un solo `localStorage` e si butta il lavoro fatto su
  Notion.

## Scelta
B. La copia `ricette.json` la rigenera una GitHub Action ogni notte, e si
può lanciare anche a mano. Il flusso è stato concordato su un mockup
(https://claude.ai/artifact/7mKgcZZvx9QkqGgT18NVsS):

- Tre schede: Ricette (si apre su questa), Piano, Spesa. Backup e
  allenamenti stanno nel menu. Nell'interfaccia niente testi che spiegano
  l'app.
- **Ricette**: solo quelle con "In rotazione" spuntato su Notion.
- **Piano** = la rotazione. Ogni piatto ha le sue porzioni, regolabili di
  0,1, con le kcal a pasto: una persona, due porzioni a ricetta (pranzo e
  cena). Il piano resta fisso: "Cucinata" non toglie il piatto, scala solo
  gli ingredienti dalla dispensa.
- **Ogni giorno**: frutta e latte di soia per giorno, moltiplicati per i
  giorni del piano (un piatto = un giorno). Prende il posto dei 2500 g fissi
  di latte.
- **Dispensa stimata**: "Spesa fatta" aggiunge quello che hai spuntato,
  "Cucinata" toglie gli ingredienti e un giorno di "Ogni giorno". Si
  corregge con −/+ in confezioni: a quarti per quelle grandi, intere per
  panetti e lattine. "Tutta la dispensa" mostra anche i prodotti che il
  piano non usa.
- **Lista** = fabbisogno del piano meno la dispensa, arrotondata a
  confezioni ("2 pacchi da 500 g") e divisa per reparto. Spezie, aglio,
  cipolla e limone non hanno quantità: si segna solo se c'è o manca.
- **Scheda ricetta**: quantità scalate, spunta di ingredienti e passi,
  schermo sempre acceso. "Cucinata fuori piano" vale per una ricetta che non
  è nel piano.
- Spariscono la modalità Bulk, l'"ultima ricetta", le ricette scritte nel
  codice e la dispensa in grammi per id.

Cosa comporta:
- **Notion**:
  - un database **Prodotti** (nome, reparto, unità, confezione, se si conta
    in dispensa) collegato agli Ingredienti;
  - olio e salse in ml, e cucchiai solo per le spezie;
  - la casella "In rotazione";
  - "Porzioni da fare" e la vista "Lista spesa" non servono più;
  - "Standard ricette" va aggiornato di conseguenza.
- **Repo**:
  - un'integrazione Notion con il token nei secret di GitHub;
  - `ricette.json` network-first nel service worker, così una
    sincronizzazione non richiede di aumentare `CACHE_NAME`;
  - le ricette restano pubbliche nel repo, come già in `script.js`.
- **Dati**:
  - chiavi nuove per piano e dispensa; le vecchie non si cancellano;
  - la dispensa vecchia (grammi per id) va migrata per nome di prodotto
    dove si può;
  - i codici di export vecchi (`{inventory, customs, v: 1}`) devono restare
    importabili.

## Conseguenze verificate
Ancora nessuna. Da tenere d'occhio con l'uso: se la stima della dispensa si
allontana troppo dalla realtà, il modello va ripensato.
