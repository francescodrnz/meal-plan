// ==================== TABS ====================
function showTab(event, name) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  event.target.classList.add('active');
}

// ==================== RECIPE TOGGLE ====================
function toggleCard(card) {
  card.classList.toggle('open');
}

// ==================== SHOPPING LIST ====================
const shopData = {
  frigo: [
    { id: 'tofu',        name: 'Tofu',                unit: '4 panetti da 180g',   need: 720,                   storeSize: 180,  storeLabel: 'panetti da 180g', useUnits: true },
    { id: 'patate',      name: 'Patate',               unit: '1,5 kg',              need: 1400,                  storeSize: 1,    storeLabel: 'g',              step: 100 },
    { id: 'broccoli',    name: 'Broccoli surgelati',   unit: '5 buste da 500g',     need: 2800,                  storeSize: 500,  storeLabel: 'buste da 500g' },
    { id: 'minestrone',  name: 'Minestrone surgelato', unit: '2 buste da 750g',     need: 1500,                  storeSize: 750,  storeLabel: 'buste da 750g' },
  ],
  secchi: [
    { id: 'lenticchie',  name: 'Lenticchie secche',   unit: 'buste da 500g',       need: 800,                   storeSize: 500,  storeLabel: 'buste da 500g' },
    { id: 'ceci',        name: 'Ceci secchi',          unit: 'buste da 500g',       need: 780,                   storeSize: 500,  storeLabel: 'buste da 500g' },
    { id: 'fagioli',     name: 'Fagioli secchi',       unit: 'buste da 500g',       need: 540,                   storeSize: 500,  storeLabel: 'buste da 500g' },
    { id: 'pasta',       name: 'Pasta corta',          unit: '500g',                need: 390,                   storeSize: 500,  storeLabel: 'pacchi da 500g' },
    { id: 'couscous',    name: 'Couscous',             unit: '1 kg',                need: 430,                   storeSize: 1000, storeLabel: 'pacchi da 1kg' },
    { id: 'farro',       name: 'Farro perlato',        unit: '500g',                need: 470,                   storeSize: 500,  storeLabel: 'pacchi da 500g' },
    { id: 'riso',        name: 'Riso integrale',       unit: '1 kg',                need: 560,                   storeSize: 1000, storeLabel: 'pacchi da 1kg' },
    { id: 'polenta',     name: 'Polenta istantanea',   unit: '500g',                need: 240,                   storeSize: 500,  storeLabel: 'pacchi da 500g' },
  ],
  liquidi: [
    { id: 'olio',        name: 'Olio EVO',             unit: '1 bottiglia da 1L',   need: 385,                   storeSize: 1000, storeLabel: 'bottiglie da 1L' },
    { id: 'passata',     name: 'Passata di pomodoro',  unit: '2 bottiglie da 700g', need: 1400,                  storeSize: 700,  storeLabel: 'bottiglie da 700g', useUnits: true },
    { id: 'latte_soia',  name: 'Latte di soia',        unit: 'brick da 1L',         need: 2750,                  storeSize: 1000, storeLabel: 'brick da 1L', suggestedBuffer: 1000 },
  ]
};

// ==================== STATE MANAGEMENT ====================
const Store = {
  inventory: {},
  customs: [],
  storageKey: 'mealplan_shop_v1',
  customKey: 'mealplan_custom_v1',

  init() {
    try {
      this.inventory = JSON.parse(localStorage.getItem(this.storageKey)) || {};
      this.customs = JSON.parse(localStorage.getItem(this.customKey)) || [];
    } catch(e) {
      this.inventory = {};
      this.customs = [];
    }
  },

  persist() {
    localStorage.setItem(this.storageKey, JSON.stringify(this.inventory));
    localStorage.setItem(this.customKey, JSON.stringify(this.customs));
  },

  update(id, val, silent = false) {
    if (val === '' || val === null) delete this.inventory[id];
    else this.inventory[id] = val;
    this.persist();
    if (!silent) debouncedRefresh();
  },

  setCustoms(items) {
    this.customs = items;
    this.persist();
    buildShopTable();
  },

  commit() {
    this.persist();
    buildShopTable();
  }
};
Store.init();

// Alias per retrocompatibilità e semplicità
function loadSaved() { return Store.inventory; }
function loadCustom() { return Store.customs; }
function saveVal(id, val) { Store.update(id, val); }
function saveNotes(val) { Store.update('_notes', val); }

let refreshTimer;
function debouncedRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refreshBuyList, 250);
}

function calcBuy(need, have) {
  const h = parseFloat(have);
  if (isNaN(h)) return need;
  return Math.max(0, need - h);
}

function buildBuyRow(item, saved) {
  const have = saved[item.id] !== undefined ? saved[item.id] : '';
  const buyBase = calcBuy(item.need, have);
  const storeSize = item.storeSize || 1;
  const buyUnits = buyBase > 0 ? Math.ceil(buyBase / storeSize) : 0;
  const cls = buyUnits === 0 ? 'zero' : 'need';
  const tr = document.createElement('tr');
  tr.style.cursor = 'pointer';
  tr.onclick = function() { this.classList.toggle('bought'); };
  tr.innerHTML =
    '<td><div class="buy-row-name">' + item.name + '</div><div class="buy-row-sub">' + item.storeLabel + '</div></td>' +
    '<td><div class="buy-row-amt ' + cls + '" id="buyrow-' + item.id + '">' + (buyUnits > 0 ? buyUnits : '—') + '</div></td>';
  return tr;
}

