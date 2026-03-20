# WhatsApp Embedded Signup Plan

Blueprint tecnico per implementare `Embedded Signup` in Zirèl sopra il motore WhatsApp V3 gia funzionante.

## Obiettivo

Permettere al cliente di collegare il proprio canale WhatsApp a Zirèl direttamente dalla dashboard, senza onboarding tecnico manuale ogni volta.

L'obiettivo non e riscrivere il motore WhatsApp, ma automatizzare e rendere prodotto la fase di connessione del canale.

## Punto di partenza

Gia disponibile:

- webhook Meta funzionante
- pre-handler Railway funzionante
- workflow n8n funzionanti
- persistenza Supabase funzionante
- sender e orchestrator funzionanti
- modello dati multi-tenant gia presente

Quindi `Embedded Signup` deve soltanto:

1. far passare il cliente nel flusso Meta
2. recuperare gli identificativi finali
3. salvarli in Zirèl
4. marcare il tenant come WhatsApp collegato

## Visione architetturale

Il flusso finale ideale e:

1. cliente apre dashboard Zirèl
2. clicca `Collega WhatsApp`
3. parte `Embedded Signup` Meta
4. cliente autentica account/business assets necessari
5. Meta restituisce gli identificativi necessari a Zirèl
6. Zirèl salva i dati lato server
7. Zirèl crea/aggiorna `tenant_whatsapp_accounts`
8. tenant risulta collegato e pronto a ricevere/inviare

## Output tecnico necessario

Alla fine del signup Zirèl deve poter conoscere almeno:

- `tenant_id`
- `meta_phone_number_id`
- `waba_id`
- eventuale `business_id` o asset id utile
- stato connessione

In piu, Zirèl deve sapere se il canale e:

- configurato correttamente
- in attesa di completamento
- in errore
- attivo

## Cosa NON deve fare Embedded Signup

Non deve:

- gestire direttamente i webhook runtime
- chiamare AI Core
- riscrivere ingestion / processor / sender / orchestrator
- esporre token grezzi nel frontend

## Blocchi di implementazione

## 1. Meta prerequisites

Prima di scrivere prodotto, Zirèl deve chiarire:

- stato app Meta
- prerequisiti `Embedded Signup`
- permessi / access level richiesti
- eventuali review / business verification ancora mancanti

Deliverable:

- checklist Meta ufficiale necessaria per `Embedded Signup`
- decisione su quali asset sono obbligatori prima del primo rollout

## 2. Dashboard UX

Serve una UX chiara dentro la dashboard tenant.

### Stati minimi UI

- `not_connected`
- `connection_in_progress`
- `connected`
- `requires_attention`
- `error`

### Azioni minime UI

- `Collega WhatsApp`
- `Riprova collegamento`
- `Visualizza stato connessione`
- `Scollega` o `richiedi assistenza` solo piu avanti

### Informazioni minime visibili

- stato collegamento
- numero collegato
- data ultimo aggiornamento
- se AI e attiva o no
- eventuale ultimo errore di connessione

## 3. Backend / server-side callback

Serve un handler server-side dedicato al completamento del signup.

Questo handler dovra:

1. ricevere i dati del flusso Meta
2. validare la richiesta
3. risolvere il `tenant_id`
4. estrarre gli identificativi rilevanti
5. creare o aggiornare `tenant_whatsapp_accounts`
6. marcare lo stato connessione del tenant
7. scrivere audit log

### Requisiti del backend

- nessun token persistito in chiaro sul frontend
- eventuali riferimenti token gestiti lato server
- log sufficienti per capire errori di onboarding
- idempotenza sul salvataggio dell'account WhatsApp

## 4. Persistenza dati

La tabella principale da aggiornare resta:

- `tenant_whatsapp_accounts`

Campi minimi da gestire nel rollout iniziale:

- `tenant_id`
- `meta_phone_number_id`
- `credential_mode`
- `credential_provider`
- `access_token_ref` se necessario

Campi raccomandati da aggiungere o tracciare se non gia presenti altrove:

- `waba_id`
- `connection_status`
- `last_sync_at`
- `onboarding_error`

Nota:

Se questi campi non sono ancora nel database, vanno valutati come estensione additiva e non distruttiva.

## 5. Mapping con motore WhatsApp V3

Il runtime esistente si aspetta soprattutto:

- `tenant_id`
- `meta_phone_number_id`

Quindi il risultato minimo dell'Embedded Signup deve essere almeno sufficiente a produrre una riga valida in `tenant_whatsapp_accounts`.

Se quello avviene, il motore V3:

- sa gia ricevere
- sa gia processare
- sa gia inviare

## 6. Failure states

Lo signup deve gestire in modo pulito questi casi:

- cliente interrompe il flusso
- Meta ritorna asset incompleti
- numero non verificato
- numero gia collegato altrove
- tenant gia collegato a un altro numero
- mismatch tra tenant corrente e asset ricevuti

### Regola di prodotto

Mai lasciare il tenant in stato ambiguo.

Ogni tenant deve risultare sempre in uno stato chiaro:

- non collegato
- collegamento in corso
- collegato
- errore

## 7. Osservabilita

Serve audit anche per l'onboarding.

Minimo richiesto:

- timestamp inizio tentativo
- timestamp completamento
- tenant coinvolto
- asset ricevuti
- esito
- eventuale errore

Questo puo vivere in:

- tabella dedicata
- metadata tenant
- log applicativi strutturati

La scelta va fatta in implementazione.

## Sequenza consigliata di lavoro

### Fase 1

Meta discovery:

- capire esattamente i prerequisiti ufficiali `Embedded Signup`
- confermare cosa Meta restituisce a fine flusso
- confermare i permessi richiesti

### Fase 2

Contract Zirèl:

- definire quali dati minimi salva il backend
- definire schema di stato connessione
- definire contratto frontend -> backend

### Fase 3

Dashboard UI:

- bottone `Collega WhatsApp`
- stato canale
- error state
- completion state

### Fase 4

Server callback:

- endpoint backend
- validazione
- upsert in `tenant_whatsapp_accounts`
- audit log

### Fase 5

Test reale:

- tenant di prova
- numero reale
- completamento signup
- verifica inbound/outbound immediata con motore V3 gia attivo

## Prossimi deliverable consigliati

I documenti o task successivi piu utili sono:

1. specifica funzionale `Embedded Signup UX`
2. specifica tecnica `server callback contract`
3. schema dati stato connessione WhatsApp per tenant
4. lista prerequisiti Meta realmente bloccanti

## Conclusione

Il valore di `Embedded Signup` per Zirèl e altissimo:

- riduce onboarding manuale
- rende il canale vendibile come feature piattaforma
- si appoggia a un motore V3 che e gia stato validato

La cosa importante e ricordare che il motore runtime e gia pronto.

Quello che stiamo costruendo adesso non e il motore, ma la porta di ingresso prodotto.
