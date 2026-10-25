// Piano pasti: ricette da ricette.json (generato da Notion), piano, dispensa stimata e spesa.

// ==================== CHIAVI ====================
const CHIAVI = {
  piano: 'mealplan_piano_v2',
  dispensa: 'mealplan_dispensa_v2',
  cucina: 'mealplan_cucina_v2',
  spesa: 'mealplan_spesa_v2', // righe spuntate della lista, fino a "Spesa fatta"
  altro: 'mealplan_altro_v1', // cose scritte a mano nella lista, fino a "Spesa fatta"
  extra: 'mealplan_custom_v1',
  v1: 'mealplan_shop_v1' // dispensa vecchia: si legge per la migrazione, non si scrive mai
};

function leggiJSON(chiave, predefinito) {
  try {
    const v = JSON.parse(localStorage.getItem(chiave));
    return v === null ? predefinito : v;
  } catch (e) {
    return predefinito;
  }
}

function scriviJSON(chiave, valore) {
  localStorage.setItem(chiave, JSON.stringify(valore));
}

// ==================== CATALOGO ====================
let catalogo = null;

async function caricaCatalogo() {
  try {
    const r = await fetch('ricette.json');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const dati = await r.json();
    if (dati.versione !== 1) throw new Error('versione ' + dati.versione);
    catalogo = preparaCatalogo(dati);
  } catch (e) {
    catalogo = null;
  }
  return catalogo;
}

function preparaCatalogo(dati) {
  const prodottiPerId = {};
  dati.prodotti.forEach(p => { prodottiPerId[p.id] = p; });
  const ricettePerId = {};
  dati.ricette.forEach(r => {
    ricettePerId[r.id] = r;
    r.nutrizione = calcolaNutrizione(r, prodottiPerId);
  });
  return { prodotti: dati.prodotti, ricette: dati.ricette, prodottiPerId, ricettePerId };
}

function prodottoPerNome(nome) {
  return catalogo ? catalogo.prodotti.find(p => p.nome === nome) : undefined;
}

// ==================== NUMERI ====================
const arrotonda1 = x => Math.round(x * 10) / 10;
const arrotonda6 = x => Math.round(x * 1e6) / 1e6;

// ==================== PIANO ====================
// {porzioni: {idRicetta: n}, aggiunte: [idRicetta], ogniGiorno: [{prodotto, quantita}]}
// Il piano è la rotazione di Notion più le modifiche (decisione 0005): porzioni solo quelle diverse
// dalla ricetta, 0 = tolta dal piano; aggiunte: ricette fuori rotazione messe nel piano.
// ogniGiorno: assente finché non si cambia.

function ogniGiornoIniziale() {
  return [['Latte di soia', 250], ['Frutta', 2]]
    .map(([nome, quantita]) => { const p = prodottoPerNome(nome); return p ? { prodotto: p.id, quantita } : null; })
    .filter(Boolean);
}

function leggiPiano() {
  const p = leggiJSON(CHIAVI.piano, {}) || {};
  return {
    porzioni: (p.porzioni && typeof p.porzioni === 'object') ? p.porzioni : {},
    aggiunte: Array.isArray(p.aggiunte) ? p.aggiunte.filter(id => typeof id === 'string') : [],
    ogniGiorno: Array.isArray(p.ogniGiorno)
      ? p.ogniGiorno.filter(x => x && typeof x.prodotto === 'string' && typeof x.quantita === 'number')
      : ogniGiornoIniziale()
  };
}

function scriviPiano(piano) {
  scriviJSON(CHIAVI.piano, piano);
}

function porzioniNelPiano(piano, ricetta) {
  const v = piano.porzioni[ricetta.id];
  return typeof v === 'number' ? v : ricetta.porzioni;
}

// A 0 porzioni la ricetta esce dal piano.
function impostaPorzioni(ricetta, valore) {
  const v = Math.max(0, arrotonda1(valore));
  if (v === 0) { togliDalPiano(ricetta); return; }
  const piano = leggiPiano();
  if (v === ricetta.porzioni) delete piano.porzioni[ricetta.id];
  else piano.porzioni[ricetta.id] = v;
  scriviPiano(piano);
}

function aggiungiAlPiano(ricetta) {
  const piano = leggiPiano();
  delete piano.porzioni[ricetta.id];
  if (!ricetta.rotazione && !piano.aggiunte.includes(ricetta.id)) piano.aggiunte.push(ricetta.id);
  scriviPiano(piano);
}

function togliDalPiano(ricetta) {
  const piano = leggiPiano();
  piano.aggiunte = piano.aggiunte.filter(id => id !== ricetta.id);
  if (ricetta.rotazione) piano.porzioni[ricetta.id] = 0;
  else delete piano.porzioni[ricetta.id];
  scriviPiano(piano);
}

// I piatti da cucinare: la rotazione, poi le aggiunte, senza quelli a 0 porzioni.
function piattiDelPiano(piano) {
  const aggiunte = piano.aggiunte.map(id => catalogo.ricettePerId[id]).filter(r => r && !r.rotazione);
  return catalogo.ricette.filter(r => r.rotazione).concat(aggiunte)
    .map(r => ({ ricetta: r, porzioni: porzioniNelPiano(piano, r) }))
    .filter(x => x.porzioni > 0);
}

// Una ricetta da 2 porzioni copre pranzo e cena: un giorno.
const giorniRicetta = ricetta => ricetta.porzioni / 2;

function giorniDelPiano(piano) {
  return piattiDelPiano(piano)
    .reduce((tot, x) => tot + giorniRicetta(x.ricetta), 0);
}

const kcalAPasto = (ricetta, porzioni) => typeof ricetta.nutrizione.kcal === 'number'
  ? ricetta.nutrizione.kcal * porzioni / ricetta.porzioni : null;

// ==================== VALORI NUTRIZIONALI ====================
// Valori dei prodotti per 100 g o 100 ml; pz e spicchio pesano pesoPezzo.
const GRAMMI_PER_UNITA = { g: 1, ml: 1, cucchiaino: 5, cucchiaio: 15 };
const MACRO = ['kcal', 'proteine', 'carboidrati', 'grassi'];

function grammiIngrediente(ing, p) {
  if (GRAMMI_PER_UNITA[ing.unita]) return ing.quantita * GRAMMI_PER_UNITA[ing.unita];
  if ((ing.unita === 'pz' || ing.unita === 'spicchio') && p.pesoPezzo) return ing.quantita * p.pesoPezzo;
  return null;
}

// A porzione, dalle quantità degli ingredienti; spezie, q.b. e facoltativi non contano.
// Se a un ingrediente mancano i valori si ripiega su kcal e proteine scritti a mano su Notion.
function calcolaNutrizione(ricetta, prodottiPerId) {
  const tot = { kcal: 0, proteine: 0, carboidrati: 0, grassi: 0 };
  const mancanti = [];
  ricetta.ingredienti.forEach(ing => {
    const p = ing.prodotto && prodottiPerId[ing.prodotto];
    if (!p || ing.quantita === null || ing.facoltativo || p.reparto === 'Spezie') return;
    const grammi = grammiIngrediente(ing, p);
    if (grammi === null || typeof p.kcal !== 'number') { mancanti.push(ing.nome); return; }
    MACRO.forEach(k => { tot[k] += grammi * (p[k] || 0) / 100; });
  });
  if (!mancanti.length) return Object.assign(tot, { calcolata: true, mancanti });
  return { kcal: ricetta.kcal, proteine: ricetta.proteine, carboidrati: null, grassi: null, calcolata: false, mancanti };
}

// ==================== INGREDIENTI ====================
// Il prodotto da contare per un ingrediente, oppure null se non si conta in dispensa.
function prodottoContato(ing) {
  if (!ing.prodotto || ing.quantita === null || ing.facoltativo) return null;
  const p = catalogo.prodottiPerId[ing.prodotto];
  if (!p || !p.siConta || ing.unita !== p.unita) return null;
  return p;
}

function unitaDiversa(ing) {
  const p = ing.prodotto && catalogo.prodottiPerId[ing.prodotto];
  return !!(p && p.siConta && ing.quantita !== null && ing.unita !== p.unita);
}

function ogniGiornoContato(piano) {
  return piano.ogniGiorno.filter(x => {
    const p = catalogo.prodottiPerId[x.prodotto];
    return p && p.siConta && typeof x.quantita === 'number';
  });
}