function buildDispRow(item, saved) {
  const haveBase = parseFloat(saved[item.id]) || 0;
  const storeSize = item.storeSize || 1;
  const unit = item.suffix || 'g';
  
  const useUnits = !!item.useUnits;
  const displayVal = useUnits ? parseFloat((haveBase / storeSize).toFixed(2)) : haveBase;
  const displayUnit = useUnits ? item.storeLabel.split(' ')[0] : unit;
  const needDisplay = item.need + unit;

  // Calcolo percentuale per la barra di scorta
  const pct = Math.min(100, (haveBase / item.need) * 100);
  let colorClass = 'stock-ok';
  if (pct < 25) colorClass = 'stock-low';
  else if (pct < 60) colorClass = 'stock-mid';

  const tr = document.createElement('tr');
  tr.innerHTML =
    '<td style="padding-bottom:12px">' +
      '<div class="prod-name">' + item.name + '</div>' +
      '<div class="stock-bar-container"><div class="stock-bar-fill ' + colorClass + '" style="width:' + pct + '%"></div></div>' +
    '</td>' +
    '<td style="text-align:center; vertical-align:top; padding-top:10px"><div class="need-val">' + needDisplay + '</div></td>' +
    '<td style="text-align:center; vertical-align:top; padding-top:10px">' +
      '<input class="have-input" type="number" step="any" min="0" placeholder="0" value="' + (displayVal || '') + '" ' +
      'data-id="' + item.id + '" data-store-size="' + storeSize + '" data-use-units="' + useUnits + '" ' +
      'oninput="onHaveInput(this)" style="width:72px;display:inline-block">' +
      '<div style="font-size:0.7rem;color:var(--muted);text-align:center;margin-top:2px">' + displayUnit + '</div>' +
    '</td>';
  return tr;
}

function onHaveInput(input) {
  const id = input.dataset.id;
  const storeSize = parseFloat(input.dataset.storeSize) || 1;
  const useUnits = input.dataset.useUnits === 'true';
  let val = input.value.replace(',', '.');
  let numVal = parseFloat(val);
  
  const baseVal = isNaN(numVal) ? 0 : (useUnits ? numVal * storeSize : numVal);
  
  if (val === '') {
    Store.update(id, '');
  } else {
    Store.update(id, baseVal);
  }

  // Aggiornamento visivo immediato della barra di scorta
  const item = allItems().find(function(i) { return i.id === id; });
  if (item && item.need > 0) {
    const tr = input.closest('tr');
    if (tr) {
      const bar = tr.querySelector('.stock-bar-fill');
      if (bar) {
        const pct = Math.min(100, (baseVal / item.need) * 100);
        bar.style.width = pct + '%';
        bar.className = 'stock-bar-fill ' + (pct < 25 ? 'stock-low' : pct < 60 ? 'stock-mid' : 'stock-ok');
      }
    }
  }
}

function refreshBuyList() {
  clearTimeout(refreshTimer);
  const saved = Store.inventory;
  
  const noteArea = document.getElementById('spesa-note');
  if (noteArea && document.activeElement !== noteArea) noteArea.value = saved['_notes'] || '';

  const dynamicContainer = document.getElementById('buy-dynamic-sections');
  if (!dynamicContainer) return;
  dynamicContainer.innerHTML = '';

  var totalToBuy = 0;

  // Raggruppa tutti i prodotti per categoria
  const groups = {};

  // Prodotti standard
  ['frigo', 'secchi', 'liquidi'].forEach(section => {
    let label = '';
    if (section === 'frigo') label = '🧊 Frigo / Freezer';
    if (section === 'secchi') label = '🌾 Secchi';
    if (section === 'liquidi') label = '🫙 Liquidi';
    
    shopData[section].forEach(item => {
      const have = saved[item.id] !== undefined ? saved[item.id] : '';
      const buyBase = calcBuy(item.need, have);
      const storeSize = item.storeSize || 1;
      const buyUnits = buyBase > 0 ? Math.ceil(buyBase / storeSize) : 0;
      
      if (buyUnits > 0) {
        if (!groups[label]) groups[label] = [];
        groups[label].push(item);
        totalToBuy++;
      }
    });
  });

  // Prodotti extra
  customItems().forEach(item => {
    const have = saved[item.id] !== undefined ? saved[item.id] : '';
    const buyBase = calcBuy(item.need, have);
    const storeSize = item.storeSize || 1;
    const buyUnits = buyBase > 0 ? Math.ceil(buyBase / storeSize) : 0;
    
    if (buyUnits > 0) {
      const label = item.category || '➕ Extra';
      if (!groups[label]) groups[label] = [];
      groups[label].push(item);
      totalToBuy++;
    }
  });

  // Genera HTML per ogni gruppo
  Object.keys(groups).forEach(label => {
    const sectionDiv = document.createElement('div');
    sectionDiv.innerHTML = 
      '<div class="shop-section-title">' + label + '</div>' +
      '<table class="shop-table">' +
        '<thead><tr><th>Prodotto</th><th style="text-align:right">Da comprare</th></tr></thead>' +
        '<tbody id="buy-group-' + label.replace(/\s/g, '') + '"></tbody>' +
      '</table>';
    
    const tbody = sectionDiv.querySelector('tbody');
    groups[label].forEach(item => {
      tbody.appendChild(buildBuyRow(item, saved));
    });
    dynamicContainer.appendChild(sectionDiv);
  });

  const emptyMsg = document.getElementById('spesa-empty');
  if (emptyMsg) emptyMsg.style.display = totalToBuy === 0 ? 'block' : 'none';
  
  refreshSuggested(saved);
  updateRecipeAvailability(saved);
}

