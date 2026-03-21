# Richieste Operations Flow

## Obiettivo
Trasformare la sezione dashboard oggi chiamata `Prenotazioni` in una vera inbox operativa `Richieste`, capace di gestire:

- richieste appuntamento (`appointments`)
- richieste tavolo (`prenotazioni`)
- in futuro richieste hotel (`hotel_bookings`)

Il flusso deve permettere al team di:

- vedere subito le richieste ricevute
- confermarle manualmente
- rifiutarle con motivo
- proporre una modifica di data/orario senza cambiare la richiesta in silenzio
- inviare email cliente coerenti con lo stato reale
- tracciare gli eventi operativi lato dashboard

---

## Decisione Chiave: come gestire `change_proposed`

Quando il team propone un nuovo slot, il cliente **non** deve ricevere una modifica silenziosa.

La regola corretta e:

1. la richiesta originale resta tracciata
2. il team propone un nuovo slot
3. la richiesta passa a stato `change_proposed`
4. il cliente riceve una mail con proposta chiara
5. il cliente conferma o rifiuta la proposta

### MVP consigliato
Per il primo rilascio, la conferma della proposta cliente avviene **manual review assistita**, non con link magici immediati.

In pratica:

- nella mail cliente scriviamo:
  - lo slot richiesto non e disponibile
  - proponiamo `data + ora` alternative
  - invitiamo il cliente a rispondere alla mail oppure a contattare il canale operativo
- in dashboard la richiesta resta nello stato:
  - `change_proposed`
- quando il cliente risponde positivamente, l'operatore clicca:
  - `Conferma modifica`
  oppure
  - `Conferma`

### Perche questa scelta e la migliore adesso

- evita di implementare subito token, link signed e callback pubblici
- evita conferme accidentali o link inoltrati
- mantiene il controllo umano
- si adatta a tutti i verticali

### Evoluzione futura
In un secondo step potremo introdurre:

- pulsante email `Confermo il nuovo orario`
- pulsante email `Non va bene`
- link firmati con token temporaneo
- aggiornamento automatico stato richiesta

Ma non e necessario per il primo rilascio operativo.

---

## Stati Richiesta

Per `appointments` e `prenotazioni` usiamo gli stessi stati operativi:

- `manual_review`
- `confirmed`
- `rejected`
- `change_proposed`

Facoltativi per fase 2:

- `customer_confirmed_change`
- `customer_declined_change`
- `canceled`

### Significato

`manual_review`
- richiesta ricevuta
- non ancora confermata
- visibile nel filtro `Da gestire`

`confirmed`
- richiesta confermata dal team
- cliente notificato

`rejected`
- richiesta rifiutata dal team
- cliente notificato
- motivo rifiuto salvato

`change_proposed`
- richiesta originale non confermata
- nuova proposta inviata al cliente
- si aspetta risposta cliente / follow-up team

---

## Dashboard UX

### Lista `Richieste`
La lista deve mostrare subito i dati critici:

Per tutti:

- nome cliente
- data
- ora
- telefono
- stato
- badge `Nuova` se recente

Per restaurant:

- numero persone sempre visibile
- note visibili in preview se presenti

Per appointment:

- motivo o note in preview
- email visibile se presente

La lista non va segmentata per verticale.
Il filtro corretto e per stato operativo:

- `Da gestire`
- `Confermate`
- `Rifiutate`
- `Tutte`

In futuro:

- `Proposte inviate`

### Drawer dettaglio richiesta
Click sulla card => drawer laterale con:

Sezione 1: riepilogo

- tipo richiesta
- stato
- ricevuta il
- ultimo aggiornamento

Sezione 2: dati cliente

- nome
- telefono
- email

Sezione 3: dettaglio richiesta

Per appointment:

- data richiesta
- ora richiesta
- motivo
- note

Per restaurant:

- data richiesta
- ora richiesta
- persone
- note

Sezione 4: timeline

- richiesta ricevuta
- email cliente inviata
- conferma/rifiuto/proposta modifica
- operatore
- timestamp

Sezione 5: azioni

- `Conferma`
- `Rifiuta`
- `Proponi modifica`

Se stato `change_proposed`, aggiungere:

- `Conferma modifica`
- `Segna come rifiutata`

---

## Azioni Operative

### 1. Conferma

Input:

- nota interna opzionale
- messaggio cliente opzionale

Effetti:

- stato => `confirmed`
- salva `confirmed_at`
- salva `confirmed_by`
- aggiorna `last_customer_email_sent_at`
- aggiorna `last_internal_update_sent_at`
- crea evento timeline
- manda email cliente di conferma
- opzionale email/telegram interna di aggiornamento

### 2. Rifiuta

Input:

- `rejection_reason` obbligatorio
- messaggio cliente opzionale

Effetti:

- stato => `rejected`
- salva `rejected_at`
- salva `rejected_by`
- salva `rejection_reason`
- aggiorna `last_customer_email_sent_at`
- aggiorna `last_internal_update_sent_at`
- crea evento timeline
- manda email cliente di rifiuto

### 3. Proponi modifica

Input:

- nuova data obbligatoria
- nuovo orario obbligatorio
- nota operativa opzionale
- messaggio cliente opzionale

