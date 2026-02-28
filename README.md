# Zirèl: Il Concierge AI della Riviera 🌅🤖

Benvenuto nella repository ufficiale di **Zirèl**, la soluzione definitiva di intelligenza artificiale progettata esclusivamente per l'ospitalità e le attività commerciali della Riviera Romagnola.

## 🏖️ La Visione
Il settore dell'ospitalità in Riviera è veloce, stagionale e richiede un'attenzione al cliente impareggiabile. Che sia un Hotel a Rimini, un Chiringuito a Riccione o uno Studio Medico a Cattolica, il problema è sempre lo stesso: **troppe richieste ripetitive, poco tempo e personale sovraccarico**. 

Zirèl risolve questo problema. Non è un semplice chatbot, ma un vero e proprio "Concierge Digitale" che risponde istantaneamente alle domande frequenti, gestisce le prenotazioni, illustra i servizi e consiglia le attività locali, permettendo al tuo staff di concentrarsi su ciò che conta davvero: **l'accoglienza calorosa di persona**.

## 🚀 Lo Stack Tecnologico
Zirèl è costruito su un'architettura moderna, progettata per essere veloce, scalabile e facile da gestire:

* **Antigravity (Frontend & AI Agent):** Gestisce l'interfaccia utente (HTML/Tailwind), il widget della chat e l'elaborazione del linguaggio naturale (NLP) per comprendere l'intento dell'utente con la tipica cordialità romagnola.
* **n8n (Workflow Automation):** Il "cervello logico". Riceve i webhook dal widget, orchestra i processi di verifica e formatta le risposte da restituire all'utente.
* **Google Sheets (Il Database Accessibile):** Funge da database "No-Code" per le attività. Permette ai gestori di aggiornare orari, menu, eventi e listini prezzi da un normale foglio Excel, rendendo l'AI sempre aggiornata senza bisogno di competenze tecniche.

### Perché questo stack?
* **Velocità:** L'integrazione fluida garantisce risposte quasi istantanee.
* **Affidabilità:** Strumenti enterprise-grade come n8n assicurano zero downtime.
* **Gestione No-Code:** Il cliente finale gestisce il "cervello" dell'AI (i dati) tramite Google Sheets.

## 🛠️ Struttura della Repository
La repository è organizzata per facilitare la navigazione sia ai webmaster che a chi gestisce la logica AI:

* `/docs/technical/`: Architettura tecnica, reference API.
* `/docs/integration/`: Guide per l'integrazione del widget nei siti web.
* `/docs/ai/`: Libreria dei prompt e linee guida sul Tone of Voice.

## ⚡ Setup Rapido (Local Development)

Per avviare la demo frontend di Zirèl localmente (richiede Node.js):

```bash
# Installa le dipendenze
npm install

# Avvia il server di sviluppo (Vite)
npm run dev
```

Una volta avviato, la demo sarà disponibile su `http://localhost:5173`.

---

*Realizzato con ❤️ e piadina per la Riviera.*
