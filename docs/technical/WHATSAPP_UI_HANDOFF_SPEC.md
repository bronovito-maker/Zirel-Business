# WhatsApp UI Handoff Spec

Specifica funzionale della UI che permette al cliente di controllare il comportamento dell'AI nelle conversazioni WhatsApp.

## Obiettivo

Dare al cliente finale un controllo semplice e immediato su quando:

- l'AI puo rispondere
- la conversazione passa a un umano
- la conversazione viene chiusa

Il motore backend supporta gia questi stati.
Questa UI serve a renderli usabili senza SQL o intervento tecnico.

## Problema che risolve

Senza UI handoff:

- il motore funziona
- ma il cliente non ha controllo operativo reale

Con UI handoff:

- il cliente puo interrompere l'automazione
- puo riprendere il controllo AI
- puo chiudere una conversazione

Questo rende WhatsApp una funzione prodotto, non solo una pipeline tecnica.

## Dove vive la UI

La UI handoff deve vivere nella:

- vista conversazioni WhatsApp

Non nel card generale del canale.

Separazione consigliata:

- `Card canale WhatsApp` -> stato collegamento
- `Vista conversazione` -> stato operativo della conversazione

## Stati conversazione da esporre

Il backend usa gia o puo usare stati come:

- `ai_active`
- `human_handoff`
- `closed`

La UI deve mostrare chiaramente questi stati con badge leggibili.

### Stato `ai_active`

Significato:

- Zirèl puo rispondere automaticamente

Badge suggerito:

- `AI attiva`

### Stato `human_handoff`

Significato:

- l'AI e sospesa
- la gestione passa a una persona

Badge suggerito:

- `Passata a operatore`

### Stato `closed`

Significato:

- conversazione chiusa
- nessuna risposta AI automatica

Badge suggerito:

- `Chiusa`

## Azioni minime

### 1. Passa a umano

Effetto backend:

- `tenant_conversations.status = 'human_handoff'`

Effetto prodotto:

- i nuovi inbound vengono ancora salvati
- l'orchestrator non genera risposte AI

Etichetta bottone:

- `Passa a operatore`

### 2. Riattiva AI

Effetto backend:

- `tenant_conversations.status = 'ai_active'`

Effetto prodotto:

- i nuovi inbound tornano a poter attivare AI

Etichetta bottone:

- `Riattiva AI`

### 3. Chiudi conversazione

Effetto backend:

- `tenant_conversations.status = 'closed'`

Effetto prodotto:

- l'AI non risponde piu automaticamente
- la conversazione resta storicizzata

Etichetta bottone:

- `Chiudi conversazione`

## Regole UX per i bottoni

### Se stato = `ai_active`

Mostrare:

- `Passa a operatore`
- `Chiudi conversazione`

### Se stato = `human_handoff`

Mostrare:

- `Riattiva AI`
- `Chiudi conversazione`

### Se stato = `closed`

Mostrare:

- `Riapri con AI`
  oppure
- `Riattiva AI`

Se si vuole mantenere la UI piu semplice nel primo rollout:

- usare sempre `Riattiva AI`

## Informazioni da mostrare nella vista conversazione

Minimo consigliato:

- badge stato conversazione
- badge AI status
- ultimo messaggio ricevuto
- ultimo messaggio inviato
- indicazione se l'ultimo messaggio in uscita e AI o umano
- azioni contestuali

## Microcopy suggerita

### Stato AI attiva

> Zirèl puo rispondere automaticamente ai nuovi messaggi in questa conversazione.

### Stato handoff umano

> Le risposte automatiche sono sospese. I nuovi messaggi saranno ricevuti ma non avranno risposta AI finche non riattivi l'automazione.

### Stato chiusa

> La conversazione e chiusa. Zirèl non inviera nuove risposte automatiche finche non riattivi la conversazione.

## Conferme consigliate

### Per `Passa a operatore`

Conferma semplice:

> Vuoi sospendere le risposte automatiche AI per questa conversazione?

### Per `Chiudi conversazione`

Conferma semplice:

> Vuoi chiudere questa conversazione? Zirèl non rispondera automaticamente ai nuovi messaggi finche non la riattivi.

## Comportamento atteso dopo click

### `Passa a operatore`

UI:

- badge cambia subito a `Passata a operatore`
- messaggio toast di conferma

Runtime:

- i successivi inbound finiscono con skip AI

### `Riattiva AI`

UI:

- badge torna a `AI attiva`

Runtime:

- i nuovi inbound tornano a passare nell'orchestrator

### `Chiudi conversazione`

UI:

- badge `Chiusa`

Runtime:

- i nuovi inbound vengono salvati ma l'AI non risponde

## Error handling UI

Se l'update stato fallisce:

- non mostrare badge falso
- toast errore leggibile
- pulsante `Riprova`

Messaggio esempio:

> Non siamo riusciti ad aggiornare lo stato della conversazione. Riprova tra qualche istante.

## Audit desiderato

Ogni cambio stato dovrebbe essere tracciabile.

Minimo utile:

- chi ha cliccato
- tenant
- conversation_id
- stato precedente
- stato nuovo
- timestamp

## API / contract minimo richiesto lato dashboard

Serve un endpoint o action server-side del tipo:

### Input esempio

```json
{
  "conversation_id": "5bda9918-b5da-4a7d-bc6b-53979cd59498",
  "action": "human_handoff"
}
```

Azioni ammesse:

- `human_handoff`
- `resume_ai`
- `close`

### Output esempio

```json
{
  "ok": true,
  "conversation_id": "5bda9918-b5da-4a7d-bc6b-53979cd59498",
  "status": "human_handoff"
}
```

Errore esempio:

```json
{
  "ok": false,
  "error_code": "CONVERSATION_STATUS_UPDATE_FAILED",
  "error_message": "Unable to update conversation status"
}
```

## Mapping backend minimo

### `human_handoff`

- `status = 'human_handoff'`

### `resume_ai`

- `status = 'ai_active'`

### `close`

- `status = 'closed'`

## Casi di test minimi

### Caso 1

Conversazione in `ai_active`

- clic su `Passa a operatore`
- manda nuovo messaggio
- nessuna reply AI

### Caso 2

Conversazione in `human_handoff`

- clic su `Riattiva AI`
- manda nuovo messaggio
- reply AI presente

### Caso 3

Conversazione in `ai_active`

- clic su `Chiudi conversazione`
- manda nuovo messaggio
- inbound salvato
- nessuna reply AI

## Priorita prodotto

Per il primo rollout basta:

- badge stato
- 3 azioni
- toast di conferma/errore

Non servono subito:

- assegnazioni operatore
- note interne avanzate
- SLA panel
- audit UI complesso

## Conclusione

La UI handoff e il pezzo che da controllo operativo al cliente.

Il valore non e tecnico ma prodotto:

- l'AI aiuta quando serve
- l'umano riprende controllo quando vuole
- il cliente si fida di piu del sistema
