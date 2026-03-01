# Zirèl: Il Concierge AI della Riviera 🌅🤖

Soluzione AI per l'ospitalità e le attività commerciali della Riviera Romagnola. Widget chat intelligente, configurabile, zero-backend per il cliente.

---

## Struttura del Progetto

```
Zirel-Business/
├── README.md
├── PRELAUNCH.md            ← checklist pre-pubblicazione
├── .gitignore
├── demo/                   ← applicazione web vetrina (Vite multi-page)
│   ├── public/             ← asset statici copiati in dist/
│   │   ├── config.js       ← endpoint demo e tenant configurati
│   │   ├── chat.js         ← logica chat condivisa
│   │   └── ui-helpers.js   ← carousel, FAQ, navbar
│   ├── index.html          ← landing principale
│   ├── demo.html           ← demo interattiva Chiringuito da Gino
│   ├── pricing.html
│   ├── privacy.html
│   ├── cookie.html
│   └── vite.config.js
├── dashboard/              ← applicazione web React SPA per i clienti
│   ├── src/                ← componenti React (Login, Dashboard, Reservations)
│   ├── index.html          ← entry point (Zirèl Dashboard)
│   ├── vercel.json         ← regole di fallback SPA per Vercel
│   └── vite.config.ts
└── docs/
    ├── technical/ARCHITECTURE.md
    ├── integration/INTEGRATION_GUIDE.md
    └── ai/                 ← prompt e tone of voice
```

---

## Setup Locale (sviluppo)

### Sito Vetrina (`/demo`)

```bash
cd demo
npm install
npm run dev       # avvia Vite su http://localhost:5173
```

La demo usa la config pubblica in `public/config.js` — nessuna configurazione aggiuntiva necessaria.

### Dashboard Clienti (`/dashboard`)

```bash
cd dashboard
npm install
npm run dev       # avvia React app su http://localhost:5174
```
La dashboard richiede le chiavi `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` nel file `.env.local` per connettersi al database PostgreSQL.

---

## Build di Produzione e Deploy

Il progetto è diviso in due deploy separati: sito vetrina e dashboard.

### 1. Sito Vetrina
Vai nella cartella `demo` e usa `npm run build`. Su Vercel:
| Campo | Valore |
|-------|--------|
| Root Directory | `demo` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

### 2. Dashboard
Questa è un'applicazione Single Page (SPA) React connessa a Supabase. Su Vercel (es. `dashboard.zirel.org`):
| Campo | Valore |
|-------|--------|
| Root Directory | `dashboard` |
| Build Command | `npm run build` |
| Output Directory | `dist` |
| Env Vars | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

> ⚠️ Il file `dashboard/vercel.json` assicura che il routing React funzioni correttamente (fallback a `index.html`).

---

→ Segui `docs/integration/INTEGRATION_GUIDE.md` per il dettaglio completo.

---

*Realizzato con ❤️ e piadina per la Riviera.*
