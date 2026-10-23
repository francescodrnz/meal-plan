# Convenzioni di lavoro

Come si scrive la documentazione di questo progetto e come si porta a casa
un lavoro. Le regole qui dentro valgono per me e per Claude Code: le skill
globali `/inizio`, `/fine`, `/revisione`, `/secondo-parere` e `/igiene`
leggono questo file prima di fare qualsiasi cosa. Le parti A e B sono il metodo, uguale in tutti i
progetti; la Parte C è quello che vale solo qui.

---

## Parte A — Dove va cosa

### I tre tempi verbali

Ogni file appartiene a un tempo verbale, e il tempo detta la regola di
scrittura. È questa la regola che impedisce al progetto di diventare un diario.

| Tempo | File | Regola |
|---|---|---|
| **Presente** — com'è adesso | `CLAUDE.md`, `STATO.md`, `<unità>/README.md` | Si **riscrivono sul posto**. Se un fatto cambia, il vecchio si **cancella**. Mai "aggiornamento del …", mai due versioni dello stesso fatto nello stesso file. |
| **Futuro** — cosa manca | `TODO.md`, `BACKLOG.md`, `IDEE.md`, `lavori/*.md` | Solo azioni non ancora fatte. Quando una è fatta si **cancella**: l'esito va nel file "presente" giusto, la storia resta nel commit. **Niente `[x]`.** |
| **Passato** — perché | `decisioni/NNNN-*.md`, `git log` | **Immutabili.** Si aggiungono, non si modificano. Una decisione superata non si riscrive: si apre la successiva, e la vecchia prende stato "superata da NNNN". |

**Test rapido, mentre scrivi:** se una riga di TODO.md contiene un orario, la
parola "poi", o racconta cosa è successo, è nel file sbagliato.

### Tabella di smistamento

Quando emerge qualcosa durante una sessione, va in uno di questi posti. Se non
è chiaro dove, è quasi sempre perché sono due cose diverse appiccicate insieme:
separale.

| Cosa è emerso | Dove va |
|---|---|
| Un'azione ancora da fare | `TODO.md` |
| Un'idea ragionata, qualcosa di non urgente | `BACKLOG.md`, al massimo ~10 righe per voce |
| Un'idea grezza, buttata lì | `IDEE.md`, una riga con la data |
| Una scelta fra alternative, presa o ancora aperta | `decisioni/NNNN-<slug>.md` + riga nell'indice |
| Una misura (tempi, RAM, dimensioni, velocità) | `<unità>/README.md` › Misure, con la data |
| Com'è fatta un'unità | `<unità>/README.md` › Com'è fatto |
| Un limite, un bug noto, un comportamento strano e il suo rimedio | `<unità>/README.md` › Limiti e comportamenti noti |
| Un'indagine su un problema poi risolto | il **rimedio** nel README dell'unità; il racconto sta nel commit e si butta |
| Un fatto stabile che vale per tutto il progetto | `CLAUDE.md` (vedi la regola sotto) |
| Dove siamo adesso | `STATO.md` |
| Cronaca di cosa è stato fatto oggi | il messaggio di commit, e basta |

### Aggiornare CLAUDE.md senza trasformarlo in un diario

CLAUDE.md è sempre in contesto: ogni riga costa, quindi deve guadagnarsi il posto.

Quando emerge un fatto di contesto che vale per tutto il progetto e non cambia
di settimana in settimana — un limite, una trappola verificata, una regola di
sicurezza, un vincolo nuovo — **aggiungilo lì**, riscrivendo la riga esistente
se già c'è.

Non aggiungerlo se:
- è un numero che invecchia (conteggi, versioni in corso) → `STATO.md`
- riguarda una sola unità → il README di quell'unità
- è il motivo di una scelta → `decisioni/`

**Se una riga che stai per aggiungere a CLAUDE.md comincia con una data, è nel
file sbagliato.**

### Soglie di allarme

Non sono limiti rigidi: `/igiene` le segnala e basta, poi si decide se il
contenuto va spostato nel posto giusto o se quel file ha davvero bisogno di
quello spazio. **Non si cancella niente di utile per starci dentro.**

| File | Soglia |
|---|---|
| `TODO.md` | 80 righe |
| una voce di `BACKLOG.md` | ~10 righe |
| `STATO.md` | 60 righe |
| `CLAUDE.md` | 120 righe |
| `<unità>/README.md` | 250 righe |
| una decisione | 100 righe |

### Modelli

**Una decisione** (`decisioni/0000-modello.md`): stato, contesto, alternative,
scelta, conseguenze verificate. Una decisione **aperta** è uno stato legittimo:
è lì che vivono le scelte in sospeso, non in TODO.md. Numerazione progressiva a
4 cifre, mai riusata, mai riordinata.

**Un README di unità**: sezioni fisse, quelle della Parte C, vuote se non
servono.

**Segreti**: nei file si scrive *dove* sta una credenziale, mai il valore.

---

## Parte B — Come si porta a casa un lavoro

Quattro fasi: **piano → esecuzione → verifica → chiusura**. La quantità di
cerimonia dipende dalla taglia del lavoro, che si decide all'inizio in una riga.

