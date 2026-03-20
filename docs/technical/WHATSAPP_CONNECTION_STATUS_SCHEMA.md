# WhatsApp Connection Status Schema

Specifica dello stato canale WhatsApp per il tenant Zirèl.

## Obiettivo

Dare a dashboard e backend un linguaggio condiviso per descrivere lo stato del collegamento WhatsApp.

Questo schema serve a:

- mostrare uno stato chiaro al cliente
- guidare `Embedded Signup`
- distinguere canale operativo da canale non pronto

## Perche serve

Oggi il motore runtime funziona, ma manca ancora uno stato canale prodotto ben definito.

Senza `connection_status`:

- il tenant puo essere collegato tecnicamente ma la UI non sa spiegarlo bene
- `Embedded Signup` non ha un ciclo stato coerente
- il supporto fatica a capire dove si e fermato un onboarding

## Stato raccomandato

Campo logico:

- `connection_status`

Valori ammessi raccomandati:

- `not_connected`
- `connection_in_progress`
- `connected`
- `requires_attention`
- `error`

## Semantica degli stati

### `not_connected`

Significa:

- nessun canale WhatsApp collegato al tenant

Uso UI:

- mostra `Collega WhatsApp`

### `connection_in_progress`

Significa:

- il flusso e iniziato
- Zirèl non ha ancora confermato il collegamento finale

Uso UI:

- mostra `Collegamento in corso`
- abilita `Ricarica stato`

### `connected`

Significa:

- Zirèl ha abbastanza dati per usare il canale WhatsApp
- il runtime puo ricevere e inviare

Uso UI:

- mostra numero collegato
- consente accesso alle conversazioni

### `requires_attention`

Significa:

- collegamento parziale o degradato
- manca qualcosa per considerarlo sano

Esempi:

- asset incompleti
- dati Meta non sincronizzati
- numero presente ma configurazione da rivedere

Uso UI:

- mostra warning
- offre `Completa configurazione`

### `error`

Significa:

- tentativo di collegamento fallito
- oppure stato canale non considerabile valido

Uso UI:

- mostra errore
- offre `Riprova`

## Dove salvare lo stato

Scelta raccomandata per il primo rollout:

- salvare `connection_status` direttamente in `tenant_whatsapp_accounts`

Campi raccomandati nello stesso gruppo logico:

- `connection_status`
- `last_sync_at`
- `onboarding_error`
- `waba_id`
- `display_phone_number`
- `verified_name`

## Motivazione

Tenere lo stato in `tenant_whatsapp_accounts` e la soluzione piu semplice perche:

- lo stato riguarda proprio il canale WhatsApp del tenant
- evita tabelle nuove premature
- e sufficiente per dashboard e onboarding

## Campi raccomandati

### Minimo necessario

- `tenant_id`
- `meta_phone_number_id`
- `credential_mode`
- `credential_provider`
- `connection_status`

### Raccomandati

- `waba_id`
- `display_phone_number`
- `verified_name`
- `last_sync_at`
- `onboarding_error`

## Derivazione iniziale stato

### Caso 1

Nessuna riga in `tenant_whatsapp_accounts`

-> `not_connected`

### Caso 2

Flusso signup avviato ma non completato

-> `connection_in_progress`

### Caso 3

Riga presente con `meta_phone_number_id` valido e test runtime ok

-> `connected`

### Caso 4

Riga presente ma dati mancanti o incoerenti

-> `requires_attention`

### Caso 5

Tentativo fallito o callback in errore

-> `error`

## Regole UI

La dashboard non dovrebbe inferire lo stato in modo magico da campi sparsi.

La dashboard dovrebbe leggere:

- `connection_status`

e usare campi accessori solo per mostrare dettagli.

## Regole backend

Il backend di `Embedded Signup` deve essere il principale proprietario di:

- `connection_status`

Aggiornamenti attesi:

### inizio signup

- `connection_status = connection_in_progress`

### completamento ok

- `connection_status = connected`

### completamento parziale

- `connection_status = requires_attention`

### errore

- `connection_status = error`

## Relazione con il runtime WhatsApp V3

Importante:

- il runtime oggi puo gia funzionare anche senza questo schema formalizzato
- `connection_status` e uno strato di prodotto e osservabilita

Quindi:

- non sostituisce il runtime
- lo rende leggibile e governabile

## Contract frontend consigliato

La dashboard deve poter leggere almeno:

```json
{
  "connection_status": "connected",
  "display_phone_number": "+1 555-159-8512",
  "verified_name": "Test Number",
  "last_sync_at": "2026-03-20T12:00:00.000Z",
  "onboarding_error": null
}
```

## Query minima consigliata

Per un tenant:

- leggere l'ultima o unica riga `tenant_whatsapp_accounts`
- ricavare `connection_status`
- mostrare stato canale nella dashboard

## Estensione futura

Se in futuro Zirèl supportera piu numeri attivi per tenant, questo schema va esteso per:

- numero primario
- piu canali per tenant
- stato per singolo numero

Per il rollout attuale:

- un tenant = un numero WhatsApp attivo

## Prossimo step tecnico

Dopo questa specifica, i passi piu utili sono:

1. introdurre i campi additivi in database se non esistono
2. aggiungere helper dashboard per leggere lo stato canale
3. mostrare il card WhatsApp con `connection_status`
4. poi agganciare `Embedded Signup`