function updateRecipeAvailability(saved) {
  if (!saved) saved = loadSaved();
  const cards = document.querySelectorAll('.recipe-card');
  
  recipeIngredients.forEach(r => {
    let canCook = true;
    for (let ing of r.ingredients) {
      let have = parseFloat(saved[ing.id]) || 0;
      if (have < ing.amt) {
        canCook = false;
        break;
      }
    }
    
    cards.forEach(card => {
      const numElem = card.querySelector('.recipe-num');
      if (numElem && parseInt(numElem.textContent) === r.num) {
        const titleElem = card.querySelector('.recipe-title');
        if (titleElem) {
          let originalText = titleElem.dataset.originalText;
          if (!originalText) {
             originalText = titleElem.textContent.replace(/ ✅| ❌/g, '').trim();
             titleElem.dataset.originalText = originalText;
          }
          titleElem.textContent = originalText + (canCook ? ' ✅' : ' ❌');
        }
      }
    });
  });
}

function buildShopTable() {
  const saved = loadSaved();
  refreshBuyList();

  const dynamicContainer = document.getElementById('disp-dynamic-sections');
  if (!dynamicContainer) return;
  dynamicContainer.innerHTML = '';

  // Raggruppa tutti i prodotti per categoria
  const groups = {};

  // Prodotti standard
  ['frigo', 'secchi', 'liquidi'].forEach(section => {
    let label = '';
    if (section === 'frigo') label = '🧊 Frigo / Freezer';
    if (section === 'secchi') label = '🌾 Secchi';
    if (section === 'liquidi') label = '🫙 Liquidi';
    
    shopData[section].forEach(item => {
      if (!groups[label]) groups[label] = [];
      groups[label].push({ ...item, isCustom: false });
    });
  });

  // Prodotti extra
  customItems().forEach(item => {
    const label = item.category || '➕ Extra';
    if (!groups[label]) groups[label] = [];
    groups[label].push({ ...item, isCustom: true });
  });

  // Genera HTML per ogni gruppo
  Object.keys(groups).forEach(label => {
    const sectionDiv = document.createElement('div');
    sectionDiv.innerHTML = 
      '<div class="shop-section-title">' + label + '</div>' +
      '<table class="shop-table">' +
        '<thead><tr><th>Prodotto</th><th style="text-align:center">Serve</th><th style="text-align:center">Ho</th><th></th></tr></thead>' +
        '<tbody></tbody>' +
      '</table>';
    
    const tbody = sectionDiv.querySelector('tbody');
    groups[label].forEach(item => {
      if (item.isCustom) {
        // Riga custom con tasti edit/delete
        const id = 'custom_' + item.customId;
        const have = saved[id] !== undefined ? parseFloat(saved[id]) : 0;
        const unit = item.storeLabel || 'pz';
        const pct = item.need > 0 ? Math.min(100, (have / item.need) * 100) : (have > 0 ? 100 : 0);
        let colorClass = 'stock-ok';
        if (pct < 25) colorClass = 'stock-low';
        else if (pct < 60) colorClass = 'stock-mid';

        const tr = document.createElement('tr');
        tr.innerHTML =
          '<td style="padding-bottom:12px">' +
            '<div class="prod-name">' + item.name + '</div>' +
            '<div class="stock-bar-container"><div class="stock-bar-fill ' + colorClass + '" style="width:' + pct + '%"></div></div>' +
          '</td>' +
          '<td style="text-align:center; vertical-align:top; padding-top:10px"><div class="need-val">' + item.need + unit + '</div></td>' +
          '<td style="text-align:center; vertical-align:top; padding-top:10px">' +
            '<input class="have-input" type="number" min="0" placeholder="0" value="' + (have || '') + '" data-id="' + id + '" data-need="' + item.need + '" oninput="onHaveInput(this)" style="width:72px;display:inline-block">' +
            '<div style="font-size:0.7rem;color:var(--muted);text-align:center;margin-top:2px">' + unit + '</div>' +
          '</td>' +
          '<td style="white-space:nowrap; vertical-align:top; padding-top:6px">' +
            '<button class="delete-btn" onclick="startEditCustom(' + item.customId + ')">✎</button>' +
          '</td>';
        tbody.appendChild(tr);
      } else {
        // Riga standard
        tbody.appendChild(buildDispRow(item, saved));
      }
    });
    dynamicContainer.appendChild(sectionDiv);
  });
}

// Rimuovo buildCustomDispRows perché ora è integrata in buildShopTable
function buildCustomDispRows() { buildShopTable(); }

// Max single-recipe consumption per ingredient id
function buildMaxConsumption() {
  var max = {};
  recipeIngredients.forEach(function(r) {
    r.ingredients.forEach(function(ing) {
      if (!max[ing.id] || ing.amt > max[ing.id]) max[ing.id] = ing.amt;
    });
  });
  return max;
}

