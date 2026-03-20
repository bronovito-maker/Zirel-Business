# WhatsApp Embedded Signup UX

Specifica funzionale della UX dashboard per collegare WhatsApp a Zirèl tramite `Embedded Signup`.

## Obiettivo

Rendere il collegamento WhatsApp comprensibile e autonomo per il cliente finale, senza esporre dettagli tecnici di Meta o della pipeline runtime.

Questa UX non deve spiegare il motore interno.
Deve solo accompagnare il cliente da:

- `non collegato`

a:

- `collegato e pronto`

## Contesto prodotto

Il runtime WhatsApp V3 di Zirèl e gia funzionante.

Questa UX serve a:

- avviare il collegamento del canale
- mostrare lo stato corrente
- aiutare il cliente se qualcosa va storto

## Entry point consigliato

Nella dashboard tenant deve esistere una sezione dedicata tipo:

- `Canali`
- oppure `WhatsApp`
- oppure `Messaggistica`

All'interno, un card/pannello dedicato a WhatsApp.

## Stati UX minimi

### 1. `not_connected`

Significato:

- il tenant non ha ancora collegato un canale WhatsApp

UI minima:

- titolo: `Collega WhatsApp`
- descrizione breve
- bottone primario: `Collega WhatsApp`

Microcopy suggerita:

> Collega il tuo numero WhatsApp Business a Zirèl per ricevere messaggi, automatizzare le risposte e gestire le conversazioni in un unico posto.

### 2. `connection_in_progress`

Significato:

- il cliente ha avviato il flusso ma il collegamento non e ancora confermato

UI minima:

- stato visibile: `Collegamento in corso`
- bottone secondario: `Ricarica stato`
- bottone opzionale: `Riprova collegamento`

Microcopy suggerita:

> Stiamo verificando il collegamento del tuo account WhatsApp. Se hai appena completato il flusso Meta, attendi qualche istante e aggiorna lo stato.

### 3. `connected`

Significato:

- il canale e collegato correttamente

UI minima:

- badge verde: `Connesso`
- numero collegato
- nome verificato, se disponibile
- data ultimo aggiornamento
- stato AI/Handoff visibile

Azioni minime:

- `Visualizza dettagli`
- `Gestisci automazione`
- `Passa a umano` nella vista conversazione, non qui nel card canale

Microcopy suggerita:

> Il tuo numero WhatsApp e collegato a Zirèl ed e pronto per ricevere e inviare messaggi.

### 4. `requires_attention`

Significato:

- il collegamento esiste ma richiede intervento

Esempi:

- dati incompleti
- configurazione non sincronizzata
- numero collegato ma non pienamente utilizzabile

UI minima:

- badge giallo
- spiegazione leggibile
- bottone: `Completa configurazione`
- bottone: `Contatta supporto`

### 5. `error`

Significato:

- il flusso di collegamento e fallito oppure non e stato completato correttamente

UI minima:

- badge rosso
- messaggio errore leggibile
- bottone primario: `Riprova`
- bottone secondario: `Contatta supporto`

## Struttura del card WhatsApp

Il card dovrebbe contenere almeno:

1. titolo
   - `WhatsApp`

2. stato
   - `Non collegato`
   - `Collegamento in corso`
   - `Connesso`
   - `Richiede attenzione`
   - `Errore`

3. descrizione breve

4. dati principali se disponibili
   - numero collegato
   - nome verificato
   - ultimo aggiornamento

5. azione primaria contestuale

## CTA principali

### Caso `not_connected`

- `Collega WhatsApp`

### Caso `connection_in_progress`

- `Ricarica stato`

### Caso `connected`

- `Gestisci WhatsApp`

### Caso `requires_attention`

- `Completa configurazione`

### Caso `error`

- `Riprova collegamento`

## Modale o flow suggerito

Quando il cliente clicca `Collega WhatsApp`:

1. si apre una modale o nuova vista dedicata
2. Zirèl spiega in 2-3 righe cosa succedera
3. parte il flusso `Embedded Signup`

### Testo suggerito prima del flow

> Verrai guidato nella configurazione del tuo account WhatsApp Business tramite Meta. Al termine, Zirèl colleghera automaticamente il tuo numero al tenant attuale.

## Cosa evitare nella UX

Non mostrare al cliente finale:

- token
- app id
- phone number id tecnico
- webhook
- dettagli n8n
- riferimenti a Supabase

Il cliente deve vedere solo:

- numero
- stato
- cosa puo fare adesso

## Success state dettagliato

Dopo successo, la dashboard dovrebbe mostrare:

- numero collegato
- nome verificato
- badge `Connesso`
- se AI e attiva oppure no
- link alla vista conversazioni

Messaggio suggerito:

> WhatsApp e collegato correttamente. Da ora Zirèl puo ricevere messaggi e, se attivato, rispondere automaticamente.

## Error state dettagliato

In caso di errore, distinguere almeno:

- errore temporaneo
- configurazione incompleta
- numero gia collegato altrove

Messaggi esempio:

### errore temporaneo

> Non siamo riusciti a completare il collegamento. Riprova tra qualche istante.

### configurazione incompleta

> Il collegamento e iniziato, ma mancano ancora alcuni dati per completarlo.

### conflitto numero

> Questo numero risulta gia associato a un'altra configurazione. Contatta il supporto per procedere.

## Post-connection journey

Dopo il collegamento, il passo successivo piu utile e portare il cliente verso:

- test del canale
- impostazioni automazione
- handoff umano

### CTA suggerite dopo `connected`

- `Apri conversazioni`
- `Configura automazione`
- `Scopri come funziona il passaggio a operatore`

## Relazione con UI Handoff

Il card di collegamento WhatsApp non deve fare tutto.

Separazione consigliata:

- `Card WhatsApp`: stato canale e collegamento
- `Vista conversazioni`: handoff e gestione operativa

## Metriche UX utili

Da tracciare in futuro:

- click su `Collega WhatsApp`
- signup avviati
- signup completati
- signup falliti
- tempo medio di completamento
- tenant con canale connesso

## Casi limite da considerare

1. utente abbandona il flow Meta
2. utente chiude la finestra
3. Meta completa ma Zirèl non ha ancora sincronizzato
4. tenant torna sulla dashboard dopo alcuni minuti

Per questo la UX deve avere sempre:

- stato persistente
- bottone `Ricarica stato`
- messaggi non tecnici

## Conclusione

Questa UX deve far percepire il collegamento WhatsApp come una funzione prodotto semplice.

Il cliente non deve capire:

- Meta
- token
- webhook

Deve solo capire:

- se e collegato
- se non lo e, come collegarsi
- cosa puo fare una volta collegato