// {quantita: {idProdotto: n}, serve: Set di prodotti senza quantità usati dal piano}
function fabbisogno(piano) {
  const quantita = {};
  const serve = new Set();
  const aggiungi = (id, n) => { quantita[id] = (quantita[id] || 0) + n; };
  piattiDelPiano(piano).forEach(({ ricetta, porzioni }) => {
    ricetta.ingredienti.forEach(ing => {
      const p = prodottoContato(ing);
      if (p) { aggiungi(p.id, ing.quantita * porzioni); return; }
      const q = ing.prodotto && catalogo.prodottiPerId[ing.prodotto];
      if (q && !q.siConta && !ing.facoltativo) serve.add(q.id);
    });
  });
  const giorni = giorniDelPiano(piano);
  ogniGiornoContato(piano).forEach(x => aggiungi(x.prodotto, x.quantita * giorni));
  return { quantita, serve };
}

// Quanto serve, per unità, dei prodotti che si segnano solo come presenti (spezie, aglio…).
function usiCoseDiCasa(piano) {
  const usi = {};
  piattiDelPiano(piano).forEach(({ ricetta, porzioni }) => ricetta.ingredienti.forEach(ing => {
    const p = ing.prodotto && catalogo.prodottiPerId[ing.prodotto];
    if (!p || p.siConta || ing.facoltativo) return;
    const u = usi[p.id] = usi[p.id] || {};
    const unita = ing.quantita === null ? 'q.b.' : ing.unita;
    u[unita] = (u[unita] || 0) + (ing.quantita || 0) * porzioni;
  }));
  return usi;
}

// Cosa toglie "Cucinata": gli ingredienti alle porzioni della scheda e i giorni di "Ogni giorno".
function consumoCucinata(piano, ricetta, porzioni) {
  const consumo = {};
  const aggiungi = (id, n) => { consumo[id] = (consumo[id] || 0) + n; };
  ricetta.ingredienti.forEach(ing => {
    const p = prodottoContato(ing);
    if (p) aggiungi(p.id, ing.quantita * porzioni);
  });
  ogniGiornoContato(piano).forEach(x => aggiungi(x.prodotto, x.quantita * giorniRicetta(ricetta)));
  return consumo;
}

// ==================== DISPENSA ====================
// {quantita: {idProdotto: n | true/false, "custom_<id>": n}, note}
// Prodotti con siConta: numero nell'unità del prodotto. Gli altri: manca solo se false.

function leggiDispensa() {
  const d = leggiJSON(CHIAVI.dispensa, null);
  return {
    quantita: (d && d.quantita && typeof d.quantita === 'object') ? d.quantita : {},
    note: (d && typeof d.note === 'string') ? d.note : ''
  };
}

function quantitaIn(dispensa, id) {
  const v = dispensa.quantita[id];
  return typeof v === 'number' ? v : 0;
}

const manca = (dispensa, id) => dispensa.quantita[id] === false;

const MAPPA_V1 = {
  tofu: 'Tofu', patate: 'Patate', quinoa: 'Quinoa', passata: 'Passata di pomodoro',
  broccoli: 'Broccoli surgelati', minestrone: 'Minestrone surgelato light',
  lenticchie: 'Lenticchie secche', ceci: 'Ceci secchi', fagioli: 'Fagioli secchi',
  pasta: 'Pasta corta', couscous: 'Cous cous', farro: 'Farro perlato', riso: 'Riso',
  polenta: 'Polenta istantanea',
  olio: 'Olio extravergine', latte_soia: 'Latte di soia' // da g a ml 1:1, come faceva l'app
};

function migraInventarioV1(inventory, cat) {
  const perNome = {};
  cat.prodotti.forEach(p => { perNome[p.nome] = p; });
  const quantita = {};
  Object.keys(inventory).forEach(k => {
    const v = inventory[k];
    if (typeof v !== 'number') return;
    if (k.startsWith('custom_')) { quantita[k] = v; return; }
    const p = MAPPA_V1[k] && perNome[MAPPA_V1[k]];
    if (p && p.siConta) quantita[p.id] = v;
  });
  return { quantita, note: typeof inventory._notes === 'string' ? inventory._notes : '' };
}

// La dispensa v2 nasce solo da una migrazione riuscita, o vuota se non c'è niente di vecchio.
// false: serve migrare ma il catalogo non c'è, quindi non si deve scrivere niente.
function assicuraMigrazione() {
  if (localStorage.getItem(CHIAVI.dispensa) !== null) return true;
  const v1 = leggiJSON(CHIAVI.v1, null);
  if (v1 && typeof v1 === 'object' && Object.keys(v1).length > 0) {
    if (!catalogo) return false;
    scriviJSON(CHIAVI.dispensa, migraInventarioV1(v1, catalogo));
  } else {
    scriviJSON(CHIAVI.dispensa, { quantita: {}, note: '' });
  }
  return true;
}

const MSG_SENZA_CATALOGO = 'Ricette non disponibili: apri l\'app una volta con la rete.';

// Ogni scrittura della dispensa passa da qui. Restituisce false se ha dovuto rifiutare.
function scriviDispensa(modifica) {
  if (!assicuraMigrazione()) { toast(MSG_SENZA_CATALOGO); return false; }
  const d = leggiDispensa();
  modifica(d);
  scriviJSON(CHIAVI.dispensa, d);
  return true;
}

function applicaConsumo(dispensa, consumo) {
  Object.keys(consumo).forEach(id => {
    dispensa.quantita[id] = Math.max(0, arrotonda6(quantitaIn(dispensa, id) - consumo[id]));
  });
}

// Passo di −/+ in confezioni, come la descrizione di "Tipo confezione" su Notion.
const passoConfezioni = p => ['panetto', 'lattina', 'pz'].includes(p.tipoConfezione) ? 1 : 0.25;

// −/+ della dispensa: si va al multiplo del passo successivo, così dopo "Cucinata" si torna in pari.
const aPasso = (q, passo, verso) => verso > 0
  ? arrotonda6((Math.floor(q / passo + 1e-9) + 1) * passo)
  : Math.max(0, arrotonda6((Math.ceil(q / passo - 1e-9) - 1) * passo));

// ==================== PRODOTTI EXTRA ====================
// [{id, name, unit, storeSize, need, category}]; la quantità sta nella dispensa come "custom_<id>".

function leggiExtra() {
  const e = leggiJSON(CHIAVI.extra, []);
  return Array.isArray(e) ? e : [];
}

// Scrive lista degli extra e dispensa insieme, o nessuna delle due.
function salvaExtraEDispensa(modificaExtra, modificaDispensa) {
  if (!assicuraMigrazione()) { toast(MSG_SENZA_CATALOGO); return false; }
  const extra = leggiExtra();
  const d = leggiDispensa();
  modificaExtra(extra);
  modificaDispensa(d);
  scriviJSON(CHIAVI.extra, extra);
  scriviJSON(CHIAVI.dispensa, d);
  return true;
}

// ==================== LISTA DELLA SPESA ====================
const PLURALI = { pacco: 'pacchi', bottiglia: 'bottiglie', vasetto: 'vasetti', lattina: 'lattine', panetto: 'panetti', pz: 'pz' };

function nomeConfezione(p, n) {
  const tipo = p.tipoConfezione || 'pz';
  return n === 1 ? tipo : (PLURALI[tipo] || tipo);
}

function testoConfezioni(p, n) {
  if (p.tipoConfezione === 'pz' && p.confezione === 1) return n + ' pz';
  return n + ' ' + nomeConfezione(p, n) + ' da ' + p.confezione + ' ' + p.unita;
}

function fmtNumero(n) {
  return arrotonda1(n).toLocaleString('it-IT');
}

// 1,25 → "1¼": per cucchiaini, spicchi, pezzi e confezioni a quarti.
function frazione(n) {
  const quarti = Math.round(n * 4), intero = Math.floor(quarti / 4), resto = quarti % 4;
  return (intero || !resto ? String(intero) : '') + ['', '¼', '½', '¾'][resto];
}

const UNITA_PLURALI = { cucchiaino: 'cucchiaini', cucchiaio: 'cucchiai', spicchio: 'spicchi' };

// Una quantità da leggere: grammi e ml tondi (a 5 sopra i 100, in kg e l sopra i 1000), il resto a quarti.
function fmtQuantita(q, unita) {
  if (q === null || unita === 'q.b.') return 'q.b.';
  if (unita === 'g' || unita === 'ml') {
    const v = q >= 100 ? Math.round(q / 5) * 5 : Math.round(q);
    return v >= 1000 ? fmtNumero(v / 1000) + (unita === 'g' ? ' kg' : ' l') : v + ' ' + unita;
  }
  const n = Math.max(0.25, Math.round(q * 4) / 4);
  return frazione(n) + ' ' + (n > 1 && UNITA_PLURALI[unita] ? UNITA_PLURALI[unita] : unita);
}

