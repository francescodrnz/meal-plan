// Piano pasti: ricette da ricette.json (generato da Notion), piano, dispensa stimata e spesa.

// ==================== CHIAVI ====================
const CHIAVI = {
  piano: 'mealplan_piano_v2',
  dispensa: 'mealplan_dispensa_v2',
  cucina: 'mealplan_cucina_v2',
  spesa: 'mealplan_spesa_v2', // righe spuntate della lista, fino a "Spesa fatta"
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
  dati.ricette.forEach(r => { ricettePerId[r.id] = r; });
  return { prodotti: dati.prodotti, ricette: dati.ricette, prodottiPerId, ricettePerId };
}

function prodottoPerNome(nome) {
  return catalogo ? catalogo.prodotti.find(p => p.nome === nome) : undefined;
}

// ==================== NUMERI ====================
const arrotonda1 = x => Math.round(x * 10) / 10;
const arrotonda6 = x => Math.round(x * 1e6) / 1e6;

// ==================== PIANO ====================
// {porzioni: {idRicetta: n}, ogniGiorno: [{prodotto, quantita}]}
// porzioni: solo quelle diverse dalla ricetta. ogniGiorno: assente finché non si cambia.

function ogniGiornoIniziale() {
  return [['Latte di soia', 250], ['Frutta', 2]]
    .map(([nome, quantita]) => { const p = prodottoPerNome(nome); return p ? { prodotto: p.id, quantita } : null; })
    .filter(Boolean);
}