### Le tre taglie

| Taglia | Cos'è | Cosa comporta |
|---|---|---|
| **S** — configurazione | Un'impostazione, una prova, una casella di TODO | Nessun piano scritto. Si fa, si verifica, si chiude. |
| **M** — codice esistente, pezzo nuovo semplice | (esempi nella Parte C) | Plan mode → esecuzione a pezzi con verifica → **una** passata `/revisione` sui soli file toccati. `/secondo-parere` solo se richiesto. |
| **L** — pezzo nuovo con molto codice nostro | (esempi nella Parte C) | Plan mode → piano salvato in `lavori/<slug>.md` → `/secondo-parere` sul piano → esecuzione a pezzi → `/revisione` → `/secondo-parere` sul diff → `/security-review` se è esposto in rete. |

**In dubbio, taglia più piccola.** Si sale di taglia quando la verifica
fallisce due volte: è il segnale che il problema non era capito.

### Il gate di verifica

Ogni passo dichiara **prima di essere eseguito** come si verifica: un comando
con l'esito atteso, oppure un controllo esplicito da fare a mano. Si sceglie la
verifica più economica che basta: compilare, lanciare i test che ci sono,
provare la cosa. Scrivere un test nuovo non è il modo normale di verificare un
passo, e il tempo sui test resta una frazione di quello sul codice.
Non si passa al passo successivo finché l'esito non è stato osservato. Se un
passo non è verificabile, va spezzato finché non lo è.

L'esito osservato non è lavoro in più: è esattamente il materiale che poi
finisce in `Misure` del README o in `Conseguenze verificate` della decisione.

Mai scrivere "fatto" per qualcosa che non è stato osservato. Se una verifica non
si è potuta fare, si dice quale e perché.

### Lavori lunghi

Un lavoro di taglia L che non finisce in una sessione tiene il suo piano in
`lavori/<slug>.md`: passi, verifiche, cosa manca. È un file "futuro", quindi si
pota mentre si avanza e si **cancella** quando il lavoro è finito — il risultato
vive nei README e nelle decisioni, non lì.

### Chiusura

Un lavoro non è finito quando il codice gira: è finito quando `/fine` ha
smistato tutto e committato.

### Spendere poco

- `/revisione` solo su taglia M/L, e solo sui file toccati (`git diff`), mai su
  tutto il repo.
- `/revisione` e `/igiene` girano in contesto separato e su modello economico:
  una checklist esplicita non ha bisogno del modello più grosso.
- `/secondo-parere` è la parte cara: due o tre agenti per giro, sul modello
  principale, fino a tre giri. Solo su L, o su M quando lo si chiede.
- Niente subagenti sulla taglia S.
- La documentazione tenuta bene è quello che fa risparmiare: se `STATO.md` e i
  README sono aggiornati, non serve riesplorare il repo a ogni sessione.

---

## Parte C — Specifico di questo progetto

### Le unità
Una sola: l'app intera. I file stanno tutti nella radice perché GitHub Pages
li serve da lì, e `style.css` e `sw.js` sono condivisi fra le due pagine. Il
suo README è il `README.md` della radice. In "Com'è fatto" le due parti
(piano pasti e allenamenti) hanno ciascuna il suo paragrafo. Se una delle due
cresce fino a meritare un README tutto suo, si apre una decisione.

### Il README di un'unità
Sezioni fisse, sempre queste, vuote se non servono:
`A cosa serve` · `Com'è fatto` · `Come si usa` · `Misure` · `Limiti e
comportamenti noti` · `Comandi utili` · `Decisioni collegate`.

### Esempi di taglia
- S: cambiare una ricetta o una quantità, correggere un colore, aumentare la
  cache.
- M: una schermata o funzione nuova dentro una pagina esistente, cambiare la
  forma dei dati in `localStorage` con la sua migrazione, toccare `sw.js`.
- L: una pagina nuova con la sua logica, una sincronizzazione fra dispositivi
  che non passi dai codici di import/export.

### Cosa controlla /revisione
Oltre alle regole vincolanti di `CLAUDE.md`:
- se è cambiato un file in `ASSETS`, anche `CACHE_NAME` in `sw.js` è stato
  aumentato
- un file nuovo da servire è stato aggiunto ad `ASSETS`
- le chiavi di `localStorage` e il formato di import/export restano
  compatibili, oppure c'è la migrazione
- niente dipendenze nuove né passi di build
- niente `console.log` di debug lasciati in giro, e nessun dato personale
  scritto nel codice

### Cosa guarda /secondo-parere
- Aggiornamento del service worker: un telefono con la versione vecchia in
  cache deve passare a quella nuova senza restare a metà fra le due.
- Dati in `localStorage`: sono l'unica copia, quindi un errore di migrazione
  li fa perdere per sempre.
- Import di codici prodotti da versioni vecchie dell'app.

### Rilascio
Il push su `main` è il rilascio: GitHub Pages pubblica in un paio di minuti.
Niente tag né changelog. Messaggi di commit brevi, in minuscolo, con la riga
di attribuzione di Claude Code quando è lui a committare.