// Quanto c'è in dispensa, in confezioni: a quarti per pacchi e bottiglie, con un decimale per gli altri.
function testoInDispensa(p, q) {
  if (q <= 0) return 'niente';
  if (!p.confezione) return fmtQuantita(q, p.unita);
  if (p.tipoConfezione === 'pz' && p.confezione === 1) return fmtNumero(q) + ' pz';
  const n = q / p.confezione;
  if (passoConfezioni(p) < 1) {
    const t = frazione(n);
    return (t === '0' ? 'meno di ¼' : t) + ' ' + nomeConfezione(p, n > 1 ? 2 : 1);
  }
  return fmtNumero(n) + ' ' + nomeConfezione(p, arrotonda1(n));
}

// I reparti nell'ordine in cui si gira il supermercato; quelli che non ci sono, in fondo.
const ORDINE_REPARTI = ['Frutta e verdura', 'Frigo', 'Latte e bevande vegetali', 'Pasta riso e cereali',
  'Legumi', 'Conserve', 'Surgelati', 'Condimenti', 'Spezie', 'Altro'];

function confrontaReparti(a, b) {
  const pos = r => { const i = ORDINE_REPARTI.indexOf(r); return i < 0 ? ORDINE_REPARTI.length : i; };
  return pos(a) - pos(b) || String(a).localeCompare(String(b), 'it');
}

function perReparto(righe, reparto) {
  const gruppi = {};
  righe.forEach(r => { const k = reparto(r) || 'Altro'; (gruppi[k] = gruppi[k] || []).push(r); });
  return Object.keys(gruppi).sort(confrontaReparti).map(k => [k, gruppi[k]]);
}

// Righe da comprare: {chiave, nome, reparto, tipo: 'conta'|'manca'|'extra', confezioni, aggiunta, testo}
// "aggiunta" è quanto entra in dispensa con "Spesa fatta".
function listaSpesa(piano, dispensa, extra) {
  const righe = [];
  const fab = fabbisogno(piano);
  Object.keys(fab.quantita).forEach(id => {
    const p = catalogo.prodottiPerId[id];
    const mancante = arrotonda6(fab.quantita[id] - quantitaIn(dispensa, id));
    if (mancante <= 0) return;
    if (p.confezione) {
      const n = Math.ceil(mancante / p.confezione);
      righe.push({ chiave: id, nome: p.nome, reparto: p.reparto, tipo: 'conta', confezioni: n,
                   aggiunta: n * p.confezione, testo: testoConfezioni(p, n) });
    } else {
      righe.push({ chiave: id, nome: p.nome, reparto: p.reparto, tipo: 'conta', confezioni: null,
                   aggiunta: mancante, testo: fmtNumero(mancante) + ' ' + p.unita });
    }
  });
  fab.serve.forEach(id => {
    if (!manca(dispensa, id)) return;
    const p = catalogo.prodottiPerId[id];
    righe.push({ chiave: id, nome: p.nome, reparto: p.reparto, tipo: 'manca', testo: 'manca' });
  });
  extra.forEach(c => {
    const chiave = 'custom_' + c.id;
    const mancante = arrotonda6((c.need || 0) - quantitaIn(dispensa, chiave));
    if (mancante <= 0) return;
    const conf = c.storeSize || 1;
    const n = Math.ceil(mancante / conf);
    righe.push({ chiave, nome: c.name, reparto: c.category || '➕ Extra', tipo: 'extra', confezioni: n,
                 aggiunta: n * conf, testo: n + ' × ' + conf + ' ' + (c.unit || 'pz') });
  });
  return righe;
}

function spesaFatta(righe) {
  return scriviDispensa(d => {
    righe.forEach(r => {
      if (r.tipo === 'manca') d.quantita[r.chiave] = true;
      else d.quantita[r.chiave] = arrotonda6(quantitaIn(d, r.chiave) + r.aggiunta);
    });
  });
}

// ==================== IMPORT / EXPORT ====================
// Codici v2: prefisso MP2_ (copia) o MP2D_ (Telegram, compresso). L'app v11 li rifiuta perché
// "_" non è base64. Si leggono anche i codici vecchi: base64 semplice e DEFLATE_.

async function compressToBase64(dataObj) {
  const jsonStr = JSON.stringify(dataObj);
  const stream = new Blob([jsonStr]).stream().pipeThrough(new CompressionStream('deflate'));
  const blob = await new Response(stream).blob();
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

async function decompressFromBase64(b64) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate'));
  const text = await new Response(stream).text();
  return JSON.parse(text);
}

async function decodificaCodice(codice) {
  if (codice.startsWith('MP2D_')) return decompressFromBase64(codice.substring(5));
  if (codice.startsWith('MP2_')) return JSON.parse(decodeURIComponent(atob(codice.substring(4))));
  if (codice.startsWith('DEFLATE_')) return decompressFromBase64(codice.substring(8));
  const testo = atob(codice);
  try {
    return JSON.parse(decodeURIComponent(testo));
  } catch (e) {
    return JSON.parse(testo); // codici delle prime versioni: base64 del JSON, senza encodeURIComponent
  }
}

function tipoCodice(dati) {
  if (!dati || typeof dati !== 'object') return null;
  if (dati.v === 2 && dati.dispensa && typeof dati.dispensa === 'object') return 'v2';
  if (dati.v !== 2 && dati.inventory && typeof dati.inventory === 'object') return 'v1';
  return null;
}

// null se la migrazione è ancora da fare e manca il catalogo: l'export sarebbe vuoto.
function datiExport() {
  if (!assicuraMigrazione()) return null;
  return { v: 2, piano: leggiJSON(CHIAVI.piano, {}), dispensa: leggiDispensa(), customs: leggiExtra() };
}

const codiceCopia = dati => 'MP2_' + btoa(encodeURIComponent(JSON.stringify(dati)));
const codiceTelegram = async dati => 'MP2D_' + await compressToBase64(dati);

// Restituisce un messaggio per l'utente. chiediConferma è una funzione (di solito confirm).
async function importaCodice(codice, chiediConferma) {
  let dati;
  try {
    dati = await decodificaCodice(codice.trim());
  } catch (e) {
    return 'Codice non valido.';
  }
  const tipo = tipoCodice(dati);
  if (!tipo) return 'Codice non valido: non è un backup del piano pasti.';
  if (tipo === 'v1' && !catalogo) return MSG_SENZA_CATALOGO;
  if (!assicuraMigrazione()) return MSG_SENZA_CATALOGO;
  if (!chiediConferma('Importando questi dati sovrascriverai dispensa e prodotti extra' +
                      (tipo === 'v2' ? ' e il piano' : '') + '. Continuare?')) return null;
  const customs = Array.isArray(dati.customs) ? dati.customs : [];
  if (tipo === 'v2') {
    const d = dati.dispensa;
    scriviJSON(CHIAVI.piano, (dati.piano && typeof dati.piano === 'object') ? dati.piano : {});
    scriviJSON(CHIAVI.dispensa, {
      quantita: (d.quantita && typeof d.quantita === 'object') ? d.quantita : {},
      note: typeof d.note === 'string' ? d.note : ''
    });
  } else {
    scriviJSON(CHIAVI.dispensa, migraInventarioV1(dati.inventory, catalogo));
  }
  scriviJSON(CHIAVI.extra, customs);
  scriviJSON(CHIAVI.spesa, []); // le spunte della lista valevano per la dispensa di prima
  return 'Dati importati.';
}

// ==================== INTERFACCIA: COMUNE ====================
// Grafica e flussi del mockup della decisione 0001. I pulsanti dicono cosa fanno con data-azione
// (vedi AZIONI in fondo), più gli altri data-* che servono.
function esc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const $ = id => document.getElementById(id);
const attr = (nome, valore) => 'data-' + nome + '="' + esc(valore) + '"';
const icona = r => r.icona || '🍽️';
const testoGiorni = n => fmtNumero(n) + (n === 1 ? ' giorno' : ' giorni');
const tondo = (n, passo) => typeof n === 'number' ? String(Math.round(n / passo) * passo) : '?';
const kcalTesto = n => tondo(n, 10);
const grammiTesto = n => tondo(n, 1);
const kcalTonde = (ricetta, porzioni) => kcalTesto(kcalAPasto(ricetta, porzioni));

function riquadroNutrizione(n) {
  const voce = (valore, etichetta) => '<div><b class="num">' + valore + '</b><span>' + etichetta + '</span></div>';
  const valori = n.calcolata
    ? voce(kcalTesto(n.kcal), 'kcal') + voce(grammiTesto(n.proteine) + ' g', 'proteine') +
      voce(grammiTesto(n.carboidrati) + ' g', 'carboidrati') + voce(grammiTesto(n.grassi) + ' g', 'grassi')
    : voce(kcalTesto(n.kcal), 'kcal') + voce(grammiTesto(n.proteine) + ' g', 'proteine');
  return '<div class="macro">' + valori + '</div>' +
    (n.calcolata ? '' : '<div class="macro-nota"><span class="warn">⚠</span> Scritti a mano: mancano i valori di ' +
      esc(n.mancanti.join(', ')) + '</div>');
}
const mappaPiano = piano => new Map(piattiDelPiano(piano).map(x => [x.ricetta.id, x.porzioni]));