function leggiPiano() {
  const p = leggiJSON(CHIAVI.piano, {}) || {};
  return {
    porzioni: (p.porzioni && typeof p.porzioni === 'object') ? p.porzioni : {},
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

function impostaPorzioni(ricetta, valore) {
  const piano = leggiPiano();
  const v = Math.max(0, arrotonda1(valore));
  if (v === ricetta.porzioni) delete piano.porzioni[ricetta.id];
  else piano.porzioni[ricetta.id] = v;
  scriviPiano(piano);
}

function piattiDelPiano(piano) {
  return catalogo.ricette
    .filter(r => r.rotazione)
    .map(r => ({ ricetta: r, porzioni: porzioniNelPiano(piano, r) }));
}

// Una ricetta da 2 porzioni copre pranzo e cena: un giorno.
const giorniRicetta = ricetta => ricetta.porzioni / 2;

function giorniDelPiano(piano) {
  return piattiDelPiano(piano)
    .filter(x => x.porzioni > 0)
    .reduce((tot, x) => tot + giorniRicetta(x.ricetta), 0);
}

const kcalAPasto = (ricetta, porzioni) => ricetta.kcal * porzioni / ricetta.porzioni;

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
  piattiDelPiano(piano).filter(x => x.porzioni > 0).forEach(({ ricetta, porzioni }) => {
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
  if (!assicuraMigrazione()) { alert(MSG_SENZA_CATALOGO); return false; }
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

// ==================== PRODOTTI EXTRA ====================
// [{id, name, unit, storeSize, need, category}]; la quantità sta nella dispensa come "custom_<id>".

function leggiExtra() {
  const e = leggiJSON(CHIAVI.extra, []);
  return Array.isArray(e) ? e : [];
}

// Scrive lista degli extra e dispensa insieme, o nessuna delle due.
function salvaExtraEDispensa(modificaExtra, modificaDispensa) {
  if (!assicuraMigrazione()) { alert(MSG_SENZA_CATALOGO); return false; }
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

function testoConfezioni(p, n) {
  const tipo = p.tipoConfezione || 'pz';
  if (tipo === 'pz' && p.confezione === 1) return n + ' pz';
  return n + ' ' + (n === 1 ? tipo : (PLURALI[tipo] || tipo)) + ' da ' + p.confezione + ' ' + p.unita;
}

function fmtNumero(n) {
  return arrotonda1(n).toLocaleString('it-IT');
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
function esc(s) {
  return String(s === null || s === undefined ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

let schedaAttiva = 'ricette';

function mostraScheda(nome) {
  schedaAttiva = nome;
  document.querySelectorAll('.section').forEach(s => s.classList.toggle('active', s.id === 'tab-' + nome));
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === nome));
  disegna();
}

function disegna() {
  if (!catalogo) return;
  if (schedaAttiva === 'ricette') disegnaRicette();
  if (schedaAttiva === 'piano' && typeof disegnaPiano === 'function') disegnaPiano();
  if (schedaAttiva === 'spesa' && typeof disegnaSpesa === 'function') disegnaSpesa();
}

// Overlay (scheda ricetta, menu): il tasto indietro del telefono li chiude.
function apriOverlay(id) {
  document.querySelectorAll('.overlay').forEach(o => { o.hidden = o.id !== id; });
  document.body.classList.add('con-overlay');
  if (!history.state || !history.state.overlay) history.pushState({ overlay: id }, '');
  else history.replaceState({ overlay: id }, '');
  if (id === 'menu' && typeof disegnaMenu === 'function') disegnaMenu();
}

function chiudiOverlay() {
  if (history.state && history.state.overlay) history.back();
  else nascondiOverlay();
}

function nascondiOverlay() {
  document.querySelectorAll('.overlay').forEach(o => { o.hidden = true; });
  document.body.classList.remove('con-overlay');
  ricettaAperta = null;
  rilasciaSchermo();
  disegna();
}

// Dopo un ricaricamento con un pannello aperto lo stato resta nella cronologia, ma il pannello no.
if (history.state && history.state.overlay) history.replaceState(null, '');

window.addEventListener('popstate', () => {
  if (!history.state || !history.state.overlay) nascondiOverlay();
});

// ==================== SCHEDA RICETTE ====================
function rigaRicetta(r) {
  return '<button class="riga-ricetta" onclick="apriRicetta(\'' + esc(r.id) + '\')">' +
    '<span class="riga-ricetta-testo">' +
      '<span class="recipe-title">' + esc(r.nome) + '</span>' +
      (r.provata ? '' : ' <span class="badge badge-proteina">da provare</span>') +
      (r.descrizione ? '<span class="riga-ricetta-desc">' + esc(r.descrizione) + '</span>' : '') +
    '</span>' +
    '<span class="recipe-kcal">' + esc(r.kcal) + '</span>' +
  '</button>';
}

function disegnaRicette() {
  const inRotazione = catalogo.ricette.filter(r => r.rotazione);
  const altre = catalogo.ricette.filter(r => !r.rotazione);
  document.getElementById('tab-ricette').innerHTML =
    '<div class="shop-section-title">In rotazione</div>' + inRotazione.map(rigaRicetta).join('') +
    (altre.length ? '<div class="shop-section-title">Altre ricette</div>' + altre.map(rigaRicetta).join('') : '');
}

// ==================== SCHEDA PIANO ====================
const stepper = (azioneMeno, azionePiu, valore) =>
  '<div class="stepper">' +
    '<button class="spesa-step-btn" onclick="' + azioneMeno + '">−</button>' +
    '<span class="stepper-val">' + valore + '</span>' +
    '<button class="spesa-step-btn" onclick="' + azionePiu + '">+</button>' +
  '</div>';

const passoOgniGiorno = p => p.unita === 'pz' ? 1 : 50;

function disegnaPiano() {
  const piano = leggiPiano();
  const piatti = piattiDelPiano(piano).map(({ ricetta, porzioni }) => {
    const id = esc(ricetta.id);
    return '<div class="riga-piano' + (porzioni > 0 ? '' : ' saltato') + '">' +
      '<div class="riga-piano-testo" onclick="apriRicetta(\'' + id + '\')">' +
        '<div class="recipe-title">' + esc(ricetta.nome) + '</div>' +
        '<div class="riga-piano-kcal">' + Math.round(kcalAPasto(ricetta, porzioni)) + ' kcal a pasto</div>' +
      '</div>' +
      stepper('cambiaPorzioniPiano(\'' + id + '\', -0.1)', 'cambiaPorzioniPiano(\'' + id + '\', 0.1)', fmtNumero(porzioni)) +
    '</div>';
  }).join('');

  const ogniGiorno = piano.ogniGiorno.map((x, i) => {
    const p = catalogo.prodottiPerId[x.prodotto];
    if (!p) return '';
    return '<div class="riga-piano">' +
      '<div class="riga-piano-testo"><div class="recipe-title">' + esc(p.nome) + '</div>' +
        '<div class="riga-piano-kcal">' + fmtNumero(x.quantita) + ' ' + esc(p.unita) + ' al giorno</div></div>' +
      stepper('cambiaOgniGiorno(' + i + ', -1)', 'cambiaOgniGiorno(' + i + ', 1)', fmtNumero(x.quantita)) +
      '<button class="delete-btn" onclick="togliOgniGiorno(' + i + ')" aria-label="Togli">✕</button>' +
    '</div>';
  }).join('');

  const giaUsati = new Set(piano.ogniGiorno.map(x => x.prodotto));
  const scelta = catalogo.prodotti.filter(p => p.siConta && !giaUsati.has(p.id))
    .map(p => '<option value="' + esc(p.id) + '">' + esc(p.nome) + '</option>').join('');

  document.getElementById('tab-piano').innerHTML =
    '<div class="piano-giorni">' + fmtNumero(giorniDelPiano(piano)) + ' giorni</div>' +
    piatti +
    '<div class="shop-section-title">Ogni giorno</div>' +
    ogniGiorno +
    '<div class="aggiungi-riga"><select class="custom-input" id="ogni-giorno-nuovo">' + scelta + '</select>' +
      '<button class="spesa-step-btn" onclick="aggiungiOgniGiorno()" aria-label="Aggiungi">+</button></div>';
}

function cambiaPorzioniPiano(id, delta) {
  const ricetta = catalogo.ricettePerId[id];
  impostaPorzioni(ricetta, porzioniNelPiano(leggiPiano(), ricetta) + delta);
  disegnaPiano();
}

function cambiaOgniGiorno(i, verso) {
  const piano = leggiPiano();
  const x = piano.ogniGiorno[i];
  const p = catalogo.prodottiPerId[x.prodotto];
  x.quantita = Math.max(0, arrotonda1(x.quantita + verso * passoOgniGiorno(p)));
  scriviPiano(piano);
  disegnaPiano();
}

function togliOgniGiorno(i) {
  const piano = leggiPiano();
  piano.ogniGiorno.splice(i, 1);
  scriviPiano(piano);
  disegnaPiano();
}

function aggiungiOgniGiorno() {
  const id = document.getElementById('ogni-giorno-nuovo').value;
  const p = catalogo.prodottiPerId[id];
  if (!p || !p.siConta) return;
  const piano = leggiPiano();
  piano.ogniGiorno.push({ prodotto: id, quantita: passoOgniGiorno(p) });
  scriviPiano(piano);
  disegnaPiano();
}

// ==================== SCHEDA SPESA ====================
let tuttaLaDispensa = false;

function leggiSpuntateSpesa() {
  const s = leggiJSON(CHIAVI.spesa, []);
  return new Set(Array.isArray(s) ? s : []);
}

function spuntaSpesa(chiave) {
  const s = leggiSpuntateSpesa();
  if (s.has(chiave)) s.delete(chiave); else s.add(chiave);
  scriviJSON(CHIAVI.spesa, [...s]);
  disegnaSpesa();
}

const fmt2 = n => (Math.round(n * 100) / 100).toLocaleString('it-IT');

function testoInDispensa(p, q) {
  if (!p.confezione) return fmt2(q) + ' ' + p.unita;
  const n = q / p.confezione;
  const tipo = p.tipoConfezione || 'pz';
  if (tipo === 'pz' && p.confezione === 1) return fmt2(q) + ' pz';
  return fmt2(n) + ' ' + (n === 1 ? tipo : (PLURALI[tipo] || tipo)) + ' (' + fmt2(q) + ' ' + p.unita + ')';
}

function rigaDispensaProdotto(p, dispensa) {
  const id = esc(p.id);
  if (!p.siConta) {
    const m = manca(dispensa, p.id);
    return '<div class="riga-dispensa"><div class="riga-dispensa-nome">' + esc(p.nome) + '</div>' +
      '<button class="interruttore' + (m ? ' manca' : '') + '" onclick="cambiaCeManca(\'' + id + '\')">' +
      (m ? 'manca' : 'c\'è') + '</button></div>';
  }
  return '<div class="riga-dispensa"><div class="riga-dispensa-nome">' + esc(p.nome) +
      '<div class="riga-piano-kcal">' + esc(testoInDispensa(p, quantitaIn(dispensa, p.id))) + '</div></div>' +
    stepper('correggiDispensa(\'' + id + '\', -1)', 'correggiDispensa(\'' + id + '\', 1)', '') +
  '</div>';
}

const passoExtra = c => ['g', 'ml', 'kg', 'L'].includes(c.unit) ? (c.storeSize || 1) / 4 : 1;

function rigaDispensaExtra(c, dispensa) {
  const chiave = 'custom_' + c.id;
  return '<div class="riga-dispensa"><div class="riga-dispensa-nome">' + esc(c.name) +
      '<div class="riga-piano-kcal">' + fmt2(quantitaIn(dispensa, chiave)) + ' ' + esc(c.unit || 'pz') + '</div></div>' +
    stepper('correggiExtra(' + Number(c.id) + ', -1)', 'correggiExtra(' + Number(c.id) + ', 1)', '') +
  '</div>';
}

function perReparto(righe, reparto) {
  const gruppi = {};
  righe.forEach(r => { (gruppi[reparto(r)] = gruppi[reparto(r)] || []).push(r); });
  return Object.keys(gruppi).sort((a, b) => a.localeCompare(b, 'it')).map(k => [k, gruppi[k]]);
}

function disegnaSpesa() {
  const piano = leggiPiano();
  const dispensa = leggiDispensa();
  const extra = leggiExtra();
  const righe = listaSpesa(piano, dispensa, extra);
  // Una spunta vale solo finché la sua riga è in lista: se la riga sparisce senza "Spesa fatta",
  // tornando non deve essere già spuntata.
  const inLista = new Set(righe.map(r => r.chiave));
  const salvate = leggiSpuntateSpesa();
  const spuntate = new Set([...salvate].filter(k => inLista.has(k)));
  if (spuntate.size !== salvate.size) scriviJSON(CHIAVI.spesa, [...spuntate]);

  const lista = righe.length
    ? perReparto(righe, r => r.reparto).map(([reparto, rr]) =>
        '<div class="shop-section-title">' + esc(reparto) + '</div>' +
        rr.map(r => {
          const fatto = spuntate.has(r.chiave);
          return '<div class="spuntabile' + (fatto ? ' fatto' : '') + '" onclick="spuntaSpesa(\'' + esc(r.chiave) + '\')">' +
            '<span class="spunta-box">' + (fatto ? '✓' : '') + '</span>' +
            '<span class="spunta-testo ing-riga"><span>' + esc(r.nome) + '</span>' +
            (r.tipo === 'manca'
              ? '</span><button class="interruttore manca" onclick="event.stopPropagation(); cambiaCeManca(\'' +
                esc(r.chiave) + '\')">manca</button></div>'
              : '<span class="ing-qta">' + esc(r.testo) + '</span></span></div>');
        }).join('')).join('') +
      '<button class="confirm-btn" onclick="confermaSpesaFatta()">Spesa fatta</button>'
    : '<div class="info-note">Niente da comprare.</div>';

  // Dispensa: i prodotti del piano; con "Tutta la dispensa" anche gli altri e gli extra.
  const fab = fabbisogno(piano);
  const delPiano = new Set([...Object.keys(fab.quantita), ...fab.serve]);
  const prodotti = catalogo.prodotti.filter(p => tuttaLaDispensa || delPiano.has(p.id));
  const dispensaHtml = perReparto(prodotti, p => p.reparto).map(([reparto, pp]) =>
      '<div class="dispensa-reparto">' + esc(reparto) + '</div>' + pp.map(p => rigaDispensaProdotto(p, dispensa)).join('')).join('') +
    (tuttaLaDispensa && extra.length
      ? '<div class="dispensa-reparto">Prodotti extra</div>' + extra.map(c => rigaDispensaExtra(c, dispensa)).join('') : '');

  document.getElementById('tab-spesa').innerHTML =
    lista +
    '<div class="shop-section-title titolo-dispensa">Dispensa</div>' +
    dispensaHtml +
    '<button class="cancel-btn" onclick="tuttaLaDispensa = !tuttaLaDispensa; disegnaSpesa()">' +
      (tuttaLaDispensa ? 'Solo i prodotti del piano' : 'Tutta la dispensa') + '</button>' +
    '<div class="shop-section-title">Note</div>' +
    '<textarea id="spesa-note" class="spesa-note-area" oninput="salvaNote(this.value)"></textarea>';
  document.getElementById('spesa-note').value = dispensa.note;
}

function confermaSpesaFatta() {
  const spuntate = leggiSpuntateSpesa();
  const righe = listaSpesa(leggiPiano(), leggiDispensa(), leggiExtra()).filter(r => spuntate.has(r.chiave));
  if (!righe.length) { alert('Spunta quello che hai comprato.'); return; }
  if (!confirm('Aggiungere alla dispensa ' + righe.length + (righe.length === 1 ? ' prodotto?' : ' prodotti?'))) return;
  if (!spesaFatta(righe)) return;
  scriviJSON(CHIAVI.spesa, []);
  disegnaSpesa();
}

function correggiDispensa(id, verso) {
  const p = catalogo.prodottiPerId[id];
  // Senza confezione su Notion si corregge nell'unità del prodotto.
  const passo = p.confezione ? passoConfezioni(p) * p.confezione : passoOgniGiorno(p);
  scriviDispensa(d => {
    d.quantita[id] = Math.max(0, arrotonda6(quantitaIn(d, id) + verso * passo));
  });
  disegnaSpesa();
}

function cambiaCeManca(id) {
  scriviDispensa(d => { d.quantita[id] = manca(d, id); });
  disegnaSpesa();
}

function correggiExtra(idExtra, verso) {
  const c = leggiExtra().find(x => x.id === idExtra);
  if (!c) return;
  const chiave = 'custom_' + idExtra;
  scriviDispensa(d => {
    d.quantita[chiave] = Math.max(0, arrotonda6(quantitaIn(d, chiave) + verso * passoExtra(c)));
  });
  disegnaSpesa();
}

// Si salva a ogni tasto: con un ritardo, un −/+ nel frattempo ridisegnerebbe il testo vecchio.
function salvaNote(testo) {
  scriviDispensa(d => { d.note = testo; });
}

// ==================== MENU ====================
let extraInModifica = null;

function disegnaMenu() {
  const extra = leggiExtra();
  const dispensa = leggiDispensa();
  // Le categorie del modulo di prima, più quelle già usate
  const categorie = [...new Set(['🧊 Frigo / Freezer', '🌾 Secchi', '🫙 Liquidi', '➕ Extra',
    ...extra.map(c => c.category).filter(Boolean)])];
  const lista = extra.map(c =>
    '<div class="riga-dispensa"><div class="riga-dispensa-nome">' + esc(c.name) +
      '<div class="riga-piano-kcal">' + esc(c.category || '➕ Extra') + ' · scorta ' + fmt2(c.need || 0) + ' ' + esc(c.unit || 'pz') +
      ' · in casa ' + fmt2(quantitaIn(dispensa, 'custom_' + c.id)) + '</div></div>' +
      '<button class="delete-btn" onclick="modificaExtra(' + Number(c.id) + ')" aria-label="Modifica">✎</button></div>').join('');

  document.getElementById('menu-corpo').innerHTML =
    '<a class="confirm-btn link-btn" href="workout.html">Allenamenti 🏋️</a>' +

    '<div class="shop-section-title titolo-menu">Backup</div>' +
    '<textarea id="sync-area" class="spesa-note-area" placeholder="Codice"></textarea>' +
    '<div class="due-pulsanti">' +
      '<button class="cancel-btn" onclick="esportaCodice()">Copia codice</button>' +
      '<button class="cancel-btn" onclick="importaDaArea()">Importa</button>' +
    '</div>' +
    '<button class="confirm-btn telegram-btn" onclick="backupTelegram()">Backup Telegram 🤖</button>' +

    '<div class="shop-section-title titolo-menu">Prodotti extra</div>' +
    lista +
    '<div class="custom-form" id="form-extra">' +
      '<div class="custom-field"><label class="custom-label">Nome</label>' +
        '<input class="custom-input" id="cf-nome" type="text"></div>' +
      '<div class="custom-field"><label class="custom-label">Categoria</label>' +
        '<input class="custom-input" id="cf-categoria" type="text" list="cf-categorie">' +
        '<datalist id="cf-categorie">' + categorie.map(c => '<option value="' + esc(c) + '">').join('') + '</datalist></div>' +
      '<div class="custom-form-row">' +
        '<div class="custom-field"><label class="custom-label">Unità</label>' +
          '<input class="custom-input" id="cf-unita" type="text" list="cf-unita-lista" placeholder="g">' +
          '<datalist id="cf-unita-lista">' + ['g', 'ml', 'pz', 'barattolo', 'confezioni', 'rotoli'].map(u => '<option value="' + u + '">').join('') + '</datalist></div>' +
        '<div class="custom-field"><label class="custom-label">Confezione</label>' +
          '<input class="custom-input" id="cf-confezione" type="number" min="0" step="any"></div>' +
      '</div>' +
      '<div class="custom-form-row">' +
        '<div class="custom-field"><label class="custom-label">Scorta minima</label>' +
          '<input class="custom-input" id="cf-scorta" type="number" min="0" step="any"></div>' +
        '<div class="custom-field"><label class="custom-label">In casa</label>' +
          '<input class="custom-input" id="cf-in-casa" type="number" min="0" step="any"></div>' +
      '</div>' +
      '<button class="confirm-btn" onclick="salvaFormExtra()">' + (extraInModifica ? 'Salva' : 'Aggiungi') + '</button>' +
      (extraInModifica
        ? '<button class="cancel-btn" onclick="extraInModifica = null; disegnaMenu()">Annulla</button>' +
          '<button class="reset-btn" onclick="eliminaExtra()">Elimina</button>'
        : '') +
    '</div>';

  if (extraInModifica) {
    const c = extra.find(x => x.id === extraInModifica);
    if (c) {
      document.getElementById('cf-nome').value = c.name || '';
      document.getElementById('cf-categoria').value = c.category || '';
      document.getElementById('cf-unita').value = c.unit || '';
      document.getElementById('cf-confezione').value = c.storeSize || '';
      document.getElementById('cf-scorta').value = c.need || 0;
      document.getElementById('cf-in-casa').value = quantitaIn(dispensa, 'custom_' + c.id);
    }
  }
}

function modificaExtra(id) {
  extraInModifica = id;
  disegnaMenu();
  document.getElementById('form-extra').scrollIntoView({ behavior: 'smooth' });
}

function salvaFormExtra() {
  const val = id => document.getElementById(id).value.trim();
  const num = id => parseFloat(val(id).replace(',', '.'));
  const nome = val('cf-nome');
  if (!nome) { alert('Inserisci il nome del prodotto.'); return; }
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
  if (ok) { extraInModifica = null; disegnaMenu(); }
}

function eliminaExtra() {
  const id = extraInModifica;
  if (!id || !confirm('Eliminare questo prodotto?')) return;
  const ok = salvaExtraEDispensa(
    extra => { const i = extra.findIndex(x => x.id === id); if (i >= 0) extra.splice(i, 1); },
    d => { delete d.quantita['custom_' + id]; }
  );
  if (ok) { extraInModifica = null; disegnaMenu(); }
}

function esportaCodice() {
  const dati = datiExport();
  if (!dati) { alert(MSG_SENZA_CATALOGO); return; }
  const codice = codiceCopia(dati);
  const area = document.getElementById('sync-area');
  area.value = codice;
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(codice)
      .then(() => alert('Codice copiato negli appunti.'))
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
    alert('Codice copiato negli appunti.');
  } catch (err) {
    alert('Codice pronto: copialo dal riquadro.');
  }
}

async function importaDaArea() {
  const area = document.getElementById('sync-area');
  if (!area.value.trim()) { alert('Incolla prima un codice.'); return; }
  const esito = await importaCodice(area.value, msg => confirm(msg));
  if (esito === null) return;
  alert(esito);
  if (esito === 'Dati importati.') { area.value = ''; disegnaMenu(); }
}

async function backupTelegram() {
  const dati = datiExport();
  if (!dati) { alert(MSG_SENZA_CATALOGO); return; }
  const codice = await codiceTelegram(dati);
  const testo = '/backup_mealplan ' + codice;
  window.open('https://t.me/botchecontaimessaggibot?text=' + encodeURIComponent(testo), '_blank');
}

// ==================== SCHEDA RICETTA ====================
let ricettaAperta = null; // {ricetta, porzioni}

const UNITA_PLURALI = { cucchiaino: 'cucchiaini', spicchio: 'spicchi' };

function testoQuantita(ing, porzioni) {
  if (ing.quantita === null) return esc(ing.unita || 'q.b.');
  const n = arrotonda1(ing.quantita * porzioni);
  const unita = n !== 1 && UNITA_PLURALI[ing.unita] ? UNITA_PLURALI[ing.unita] : ing.unita;
  return fmtNumero(n) + ' ' + esc(unita);
}

function inPiano(ricetta) {
  return ricetta.rotazione && porzioniNelPiano(leggiPiano(), ricetta) > 0;
}

function apriRicetta(id) {
  const ricetta = catalogo.ricettePerId[id];
  if (!ricetta) return;
  const porzioni = inPiano(ricetta) ? porzioniNelPiano(leggiPiano(), ricetta) : ricetta.porzioni;
  ricettaAperta = { ricetta, porzioni };
  apriOverlay('scheda');
  disegnaRicetta();
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

function cambiaPorzioniScheda(delta) {
  ricettaAperta.porzioni = Math.max(0.1, arrotonda1(ricettaAperta.porzioni + delta));
  disegnaRicetta();
}

function disegnaRicetta() {
  const { ricetta, porzioni } = ricettaAperta;
  const s = leggiSpunte(ricetta.id);
  document.getElementById('scheda-titolo').textContent = ricetta.nome;

  const ingredienti = ricetta.ingredienti.map((ing, i) => {
    const fatto = s.ing.includes(i);
    return '<li class="spuntabile' + (fatto ? ' fatto' : '') + '" onclick="spunta(\'ing\', ' + i + ')">' +
      '<span class="spunta-box">' + (fatto ? '✓' : '') + '</span>' +
      '<span class="spunta-testo">' +
        '<span class="ing-riga"><span>' + esc(ing.nome) +
          (ing.facoltativo ? ' <span class="ing-facolt">facoltativo</span>' : '') +
          (unitaDiversa(ing) ? ' <span class="ing-avviso" title="Unità diversa dal prodotto: non conta in dispensa">⚠</span>' : '') +
        '</span><span class="ing-qta">' + testoQuantita(ing, porzioni) + '</span></span>' +
        (ing.nota ? '<span class="ing-nota">' + esc(ing.nota) + '</span>' : '') +
      '</span></li>';
  }).join('');

  const passi = ricetta.passi.map((p, i) => {
    const fatto = s.passi.includes(i);
    const sotto = Array.isArray(p.sotto) && p.sotto.length
      ? '<ul class="sotto-punti">' + p.sotto.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '';
    return '<li class="spuntabile' + (fatto ? ' fatto' : '') + '" onclick="spunta(\'passi\', ' + i + ')">' +
      '<span class="spunta-box">' + (fatto ? '✓' : (i + 1)) + '</span>' +
      '<span class="spunta-testo">' + esc(p.testo) + sotto + '</span></li>';
  }).join('');

  const note = ricetta.note.length
    ? '<div class="section-label">Note</div><ul class="note-ricetta">' +
      ricetta.note.map(n => '<li>' + esc(n.testo) +
        (Array.isArray(n.sotto) && n.sotto.length ? '<ul class="sotto-punti">' + n.sotto.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
      '</li>').join('') + '</ul>'
    : '';

  const fuoriPiano = !inPiano(ricetta);
  document.getElementById('scheda-corpo').innerHTML =
    '<div class="scheda-meta">' + esc(ricetta.kcal) + ' kcal · ' + esc(ricetta.proteine) + ' g proteine a porzione' +
      (ricetta.provata ? '' : ' · <span class="badge badge-proteina">da provare</span>') + '</div>' +
    (ricetta.descrizione ? '<p class="prep-text">' + esc(ricetta.descrizione) + '</p>' : '') +
    '<div class="porzioni-riga"><span>Porzioni</span>' +
      '<div class="stepper">' +
        '<button class="spesa-step-btn" onclick="cambiaPorzioniScheda(-0.1)">−</button>' +
        '<span class="stepper-val" id="scheda-porzioni">' + fmtNumero(porzioni) + '</span>' +
        '<button class="spesa-step-btn" onclick="cambiaPorzioniScheda(0.1)">+</button>' +
      '</div></div>' +
    '<div class="section-label">Ingredienti</div><ul class="lista-spunte">' + ingredienti + '</ul>' +
    '<div class="section-label">Procedimento</div><ol class="lista-spunte">' + passi + '</ol>' +
    note +
    '<button class="confirm-btn" onclick="cucinata()">' + (fuoriPiano ? 'Cucinata fuori piano' : 'Cucinata') + '</button>';
}

function cucinata() {
  const { ricetta, porzioni } = ricettaAperta;
  if (!confirm('Togliere dalla dispensa ' + ricetta.nome + ' per ' + fmtNumero(porzioni) + ' porzioni?')) return;
  const consumo = consumoCucinata(leggiPiano(), ricetta, porzioni);
  if (!scriviDispensa(d => applicaConsumo(d, consumo))) return;
  azzeraSpunte(ricetta.id);
  chiudiOverlay();
}

// Schermo sempre acceso mentre la scheda ricetta è aperta.
let bloccoSchermo = null;

async function tieniSchermoAcceso() {
  if (!('wakeLock' in navigator) || !ricettaAperta || bloccoSchermo) return;
  try {
    bloccoSchermo = await navigator.wakeLock.request('screen');
    bloccoSchermo.addEventListener('release', () => { bloccoSchermo = null; });
  } catch (e) {
    bloccoSchermo = null;
  }
}

function rilasciaSchermo() {
  if (bloccoSchermo) bloccoSchermo.release().catch(() => {});
  bloccoSchermo = null;
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') tieniSchermoAcceso();
});

// ==================== AVVIO ====================
window.addEventListener('DOMContentLoaded', async () => {
  await caricaCatalogo();
  const avviso = document.getElementById('avviso-catalogo');
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
