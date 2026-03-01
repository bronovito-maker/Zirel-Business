# Zirèl: Il Concierge AI della Riviera 🌅🤖

Soluzione AI per l'ospitalità e le attività commerciali della Riviera Romagnola. Widget chat intelligente, configurabile, zero-backend per il cliente.

---

## Struttura del Progetto

```
Zirel-Business/
├── README.md
├── PRELAUNCH.md            ← checklist pre-pubblicazione
├── .gitignore
├── demo/                   ← applicazione web (Vite multi-page)
│   ├── public/             ← asset statici copiati in dist/
│   │   ├── config.js       ← endpoint demo (committato, vedi ARCHITECTURE.md)
│   │   ├── chat.js         ← logica chat condivisa
│   │   └── ui-helpers.js   ← carousel, FAQ, navbar
│   ├── index.html          ← landing principale
│   ├── demo.html           ← demo interattiva Chiringuito da Gino
│   ├── pricing.html
│   ├── privacy.html
│   ├── cookie.html
│   ├── style.css
│   ├── vite.config.js
│   ├── package.json
│   ├── generate-config.js  ← genera config.js da env var (clienti reali)
│   └── config.template.js  ← campi configurabili (solo riferimento, non buildato)
└── docs/
    ├── technical/ARCHITECTURE.md
    ├── integration/INTEGRATION_GUIDE.md
    └── ai/                 ← prompt e tone of voice
```

---

## Setup Locale (sviluppo)

```bash
cd demo
npm install
npm run dev       # avvia Vite su http://localhost:5173
```

La demo usa la config pubblica in `public/config.js` — nessuna configurazione aggiuntiva necessaria.

---

## Build di Produzione

```bash
cd demo
npm run build     # genera demo/dist/
```

Per clienti con credenziali proprie, imposta prima `ZIREL_WEBHOOK_URL` e `ZIREL_TENANT_ID` nel tuo ambiente (`.env.local` o Vercel Dashboard).

---

## Deploy su Vercel

| Campo | Valore |
|-------|--------|
| Root Directory | `demo` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

→ Segui `docs/integration/INTEGRATION_GUIDE.md` per il dettaglio completo.

---

*Realizzato con ❤️ e piadina per la Riviera.*