Effetti:

- stato => `change_proposed`
- salva `change_proposed_at`
- salva `change_proposed_by`
- salva `proposed_date`
- salva `proposed_time`
- salva `change_note`
- aggiorna `last_customer_email_sent_at`
- aggiorna `last_internal_update_sent_at`
- crea evento timeline
- manda email cliente con proposta alternativa

### 4. Conferma modifica

MVP:

- usata dal team dopo risposta positiva del cliente

Effetti:

- stato => `confirmed`
- salva `confirmed_at`
- salva `confirmed_by`
- crea evento timeline con payload che indica conferma della proposta
- opzionale email finale cliente di conferma definitiva

---

## Email Cliente da aggiungere

### Appointment

- `appointment_confirmed`
- `appointment_rejected`
- `appointment_change_proposed`

### Restaurant

- `restaurant_confirmed`
- `restaurant_rejected`
- `restaurant_change_proposed`

### Contenuto atteso

`*_confirmed`

- conferma chiara di data e ora
- dettagli essenziali
- contatto utile

`*_rejected`

- tono cortese
- richiesta non confermata
- motivo rifiuto
- invito a riproporre altra disponibilita se utile

`*_change_proposed`

- spiegazione chiara che lo slot richiesto non e disponibile
- nuova proposta `data + ora`
- istruzione semplice:
  - rispondi a questa mail per confermare
  - oppure contattaci per un altro orario

---

## Notifiche Interne

Oltre alla mail cliente:

- aggiornare notifica interna stato
- opzionale Telegram interno stato

Template futuri:

- `appointment_internal_status_update`
- `restaurant_internal_status_update`

Obiettivo:

- chi lavora vede subito che la richiesta e stata confermata / rifiutata / riprogrammata

---

## Database: estensioni richieste

Su `appointments` e `prenotazioni` aggiungere, se mancanti:

- `confirmed_at timestamptz null`
- `confirmed_by text null`
- `rejected_at timestamptz null`
- `rejected_by text null`
- `rejection_reason text null`
- `change_proposed_at timestamptz null`
- `change_proposed_by text null`
- `proposed_date date null`
- `proposed_time text null`
- `change_note text null`
- `last_customer_email_sent_at timestamptz null`
- `last_internal_update_sent_at timestamptz null`

### Tabella timeline consigliata
Creare `request_events`:

- `id uuid primary key default gen_random_uuid()`
- `tenant_id text not null`
- `request_type text not null`
- `request_id text not null`
- `event_type text not null`
- `actor text null`
- `payload jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`

Indici consigliati:

- `(tenant_id, request_type, request_id)`
- `(created_at desc)`

---

## Prompt per Antigravity + MCP Supabase

```text
Usa MCP Supabase sul database live di Zirèl e prepara la base dati per la gestione operativa completa delle richieste dalla dashboard.

Obiettivo:
estendere appointments e prenotazioni per supportare:
- conferma manuale
- rifiuto manuale con motivo
- proposta modifica manuale con nuova data/orario
- tracciamento timestamp operativi
- tracciamento operatore
- futura timeline eventi

Tabelle da aggiornare:
- appointments
- prenotazioni

Campi da aggiungere a entrambe le tabelle se non esistono già:
- confirmed_at timestamptz null
- confirmed_by text null
- rejected_at timestamptz null
- rejected_by text null
- rejection_reason text null
- change_proposed_at timestamptz null
- change_proposed_by text null
- proposed_date date null
- proposed_time text null
- change_note text null
- last_customer_email_sent_at timestamptz null
- last_internal_update_sent_at timestamptz null

In più:
crea una nuova tabella se non esiste:
request_events

Schema richiesto:
- id uuid primary key default gen_random_uuid()
- tenant_id text not null
- request_type text not null
- request_id text not null
- event_type text not null
- actor text null
- payload jsonb not null default '{}'::jsonb
- created_at timestamptz not null default now()

Indici consigliati:
- index su (tenant_id, request_type, request_id)
- index su created_at desc

Vincoli:
1. non alterare i dati esistenti
2. non rimuovere colonne attuali
3. non cancellare nulla
4. usare alter table add column if not exists dove possibile
5. mantenere compatibilità con i workflow esistenti
6. non toccare stripe, token, billing o campi sensibili non collegati a questa feature

Output richiesto:
1. SQL finale completo
2. elenco colonne aggiunte realmente
3. conferma che non è stato rimosso o sovrascritto nulla
4. eventuali warning di compatibilità
```

---

## Ordine implementativo consigliato

1. schema DB
2. drawer dettaglio richiesta
3. azioni dashboard:
   - conferma
   - rifiuta
   - proponi modifica
4. email cliente nuove
5. eventi timeline
6. eventuale phase 2 con conferma cliente via link signed

---

## Decisione finale raccomandata

Per il primo rilascio:

- conferma cliente di una proposta modifica = manuale, guidata da risposta email / contatto
- niente link auto-confirm per ora
- dashboard come unica console operativa
- tracking completo di stato + operatore + timestamp + reason

Questa e la soluzione piu pulita, credibile e sicura per Zirèl in questa fase.
