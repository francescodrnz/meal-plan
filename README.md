# 🥦 Meal Plan PWA

Un pianificatore di pasti vegano (2 porzioni, ~1100 kcal/pasto) ottimizzato per l'uso mobile. Gestisce ricette, lista della spesa intelligente e dispensa con supporto offline.

## ✨ Funzionalità principali

- **10 Ricette Bilanciate**: Database integrato di ricette vegane ad alto contenuto calorico e proteico.
- **Dispensa Intelligente**: Gestione mista dei prodotti (grammi per i secchi, unità/panetti per tofu e passata).
- **Consumo Automatico**: Il sistema scala automaticamente 250g di latte di soia per ogni pasto cucinato (colazione giornaliera).
- **Lista Spesa Dinamica**: Genera la lista di cosa comprare in base a ciò che hai effettivamente in dispensa.
- **Sincronizzazione Manuale**: Trasferisci i dati tra PC e Telefono tramite codici di import/export sicuri (senza bisogno di database esterni).
- **Info & Recap**: Tab centralizzata con valori nutrizionali, legenda ingredienti e note operative.
- **PWA (Progressive Web App)**: Installabile sulla home del telefono. Funziona offline e senza barre del browser.
- **State Management Centralizzato**: Sistema di salvataggio robusto nel `localStorage` gestito tramite uno Store globale.

## 🚀 Installazione su Smartphone

Questa app è pensata per essere caricata su **GitHub Pages**:

1. Carica i file (`index.html`, `manifest.json`, `sw.js` e le icone) su un repository GitHub.
2. Attiva **GitHub Pages** nelle impostazioni del repository (Settings > Pages).
3. Apri il link `https://<tuo-utente>.github.io/<repo>/` dal telefono.
4. **Android (Chrome)**: Tocca i tre puntini e seleziona "Installa app" o "Aggiungi a schermata Home".
5. **iOS (Safari)**: Tocca l'icona "Condividi" (quadrato con freccia) e seleziona "Aggiungi alla schermata Home".

## 🔄 Come sincronizzare PC e Telefono

Poiché i dati sono salvati localmente per privacy e sicurezza, per sincronizzarli:
1. Sul dispositivo sorgente, vai nella tab **Info** e clicca su **Copia Dati 📋**.
2. Invia il codice generato all'altro dispositivo (via WhatsApp, Email, etc.).
3. Sul dispositivo di destinazione, incolla il codice nell'area di testo della tab **Info** e clicca su **Importa Dati 📥**.

## 🛠 Note Tecniche

- **Entry Point**: `index.html` (rinominato per compatibilità standard con GitHub Pages).
- **Linguaggio**: Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Persistenza**: LocalStorage API.
- **Offline**: Service Worker API per il caching degli asset.

---
Sviluppato con ❤️ per una gestione semplice dei pasti.
