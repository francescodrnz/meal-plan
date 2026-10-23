# Idee e cose non urgenti

Niente di qui è programmato. Quando una voce diventa un lavoro vero, si sposta
in TODO.md. Al massimo ~10 righe per voce.

## Ricette in un posto solo

Oggi una ricetta sta in `recipesData` (testo a schermo), in
`recipeIngredients` (grammi per la spesa) e, per la proteina, in
`bulkOverrides`. Se si cambia in un posto e non negli altri, la lista della
spesa non corrisponde più. Si potrebbe generare il testo dai grammi, oppure
tenere un'unica struttura. Da fare prima di toccare molte ricette.

## Modalità Bulk nei codici di export

`mealplan_bulk_v1` non entra nel codice di export, quindi va riattivata a mano
su ogni dispositivo. Aggiungerla al payload (campo opzionale, `v` resta
leggibile dalle versioni vecchie) se diventa fastidioso.
