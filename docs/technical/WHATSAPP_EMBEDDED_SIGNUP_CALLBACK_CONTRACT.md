# WhatsApp Embedded Signup Callback Contract

Specifica tecnica del backend/server-side che riceve il completamento del flusso `Embedded Signup` e collega il tenant Zirèl ai dati WhatsApp restituiti da Meta.

## Obiettivo

Definire un contratto chiaro per il punto piu importante del flusso:

- il frontend avvia il collegamento WhatsApp
- Meta completa il signup
- Zirèl riceve i dati finali
- Zirèl salva il collegamento del tenant

Questo documento non descrive ancora l'implementazione finale riga per riga, ma il contratto da rispettare.

## Responsabilita del callback

L'handler backend deve:

1. ricevere i dati di completamento del signup
2. verificare che il tenant attivo sia corretto
3. validare che il payload sia coerente
4. estrarre gli identificativi WhatsApp utili
5. creare o aggiornare `tenant_whatsapp_accounts`
6. aggiornare lo stato connessione del tenant
7. produrre un risultato leggibile dalla dashboard

## Principi di sicurezza

- nessun token grezzo deve passare al frontend oltre il minimo strettamente necessario
- il frontend non deve decidere da solo il `tenant_id`
- il backend deve ricavare il tenant da sessione autenticata o contesto server-side
- il salvataggio deve essere idempotente
- ogni tentativo deve lasciare audit log o traccia osservabile

## Trigger del callback

Possibili modelli:

### Modello A

`Frontend -> Backend Zirèl -> Meta flow -> Backend Zirèl`

### Modello B

`Frontend Zirèl` avvia il widget e poi invia al backend il payload finale ricevuto

Per Zirèl il modello raccomandato e:

- `Frontend` solo come orchestratore UX
- `Backend` come punto finale di verita e persistenza

## Input minimo atteso

Il backend deve poter ricevere o ricostruire almeno:

- `tenant_id`
- `meta_phone_number_id`
- `waba_id`

Campi raccomandati addizionali:

- `business_id`
- `display_phone_number`
- `verified_name`
- `connection_state`
- `credential_mode`
- `credential_provider`

## Fonte del tenant

Il `tenant_id` non dovrebbe arrivare come unico dato trusted dal browser.

Ordine di fiducia consigliato:

1. tenant derivato dalla sessione autenticata del dashboard
2. tenant derivato da route protetta backend
3. eventuale `tenant_id` nel payload solo come supporto, non come fonte di verita

## Input contract proposto

Esempio di input minimo lato backend:

```json
{
  "signup_session_id": "optional-trace-id",
  "meta_phone_number_id": "1023529240851906",
  "waba_id": "952596820596407",
  "display_phone_number": "+1 555-159-8512",
  "verified_name": "Test Number",
  "business_id": "optional-business-id",
  "connection_state": "connected"
}
```

Nota:

Il backend puo ricevere piu campi, ma questi sono quelli sufficienti per il primo rollout utile.

## Output contract proposto

Risposta consigliata verso frontend/dashboard:

```json
{
  "ok": true,
  "tenant_id": "zirel_official",
  "connection_status": "connected",
  "meta_phone_number_id": "1023529240851906",
  "waba_id": "952596820596407",
  "display_phone_number": "+1 555-159-8512",
  "verified_name": "Test Number",
  "next_step": "refresh_channel_status"
}
```

Errore esempio:

```json
{
  "ok": false,
  "connection_status": "error",
  "error_code": "WHATSAPP_SIGNUP_INVALID_PAYLOAD",
  "error_message": "Missing meta_phone_number_id"
}
```

## Persistenza minima obbligatoria

La tabella minima da aggiornare e:

- `tenant_whatsapp_accounts`

Upsert minimo richiesto:

- `tenant_id`
- `meta_phone_number_id`
- `credential_mode`
- `credential_provider`

Valori iniziali raccomandati:

- `credential_mode = 'platform_managed'`
- `credential_provider = 'n8n_credentials'`

## Persistenza raccomandata additiva

Per avere uno stato prodotto migliore, e utile aggiungere o tracciare anche:

- `waba_id`
- `display_phone_number`
- `verified_name`
- `connection_status`
- `last_sync_at`
- `onboarding_error`

Se questi campi non esistono ancora, considerarli come futura estensione additiva.

## Upsert semantics

Comportamento desiderato:

### Se il tenant non ha ancora account WhatsApp

- creare nuova riga

### Se il tenant ha gia una riga per quel numero

- aggiornare la riga

### Se il tenant ha un altro numero gia collegato

Da decidere a livello prodotto:

- bloccare il nuovo collegamento
- oppure sostituire il collegamento precedente in modo esplicito

Per il rollout iniziale la regola piu sicura e:

- un tenant = un numero WhatsApp attivo
- se gia presente, richiedere conferma esplicita prima della sostituzione

## Stati connessione raccomandati

Minimo set utile:

- `not_connected`
- `connection_in_progress`
- `connected`
- `requires_attention`
- `error`

Questi stati possono vivere:

- in tabella dedicata stato canale
- in metadata tenant
- o direttamente in `tenant_whatsapp_accounts`

La scelta implementativa resta aperta, ma il contratto UI deve usare questi stati o equivalenti.

## Error handling

Errori da distinguere:

### Errori di input

- manca `meta_phone_number_id`
- manca `waba_id`
- payload malformato

### Errori di ownership

- tenant mismatch
- sessione non valida
- utente non autorizzato

### Errori di conflitto

- numero gia collegato a un altro tenant
- tenant gia collegato a un altro numero

### Errori Meta / integrazione

- dati incompleti
- callback interrotto
- asset non ancora propagati

## Codici errore raccomandati

- `WHATSAPP_SIGNUP_INVALID_PAYLOAD`
- `WHATSAPP_SIGNUP_UNAUTHORIZED`
- `WHATSAPP_SIGNUP_TENANT_MISMATCH`
- `WHATSAPP_SIGNUP_PHONE_CONFLICT`
- `WHATSAPP_SIGNUP_ALREADY_CONNECTED`
- `WHATSAPP_SIGNUP_META_INCOMPLETE`
- `WHATSAPP_SIGNUP_INTERNAL_ERROR`

## Audit / logging

Ogni callback dovrebbe produrre almeno:

- timestamp
- tenant
- asset principali ricevuti
- esito
- eventuale errore

Esempio di eventi audit:

- `whatsapp_signup_started`
- `whatsapp_signup_completed`
- `whatsapp_signup_failed`
- `whatsapp_signup_conflict`

## Integrazione con dashboard

La dashboard deve poter:

1. avviare il flusso
2. ricevere l'esito
3. aggiornare lo stato UI del canale
4. mostrare eventuali errori leggibili

## Comportamento UI atteso dopo successo

Dopo callback riuscito:

- il tenant vede il canale come `connected`
- puo vedere numero collegato e nome verificato
- puo usare il motore WhatsApp gia esistente

## Comportamento UI atteso dopo errore

Dopo callback fallito:

- il tenant vede `error` o `requires_attention`
- il canale non viene mostrato come attivo
- il sistema non deve lasciare record ambigui

## Idempotenza

Il callback puo essere chiamato piu volte.

Quindi:

- stesso tenant + stesso `meta_phone_number_id` non deve creare duplicati
- stesso tenant + stesso `waba_id` deve essere trattato come retry benigno

## Dipendenze con il motore V3

Una volta salvato correttamente almeno:

- `tenant_id`
- `meta_phone_number_id`

il motore esistente e gia in grado di:

- ricevere inbound
- risolvere il tenant
- creare conversation
- creare message
- orchestrare AI
- inviare outbound

Quindi questo callback e il ponte tra onboarding prodotto e runtime gia esistente.

## Decisioni aperte da chiudere

1. dove salvare `connection_status`
2. se aggiungere `waba_id`, `verified_name`, `display_phone_number` al DB
3. politica esatta di sostituzione numero gia collegato
4. struttura audit definitiva
5. forma esatta del payload Meta finale restituito a Zirèl

## Prossimo step consigliato

Dopo questo documento, il passo piu utile e:

- specifica UX del bottone `Collega WhatsApp`
- e subito dopo:
- definizione dello schema dati di stato canale / onboarding
