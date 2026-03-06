# 🥦 Meal Plan PWA

Un'applicazione web progressiva (PWA) moderna per la pianificazione dei pasti vegani, ottimizzata per l'uso mobile. Gestisce ricette ad alto contenuto proteico, liste della spesa intelligenti e una dispensa dinamica con supporto offline completo.

## 🚀 Caratteristiche Principali

- **Gestione Ricette**: 10 ricette vegane bilanciate (~1100 kcal) con calcolo automatico dei macros.
- **Dispensa Dinamica**: Gestione scorte con barre di avanzamento visive (verde/giallo/rosso) e supporto per unità di misura miste (g, kg, pz, bott).
- **Prodotti Extra**: Possibilità di aggiungere, modificare ed eliminare prodotti personalizzati fuori dal piano base.
- **Categorie Intelligenti**: Organizzazione automatica della spesa e della dispensa in categorie (Frigo, Secchi, Liquidi) con supporto per nuove categorie create dall'utente.
- **Lista Spesa Automatica**: Calcolo dei quantitativi necessari in base alle scorte minime impostate e a quanto già presente in casa.
- **Sync Locale**: Trasferimento dati tra dispositivi (PC ↔ Smartphone) tramite codici di import/export, garantendo la massima privacy senza database esterni.
- **PWA Ready**: Installabile come app nativa su iOS e Android. Funziona offline grazie al Service Worker integrato.

## 📱 Installazione Mobile

L'app è ottimizzata per essere ospitata su **GitHub Pages**:

1. Carica i file in un repository GitHub.
2. Attiva **Settings > Pages** selezionando il branch `main`.
3. Apri il link dal browser dello smartphone.
4. **Android (Chrome)**: Seleziona "Installa app" dal menu.
5. **iOS (Safari)**: Tocca l'icona "Condividi" e seleziona "Aggiungi alla schermata Home".

## 🛠 Note Tecniche

- **Stack**: Vanilla JS (ES6+), HTML5, CSS3 (con supporto nativo Dark Mode).
- **Persistenza**: LocalStorage API per dati persistenti senza account.
- **Offline**: Service Worker con strategia *Network-First* per aggiornamenti rapidi.
- **Performance**: Zero dipendenze esterne, caricamento istantaneo.

---
Progettato per semplificare la gestione alimentare quotidiana.
