# Zirèl Project Context (End-to-End)

Data di riferimento: 2026-03-04

## 1) Cos'e Zirèl

Zirèl e una piattaforma AI multi-tenant per gestire il primo contatto digitale (chat, richieste, lead, prenotazioni e intake), con:

- un frontend pubblico (Core + settori + demo live + pricing + supporto)
- un dashboard clienti React/TypeScript
- un data layer su Supabase
- workflow AI e ingestione orchestrati in n8n

## 2) Struttura del repository

- `demo/`: sito pubblico e pagine commerciali
- `dashboard/`: pannello clienti autenticato
- `docs/`: documentazione tecnica, AI e integrazione

Riferimenti principali:

- `README.md`
- `docs/README.md`
- `docs/technical/ARCHITECTURE.md`
- `docs/technical/HANDOFF_CONTEXT_CURRENT.md`
- `docs/technical/PRICING_MODEL.md`
- `docs/technical/FRONTEND_TENANT_MAP.md`

## 3) Frontend pubblico (demo/)

### Pagine Core e supporto

- `demo/index.html` (homepage Zirèl Core)
- `demo/pricing.html` (hub pricing per settore)
- `demo/contatti.html`
- `demo/faq.html`
- `demo/login.html`
- `demo/register.html`
- `demo/privacy.html`
- `demo/cookie.html`

### Pagine per settore

- Restaurant: `demo/restaurant.html`, `demo/pricing-restaurant.html`, `demo/demo.html`
- Hotel: `demo/hotel.html`, `demo/pricing-hotel.html`, `demo/hotel-demo.html`
- Professional: `demo/professional.html`, `demo/pricing-professional.html`, `demo/professional-demo.html`

### Branding e UI

- CSS condiviso: `demo/style.css`
- Componenti JS condivisi: `demo/public/ui-helpers.js`
- Linguaggio pubblico: usare `settore` (non `verticale`)

## 4) Modello pricing attivo

Fonte ufficiale: `docs/technical/PRICING_MODEL.md`

Regole attive:

- stessa struttura prezzi su tutti i settori
- naming piani diverso per settore
- canone mensile sempre attivo
- attivazione iniziale sempre prevista
- annuale: `-50%` sull'attivazione iniziale
- configurazione widget + implementazione standard sito: gratuite
- annullamento: gratuito e senza vincoli
- attivazione iniziale una tantum: non rimborsabile

Valori correnti:

- entry: `49 euro/mese + 349 euro` attivazione assistita
- intermedio: `99 euro/mese + 599 euro` setup e configurazione iniziale
- custom: su progetto

Naming piani per settore:

- Restaurant: `Servizio`, `Azdora`, `Maestro`
- Hotel: `Direct`, `Azdora`, `Gran Turismo`
- Professional: `Studio`, `Equipe`, `Partner`

## 5) Tenant map frontend

Fonte ufficiale: `docs/technical/FRONTEND_TENANT_MAP.md`

Mappa attiva:

- Core/supporto principali: `zirel_official`
- Restaurant commerciale: `zirel_restaurant`
- Hotel commerciale: `zirel_hotel`
- Professional commerciale: `zirel_professional`
- Demo in-character:
  - `demo/demo.html` -> `chiringuito_gino_001`
  - `demo/hotel-demo.html` -> `hotel_rivamare_demo_001`
  - `demo/professional-demo.html` -> `studio_nova_demo_001`

Widget ufficiale attivo su:

- `demo/index.html`
- `demo/pricing.html`
- `demo/contatti.html`

## 6) Widget chat runtime (demo/public/chat.js)

File chiave:

- `demo/public/config.js`
- `demo/public/chat.js`

Comportamento:

- `tenantId` letto da `data-tenant-id` dello script (fallback a `window.ZirelConfig`)
- webhook chat configurabile via `data-webhook-url` (fallback config)
- sessione runtime per tenant generata lato browser
- supporto configurazione dinamica widget da Supabase (`widget_title`, `widget_subtitle`, `widget_color`, `widget_icon`)
- funzione `openDemoChat()` per apertura deterministica:
  - desktop: widget in basso a destra
  - mobile: full-screen con lock scroll

## 7) Dashboard clienti (dashboard/)

Stack:

- React + TypeScript + Vite
- Supabase client-side

File chiave:

- `dashboard/src/lib/supabase-helpers.ts` (service layer applicativo)
- `dashboard/src/lib/auth/*` (auth/session storage)
- `dashboard/src/components/*` (UI dashboard)

Capacita principali:

- login tenant via token API
- gestione dati tenant
- gestione prenotazioni
- upload/list/delete documenti
- signed URL + trigger ingestione n8n
- rigenerazione token tenant

## 8) Dati e AI orchestration

### Supabase

- tabella tenant e configurazioni widget
- dati operativi (es. prenotazioni)
- storage documenti per tenant
- vettori KB tenant-scoped

### n8n

Fonte: `docs/technical/N8N_WORKFLOWS.md`

Workflow principali:

- chat (`/webhook/chat`)
- ingestione (`/webhook/ingest`)
- appuntamenti (`Registra_Appuntamento`)

Guardrail critico multi-tenant:

- filtri tenant nei nodi di retrieval/vector search
- validazione token/header lato workflow

## 9) Sicurezza e boundary

Fonte: `docs/technical/ARCHITECTURE.md`

Stato attuale:

- architettura client-heavy
- isolamento dipendente da policy RLS/storage Supabase e validazioni n8n
- backend proxy + sessioni HttpOnly sono roadmap futura

Boundary critici:

- browser dashboard (accesso dati tenant)
- browser widget pubblico (invio chat e lettura config limitata)
- n8n webhook pubblici (necessaria auth robusta)

## 10) Convenzioni operative correnti

- pricing e copy allineati per settore
- header/footer con link pricing contestuale
- FAQ centralizzate in `demo/faq.html`
- evitare nuovi `.md` operativi fuori da `docs/`

## 11) Build e sviluppo locale

Frontend demo:

```bash
cd demo
npm install
npm run dev
npm run build
```

Dashboard:

```bash
cd dashboard
npm install
npm run dev
npm run build
```

Env dashboard richieste:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 12) Checklist rapida QA consigliata

- smoke test desktop/mobile su pagine pricing e faq
- verifica navbar su viewport intermedi
- verifica apertura widget su `index`, `pricing`, `contatti`
- verifica chat demo: apertura CTA desktop/mobile coerente
- verifica copy consistency su terminologia `settore`
