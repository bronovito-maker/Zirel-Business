# Architettura Tecnica — Zirèl

Progetto: landing statica multi-pagina con widget chat AI integrato.

---

## Stack

| Livello      | File / Tecnologia     | Responsabilità                                    |
|--------------|-----------------------|---------------------------------------------------|
| Frontend Vetrina | HTML + CSS            | Landing, demo, pricing, pagine legali             |
| Client Dashboard | React + Tailwind (Vite)| Pannello di controllo, gestione AI, prenotazioni  |
| Config demo  | `public/config.js`    | Endpoint webhook + tenant_id — committato         |
| Chat Logic   | `public/chat.js`      | Fetch al webhook, escape XSS, rendering messaggi  |
| UI Logic     | `public/ui-helpers.js`| Carousel, FAQ, navbar, hamburger                  |
| Build        | Vite                  | Multi-pagina per vetrina, SPA per dashboard       |
| Automation   | n8n                   | Routing, AI Agent, lettura Supabase, prenotazioni |
| AI           | OpenAI GPT-4o         | Generazione risposte                              |
| Database     | Supabase (PostgreSQL) | CMS no-code (menu, orari), prenotazioni, Qdrant   |

---

## Struttura del Repository

```
Zirel-Business/
├── README.md
├── PRELAUNCH.md
├── .gitignore
├── demo/
│   ├── public/            ← copiati in dist/ verbatim
│   │   ├── config.js      ← ✅ COMMITTATO (config demo pubblica)
│   │   ├── config.template.js ← riferimento campi (usato da client-deploy)
│   │   ├── chat.js
│   │   └── ui-helpers.js
│   ├── index.html
│   ├── demo.html
│   ├── pricing.html
│   ├── privacy.html
│   ├── cookie.html
│   ├── vite.config.js
│   ├── package.json
│   └── client-deploy.js   ← strumento per clienti reali
├── dashboard/
│   ├── src/               ← React components for Supabase sync
│   ├── vercel.json
│   └── vite.config.ts
└── docs/
    ├── technical/ARCHITECTURE.md
    ├── integration/INTEGRATION_GUIDE.md
    └── ai/
```

---

## Strategia di Configurazione

**Scelta definitiva: `public/config.js` è pubblico e versionato.**

| Aspetto | Scelta |
|---------|--------|
| config.js nel repo? | ✅ Sì — contiene l'endpoint della demo |
| Secret? | No — è un URL client-side visibile via DevTools |
| Nel .gitignore? | No |
| Come si builda? | `npm run build` — build Vite pura, nessuna generazione |

### Per la demo pubblica

1. `npm run build`
2. Deploy `dist/` su Vercel

### Per un sito cliente reale

Usa `client-deploy.js` per sovrascrivere `public/config.js` prima del build:

```bash
export ZIREL_WEBHOOK_URL=https://tuo-webhook
export ZIREL_TENANT_ID=nome_cliente
npm run client:setup && npm run build
```

---

## Dual Persona Chat

| Pagina | `tenantId` | Comportamento |
|--------|-----------|---------------|
| Tutte tranne `/demo.html` | `zirel_official` | Consulente di vendita Zirèl |
| `/demo.html` | `chiringuito_gino_001` | Receptionist white-label Chiringuito da Gino |

L'override avviene in un inline script in `demo.html` che sovrascrive `window.ZirelConfig` prima del caricamento di `chat.js`.

---

## Sicurezza

- **XSS**: risposte bot passano per `escapeHTML()` con `String()` coercion prima di `.innerHTML`.
- **Sessioni**: UUID in `sessionStorage` — nessun cookie, nessun dato persistente.
- **Demo endpoint**: intenzionalmente pubblico — limitato al tenant `zirel_official`.