function stepper(azione, attributi, valore) {
  const b = (verso, segno, nome) =>
    '<button data-azione="' + azione + '" ' + attributi + ' data-verso="' + verso + '" aria-label="' + nome + '">' + segno + '</button>';
  return '<div class="stepper">' + b(-1, '−', 'Meno') + '<output>' + esc(valore) + '</output>' + b(1, '+', 'Più') + '</div>';
}

let timerToast = null;

function toast(messaggio) {
  document.querySelectorAll('.toast').forEach(t => t.remove());
  const t = document.createElement('div');
  t.className = 'toast';
  t.setAttribute('role', 'status');
  t.textContent = messaggio;
  document.body.appendChild(t);
  clearTimeout(timerToast);
  timerToast = setTimeout(() => t.remove(), 2400);
}

const TITOLI = { ricette: 'Ricette', piano: 'Piano', spesa: 'Spesa' };
let schedaAttiva = TITOLI[location.hash.slice(1)] ? location.hash.slice(1) : 'ricette';

function mostraScheda(nome) {
  schedaAttiva = nome;
  try { history.replaceState(history.state, '', '#' + nome); } catch (e) {}
  disegna();
  window.scrollTo(0, 0);
}

function disegna() {
  Object.keys(TITOLI).forEach(t => { $('v-' + t).hidden = t !== schedaAttiva; });
  document.querySelectorAll('.tabbar [data-scheda]').forEach(b => b.classList.toggle('on', b.dataset.scheda === schedaAttiva));
  $('titolo').textContent = TITOLI[schedaAttiva];
  if (!catalogo) return;
  const spesa = statoSpesa();
  const daPrendere = spesa.righe.length - spesa.spuntate.size;
  $('badge-spesa').hidden = !daPrendere;
  $('badge-spesa').textContent = daPrendere;
  if (schedaAttiva === 'ricette') disegnaRicette();
  if (schedaAttiva === 'piano') disegnaPiano();
  if (schedaAttiva === 'spesa') disegnaSpesa(spesa);
}

// Pagine a tutto schermo e fogli dal basso: uno alla volta, e il tasto indietro del telefono li chiude.
function segnaOverlay(id) {
  document.body.classList.add('con-overlay');
  if (!history.state || !history.state.overlay) history.pushState({ overlay: id }, '');
  else history.replaceState({ overlay: id }, '');
}

const togliFoglio = () => document.querySelectorAll('.scrim').forEach(o => o.remove());

function apriPagina(id) {
  togliFoglio();
  document.querySelectorAll('.sheet-full').forEach(o => { o.hidden = o.id !== id; });
  $(id).scrollTop = 0;
  segnaOverlay(id);
}

function apriFoglio(html) {
  togliFoglio();
  const o = document.createElement('div');
  o.className = 'scrim';
  o.innerHTML = '<div class="bsheet" role="dialog"><div class="wrap"><div class="grab"></div>' + html + '</div></div>';
  o.addEventListener('click', e => { if (e.target === o) chiudiOverlay(); });
  document.body.appendChild(o);
  segnaOverlay('foglio');
}

function chiudiOverlay() {
  if (history.state && history.state.overlay) history.back();
  else nascondiOverlay();
}

function nascondiOverlay() {
  togliFoglio();
  document.querySelectorAll('.sheet-full').forEach(o => { o.hidden = true; });
  document.body.classList.remove('con-overlay');
  ricettaAperta = null;
  extraInModifica = null;
  rilasciaSchermo();
  disegna();
}

// Dopo un ricaricamento con un pannello aperto lo stato resta nella cronologia, ma il pannello no.
if (history.state && history.state.overlay) history.replaceState(null, '');

window.addEventListener('popstate', () => {
  if (!history.state || !history.state.overlay) nascondiOverlay();
});

function menu() {
  apriFoglio('<h3>Menu</h3>' +
    '<button class="menu-item" data-azione="pagina-backup">Backup</button>' +
    '<button class="menu-item" data-azione="pagina-extra">Prodotti extra</button>' +
    '<a class="menu-item" href="workout.html">Allenamenti</a>');
}

// ==================== SCHEDA RICETTE ====================
function rigaRicetta(r, nelPiano, azione) {
  const porzioni = nelPiano.get(r.id);
  const etichetta = porzioni !== undefined
    ? '<span class="pill in num">nel piano · ' + fmtNumero(porzioni) + '</span>'
    : (azione === 'scegli-piatto' ? '<span class="pill num">' + fmtNumero(r.porzioni) + '</span>'
      : (r.base && r.base.length ? '<span class="pill">' + esc(r.base.join(', ')) + '</span>' : '<span></span>'));
  return '<button class="rec" data-azione="' + azione + '" ' + attr('id', r.id) + '>' +
    '<span class="emo">' + esc(icona(r)) + '</span>' +
    '<span><div class="name">' + esc(r.nome) + '</div>' +
      '<div class="meta num">' + kcalTesto(r.nutrizione.kcal) + ' kcal · ' + grammiTesto(r.nutrizione.proteine) + ' g proteine' +
      (r.provata ? '' : ' · <span class="da-provare">da provare</span>') + '</div></span>' +
    etichetta + '</button>';
}

function gruppoRicette(titolo, ricette, nelPiano, azione) {
  if (!ricette.length) return '';
  return '<div><h2 class="sec-title">' + titolo + ' <span class="num">' + ricette.length + '</span></h2>' +
    '<div class="rec-list">' + ricette.map(r => rigaRicetta(r, nelPiano, azione)).join('') + '</div></div>';
}

// Gruppi come la scheda Piano (decisione 0006): la casella di Notion conta solo come partenza del piano.
function disegnaRicette() {
  const piatti = piattiDelPiano(leggiPiano());
  const nelPiano = new Map(piatti.map(x => [x.ricetta.id, x.porzioni]));
  $('v-ricette').innerHTML =
    gruppoRicette('Nel piano', piatti.map(x => x.ricetta), nelPiano, 'apri') +
    gruppoRicette('Altre ricette', catalogo.ricette.filter(r => !nelPiano.has(r.id)), nelPiano, 'apri');
}

// ==================== SCHEDA PIANO ====================
const passoOgniGiorno = p => p.unita === 'pz' ? 1 : 50;

function disegnaPiano() {
  const piano = leggiPiano();
  const piatti = piattiDelPiano(piano);
  const giorni = giorniDelPiano(piano);
  const porzioni = piatti.reduce((tot, x) => tot + x.porzioni, 0);

  const righe = piatti.map(({ ricetta, porzioni }) =>
    '<div class="plan-row"><div class="emo">' + esc(icona(ricetta)) + '</div>' +
      '<button class="info" data-azione="apri" ' + attr('id', ricetta.id) + '>' +
        '<div class="name">' + esc(ricetta.nome) + '</div>' +
        '<div class="sub num">≈ ' + kcalTonde(ricetta, porzioni) + ' kcal a pasto</div></button>' +
      stepper('porzioni', attr('id', ricetta.id), fmtNumero(porzioni)) +
    '</div>').join('');

  const ogniGiorno = piano.ogniGiorno.map((x, i) => {
    const p = catalogo.prodottiPerId[x.prodotto];
    if (!p) return '';
    return '<div class="daily"><div><div>' + esc(p.nome) + '</div>' +
        '<div class="sub num">' + testoGiorni(giorni) + ': ' + fmtQuantita(x.quantita * giorni, p.unita) + '</div></div>' +
      stepper('ogni-giorno', attr('i', i), fmtQuantita(x.quantita, p.unita)) + '</div>';
  }).join('');

  $('v-piano').innerHTML =
    '<div class="summary">' +
      '<div class="s"><b class="num">' + fmtNumero(giorni) + '</b> ' + (giorni === 1 ? 'giorno' : 'giorni') + '</div>' +
      '<div class="s"><b class="num">' + fmtNumero(porzioni) + '</b> porzioni</div></div>' +
    '<div><h2 class="sec-title">Da cucinare</h2><div class="plan-list">' +
      (righe || '<div class="empty">Il piano è vuoto.</div>') +
      '<button class="add-btn" data-azione="aggiungi-piatto">+ Aggiungi piatto</button></div></div>' +
    '<div><h2 class="sec-title">Ogni giorno</h2><div class="card">' + ogniGiorno +
      '<button class="daily-add" data-azione="aggiungi-ogni-giorno">+ Aggiungi</button></div></div>';
}

function cambiaPorzioniPiano(id, verso) {
  const ricetta = catalogo.ricettePerId[id];
  if (!ricetta) return;
  const v = arrotonda1(porzioniNelPiano(leggiPiano(), ricetta) + 0.1 * verso);
  impostaPorzioni(ricetta, v);
  disegna();
  if (v <= 0) toast(ricetta.nome + ': tolta dal piano');
}