function refreshSuggested(saved) {
  if (!saved) saved = loadSaved();
  var maxC = buildMaxConsumption();
  var suggestedItems = [];
  allItems().forEach(function(item) {
    var have = parseFloat(saved[item.id]) || 0;
    var buyBase = calcBuy(item.need, have);
    if (buyBase > 0) return; // already in buy list
    
    if (item.isCustom) {
      if (item.need > 0 && have < item.need * 1.33) {
        suggestedItems.push(item);
      }
    } else {
      var maxUse = maxC[item.id] || 0;
      var buffer = item.suggestedBuffer || maxUse;
      if (buffer > 0 && (have - buffer) < item.need) {
        suggestedItems.push(item);
      }
    }
  });

  var section = document.getElementById('suggested-section');
  var tbody = document.getElementById('buy-suggested');
  if (!section || !tbody) return;

  if (suggestedItems.length === 0) {
    section.style.display = 'none';
    return;
  }
  section.style.display = 'block';
  tbody.innerHTML = '';
  suggestedItems.forEach(function(item) {
    var have = parseFloat(saved[item.id]) || 0;
    var maxUse = maxC[item.id] || 0;
    var buffer = item.suggestedBuffer || maxUse;
    var minBuyBase = item.need + buffer - have;
    var storeSize = item.storeSize || 1;
    var unitsNeeded = Math.ceil(minBuyBase / storeSize);
    var tr = document.createElement('tr');
    tr.className = 'buy-row-suggested';
    tr.innerHTML =
      '<td><div class="buy-row-name">' + item.name + '</div><div class="buy-row-sub">' + item.storeLabel + '</div></td>' +
      '<td><div class="buy-row-amt suggested" style="text-align:right">' + unitsNeeded + '</div></td>';
    tbody.appendChild(tr);
  });
}

function resetAll() {
  if (!confirm('Azzerare tutta la dispensa?')) return;
  Store.inventory = {};
  Store.commit();
}

// ==================== CUSTOM PRODUCTS ====================
let editingCustomId = null;

function customItems() {
  return Store.customs.map(function(c) {
    return {
      id: 'custom_' + c.id,
      name: c.name,
      unit: c.storeSize + ' ' + (c.unit || 'pz'),
      need: c.need,
      storeSize: c.storeSize,
      storeLabel: c.unit || 'pz',
      isCustom: true,
      customId: c.id,
      category: c.category // Aggiunta categoria
    };
  });
}

function allItems() {
  return [...shopData.frigo, ...shopData.secchi, ...shopData.liquidi, ...customItems()];
}

function startEditCustom(id) {
  const c = Store.customs.find(function(x) { return x.id === id; });
  if (!c) return;

  editingCustomId = id;
  
  // Popola campi
  document.getElementById('cf-nome').value = c.name;
  document.getElementById('cf-size').value = c.storeSize;
  document.getElementById('cf-need').value = c.need;
  document.getElementById('cf-have').value = Store.inventory['custom_' + id] || 0;

  // Assicurati che le categorie siano aggiornate prima di leggerle
  updateCategoryDropdown();

  const unitSelect = document.getElementById('cf-unit-select');
  const unitCustomInput = document.getElementById('cf-unit');
  
  // Gestione unità
  const unitOptions = Array.from(unitSelect.options).map(opt => opt.value);
  if (unitOptions.includes(c.unit) && c.unit !== 'CUSTOM') {
    unitSelect.value = c.unit;
    unitSelect.style.display = 'block';
    unitCustomInput.style.display = 'none';
  } else {
    unitSelect.value = 'CUSTOM';
    unitSelect.style.display = 'none';
    unitCustomInput.value = c.unit || '';
    unitCustomInput.style.display = 'block';
  }

  // Gestione categoria
  const catSelect = document.getElementById('cf-category-select');
  const catNewInput = document.getElementById('cf-category-new');
  const catOptions = Array.from(catSelect.options).map(opt => opt.value);
  
  const currentCat = c.category || '➕ Extra';
  
  if (catOptions.includes(currentCat)) {
    catSelect.value = currentCat;
    catSelect.style.display = 'block';
    catNewInput.style.display = 'none';
  } else {
    catSelect.value = 'NEW_CAT';
    catSelect.style.display = 'none';
    catNewInput.value = currentCat;
    catNewInput.style.display = 'block';
  }

  // Cambia UI pulsanti
  document.getElementById('cf-confirm-btn').textContent = '💾 Salva modifiche';
  document.getElementById('cf-cancel-btn').style.display = 'block';
  document.getElementById('cf-delete-btn').style.display = 'block';

  // Apri la card se chiusa
  const body = document.getElementById('body-custom');
  if (!body.classList.contains('open')) toggleDispensaCard('custom');
  
  // Scroll al modulo
  document.getElementById('body-custom').scrollIntoView({ behavior: 'smooth' });
}

function cancelEditCustom() {
  editingCustomId = null;
  
  // Reset form
  document.getElementById('cf-nome').value = '';
  document.getElementById('cf-size').value = '';
  document.getElementById('cf-need').value = '';
  document.getElementById('cf-have').value = '';
  document.getElementById('cf-unit').value = '';
  document.getElementById('cf-unit').style.display = 'none';
  document.getElementById('cf-unit-select').value = 'g';
  document.getElementById('cf-unit-select').style.display = 'block';
  
  document.getElementById('cf-category-new').value = '';
  document.getElementById('cf-category-new').style.display = 'none';
  document.getElementById('cf-category-select').value = '🧊 Frigo / Freezer';
  document.getElementById('cf-category-select').style.display = 'block';

  // Reset UI pulsanti
  document.getElementById('cf-confirm-btn').textContent = '+ Aggiungi prodotto';
  document.getElementById('cf-cancel-btn').style.display = 'none';
  document.getElementById('cf-delete-btn').style.display = 'none';
}

