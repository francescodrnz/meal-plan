# Da fare

Solo azioni aperte. Quando una è fatta si cancella: l'esito va nel README
dell'unità o in una decisione, e la cronaca resta nel commit. Regole in
CONVENZIONI.md, idee non urgenti in BACKLOG.md.

## Service worker

- [M] In `sw.js` rendere network-first anche la radice `/meal-plan/` (oggi
  il controllo è `pathname === '/'`) e correggere il commento che dice
  network-first anche per il manifest. Aumentare `CACHE_NAME`.