function foglioAggiungiPiatto() {
  const nelPiano = mappaPiano(leggiPiano());
  const fuori = catalogo.ricette.filter(r => !nelPiano.has(r.id));
  const html =
    gruppoRicette('Dalla rotazione', fuori.filter(r => r.rotazione), nelPiano, 'scegli-piatto') +
    gruppoRicette('Altre ricette', fuori.filter(r => !r.rotazione), nelPiano, 'scegli-piatto');
  apriFoglio('<h3>Aggiungi al piano</h3>' + (html || '<div class="empty">Sono già tutte nel piano.</div>'));
}

function scegliPiatto(id) {
  const ricetta = catalogo.ricettePerId[id];
  if (!ricetta) return;
  aggiungiAlPiano(ricetta);
  chiudiOverlay();
  toast(ricetta.nome + ': nel piano');
}

function cambiaOgniGiorno(i, verso) {
  const piano = leggiPiano();
  const x = piano.ogniGiorno[i];
  const p = x && catalogo.prodottiPerId[x.prodotto];
  if (!p) return;
  x.quantita = Math.max(0, arrotonda1(x.quantita + verso * passoOgniGiorno(p)));
  if (x.quantita === 0) piano.ogniGiorno.splice(i, 1);
  scriviPiano(piano);
  disegna();
}

function foglioAggiungiOgniGiorno() {
  const giaUsati = new Set(leggiPiano().ogniGiorno.map(x => x.prodotto));
  const scelta = catalogo.prodotti.filter(p => p.siConta && !giaUsati.has(p.id));
  apriFoglio('<h3>Ogni giorno</h3>' + (scelta.length
    ? scelta.map(p => '<button class="menu-item" data-azione="scegli-ogni-giorno" ' + attr('id', p.id) + '>' + esc(p.nome) + '</button>').join('')
    : '<div class="empty">Ci sono già tutti.</div>'));
}

function scegliOgniGiorno(id) {
  const p = catalogo.prodottiPerId[id];
  if (!p || !p.siConta) return;
  const piano = leggiPiano();
  piano.ogniGiorno.push({ prodotto: id, quantita: passoOgniGiorno(p) });
  scriviPiano(piano);
  chiudiOverlay();
}

// ==================== SCHEDA SPESA ====================
let modoSpesa = null; // 'casa' | 'super'; all'apertura "super" se c'è già qualcosa spuntato
let tuttaLaDispensa = false;

function leggiSpuntateSpesa() {
  const s = leggiJSON(CHIAVI.spesa, []);
  return new Set(Array.isArray(s) ? s : []);
}

function leggiAltro() {
  const a = leggiJSON(CHIAVI.altro, []);
  return Array.isArray(a) ? a.filter(x => x && typeof x.chiave === 'string' && typeof x.nome === 'string') : [];
}

// La lista con le cose scritte a mano, e le righe spuntate.
function statoSpesa() {
  const piano = leggiPiano();
  const dispensa = leggiDispensa();
  const extra = leggiExtra();
  const righe = listaSpesa(piano, dispensa, extra)
    .concat(leggiAltro().map(a => ({ chiave: a.chiave, nome: a.nome, reparto: 'Altro', tipo: 'altro' })));
  // Una spunta vale solo finché la sua riga è in lista: se la riga sparisce senza "Spesa fatta",
  // tornando non deve essere già spuntata.
  const inLista = new Set(righe.map(r => r.chiave));
  const salvate = leggiSpuntateSpesa();
  const spuntate = new Set([...salvate].filter(k => inLista.has(k)));
  if (spuntate.size !== salvate.size) scriviJSON(CHIAVI.spesa, [...spuntate]);
  return { piano, dispensa, extra, righe, spuntate };
}

// [quantità, sotto] di una riga della lista, per esempio ["2 pacchi", "da 500 g"].
function quantitaRiga(r) {
  if (r.tipo === 'extra') return [r.testo, ''];
  if (r.tipo !== 'conta') return ['', ''];
  const p = catalogo.prodottiPerId[r.chiave];
  if (r.confezioni === null) return [fmtQuantita(r.aggiunta, p.unita), ''];
  if (p.tipoConfezione === 'pz' && p.confezione === 1) return [r.confezioni + ' pz', ''];
  return [r.confezioni + ' ' + nomeConfezione(p, r.confezioni), 'da ' + fmtQuantita(p.confezione, p.unita)];
}

const segSpesa = () => '<div class="seg">' +
  '<button data-azione="modo" data-modo="casa" class="' + (modoSpesa === 'casa' ? 'on' : '') + '">A casa</button>' +
  '<button data-azione="modo" data-modo="super" class="' + (modoSpesa === 'super' ? 'on' : '') + '">Al super</button></div>';

const sezione = (titolo, conto, html, classe) => html
  ? '<div' + (classe ? ' class="' + classe + '"' : '') + '><h2 class="sec-title">' + titolo +
    (conto !== '' ? ' <span class="num">' + conto + '</span>' : '') + '</h2>' + html + '</div>'
  : '';

function disegnaSpesa(s) {
  if (modoSpesa === null) modoSpesa = s.spuntate.size ? 'super' : 'casa';
  if (modoSpesa === 'super') disegnaSuper(s); else disegnaCasa(s);
}

function rigaProdotto(p, dispensa, serve, riga) {
  const tag = riga ? '<span class="tag buy num">compra ' + esc(quantitaRiga(riga)[0]) + '</span>'
    : (serve ? '<span class="tag ok">basta</span>' : '');
  return '<div class="prow' + (serve && !riga ? ' covered' : '') + '"><div class="txt">' +
      '<div class="nm">' + esc(p.nome) + '</div>' +
      (serve ? '<div class="from num">servono ' + fmtQuantita(serve, p.unita) + '</div>' : '') + tag + '</div>' +
    stepper('dispensa', attr('id', p.id), testoInDispensa(p, quantitaIn(dispensa, p.id))) + '</div>';
}

function rigaExtra(c, dispensa, riga) {
  const unita = c.unit || 'pz';
  return '<div class="prow"><div class="txt"><div class="nm">' + esc(c.name) + '</div>' +
      '<div class="from num">scorta ' + fmtNumero(c.need || 0) + ' ' + esc(unita) + '</div>' +
      (riga ? '<span class="tag buy num">compra ' + esc(riga.testo) + '</span>' : '') + '</div>' +
    stepper('extra-passo', attr('id', c.id), fmtNumero(quantitaIn(dispensa, 'custom_' + c.id)) + ' ' + unita) + '</div>';
}

function rigaCasa(p, dispensa, sotto) {
  const m = manca(dispensa, p.id);
  return '<button class="item dsp' + (m ? ' missing' : '') + '" data-azione="ce-manca" ' + attr('id', p.id) + '>' +
    '<span class="dot">' + (m ? '!' : '✓') + '</span>' +
    '<span class="txt"><div class="nm">' + esc(p.nome) + '</div>' + (sotto ? '<div class="from">' + esc(sotto) + '</div>' : '') + '</span>' +
    (m ? '<span class="tag buy">manca</span>' : '<span class="tag muted">c\'è</span>') + '</button>';
}

function testoUsi(u) {
  const unita = Object.keys(u).filter(k => k !== 'q.b.');
  return unita.length ? 'servono ' + unita.map(k => fmtQuantita(u[k], k)).join(' + ') : '';
}