function deleteCustomProductFromEdit() {
  if (editingCustomId) {
    if (confirm('Eliminare definitivamente questo prodotto?')) {
      const idToDelete = editingCustomId;
      cancelEditCustom();
      Store.customs = Store.customs.filter(function(c) { return c.id !== idToDelete; });
      delete Store.inventory['custom_' + idToDelete];
      Store.commit();
    }
  }
}

function addCustomProduct() {
  const nome = document.getElementById('cf-nome').value.trim();
  const uSelect = document.getElementById('cf-unit-select');
  const uInput = document.getElementById('cf-unit');
  const cSelect = document.getElementById('cf-category-select');
  const cInput = document.getElementById('cf-category-new');
  
  let unit = uSelect.value === 'CUSTOM' ? uInput.value.trim() : uSelect.value;
  let category = cSelect.value === 'NEW_CAT' ? cInput.value.trim() : cSelect.value;
  
  const size = parseFloat(document.getElementById('cf-size').value) || 1;
  const need = parseFloat(document.getElementById('cf-need').value) || 0;
  const have = parseFloat(document.getElementById('cf-have').value) || 0;
  
  if (!nome) { alert('Inserisci il nome del prodotto.'); return; }
  if (!unit) { alert('Inserisci l\'unità di misura.'); return; }
  if (!category) { alert('Inserisci la categoria.'); return; }
  
  if (editingCustomId) {
    const index = Store.customs.findIndex(x => x.id === editingCustomId);
    if (index !== -1) {
      Store.customs[index] = { id: editingCustomId, name: nome, unit: unit, storeSize: size, need: need, category: category };
      Store.inventory['custom_' + editingCustomId] = have;
    }
    editingCustomId = null;
  } else {
    const id = Date.now();
    const newItem = { id: id, name: nome, unit: unit, storeSize: size, need: need, category: category };
    Store.customs.push(newItem);
    Store.inventory['custom_' + id] = have;
  }
  
  Store.commit();
  cancelEditCustom();
}

function handleUnitSelect(val) {
  const customInput = document.getElementById('cf-unit');
  const select = document.getElementById('cf-unit-select');
  if (val === 'CUSTOM') {
    select.style.display = 'none';
    customInput.style.display = 'block';
    customInput.focus();
  }
}

function handleCategorySelect(val) {
  const customInput = document.getElementById('cf-category-new');
  const select = document.getElementById('cf-category-select');
  if (val === 'NEW_CAT') {
    select.style.display = 'none';
    customInput.style.display = 'block';
    customInput.focus();
  }
}

function deleteCustomProduct(customId) {
  if (!confirm('Rimuovere questo prodotto?')) return;
  Store.customs = Store.customs.filter(function(c) { return c.id !== customId; });
  delete Store.inventory['custom_' + customId];
  Store.commit();
}

function buildCustomDispRows() {
  const customs = loadCustom();
  const title = document.getElementById('disp-custom-title');
  const table = document.getElementById('disp-custom-table');
  const tbody = document.getElementById('disp-custom');
  if (!tbody) return;
  if (customs.length === 0) {
    title.style.display = 'none';
    table.style.display = 'none';
    return;
  }
  title.style.display = 'block';
  table.style.display = 'table';
  const saved = loadSaved();
  tbody.innerHTML = '';
  customs.forEach(function(c) {
    const id = 'custom_' + c.id;
    const have = saved[id] !== undefined ? parseFloat(saved[id]) : 0;
    const unit = c.unit || 'pz';
    
    // Calcolo barra scorta
    const pct = c.need > 0 ? Math.min(100, (have / c.need) * 100) : (have > 0 ? 100 : 0);
    let colorClass = 'stock-ok';
    if (pct < 25) colorClass = 'stock-low';
    else if (pct < 60) colorClass = 'stock-mid';

    const tr = document.createElement('tr');
    tr.innerHTML =
      '<td style="padding-bottom:12px">' +
        '<div class="prod-name">' + c.name + '</div>' +
        '<div class="stock-bar-container"><div class="stock-bar-fill ' + colorClass + '" style="width:' + pct + '%"></div></div>' +
      '</td>' +
      '<td style="text-align:center; vertical-align:top; padding-top:10px"><div class="need-val">' + c.need + unit + '</div></td>' +
      '<td style="text-align:center; vertical-align:top; padding-top:10px">' +
        '<input class="have-input" type="number" min="0" placeholder="0" value="' + (have || '') + '" data-id="' + id + '" data-need="' + c.need + '" oninput="onHaveInput(this)" style="width:72px;display:inline-block">' +
        '<div style="font-size:0.7rem;color:var(--muted);text-align:center;margin-top:2px">' + unit + '</div>' +
      '</td>' +
      '<td style="white-space:nowrap; vertical-align:top; padding-top:6px">' +
        '<button class="delete-btn" onclick="startEditCustom(' + c.id + ')">✎</button>' +
        '<button class="delete-btn" onclick="deleteCustomProduct(' + c.id + ')">🗑</button>' +
      '</td>';
    tbody.appendChild(tr);
  });
}

