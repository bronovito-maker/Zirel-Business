# Workflow n8n: Registra_Appuntamento

Specifica operativa per il workflow unico `Registra_Appuntamento`, pensato per centralizzare tutte le richieste di appuntamento dei tenant non-restaurant.

## Obiettivo

Registrare in modo reale un appuntamento o una richiesta di contatto strutturata solo dopo conferma esplicita dell'utente, salvando il lead in Supabase e notificando il team interno.

Primo caso d'uso attivo:

- `appointment_type = demo_request` per `zirel_official`

Casi gia previsti dal design, ma da attivare gradualmente:

- `appointment_type = intro_call`
- `appointment_type = first_consultation`
- `appointment_type = callback_request`

## Contratto di Input

Il workflow deve essere eseguito tramite `When Executed by Another Workflow` e ricevere questo payload:

```json
{
  "tenant_id": "zirel_official",
  "business_type": "professional",
  "appointment_type": "demo_request",
  "nome": "Mario Rossi",
  "telefono": "+39 333 1234567",
  "email": "mario@hotelsole.it",
  "data_input": "venerdi 13 marzo",
  "orario": "10:30",
  "note": "Gestisce un hotel 3 stelle a Riccione e vuole capire il piano migliore"
}
```

## Contratto di Output

Il workflow deve sempre restituire un oggetto coerente, anche in errore:

```json
{
  "success": true,
  "code": "APPOINTMENT_CREATED",
  "message": "Appuntamento registrato correttamente.",
  "lead_id": "uuid-or-row-id",
  "appointment_type": "demo_request",
  "data_appuntamento": "2026-03-13",
  "data_appuntamento_label": "venerdi 13 marzo 2026",
  "orario": "10:30",
  "nome": "Mario Rossi",
  "telefono": "+39 333 1234567",
  "email": "mario@hotelsole.it",
  "note": "Gestisce un hotel 3 stelle a Riccione e vuole capire il piano migliore",
  "booking_summary": "Richiesta demo da Mario Rossi per venerdi 13 marzo 2026 alle 10:30.",
  "final_reply": "Perfetto, ho registrato la tua richiesta demo per venerdi 13 marzo 2026 alle 10:30. Il nostro team ti contattera a breve usando telefono o email indicati."
}
```

## Guardrail

- Se `business_type` non e supportato, bloccare il flusso con `code = "UNSUPPORTED_SECTOR"`.
- Se `appointment_type` non e supportato, bloccare il flusso con `code = "UNSUPPORTED_APPOINTMENT_TYPE"`.
- Se mancano `nome` o `telefono`, bloccare il flusso con `code = "MISSING_REQUIRED_FIELDS"`.
- Se il tipo appuntamento richiede email (come `demo_request`) e `email` manca, bloccare il flusso con `code = "MISSING_REQUIRED_FIELDS"`.
- Se `data_input` o `orario` sono vaghi o non parseabili in modo affidabile, bloccare il flusso con `code = "NEED_EXACT_SLOT"`.
- Nessuna conferma commerciale deve essere mostrata all'utente prima del completamento del nodo di scrittura.
- Usare sempre timezone `Europe/Rome`.

## Tabella Supabase consigliata

Tabella: `appointments`

Campi minimi:

```sql
id uuid primary key default gen_random_uuid(),
created_at timestamptz not null default now(),
tenant_id text not null,
business_type text not null,
appointment_type text not null,
nome text not null,
telefono text not null,
email text,
data_appuntamento date not null,
orario text not null,
note text,
stato text not null default 'new',
source text not null default 'chat_widget'
```

## Struttura del Workflow

1. `When Executed by Another Workflow`
2. `Check Sector Supported`
3. `Check Appointment Type`
4. `Normalize Contact Data`
5. `Check Required Fields`
6. `Parse Appointment Date`
7. `Build Appointment Copy`
8. `Create a row` (tabella `appointments`)
9. `Telegram - Team Alert`
10. `Email - Internal Notification`
11. `Edit Fields`

## Settori supportati

Per mantenere il workflow governabile, supporta solo questi rami:

- `professional`
- `medical`
- `legal`
- `hotel`

Escludi esplicitamente:

- `restaurant`

Il ristorante continua a usare `Registra_Prenotazione`, che ha regole operative diverse.

## Tipi appuntamento supportati

Per il primo rilascio:

- `demo_request`

Il workflow va progettato per essere estendibile, ma non va riempito subito di eccezioni.

## Nodo 2: Check Sector Supported

Condizione:

```javascript
{{ ['professional', 'medical', 'legal', 'hotel'].includes(String($json.business_type || '').trim().toLowerCase()) }}
```

Ramo falso: restituire