function disegnaCasa(s) {
  const fab = fabbisogno(s.piano);
  const daComprare = new Map(s.righe.filter(r => r.tipo === 'conta').map(r => [r.chiave, r]));
  const perReparti = pp => pp.sort((a, b) => confrontaReparti(a.reparto, b.reparto));
  const delPiano = perReparti(catalogo.prodotti.filter(p => fab.quantita[p.id] > 0));
  const compra = delPiano.filter(p => daComprare.has(p.id));
  const basta = delPiano.filter(p => !daComprare.has(p.id));
  const extraSotto = s.righe.filter(r => r.tipo === 'extra');
  const usi = usiCoseDiCasa(s.piano);
  const diCasa = perReparti(catalogo.prodotti.filter(p => fab.serve.has(p.id)));
  const mancano = diCasa.filter(p => manca(s.dispensa, p.id)).length;

  // Divise per reparto come "Al super": [{reparto, html}] -> righe con le intestazioni.
  const perCategorie = voci => perReparto(voci, v => v.reparto).map(([reparto, vv]) =>
    '<div class="rep">' + esc(reparto) + '</div>' + vv.map(v => v.html).join('')).join('');
  const righeCompra = perCategorie(
    compra.map(p => ({ reparto: p.reparto, html: rigaProdotto(p, s.dispensa, fab.quantita[p.id], daComprare.get(p.id)) }))
      .concat(extraSotto.map(r => {
        const c = s.extra.find(x => 'custom_' + x.id === r.chiave);
        return c ? { reparto: r.reparto, html: rigaExtra(c, s.dispensa, r) } : null;
      }).filter(Boolean)));

  const tutta = perReparto(catalogo.prodotti, p => p.reparto).map(([reparto, pp]) =>
      '<div class="rep">' + esc(reparto) + '</div>' +
      pp.map(p => p.siConta ? rigaProdotto(p, s.dispensa, null, null) : rigaCasa(p, s.dispensa, '')).join('')).join('') +
    (s.extra.length ? '<div class="rep">Prodotti extra</div>' + s.extra.map(c => rigaExtra(c, s.dispensa, null)).join('') : '');

  $('v-spesa').innerHTML = segSpesa() +
    sezione('Da comprare', compra.length + extraSotto.length, righeCompra ? '<div class="items">' + righeCompra + '</div>' : '') +
    sezione('Ce l\'hai già', basta.length, basta.length
      ? '<div class="items">' + perCategorie(basta.map(p => ({ reparto: p.reparto, html: rigaProdotto(p, s.dispensa, fab.quantita[p.id], null) }))) + '</div>' : '') +
    sezione('Spezie e cose di casa', mancano ? (mancano === 1 ? '1 manca' : mancano + ' mancano') : 'tutto in casa', diCasa.length
      ? '<div class="items">' + diCasa.map(p => rigaCasa(p, s.dispensa, testoUsi(usi[p.id] || {}))).join('') + '</div>' : '') +
    '<details class="rest" id="tutta-dispensa"' + (tuttaLaDispensa ? ' open' : '') + '><summary><h2 class="sec-title">Tutta la dispensa</h2></summary>' +
      '<div class="items">' + tutta + '</div></details>' +
    (s.dispensa.note ? sezione('Note', '', '<textarea id="spesa-note" class="field"></textarea>') : '') +
    '<button class="btn block" data-azione="modo" data-modo="super">Vado a fare la spesa</button>';

  $('tutta-dispensa').addEventListener('toggle', e => { tuttaLaDispensa = e.target.open; });
  const note = $('spesa-note');
  if (note) note.value = s.dispensa.note;
}

function disegnaSuper(s) {
  const prese = s.righe.filter(r => s.spuntate.has(r.chiave));
  const daPrendere = s.righe.filter(r => !s.spuntate.has(r.chiave));
  const pct = s.righe.length ? Math.round(prese.length / s.righe.length * 100) : 0;
  const riga = r => {
    const [q, sotto] = quantitaRiga(r);
    const preso = s.spuntate.has(r.chiave);
    const destra = r.tipo === 'altro'
      ? '<span class="icon-btn" data-azione="togli-altro" ' + attr('chiave', r.chiave) + ' aria-label="Togli">✕</span>'
      : (q ? '<span class="q">' + esc(q) + (sotto ? '<small>' + esc(sotto) + '</small>' : '') + '</span>' : '<span></span>');
    return '<button class="item' + (preso ? ' taken' : '') + '" data-azione="prendi" ' + attr('chiave', r.chiave) + '>' +
      '<span class="dot">' + (preso ? '✓' : '') + '</span>' +
      '<span class="txt"><div class="nm">' + esc(r.nome) + '</div>' + (r.tipo === 'manca' ? '<div class="from">manca</div>' : '') + '</span>' +
      destra + '</button>';
  };
  const perNome = (a, b) => a.nome.localeCompare(b.nome, 'it');

  $('v-spesa').innerHTML = segSpesa() +
    '<div class="progress"><div class="row"><span class="big num">' + prese.length + ' su ' + s.righe.length + '</span>' +
      '<span class="lbl">nel carrello</span></div><div class="bar"><i style="width:' + pct + '%"></i></div></div>' +
    (s.righe.length ? '' : '<div class="empty">Non manca niente.</div>') +
    perReparto(daPrendere.sort(perNome), r => r.reparto).map(([reparto, rr]) =>
      sezione(esc(reparto), '', '<div class="items">' + rr.map(riga).join('') + '</div>', 'shop')).join('') +
    sezione('Nel carrello', '', prese.length ? '<div class="items">' + prese.map(riga).join('') + '</div>' : '', 'shop') +
    '<form class="extra-form" id="form-altro"><input class="field" id="altro-nome" placeholder="Aggiungi altro" autocomplete="off">' +
      '<button class="btn" type="submit" aria-label="Aggiungi">+</button></form>' +
    (prese.length ? '<button class="btn block" data-azione="spesa-fatta">Spesa fatta, metti in dispensa</button>' : '');
}

function cambiaModoSpesa(modo) {
  modoSpesa = modo;
  disegna();
  window.scrollTo(0, 0);
}

function spuntaSpesa(chiave) {
  const s = leggiSpuntateSpesa();
  if (s.has(chiave)) s.delete(chiave); else s.add(chiave);
  scriviJSON(CHIAVI.spesa, [...s]);
  disegna();
}

function aggiungiAltro(nome) {
  const altro = leggiAltro();
  altro.push({ chiave: 'altro_' + Date.now(), nome });
  scriviJSON(CHIAVI.altro, altro);
  disegna();
}

function togliAltro(chiave) {
  scriviJSON(CHIAVI.altro, leggiAltro().filter(a => a.chiave !== chiave));
  disegna();
}

function confermaSpesaFatta() {
  const s = statoSpesa();
  const prese = s.righe.filter(r => s.spuntate.has(r.chiave));
  if (!prese.length) return;
  if (!spesaFatta(prese.filter(r => r.tipo !== 'altro'))) return;
  scriviJSON(CHIAVI.altro, leggiAltro().filter(a => !s.spuntate.has(a.chiave)));
  scriviJSON(CHIAVI.spesa, []);
  modoSpesa = 'casa';
  disegna();
  window.scrollTo(0, 0);
  toast(prese.length === 1 ? '1 prodotto in dispensa' : prese.length + ' prodotti in dispensa');
}

function correggiDispensa(id, verso) {
  const p = catalogo.prodottiPerId[id];
  if (!p) return;
  // Senza confezione su Notion si corregge nell'unità del prodotto.
  const passo = p.confezione ? passoConfezioni(p) * p.confezione : passoOgniGiorno(p);
  if (scriviDispensa(d => { d.quantita[id] = aPasso(quantitaIn(d, id), passo, verso); })) disegna();
}

function cambiaCeManca(id) {
  if (scriviDispensa(d => { d.quantita[id] = manca(d, id); })) disegna();
}

const passoExtra = c => ['g', 'ml', 'kg', 'L'].includes(c.unit) ? (c.storeSize || 1) / 4 : 1;

function correggiExtra(idExtra, verso) {
  const c = leggiExtra().find(x => x.id === idExtra);
  if (!c) return;
  const chiave = 'custom_' + idExtra;
  if (scriviDispensa(d => { d.quantita[chiave] = aPasso(quantitaIn(d, chiave), passoExtra(c), verso); })) disegna();
}

// Si salva a ogni tasto: con un ritardo, un −/+ nel frattempo ridisegnerebbe il testo vecchio.
function salvaNote(testo) {
  scriviDispensa(d => { d.note = testo; });
}

// ==================== BACKUP ====================
function paginaBackup() {
  $('backup-corpo').innerHTML =
    '<textarea id="sync-area" class="field" placeholder="Codice"></textarea>' +
    '<div class="due">' +
      '<button class="btn ghost" data-azione="copia">Copia codice</button>' +
      '<button class="btn ghost" data-azione="importa">Importa</button>' +
    '</div>' +
    '<button class="btn block" data-azione="telegram">Backup Telegram</button>';
  apriPagina('backup');
}

function esportaCodice() {
  const dati = datiExport();
  if (!dati) { toast(MSG_SENZA_CATALOGO); return; }
  const codice = codiceCopia(dati);
  const area = $('sync-area');
  area.value = codice;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(codice)
      .then(() => toast('Codice copiato'))
      .catch(() => fallbackCopy(area));
  } else {
    fallbackCopy(area);
  }
}

function fallbackCopy(area) {
  area.select();
  area.setSelectionRange(0, 999999);
  try {
    document.execCommand('copy');
    toast('Codice copiato');
  } catch (err) {
    toast('Codice pronto: copialo dal riquadro');
  }
}

async function importaDaArea() {
  const area = $('sync-area');
  if (!area.value.trim()) { toast('Incolla prima un codice'); return; }
  const esito = await importaCodice(area.value, msg => confirm(msg));
  if (esito === null) return;
  toast(esito);
  if (esito === 'Dati importati.') area.value = '';
}

async function backupTelegram() {
  const dati = datiExport();
  if (!dati) { toast(MSG_SENZA_CATALOGO); return; }
  const codice = await codiceTelegram(dati);
  const testo = '/backup_mealplan ' + codice;
  window.open('https://t.me/botchecontaimessaggibot?text=' + encodeURIComponent(testo), '_blank');
}