const recipeIngredients = [
  { num:1,  name:'Riso Integrale + Tofu',       ingredients: [{id:'riso',amt:340},{id:'tofu',amt:360},{id:'broccoli',amt:400},{id:'olio',amt:50}] },
  { num:2,  name:'Dahl Lenticchie + Couscous',  ingredients: [{id:'lenticchie',amt:260},{id:'couscous',amt:200},{id:'broccoli',amt:400},{id:'olio',amt:40},{id:'latte_soia',amt:150}] },
  { num:3,  name:'Minestrone Farro + Fagioli',  ingredients: [{id:'fagioli',amt:250},{id:'farro',amt:250},{id:'minestrone',amt:500},{id:'olio',amt:30}] },
  { num:4,  name:'Riso al Forno + Ceci',        ingredients: [{id:'riso',amt:220},{id:'ceci',amt:250},{id:'broccoli',amt:400},{id:'passata',amt:700},{id:'olio',amt:30}] },
  { num:5,  name:'Pasta al Forno Ignorante',    ingredients: [{id:'pasta',amt:200},{id:'lenticchie',amt:220},{id:'broccoli',amt:400},{id:'passata',amt:700},{id:'olio',amt:50},{id:'latte_soia',amt:100}] },
  { num:6,  name:'Teglia Tofu e Patate',        ingredients: [{id:'tofu',amt:360},{id:'patate',amt:1400},{id:'broccoli',amt:400},{id:'olio',amt:60}] },
  { num:7,  name:'Couscous + Ceci Croccanti',   ingredients: [{id:'ceci',amt:260},{id:'couscous',amt:230},{id:'broccoli',amt:400},{id:'olio',amt:35}] },
  { num:8,  name:'Fagioli con Polenta',         ingredients: [{id:'fagioli',amt:290},{id:'polenta',amt:240},{id:'broccoli',amt:400},{id:'olio',amt:25}] },
  { num:9,  name:'Pasta e Lenticchie',          ingredients: [{id:'lenticchie',amt:320},{id:'pasta',amt:190},{id:'broccoli',amt:400},{id:'olio',amt:30}] },
  { num:10, name:'Zuppa Ceci e Farro',          ingredients: [{id:'ceci',amt:270},{id:'farro',amt:220},{id:'broccoli',amt:400},{id:'olio',amt:35}] },
];

// (allItems defined above with custom support)
function getItem(id) { return allItems().find(function(i){ return i.id === id; }); }
function fmtAmt(id, amt) {
  const item = getItem(id);
  return (item && item.suffix) ? amt + ' ' + item.suffix : amt + 'g';
}

function updateCategoryDropdown() {
  const select = document.getElementById('cf-category-select');
  if (!select) return;

  // Categorie standard
  const standards = ['🧊 Frigo / Freezer', '🌾 Secchi', '🫙 Liquidi', '➕ Extra'];
  
  // Recupera categorie uniche dai prodotti custom esistenti
  const userCats = Store.customs
    .map(c => c.category)
    .filter(cat => cat && !standards.includes(cat));
  
  const uniqueUserCats = [...new Set(userCats)].sort();

  // Ricostruisci il menu
  let html = '';
  standards.forEach(cat => {
    html += '<option value="' + cat + '">' + cat + '</option>';
  });
  
  if (uniqueUserCats.length > 0) {
    html += '<optgroup label="Le tue categorie">';
    uniqueUserCats.forEach(cat => {
      html += '<option value="' + cat + '">' + cat + '</option>';
    });
    html += '</optgroup>';
  }
  
  html += '<option value="NEW_CAT">➕ Nuova categoria...</option>';
  
  // Salva il valore corrente per non perderlo durante il refresh (se non è NEW_CAT)
  const currentVal = select.value;
  select.innerHTML = html;
  
  if (currentVal && currentVal !== 'NEW_CAT') {
    select.value = currentVal;
  }
}

function toggleDispensaCard(key) {
  const body = document.getElementById('body-' + key);
  const chev = document.getElementById('chev-' + key);
  const isOpen = body.classList.contains('open');
  body.classList.toggle('open', !isOpen);
  chev.style.transform = isOpen ? '' : 'rotate(180deg)';
  if (!isOpen && key === 'dispensa-attuale') buildShopTable();
  if (!isOpen && key === 'custom') {
    updateCategoryDropdown();
    buildCustomDispRows();
  }
  if (!isOpen && key === 'spesa-fatta') buildSpesaFattaRows();
  if (!isOpen && key === 'cucinato') buildRecipeBtns();
}

function buildSpesaFattaRows() {
  const saved = loadSaved();
  const container = document.getElementById('spesa-fatta-rows');
  container.innerHTML = '';
  allItems().forEach(function(item) {
    const buyBase = calcBuy(item.need, saved[item.id] !== undefined ? saved[item.id] : '');
    const storeSize = item.storeSize || 1;
    const step = item.step ? (item.step / storeSize) : 1;
    const suggestedUnits = buyBase > 0 ? Math.ceil(buyBase / storeSize) : 0;
    const inputId = 'sf-input-' + item.id;
    const div = document.createElement('div');
    div.className = 'spesa-row';
    div.innerHTML =
      '<div class="spesa-row-name">' + item.name + '</div>' +
      '<div class="spesa-stepper">' +
        '<button class="spesa-step-btn" onclick="stepSpesa(\'' + inputId + '\',-' + step + ')">−</button>' +
        '<input class="spesa-row-input" id="' + inputId + '" type="number" min="0" value="' + (suggestedUnits > 0 ? suggestedUnits : '') + '" placeholder="0" data-id="' + item.id + '" data-store-size="' + storeSize + '">' +
        '<button class="spesa-step-btn" onclick="stepSpesa(\'' + inputId + '\',' + step + ')">+</button>' +
      '</div>' +
      '<div class="spesa-row-unit" style="font-size:0.7rem;min-width:80px">' + item.storeLabel + '</div>';
    container.appendChild(div);
  });
}