```json
{
  "success": false,
  "code": "UNSUPPORTED_SECTOR",
  "message": "Questo workflow gestisce solo appuntamenti per settori non-restaurant supportati.",
  "final_reply": "Posso raccogliere i dati, ma questa richiesta non puo essere registrata da questo flusso."
}
```

## Nodo 3: Check Appointment Type

Condizione:

```javascript
{{ ['demo_request'].includes(String($json.appointment_type || '').trim().toLowerCase()) }}
```

Ramo falso: restituire `UNSUPPORTED_APPOINTMENT_TYPE`.

## Nodo 4: Normalize Contact Data

Nodo `Code` in JavaScript:

```javascript
const value = $json;

const normalizeSpaces = (input) =>
  String(input || '')
    .replace(/\s+/g, ' ')
    .trim();

const nome = normalizeSpaces(value.nome)
  .split(' ')
  .map((part) => part ? part[0].toUpperCase() + part.slice(1).toLowerCase() : '')
  .join(' ');

const telefono = normalizeSpaces(value.telefono).replace(/[^\d+\s]/g, '');
const email = normalizeSpaces(value.email).toLowerCase();
const note = normalizeSpaces(value.note);
const appointment_type = normalizeSpaces(value.appointment_type).toLowerCase();
const business_type = normalizeSpaces(value.business_type).toLowerCase();

return [{
  json: {
    ...value,
    nome,
    telefono,
    email,
    note,
    appointment_type,
    business_type,
  },
}];
```

## Nodo 5: Check Required Fields

Condizione:

```javascript
{{
  !!String($json.nome || '').trim() &&
  !!String($json.telefono || '').trim() &&
  (
    $json.appointment_type !== 'demo_request' ||
    !!String($json.email || '').trim()
  )
}}
```

Ramo falso: restituire `MISSING_REQUIRED_FIELDS`.

## Nodo 6: Parse Appointment Date

Questo nodo deve usare `Europe/Rome` e applicare una regola rigorosa e comune:

- accetta `oggi`, `domani`, date esplicite e giorni della settimana;
- rifiuta input vaghi come "settimana prossima", "un pomeriggio", "quando potete";
- richiede sempre un orario preciso in formato affidabile.

Se il parsing fallisce, restituire:

```json
{
  "success": false,
  "code": "NEED_EXACT_SLOT",
  "message": "Data o orario non abbastanza precisi.",
  "final_reply": "Per registrare davvero l'appuntamento mi serve una data precisa e un orario preciso, ad esempio 13 marzo alle 10:30."
}
```

Output atteso del nodo:

```json
{
  "data_appuntamento": "2026-03-13",
  "data_appuntamento_label": "venerdi 13 marzo 2026"
}
```

## Nodo 7: Build Appointment Copy

Nodo `Code` dedicato a costruire testi coerenti senza moltiplicare eccezioni.

Per il primo ramo `demo_request`:

```javascript
const labels = {
  demo_request: {
    kind: 'richiesta demo',
    successMessage: 'Richiesta demo registrata correttamente.',
    finalReply: `Perfetto, ho registrato la tua richiesta demo per ${$json.data_appuntamento_label} alle ${$json.orario}. Il nostro team ti contattera a breve usando telefono o email indicati.`,
  },
};

const copy = labels[$json.appointment_type] || {
  kind: 'appuntamento',
  successMessage: 'Appuntamento registrato correttamente.',
  finalReply: `Perfetto, ho registrato il tuo appuntamento per ${$json.data_appuntamento_label} alle ${$json.orario}.`,
};

return [{
  json: {
    ...$json,
    appointment_kind_label: copy.kind,
    success_message: copy.successMessage,
    generated_final_reply: copy.finalReply,
  },
}];
```

## Nodo 8: Create a row

Mappatura minima verso `appointments`:

- `tenant_id` -> `={{ $json.tenant_id }}`
- `business_type` -> `={{ $json.business_type }}`
- `appointment_type` -> `={{ $json.appointment_type }}`
- `nome` -> `={{ $json.nome }}`
- `telefono` -> `={{ $json.telefono }}`
- `email` -> `={{ $json.email }}`
- `data_appuntamento` -> `={{ $json.data_appuntamento }}`
- `orario` -> `={{ $json.orario }}`
- `note` -> `={{ $json.note }}`
- `stato` -> `new`
- `source` -> `chat_widget`

Dopo `Create a row`, il workflow deve aprire rami paralleli:

- `Edit Fields` sul ramo principale
- `Telegram - Team Alert` come notifica interna non bloccante
- `Check Has Email` per il ramo email cliente

In questo modo il successo del tool dipende dal salvataggio nel database, non dall'esito delle notifiche.

## Nodo 9: Telegram - Team Alert

Messaggio suggerito:

```text
Nuovo appuntamento Zirèl

Tenant: {{$json.tenant_id}}
Settore: {{$json.business_type}}
Tipo: {{$json.appointment_type}}
Nome: {{$json.nome}}
Telefono: {{$json.telefono}}
Email: {{$json.email || 'Non fornita'}}
Slot richiesto: {{$json.data_appuntamento_label}} alle {{$json.orario}}
Note: {{$json.note || 'Nessuna nota'}}
```

Il nodo deve avere `On Error -> Continue Regular Output`.

## Nodo 10: Check Has Email

Condizione:

```javascript
{{ !!String($json.email || '').trim() }}
```

Se falso, il ramo email si interrompe senza errori.

## Nodo 11: Get Tenant Row

Leggere la tabella `tenants` filtrando per `tenant_id`.

Questo nodo serve a recuperare il branding del tenant da usare nel testo della mail:

- `nome_attivita`
- `telefono`
- `mail`
- `sito_web_url`

## Nodo 12: HTTP Request (Resend)

Usare Resend via API con credenziale `Header Auth` dedicata.

Regole:

- il bearer token non va mai lasciato inline nel workflow
- il nodo deve avere `On Error -> Continue Regular Output`
- `from` puo restare su dominio verificato Zirèl (es. `noreply@zirel.org`)
- il corpo della mail deve usare il brand del tenant, non il brand Zirèl

Il `jsonBody` deve leggere:

- i dati cliente/appuntamento dal nodo `Build Appointment Copy`
- i dati tenant dal nodo `Get Tenant Row`

Esempio:

```javascript
={{
  {
    from: 'Zirel <noreply@zirel.org>',
    to: [$node["Build Appointment Copy"].json.email],
    subject: `Richiesta ricevuta da ${$node["Get Tenant Row"].json.nome_attivita}`,
    text: `Ciao ${$node["Build Appointment Copy"].json.nome},

abbiamo ricevuto correttamente la tua richiesta di appuntamento con ${$node["Get Tenant Row"].json.nome_attivita}.

Riepilogo:
- Data: ${$node["Build Appointment Copy"].json.data_appuntamento_label}
- Ora: ${$node["Build Appointment Copy"].json.orario}
- Email: ${$node["Build Appointment Copy"].json.email}

Ti contatteremo a breve per conferma e dettagli.

A presto,
Team ${$node["Get Tenant Row"].json.nome_attivita}`,
    html: `<p>Ciao ${$node["Build Appointment Copy"].json.nome},</p><p>Abbiamo ricevuto correttamente la tua richiesta di appuntamento con <strong>${$node["Get Tenant Row"].json.nome_attivita}</strong>.</p><p><strong>Riepilogo:</strong><br>Data: ${$node["Build Appointment Copy"].json.data_appuntamento_label}<br>Ora: ${$node["Build Appointment Copy"].json.orario}<br>Email: ${$node["Build Appointment Copy"].json.email}</p><p>Ti contatteremo a breve per conferma e dettagli.</p><p>A presto,<br>Team ${$node["Get Tenant Row"].json.nome_attivita}</p>`,
  }
}}
```

## Nodo 13: Edit Fields

Restituire esattamente:

```javascript
return [{
  json: {
    success: true,
    code: 'APPOINTMENT_CREATED',
    message: $json.success_message || 'Appuntamento registrato correttamente.',
    lead_id: $json.id || $json.lead_id || null,
    appointment_type: $json.appointment_type,
    business_type: $json.business_type,
    data_appuntamento: $json.data_appuntamento,
    data_appuntamento_label: $json.data_appuntamento_label,
    orario: $json.orario,
    nome: $json.nome,
    telefono: $json.telefono,
    email: $json.email || '',
    note: $json.note || '',
    booking_summary: `${$json.appointment_kind_label || 'Appuntamento'} da ${$json.nome} per ${$json.data_appuntamento_label} alle ${$json.orario}.`,
    final_reply: $json.generated_final_reply || `Perfetto, ho registrato il tuo appuntamento per ${$json.data_appuntamento_label} alle ${$json.orario}.`,
  },
}];
```

## Integrazione con AI Core

Nel nodo `AI Agent`, il tool deve essere descritto in modo restrittivo:

```text
Usa questo tool solo per registrare un appuntamento reale quando hai gia raccolto i dati obbligatori, hai identificato il tipo di appuntamento e l'utente ha confermato esplicitamente il riepilogo finale.
```

Prima del tool:

- non dire "appuntamento fissato";
- non dire "ti ho appena registrato";
- non inventare disponibilita;
- se la richiesta e ancora vaga, chiedi il dato mancante.

## Nota operativa: Railway

Se n8n mostra `Queued` o `Starting soon`, trattalo come un segnale infrastrutturale (worker occupato, cold start, restart Railway), non come un bug del parser o della logica del workflow.