// ==================== PRODOTTI EXTRA ====================
let extraInModifica = null;

function paginaExtra() {
  disegnaExtra();
  apriPagina('extra');
}

function disegnaExtra() {
  const extra = leggiExtra();
  const dispensa = leggiDispensa();
  // Le categorie del modulo di prima, più quelle già usate
  const categorie = [...new Set(['🧊 Frigo / Freezer', '🌾 Secchi', '🫙 Liquidi', '➕ Extra',
    ...extra.map(c => c.category).filter(Boolean)])];
  const lista = extra.map(c =>
    '<div class="prow"><div class="txt"><div class="nm">' + esc(c.name) + '</div>' +
      '<div class="from num">' + esc(c.category || '➕ Extra') + ' · scorta ' + fmtNumero(c.need || 0) + ' ' + esc(c.unit || 'pz') +
      ' · in casa ' + fmtNumero(quantitaIn(dispensa, 'custom_' + c.id)) + '</div></div>' +
      '<button class="icon-btn" data-azione="modifica-extra" ' + attr('id', c.id) + ' aria-label="Modifica">✎</button></div>').join('');
  const campo = (etichetta, id, tipo, extraAttr) =>
    '<label>' + etichetta + '<input class="field" id="' + id + '" type="' + tipo + '"' + (extraAttr || '') + '></label>';

  $('extra-corpo').innerHTML =
    (lista ? '<div class="items">' + lista + '</div>' : '') +
    '<div><h2 class="sec-title">' + (extraInModifica ? 'Modifica' : 'Nuovo prodotto') + '</h2>' +
    '<div class="form" id="form-extra">' +
      campo('Nome', 'cf-nome', 'text') +
      campo('Categoria', 'cf-categoria', 'text', ' list="cf-categorie"') +
      '<datalist id="cf-categorie">' + categorie.map(c => '<option value="' + esc(c) + '">').join('') + '</datalist>' +
      '<div class="due">' +
        campo('Unità', 'cf-unita', 'text', ' list="cf-unita-lista" placeholder="g"') +
        campo('Confezione', 'cf-confezione', 'number', ' min="0" step="any"') +
      '</div>' +
      '<datalist id="cf-unita-lista">' + ['g', 'ml', 'pz', 'barattolo', 'confezioni', 'rotoli'].map(u => '<option value="' + u + '">').join('') + '</datalist>' +
      '<div class="due">' +
        campo('Scorta minima', 'cf-scorta', 'number', ' min="0" step="any"') +
        campo('In casa', 'cf-in-casa', 'number', ' min="0" step="any"') +
      '</div>' +
      '<div class="btns">' +
        '<button class="btn block" data-azione="salva-extra">' + (extraInModifica ? 'Salva' : 'Aggiungi') + '</button>' +
        (extraInModifica
          ? '<button class="btn ghost block" data-azione="annulla-extra">Annulla</button>' +
            '<button class="btn danger block" data-azione="elimina-extra">Elimina</button>'
          : '') +
      '</div>' +
    '</div></div>';

  if (extraInModifica) {
    const c = extra.find(x => x.id === extraInModifica);
    if (c) {
      $('cf-nome').value = c.name || '';
      $('cf-categoria').value = c.category || '';
      $('cf-unita').value = c.unit || '';
      $('cf-confezione').value = c.storeSize || '';
      $('cf-scorta').value = c.need || 0;
      $('cf-in-casa').value = quantitaIn(dispensa, 'custom_' + c.id);
    }
  }
}

function modificaExtra(id) {
  extraInModifica = id;
  disegnaExtra();
  $('form-extra').scrollIntoView({ behavior: 'smooth' });
}

function salvaFormExtra() {
  const val = id => $(id).value.trim();
  const num = id => parseFloat(val(id).replace(',', '.'));
  const nome = val('cf-nome');
  if (!nome) { toast('Scrivi il nome del prodotto'); return; }
  const id = extraInModifica || Date.now();
  const voce = {
    id, name: nome, unit: val('cf-unita') || 'pz',
    storeSize: num('cf-confezione') > 0 ? num('cf-confezione') : 1,
    need: num('cf-scorta') >= 0 ? num('cf-scorta') : 0,
    category: val('cf-categoria') || '➕ Extra'
  };
  const inCasa = num('cf-in-casa') >= 0 ? num('cf-in-casa') : 0;
  const ok = salvaExtraEDispensa(
    extra => {
      const i = extra.findIndex(x => x.id === id);
      if (i >= 0) extra[i] = voce; else extra.push(voce);
    },
    d => { d.quantita['custom_' + id] = inCasa; }
  );
  if (ok) { extraInModifica = null; disegnaExtra(); toast(nome + ': salvato'); }
}

function eliminaExtra() {
  const id = extraInModifica;
  if (!id || !confirm('Eliminare questo prodotto?')) return;
  const ok = salvaExtraEDispensa(
    extra => { const i = extra.findIndex(x => x.id === id); if (i >= 0) extra.splice(i, 1); },
    d => { delete d.quantita['custom_' + id]; }
  );
  if (ok) { extraInModifica = null; disegnaExtra(); }
}

// ==================== SCHEDA RICETTA ====================
let ricettaAperta = null; // {ricetta, porzioni}; porzioni vale solo finché la ricetta è fuori dal piano

function inPiano(ricetta) {
  return mappaPiano(leggiPiano()).has(ricetta.id);
}

// Nel piano le porzioni sono quelle del piano: cambiarle qui le cambia anche lì.
function porzioniScheda() {
  const p = mappaPiano(leggiPiano()).get(ricettaAperta.ricetta.id);
  return p !== undefined ? p : ricettaAperta.porzioni;
}

function apriRicetta(id) {
  const ricetta = catalogo.ricettePerId[id];
  if (!ricetta) return;
  ricettaAperta = { ricetta, porzioni: ricetta.porzioni };
  disegnaRicetta();
  apriPagina('scheda');
  tieniSchermoAcceso();
}

function leggiSpunte(id) {
  const tutte = leggiJSON(CHIAVI.cucina, {}) || {};
  const s = tutte[id] || {};
  return { ing: Array.isArray(s.ing) ? s.ing : [], passi: Array.isArray(s.passi) ? s.passi : [] };
}

function spunta(tipo, indice) {
  const id = ricettaAperta.ricetta.id;
  const tutte = leggiJSON(CHIAVI.cucina, {}) || {};
  const s = leggiSpunte(id);
  const lista = s[tipo];
  const pos = lista.indexOf(indice);
  if (pos >= 0) lista.splice(pos, 1); else lista.push(indice);
  tutte[id] = s;
  scriviJSON(CHIAVI.cucina, tutte);
  disegnaRicetta();
}

function azzeraSpunte(id) {
  const tutte = leggiJSON(CHIAVI.cucina, {}) || {};
  delete tutte[id];
  scriviJSON(CHIAVI.cucina, tutte);
}

function cambiaPorzioniScheda(verso) {
  const v = Math.max(0.1, arrotonda1(porzioniScheda() + 0.1 * verso));
  if (inPiano(ricettaAperta.ricetta)) impostaPorzioni(ricettaAperta.ricetta, v);
  else ricettaAperta.porzioni = v;
  disegnaRicetta();
}

function testoQuantita(ing, porzioni) {
  if (ing.quantita === null) return esc(ing.unita || 'q.b.');
  const q = ing.quantita * porzioni;
  const p = ing.prodotto && catalogo.prodottiPerId[ing.prodotto];
  // Panetti e lattine si contano a pezzi: oltre ai grammi, quanti ne apri.
  const conf = p && p.confezione && ['panetto', 'lattina'].includes(p.tipoConfezione) && ing.unita === p.unita
    ? '<small>' + fmtNumero(q / p.confezione) + ' ' + esc(nomeConfezione(p, arrotonda1(q / p.confezione))) + '</small>' : '';
  return esc(fmtQuantita(q, ing.unita)) + conf;
}

// "Riso. Cuoci il riso…": la parte prima del primo punto, se è corta, è il titolo del passo.
function testoPasso(testo) {
  const m = /^([^.]{1,40})\.\s+([\s\S]*)$/.exec(testo);
  return m ? '<b>' + esc(m[1]) + '.</b> ' + esc(m[2]) : esc(testo);
}

const sottoPunti = x => Array.isArray(x.sotto) && x.sotto.length
  ? '<ul class="sotto">' + x.sotto.map(t => '<li>' + esc(t) + '</li>').join('') + '</ul>' : '';