function stepSpesa(inputId, delta) {
  const input = document.getElementById(inputId);
  if (!input) return;
  const current = parseFloat(input.value) || 0;
  input.value = Math.max(0, current + delta) || '';
}

function confermaSpesa() {
  const inputs = document.querySelectorAll('#spesa-fatta-rows .spesa-row-input');
  var changed = 0;
  inputs.forEach(function(input) {
    const id = input.dataset.id;
    const units = parseFloat(input.value) || 0;
    if (units > 0) {
      const storeSize = parseFloat(input.dataset.storeSize) || 1;
      const addBase = units * storeSize;
      const current = parseFloat(Store.inventory[id]) || 0;
      Store.inventory[id] = current + addBase;
      changed++;
    }
  });
  if (changed === 0) { alert('Nessun valore da aggiungere.'); return; }
  
  Store.commit();
  buildSpesaFattaRows();
  alert('Dispensa aggiornata (' + changed + ' prodotti).');

  // Chiudi la sezione per feedback visivo
  const body = document.getElementById('body-spesa-fatta');
  const chev = document.getElementById('chev-spesa-fatta');
  if (body) body.classList.remove('open');
  if (chev) chev.style.transform = '';
}

var selectedRecipesState = new Set();

function buildRecipeBtns() {
  buildCucinatoUI();
}

function buildCucinatoUI() {
  // ultima spesa display
  const saved = loadSaved();
  const ultimaNum = saved['_ultima_spesa'] || null;
  const ultimaR = ultimaNum ? recipeIngredients.find(function(r){ return r.num === ultimaNum; }) : null;
  document.getElementById('ultima-spesa-text').textContent = ultimaR ? 'R' + ultimaR.num + ' · ' + ultimaR.name : 'Non impostata';

  // ultima spesa edit grid
  const grid = document.getElementById('ultima-spesa-grid');
  grid.innerHTML = '';
  recipeIngredients.forEach(function(r) {
    const btn = document.createElement('button');
    btn.className = 'recipe-btn' + (ultimaNum === r.num ? ' selected' : '');
    btn.style.cssText = ultimaNum === r.num ? 'background:#e8f2eb;border-color:var(--accent2);color:var(--accent2)' : '';
    btn.innerHTML = '<span class="rnum">' + r.num + '</span>' + r.name;
    btn.onclick = function() { setUltimaSpesa(r.num); };
    grid.appendChild(btn);
  });

  // checkboxes grid
  buildCheckGrid();
}

function setUltimaSpesa(num) {
  Store.inventory['_ultima_spesa'] = num;
  Store.persist();
  
  const r = recipeIngredients.find(function(item){ return item.num === num; });
  alert('Impostata come ultima ricetta: R' + num + ' - ' + r.name);

  // Chiudi la sezione
  const edit = document.getElementById('ultima-spesa-edit');
  if (edit) edit.style.display = 'none';
  document.querySelector('.ultima-change-btn').textContent = 'Cambia';

  const body = document.getElementById('body-cucinato');
  const chev = document.getElementById('chev-cucinato');
  if (body) body.classList.remove('open');
  if (chev) chev.style.transform = '';

  buildCucinatoUI();
}

function toggleUltimaEdit() {
  const edit = document.getElementById('ultima-spesa-edit');
  const isOpen = edit.style.display !== 'none';
  edit.style.display = isOpen ? 'none' : 'block';
  document.querySelector('.ultima-change-btn').textContent = isOpen ? 'Cambia' : 'Chiudi';
}

function buildCheckGrid() {
  const grid = document.getElementById('recipe-check-grid');
  grid.innerHTML = '';
  recipeIngredients.forEach(function(r) {
    const btn = document.createElement('button');
    btn.className = 'recipe-check-btn' + (selectedRecipesState.has(r.num) ? ' selected' : '');
    btn.id = 'chk-' + r.num;
    btn.innerHTML = '<span class="rnum">' + r.num + '</span>' + r.name;
    btn.onclick = function() { toggleRecipeCheck(r.num); };
    grid.appendChild(btn);
  });
  updatePreview();
}

function toggleRecipeCheck(num) {
  if (selectedRecipesState.has(num)) {
    selectedRecipesState.delete(num);
  } else {
    selectedRecipesState.add(num);
  }
  const btn = document.getElementById('chk-' + num);
  if (btn) btn.classList.toggle('selected', selectedRecipesState.has(num));
  updatePreview();
}

function getSelectedRecipes() {
  // Trasforma il Set in array per preservare l'ordine di clic
  const selectedNums = Array.from(selectedRecipesState);
  return selectedNums.map(function(num) {
    return recipeIngredients.find(function(r) { return r.num === num; });
  }).filter(Boolean);
}

let isCucinatoEditable = false;

function toggleModificaCucinato() {
  isCucinatoEditable = !isCucinatoEditable;
  const btn = document.getElementById('btn-modifica-cucinato');
  if (btn) {
    btn.textContent = isCucinatoEditable ? '❌ Annulla' : '✏️ Modifica';
  }
  updatePreview();
}

