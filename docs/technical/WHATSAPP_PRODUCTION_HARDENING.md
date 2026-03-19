# WhatsApp Production Hardening

Stato attuale confermato:

- webhook Meta funzionante
- pre-handler Railway funzionante
- ingestion n8n funzionante
- processor inbound funzionante
- outbound sender funzionante
- AI orchestrator funzionante
- test end-to-end reale riuscito

## Perche la risposta puo essere lenta

La latenza attuale e coerente con l'architettura a polling:

- `WhatsApp 2 - Event Processor` era a 1 minuto, ora validato anche a 30 secondi
- `WhatsApp 4 - AI Orchestrator` era a 1 minuto, ora validato anche a 30 secondi
- `WhatsApp 3 - Outbound Sender` era a 1 minuto, ora validato anche a 30 secondi

Con polling a 1 minuto una risposta automatica puo impiegare circa 1-3 minuti a seconda di quando il messaggio arriva rispetto al cron.

Con polling a 30 secondi il test reale ha mostrato una latenza intorno a 1 minuto e 30 secondi end-to-end, valore coerente con:

- claim inbound
- chiamata AI Core
- creazione outbound
- send via Meta
- update successivi della coda

Se volete una UX piu rapida, le strade piu sane sono:

1. ridurre l'intervallo dei workflow se il runtime n8n e l'infrastruttura lo consentono
2. aggiungere trigger piu reattivi per orchestrator e sender mantenendo comunque il pattern persist -> process -> ai -> send

Raccomandazione pratica attuale:

- 30 secondi e gia una configurazione ragionevole e safe
- 15 secondi e plausibilmente sostenibile, ma va provato solo dopo qualche giorno di osservazione pulita
- sotto 15 secondi non e necessario per questa fase

## Cleanup Test

Prima della produzione vera:

1. cancellare o archiviare i messaggi outbound di test
2. tenere almeno una conversazione e un messaggio demo come riferimento tecnico
3. evitare backlog di test con `external_message_id is null`

Script consigliato:

- [whatsapp_cleanup_test_data.sql](/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/docs/technical/sql/whatsapp_cleanup_test_data.sql)
- [whatsapp_monitoring_queries.sql](/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/docs/technical/sql/whatsapp_monitoring_queries.sql)

## Hardening Consigliato

### 1. Status timestamps

Aggiungere aggiornamento esplicito di:

- `sent_at`
- `delivered_at`
- `read_at`
- `failed_at`

in base agli status webhook Meta.

### 2. Retry policy

Rendere piu rigorosa la gestione retry per:

- outbound `401/429/5xx`
- AI Core timeout
- pointer update failures

Con almeno:

- limite retry
- backoff
- separazione chiara fra errori permanenti e transienti
- policy esplicita su quando un outbound in `error` deve essere ripescato o lasciato fermo

### 3. Deduplica AI

Evitare che uno stesso inbound generi piu reply se:

- viene rilanciato manualmente un workflow
- una riga resta in stato intermedio
- il sender viene rieseguito su backlog sporco

Approccio minimo:

- prima di creare l'outbound AI, verificare se esiste gia un outbound con `source_inbound_message_id` uguale nella `provider_payload_json`

Stato attuale:

- questo controllo e gia stato applicato nel workflow `WhatsApp 4 - AI Orchestrator`
- resta da osservare il comportamento su rilanci manuali e backlog sporco in ambiente quasi reale

### 4. Token policy

Per produzione:

- evitare di dipendere da token temporanei Meta
- usare token piu stabili coerenti col modello `platform_managed`
- documentare come ruotare i token senza interrompere il sender

### 5. Monitoring

Tenere almeno una vista o query su:

- `channel_webhook_events` per `failed/orphan`
- `conversation_messages` outbound con `external_message_id is null`
- `conversation_messages` con `processing_status = error`
- conversazioni con `ai_processing_status = error`

In pratica, le query minime da tenere a portata sono:

- outbound WhatsApp con `external_message_id is null`
- outbound WhatsApp con `processing_status = error`
- inbound WhatsApp ancora `pending_ai` troppo vecchi
- `channel_webhook_events` in `failed` o `orphan`

Script pronto:

- [whatsapp_monitoring_queries.sql](/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/docs/technical/sql/whatsapp_monitoring_queries.sql)

### 6. Manual handoff

Prima del go-live:

- testare bene `human_handoff`
- testare bene `closed`
- verificare che l'orchestrator non risponda in quei casi

### 7. Prompt/brand safety

Il loop tecnico funziona gia. Prima della produzione conviene rifinire:

- tono delle risposte AI
- limiti commerciali
- gestione richieste fuori ambito
- fallback in caso di messaggi vuoti o ambigui

## Go-Live Checklist

1. env presenti e documentate in Railway
2. numero WhatsApp reale confermato
3. `tenant_whatsapp_accounts` valorizzata per i tenant attivi
4. workflows WhatsApp importati e attivi
5. un test inbound reale riuscito
6. un test AI reply reale riuscito
7. un test outbound manuale riuscito
8. query di monitoraggio pronte
9. cleanup dati test completato
10. token Meta validi e ruotabili

## Checkpoint reale del 2026-03-19

Confermato in ambiente reale:

- inbound WhatsApp reale ricevuto correttamente
- `channel_webhook_events` persistita e processata
- `tenant_whatsapp_accounts` risolta correttamente via `meta_phone_number_id`
- `tenant_conversations` creata/aggiornata
- `conversation_messages` inbound creata
- AI Orchestrator eseguito con AI Core reale via Chat URL
- outbound AI creato nel database
- Outbound Sender eseguito con Meta Cloud API reale
- `external_message_id` valorizzato
- `delivery_status` osservato almeno fino a `delivered`
- test finale pulito riuscito con una sola risposta automatica