function disegnaRicetta() {
  const { ricetta } = ricettaAperta;
  const porzioni = porzioniScheda();
  const nelPiano = inPiano(ricetta);
  const s = leggiSpunte(ricetta.id);
  const corrente = ricetta.passi.findIndex((_, i) => !s.passi.includes(i));
  const scroll = $('scheda').scrollTop;
  $('scheda-titolo').textContent = ricetta.nome;

  const ingredienti = ricetta.ingredienti.map((ing, i) =>
    '<button class="ing' + (s.ing.includes(i) ? ' done' : '') + '" data-azione="spunta" data-tipo="ing" data-i="' + i + '">' +
      '<span class="dot"></span>' +
      '<span><span class="nm">' + esc(ing.nome) + '</span>' +
        (ing.facoltativo ? '<span class="opt">facoltativo</span>' : '') +
        (unitaDiversa(ing) ? '<span class="warn" title="Unità diversa dal prodotto: non conta in dispensa">⚠</span>' : '') +
        (ing.nota ? '<div class="nota">' + esc(ing.nota) + '</div>' : '') + '</span>' +
      '<span class="q">' + testoQuantita(ing, porzioni) + '</span></button>').join('');

  const passi = ricetta.passi.map((p, i) => {
    const fatto = s.passi.includes(i);
    return '<button class="step' + (fatto ? ' done' : '') + (i === corrente ? ' cur' : '') + '" data-azione="spunta" data-tipo="passi" data-i="' + i + '">' +
      '<span class="n">' + (fatto ? '✓' : i + 1) + '</span><div><p>' + testoPasso(p.testo) + '</p>' + sottoPunti(p) + '</div></button>';
  }).join('');

  const note = ricetta.note.length
    ? '<div><h2 class="sec-title">Note</h2><ul class="notes">' +
      ricetta.note.map(n => '<li>' + esc(n.testo) + sottoPunti(n) + '</li>').join('') + '</ul></div>'
    : '';

  $('scheda-corpo').innerHTML =
    '<div class="rhero"><span class="emo">' + esc(icona(ricetta)) + '</span><h2>' + esc(ricetta.nome) + '</h2>' +
      (ricetta.provata ? '' : '<div class="meta"><span class="da-provare">da provare</span></div>') +
      '<div class="meta">A porzione</div>' + riquadroNutrizione(ricetta.nutrizione) +
      (ricetta.descrizione ? '<p class="desc">' + esc(ricetta.descrizione) + '</p>' : '') + '</div>' +
    '<div class="porz-bar"><span class="lbl"><b class="num">' + fmtNumero(porzioni) + ' porzioni</b>' +
        '<span class="num">≈ ' + kcalTonde(ricetta, porzioni) + ' kcal a pasto</span></span>' +
      stepper('porzioni-scheda', '', fmtNumero(porzioni)) + '</div>' +
    '<div><h2 class="sec-title">Ingredienti</h2><div class="card">' + ingredienti + '</div></div>' +
    (passi ? '<div><h2 class="sec-title">Procedimento</h2><div class="steps">' + passi + '</div></div>' : '') +
    note +
    '<div class="btns">' + (nelPiano
      ? '<button class="btn block" data-azione="cucinata">Cucinata</button>' +
        '<button class="btn ghost block" data-azione="togli-dal-piano">Togli dal piano</button>'
      : '<button class="btn block" data-azione="aggiungi-al-piano">Aggiungi al piano</button>' +
        '<button class="btn ghost block" data-azione="cucinata">Cucinata fuori piano</button>') + '</div>';
  $('scheda').scrollTop = scroll;
}

function aggiungiDallaScheda() {
  const { ricetta, porzioni } = ricettaAperta;
  aggiungiAlPiano(ricetta);
  impostaPorzioni(ricetta, porzioni);
  disegnaRicetta();
  toast(ricetta.nome + ': nel piano');
}

function togliDallaScheda() {
  ricettaAperta.porzioni = porzioniScheda();
  togliDalPiano(ricettaAperta.ricetta);
  disegnaRicetta();
  toast(ricettaAperta.ricetta.nome + ': tolta dal piano');
}

function cucinata() {
  const { ricetta } = ricettaAperta;
  const porzioni = porzioniScheda();
  if (!confirm('Togliere dalla dispensa ' + ricetta.nome + ' per ' + fmtNumero(porzioni) + ' porzioni?')) return;
  const consumo = consumoCucinata(leggiPiano(), ricetta, porzioni);
  if (!scriviDispensa(d => applicaConsumo(d, consumo))) return;
  azzeraSpunte(ricetta.id);
  chiudiOverlay();
  toast(ricetta.nome + ': cucinata, dispensa aggiornata');
}

// Schermo sempre acceso mentre la scheda ricetta è aperta.
let bloccoSchermo = null;

const segnaSchermo = () => { $('schermo-acceso').hidden = !bloccoSchermo; };

async function tieniSchermoAcceso() {
  if (!('wakeLock' in navigator) || !ricettaAperta || bloccoSchermo) return;
  try {
    bloccoSchermo = await navigator.wakeLock.request('screen');
    bloccoSchermo.addEventListener('release', () => { bloccoSchermo = null; segnaSchermo(); });
  } catch (e) {
    bloccoSchermo = null;
  }
  segnaSchermo();
}

function rilasciaSchermo() {
  if (bloccoSchermo) bloccoSchermo.release().catch(() => {});
  bloccoSchermo = null;
  segnaSchermo();
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') tieniSchermoAcceso();
});

// ==================== EVENTI ====================
const AZIONI = {
  'menu': menu,
  'chiudi': chiudiOverlay,
  'apri': d => apriRicetta(d.id),
  'porzioni': d => cambiaPorzioniPiano(d.id, +d.verso),
  'aggiungi-piatto': foglioAggiungiPiatto,
  'scegli-piatto': d => scegliPiatto(d.id),
  'ogni-giorno': d => cambiaOgniGiorno(+d.i, +d.verso),
  'aggiungi-ogni-giorno': foglioAggiungiOgniGiorno,
  'scegli-ogni-giorno': d => scegliOgniGiorno(d.id),
  'modo': d => cambiaModoSpesa(d.modo),
  'dispensa': d => correggiDispensa(d.id, +d.verso),
  'extra-passo': d => correggiExtra(Number(d.id), +d.verso),
  'ce-manca': d => cambiaCeManca(d.id),
  'prendi': d => spuntaSpesa(d.chiave),
  'togli-altro': d => togliAltro(d.chiave),
  'spesa-fatta': confermaSpesaFatta,
  'porzioni-scheda': d => cambiaPorzioniScheda(+d.verso),
  'spunta': d => spunta(d.tipo, +d.i),
  'cucinata': cucinata,
  'aggiungi-al-piano': aggiungiDallaScheda,
  'togli-dal-piano': togliDallaScheda,
  'pagina-backup': paginaBackup,
  'pagina-extra': paginaExtra,
  'copia': esportaCodice,
  'importa': importaDaArea,
  'telegram': backupTelegram,
  'modifica-extra': d => modificaExtra(Number(d.id)),
  'salva-extra': salvaFormExtra,
  'annulla-extra': () => { extraInModifica = null; disegnaExtra(); },
  'elimina-extra': eliminaExtra
};

document.addEventListener('click', e => {
  const b = e.target.closest('[data-azione], [data-scheda]');
  if (!b) return;
  if (b.dataset.scheda) { mostraScheda(b.dataset.scheda); return; }
  const azione = AZIONI[b.dataset.azione];
  // Senza catalogo funziona solo chiudere: tutto il resto ha bisogno delle ricette.
  if (azione && (catalogo || b.dataset.azione === 'chiudi')) azione(b.dataset);
});

document.addEventListener('submit', e => {
  if (e.target.id !== 'form-altro') return;
  e.preventDefault();
  const nome = $('altro-nome').value.trim();
  if (!nome) return;
  aggiungiAltro(nome);
  $('altro-nome').focus();
});

document.addEventListener('input', e => {
  if (e.target.id === 'spesa-note') salvaNote(e.target.value);
});

// ==================== AVVIO ====================
window.addEventListener('DOMContentLoaded', async () => {
  disegna();
  await caricaCatalogo();
  const avviso = $('avviso-catalogo');
  if (!catalogo) {
    avviso.textContent = MSG_SENZA_CATALOGO;
    avviso.hidden = false;
    return;
  }
  assicuraMigrazione();
  disegna();
});

// Registrazione Service Worker per PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        // Controlla aggiornamenti all'avvio
        reg.update();

        // Ricarica la pagina se il service worker cambia (perché abbiamo usato skipWaiting)
        reg.onupdatefound = () => {
          const newSW = reg.installing;
          newSW.onstatechange = () => {
            if (newSW.state === 'activated') {
              window.location.reload();
            }
          };
        };
      })
      .catch(() => {});
  });

  // Gestione del cambio del service worker attivo
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!refreshing) {
      window.location.reload();
      refreshing = true;
    }
  });
}
