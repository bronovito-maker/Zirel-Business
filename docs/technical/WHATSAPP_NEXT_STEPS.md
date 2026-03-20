# WhatsApp Next Steps

Documento operativo dei prossimi passi per portare la pipeline WhatsApp V3 di Zirèl da motore tecnico funzionante a prodotto pronto per onboarding cliente e go-live controllato.

## Stato attuale

Confermato al 2026-03-20:

- webhook Meta funzionante
- pre-handler Railway funzionante
- ingestion n8n funzionante
- event processor funzionante
- outbound sender funzionante
- AI orchestrator funzionante
- test reale end-to-end riuscito
- `human_handoff` e `closed` rispettati lato engine
- monitoring SQL base disponibile
- token stabile Meta gia creato e gia caricato nel runtime n8n

Quindi:

- il motore WhatsApp esiste gia
- il blocco principale non e piu tecnico di base
- i prossimi lavori sono soprattutto di produzione, onboarding e prodotto

## Decisione aggiornata

Scelta approvata:

- non investire altro tempo su onboarding cliente assistito come flusso finale
- andare direttamente verso `Embedded Signup`
- costruire anche la `UI handoff`

In pratica:

- Zirèl puo gia usare WhatsApp come motore funzionante
- il prossimo salto di valore e rendere l'attivazione del canale piu autonoma e piu vendibile

## Obiettivo

Portare Zirèl a questo stato:

1. Meta pronta per produzione reale
2. onboarding cliente via `Embedded Signup`
3. cliente capace di attivare/disattivare AI e handoff via UI
4. go-live controllato con monitoring e policy chiare

## Area 1: Meta produzione

Questa area non riguarda piu il runtime WhatsApp, ma il fatto che Meta diventi abbastanza stabile e presentabile per un uso commerciale reale.

### Obiettivi

- app Meta in stato coerente con produzione
- token stabile gia presente e documentato
- permessi Meta e configurazione app verificati
- business assets pronti per onboarding clienti
- webhook e numero reale confermati

### Passi pratici

1. verificare la configurazione della Meta App usata da Zirèl
   - app corretta
   - prodotto WhatsApp attivo
   - webhook corretto
   - app secret e token documentati

2. confermare la strategia token di produzione
   - usare il token stabile gia creato
   - documentare dove si trova
   - documentare come ruotarlo senza downtime

3. verificare lo stato reale dell'app Meta
   - cosa manca per `Live`
   - eventuali passaggi di review / advanced access
   - eventuali requisiti business da chiudere

4. verificare il percorso Meta per `Embedded Signup`
   - prerequisiti lato app
   - prerequisiti lato business portfolio
   - eventuali permessi richiesti

### Deliverable desiderato

Un documento interno con:

- nome app Meta ufficiale di Zirèl
- business portfolio associato
- token stabile in uso
- webhook URL ufficiale
- verify token
- stato `Live / non Live`
- elenco preciso dei passaggi Meta ancora da chiudere

## Area 2: Embedded Signup

Questa e la priorita prodotto piu importante.

Obiettivo:

- permettere al cliente di collegare il proprio numero WhatsApp a Zirèl senza dover passare da onboarding tecnico manuale ogni volta

### Perche e importante

Senza `Embedded Signup`, Zirèl puo essere venduto come servizio gestito.
Con `Embedded Signup`, Zirèl inizia a comportarsi come piattaforma.

### Output finale atteso

Un flusso cliente che permetta di:

1. cliccare "Collega WhatsApp"
2. autenticarsi in Meta
3. selezionare o creare business assets richiesti
4. collegare il numero
5. ricevere su Zirèl il mapping finale necessario
6. creare o aggiornare la riga in `tenant_whatsapp_accounts`
7. attivare il tenant senza intervento tecnico manuale

### Lavori da fare

1. studiare e chiudere i prerequisiti Meta di `Embedded Signup`
2. progettare il flusso frontend/dashboard
3. definire l'handler backend/server-side che salva i risultati del signup
4. mappare in modo robusto:
   - `tenant_id`
   - `meta_phone_number_id`
   - `credential_mode`
   - `credential_provider`
   - eventuali riferimenti token / asset
5. definire gli stati UI:
   - non collegato
   - collegamento in corso
   - collegato
   - errore collegamento
   - richiede revisione

### Decisione architetturale

L'engine WhatsApp V3 gia esistente resta invariato.

`Embedded Signup` non deve riscrivere:

- ingestion
- processor
- sender
- orchestrator

Deve solo automatizzare e rendere sicura la fase di onboarding del canale.

## Area 3: UI Handoff

Questa e la parte prodotto che rende il canale davvero usabile dal cliente finale.

### Obiettivo

Permettere al cliente di controllare l'automazione senza SQL e senza intervento tecnico.

### Azioni minime da esporre

1. `Passa a umano`
   - imposta `tenant_conversations.status = 'human_handoff'`

2. `Riattiva AI`
   - riporta la conversazione allo stato attivo AI

3. `Chiudi conversazione`
   - imposta `tenant_conversations.status = 'closed'`

4. visualizzare stato corrente
   - `ai_active`
   - `human_handoff`
   - `closed`
   - eventuale `ai_processing_status`

### UX minima consigliata

Nella schermata conversazione WhatsApp:

- badge stato conversazione
- bottone `Passa a umano`
- bottone `Riattiva AI`
- bottone `Chiudi`
- cronologia messaggi
- indicatore se l'ultimo messaggio e stato inviato da AI o da umano

### Regole importanti

- se `human_handoff`, l'orchestrator non deve rispondere
- se `closed`, l'orchestrator non deve rispondere
- il cambio stato deve essere immediato e auditabile

## Area 4: Hardening produzione

Questa area viene dopo i tre punti sopra, ma non va dimenticata.

### Rimane da consolidare

1. status Meta completi
   - `sent_at`
   - `delivered_at`
   - `read_at`
   - `failed_at`

2. retry policy
   - limiti
   - backoff
   - errori permanenti vs transienti

3. monitoring operativo
   - query pronte
   - dashboard minima
   - alert manuali o automatici

4. policy token
   - rotazione
   - ownership
   - procedure di emergenza

## Roadmap consigliata

### Fase 1

Chiudere Meta produzione:

- verificare stato app
- verificare prerequisiti `Embedded Signup`
- documentare token stabile e procedura di rotazione

### Fase 2

Costruire `Embedded Signup`:

- studio requisiti
- UX dashboard
- persistenza dei dati di connessione
- test con numero reale

### Fase 3

Costruire `UI Handoff`:

- azioni di stato conversazione
- aggiornamento immediato lato DB
- test con workflow AI attivi

### Fase 4

Polish produzione:

- monitoring
- retry policy
- osservazione latenza
- eventuale passaggio da `30s` a `15s`

## Cosa NON fare adesso

- non riscrivere l'engine WhatsApp V3
- non tornare su onboarding manuale come soluzione finale
- non inseguire ottimizzazioni premature di performance prima di chiudere `Embedded Signup` e `UI Handoff`

## Conclusione

Zirèl non e piu nella fase "riusciamo a far rispondere WhatsApp?".

Quella parte e stata gia validata.

La fase attuale e:

- rendere Meta production-grade
- trasformare l'onboarding in `Embedded Signup`
- mettere il controllo in mano al cliente con `UI Handoff`

Questi sono i tre passi che trasformano il motore WhatsApp da integrazione tecnica riuscita a feature prodotto vera.
