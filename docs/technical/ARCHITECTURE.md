# Zirèl System Architecture (Current Runtime)

## Overview

Zirèl e attualmente una piattaforma SaaS multi-tenant con architettura **client-heavy**:
- `demo/` fornisce il sito pubblico e il widget dimostrativo
- `dashboard/` fornisce il pannello clienti React
- Supabase gestisce dati, storage e enforcement server-side
- n8n gestisce i workflow AI e ingestione

Il backend proxy, JWT e i cookie `HttpOnly` sono **roadmap futura** e non fanno parte del runtime attivo oggi.

## Stack attuale

| Layer | Tecnologia | Ruolo |
|-------|------------|-------|
| Landing / Demo | HTML, CSS, Vite, JS vanilla | Sito pubblico, demo, widget embeddabile |
| Dashboard | React, TypeScript, Vite, Tailwind | Configurazione tenant, documenti, prenotazioni |
| Data Layer | Supabase | Database, storage, query client-side |
| AI Layer | n8n | Chat orchestration, ingestione documenti |

## Runtime attivo oggi

### Dashboard
- Il dashboard autentica il tenant tramite `api_token`.
- Dopo il login, il browser interroga direttamente Supabase.
- Le chiamate applicative sono centralizzate in `src/lib/supabase-helpers.ts`.
- La persistenza sessione e session-based di default con fallback compatibile da `localStorage`.

### Widget pubblico
- Il widget viene iniettato con `<script ... data-tenant-id="...">`.
- Il browser del visitatore chiama direttamente il webhook chat.
- Il widget puo leggere una configurazione limitata da Supabase con anon key pubblica.

### Ingestione
- Il dashboard carica file su Supabase Storage.
- Il browser richiede una signed URL.
- Il browser invoca il webhook di ingestione n8n con payload legacy e metadata di tracciabilita.

## Trust Boundaries

| Boundary | Cosa puo fare | Rischio principale |
|----------|---------------|-------------------|
| Browser dashboard | Leggere/scrivere dati tenant via Supabase | Dipendenza da RLS e rischio XSS |
| Browser widget pubblico | Inviare messaggi al webhook e leggere config widget | Webhook pubblico e configurazione client-side |
| Supabase | Applicare policy e isolare tenant | Misconfigurazione RLS |
| n8n webhook | Processare chat e ingestione | Mancanza di auth forte lato webhook |
| Storage | Conservare documenti per tenant | Accesso cross-tenant se policy deboli |
| Dati tenant | Config, prenotazioni, KB | Leakage se il server non valida correttamente |

## Stato della sicurezza

- L'isolamento multi-tenant lato codice client e migliorato, ma non e sufficiente da solo.
- La sicurezza reale dipende oggi da:
  - RLS di Supabase
  - policy storage
  - validazioni dei workflow n8n
- Il frontend include guardrail utili, ma non sostituisce controlli authoritativi server-side.

## Roadmap tecnica successiva

1. Verifica e hardening delle policy RLS su database e storage.
2. Autenticazione dei webhook n8n con secret condiviso o firma.
3. Introduzione di un backend proxy compatibile in parallelo.
4. Migrazione da token client-side a sessioni `HttpOnly`.
