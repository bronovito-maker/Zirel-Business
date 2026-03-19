# Zirèl WhatsApp V3 Handoff

## Stato attuale
- Il progetto Zirèl è stabile su:
  - dashboard React
  - Supabase
  - n8n
  - AI Core
  - billing Stripe
- Billing e reminder sono già stati sistemati e verificati.
- Le analytics base del dashboard sono state aggiunte e la build passa.
- La fase attuale riguarda la progettazione e futura implementazione dell'integrazione WhatsApp Cloud API ufficiale in ottica multi-tenant.

## Decisione architetturale approvata
La direzione ufficiale approvata è:

- WhatsApp Cloud API ufficiale
- architettura multi-tenant
- Embedded Signup come target finale di onboarding
- design tenant-first
- nessun token esposto nel frontend
- nessun secret grezzo nel database applicativo
- pattern runtime:
  - webhook -> persist -> process -> AI -> send

## Schema dati WhatsApp V3 approvato
Le tabelle base WhatsApp sono già state create in Supabase:

- `tenant_whatsapp_accounts`
- `tenant_conversations`
- `conversation_messages`
- `channel_webhook_events`

### Addendum V3 già applicato
Su Supabase risultano applicate in modo additivo anche queste estensioni:

#### `tenant_whatsapp_accounts`
- `credential_mode`
- `credential_provider`
- `access_token_ref`

Default attesi:
- `credential_mode = 'platform_managed'`
- `credential_provider = 'n8n_credentials'`

#### `tenant_conversations`
- `customer_phone_normalized`
- `ai_processing_status`
- `last_inbound_message_id`
- `last_outbound_message_id`

#### `conversation_messages`
- `processing_status`
- `provider_payload_json`

### Scelte strutturali importanti
- Niente FK circolari da `tenant_conversations.last_inbound_message_id` / `last_outbound_message_id` verso `conversation_messages.id`
- Deduplica affidata a vincoli unici e logica applicativa
- Indici creati per:
  - queue AI
  - queue outbound
  - conversation matching
  - lookup tenant via numero WhatsApp

## Modello credenziali approvato
L'architettura deve supportare entrambi i modelli:

### `platform_managed`
- modalità standard iniziale raccomandata per Zirèl
- credenziali gestite centralmente dalla piattaforma

### `tenant_managed`
- supportata già a livello architetturale
- per casi enterprise o scenari con credenziali separate

### Regola di sicurezza
- i workflow applicativi non devono dipendere dal tipo di token
- la risoluzione del token deve avvenire solo nel sender
- `access_token_ref` è solo un riferimento

## Workflow n8n da implementare
Ordine consigliato:

1. `WhatsApp Webhook Ingestion`
2. `WhatsApp Event Processor`
3. `WhatsApp Outbound Sender`
4. `WhatsApp AI Orchestrator`

## Specifica V3 approvata

### 1. WhatsApp Webhook Ingestion
- verifica firma Meta
- persistenza sincrona in `channel_webhook_events`
- risposta `200 OK` solo dopo persistenza riuscita

### 2. WhatsApp Event Processor
- legge eventi non processati
- risolve il tenant via `meta_phone_number_id`
- distingue inbound vs status update
- crea/aggiorna conversation
- inserisce o aggiorna `conversation_messages`
- marca `processed = true`

### 3. WhatsApp Outbound Sender
- legge messaggi outbound in coda
- risolve credenziali in modo agnostico
- invia via Cloud API
- aggiorna `external_message_id` e `delivery_status`

### 4. WhatsApp AI Orchestrator
- legge inbound `pending_ai`
- evita risposta se `human_handoff` o `closed`
- passa ad AI Core
- crea outbound `pending_send`

## Regole runtime importanti
- mai chiamare AI Core direttamente dal webhook Meta
- persistenza prima, elaborazione dopo
- queue async per robustezza e replay
- handoff umano come stato conversazione
- fallback conversation matching su `customer_phone_normalized`

## Stato dashboard e prodotto generale
- Dashboard billing wiring completato:
  - `expired_trial`
  - `past_due`
  - `canceled`
- Analytics base già implementate nel dashboard:
  - richieste totali
  - conversioni confermate
  - richieste pendenti/manual review
  - notifiche inviate
  - trend recente
- Non sono ancora tracciati in modo nativo:
  - conversazioni avviate
  - numero messaggi
  - abbandoni chat

## File rilevanti del progetto
- `/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/dashboard/src/components/Dashboard.tsx`
- `/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/dashboard/src/components/BillingSection.tsx`
- `/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/dashboard/src/components/AnalyticsSection.tsx`
- `/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/dashboard/src/lib/supabase-helpers.ts`
- `/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/dashboard/src/types/index.ts`
- `/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/Zirèl - Stripe Billing Manager.json`
- `/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/Zirèl - Billing Reminder Engine.json`
- `/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/Zirèl - Notifiche Dispatcher.json`

## Strategia consigliata di lavoro
Per i workflow WhatsApp la strategia consigliata è:

1. far generare ad Antigravity i workflow o le bozze workflow usando MCP e accesso operativo
2. far revisionare a Codex la struttura, la logica, i rischi e gli edge case
3. correggere e consolidare prima di importarli definitivamente in n8n

Motivo:
- Antigravity è utile per operare con MCP e creare rapidamente struttura
- Codex è più preciso nella revisione architetturale e nella correzione dei dettagli delicati

## Prossimo step raccomandato
Procedere con:

- implementazione dei workflow n8n WhatsApp:
  - `Webhook Ingestion`
  - `Event Processor`

e solo dopo:

- `Outbound Sender`
- `AI Orchestrator`

