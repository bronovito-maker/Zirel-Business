# Zirèl

Piattaforma AI multi-tenant per gestione richieste, lead, prenotazioni e primo contatto..

## Workspace

- `demo/` -> sito pubblico, landing settore, demo live, pricing, pagine supporto
- `dashboard/` -> pannello clienti React + Supabase
- `docs/` -> documentazione ufficiale progetto

## Setup rapido

### Frontend demo

```bash
cd demo
npm install
npm run dev
```

### Dashboard

```bash
cd dashboard
npm install
npm run dev
```

Richiede env dashboard:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Documentazione

Indice centrale:

- `docs/README.md`

Documenti core:

- `docs/technical/HANDOFF_CONTEXT_CURRENT.md`
- `docs/technical/BRAND_IDENTITY.md`
- `docs/technical/PRICING_MODEL.md`
- `docs/technical/FRONTEND_TENANT_MAP.md`
- `docs/technical/ARCHITECTURE.md`