function updatePreview() {
  const selected = getSelectedRecipes();
  const preview = document.getElementById('cucinato-preview');
  if (selected.length === 0) { preview.style.display = 'none'; return; }

  // aggregate ingredients
  const totals = {};
  selected.forEach(function(r) {
    r.ingredients.forEach(function(ing) {
      totals[ing.id] = (totals[ing.id] || 0) + ing.amt;
    });
    // Consumo colazione (250g per ricetta/giorno)
    totals['latte_soia'] = (totals['latte_soia'] || 0) + 250;
  });

  const rows = document.getElementById('cucinato-preview-rows');
  rows.innerHTML = '';
  Object.keys(totals).forEach(function(id) {
    const item = getItem(id);
    const div = document.createElement('div');
    div.className = 'preview-row';
    
    let amtDisplay = '- ' + fmtAmt(id, totals[id]);
    
    if (isCucinatoEditable) {
       const unit = (item && item.suffix) ? item.suffix : 'g';
       amtDisplay = `<input type="number" class="spesa-row-input cucinato-edit-input" data-id="${id}" value="${totals[id]}" style="width:60px; padding:4px; text-align:right;"> <span style="font-size:0.75rem;color:var(--muted)">${unit}</span>`;
    }

    div.innerHTML =
      '<span class="preview-row-name">' + (item ? item.name : id) + '</span>' +
      '<span class="preview-row-amt" style="display:flex;align-items:center;gap:4px">' + amtDisplay + '</span>';
    rows.appendChild(div);
  });
  preview.style.display = 'block';
}

function confermaCucinato() {
  const selected = getSelectedRecipes();
  if (selected.length === 0) { alert('Seleziona almeno una ricetta.'); return; }

  const totalsToSubtract = {};
  
  if (isCucinatoEditable) {
    const inputs = document.querySelectorAll('.cucinato-edit-input');
    inputs.forEach(input => {
      const val = parseFloat(input.value) || 0;
      if (val > 0) totalsToSubtract[input.dataset.id] = val;
    });
  } else {
    selected.forEach(function(r) {
      r.ingredients.forEach(function(ing) {
        totalsToSubtract[ing.id] = (totalsToSubtract[ing.id] || 0) + ing.amt;
      });
      // Consumo colazione (250g per ricetta/giorno)
      totalsToSubtract['latte_soia'] = (totalsToSubtract['latte_soia'] || 0) + 250;
    });
  }

  Object.keys(totalsToSubtract).forEach(function(id) {
    const current = parseFloat(Store.inventory[id]) || 0;
    Store.inventory[id] = Math.max(0, current - totalsToSubtract[id]);
  });

  // aggiorna ultima spesa all'ultima ricetta selezionata
  const lastNum = selected[selected.length - 1].num;
  Store.inventory['_ultima_spesa'] = lastNum;

  Store.commit();
  
  // Reset stato logico
  selectedRecipesState.clear();
  isCucinatoEditable = false;
  const btn = document.getElementById('btn-modifica-cucinato');
  if (btn) btn.textContent = '✏️ Modifica';
  
  buildCucinatoUI();
  updatePreview();
  
  alert('Scalate ' + selected.length + ' ricett' + (selected.length === 1 ? 'a' : 'e') + ' dalla dispensa.');

  // Chiudi la sezione per feedback visivo
  const body = document.getElementById('body-cucinato');
  const chev = document.getElementById('chev-cucinato');
  if (body) body.classList.remove('open');
  if (chev) chev.style.transform = '';
}

// ==================== SINCRONIZZAZIONE ====================
function exportSyncData() {
  const data = {
    inventory: Store.inventory,
    customs: Store.customs,
    v: 1
  };
  // encodeURIComponent gestisce correttamente i caratteri speciali prima di btoa
  const code = btoa(encodeURIComponent(JSON.stringify(data)));
  const area = document.getElementById('sync-area');
  area.value = code;
  
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(code).then(() => {
      alert('Codice copiato negli appunti! Invialo all\'altro dispositivo e incollalo lì.');
    }).catch(() => {
      fallbackCopy(area);
    });
  } else {
    fallbackCopy(area);
  }
}

function fallbackCopy(area) {
  area.select();
  area.setSelectionRange(0, 99999);
  try {
    document.execCommand('copy');
    alert('Codice copiato negli appunti! Invialo all\'altro dispositivo e incollalo lì.');
  } catch (err) {
    alert('Codice generato! Copialo manualmente dall\'area di testo.');
  }
}

function importSyncData() {
  const area = document.getElementById('sync-area');
  const code = area.value.trim();
  if (!code) { alert('Incolla prima un codice di sincronizzazione.'); return; }
  
  try {
    // decodeURIComponent ripristina la stringa originale dopo atob
    const data = JSON.parse(decodeURIComponent(atob(code)));
    if (!confirm('Importando questi dati sovrascriverai la dispensa attuale. Continuare?')) return;
    
    Store.inventory = data.inventory || {};
    Store.customs = data.customs || [];
    Store.commit();
    
    area.value = '';
    alert('Dati importati con successo!');
  } catch (err) {
    alert('Codice non valido. Assicurati di aver copiato il codice corretto dal PC.');
  }
}

// Inizializzazione al caricamento della pagina
window.addEventListener('DOMContentLoaded', buildShopTable);

// Registrazione Service Worker per PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js')
      .then(reg => {
        console.log('Service Worker registrato!', reg);
        
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
      .catch(err => console.error('Errore registrazione SW:', err));
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