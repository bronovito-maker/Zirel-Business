# Patch AI Core: tool `Registra_Appuntamento`

Questa patch completa l'integrazione del nuovo workflow `Zirèl - Registra_Appuntamento` dentro l'AI Core, seguendo lo stesso pattern già usato per `Registra_Prenotazione`.

## 1. Nuovo nodo `toolWorkflow`

Importa o crea un nodo di tipo `@n8n/n8n-nodes-langchain.toolWorkflow` con questa struttura.

Sostituisci `REPLACE_WITH_WORKFLOW_ID` con l'ID reale del workflow dopo l'import.

```json
{
  "parameters": {
    "description": "Registra un appuntamento reale nel database. Usalo solo quando hai identificato il tipo di appuntamento, hai i dati obbligatori e hai ricevuto una conferma esplicita dell'utente.",
    "workflowId": {
      "__rl": true,
      "value": "REPLACE_WITH_WORKFLOW_ID",
      "mode": "id"
    },
    "workflowInputs": {
      "mappingMode": "defineBelow",
      "value": {
        "tenant_id": "={{ $('Crystalize Context').item.json.tenant_id }}",
        "business_type": "={{ $('Build Prompt').item.json.normalized_business_type }}",
        "appointment_type": "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('appointment_type', ``, 'string') }}",
        "nome": "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('nome', ``, 'string') }}",
        "telefono": "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('telefono', ``, 'string') }}",
        "email": "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('email', ``, 'string') }}",
        "data_input": "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('data_input', ``, 'string') }}",
        "orario": "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('orario', ``, 'string') }}",
        "note": "={{ /*n8n-auto-generated-fromAI-override*/ $fromAI('note', ``, 'string') }}"
      },
      "matchingColumns": [],
      "schema": [
        {
          "id": "tenant_id",
          "displayName": "tenant_id",
          "required": false,
          "defaultMatch": false,
          "display": true,
          "canBeUsedToMatch": true,
          "type": "string",
          "removed": false
        },
        {
          "id": "business_type",
          "displayName": "business_type",
          "required": false,
          "defaultMatch": false,
          "display": true,
          "canBeUsedToMatch": true,
          "type": "string",
          "removed": false
        },
        {
          "id": "appointment_type",
          "displayName": "appointment_type",
          "required": false,
          "defaultMatch": false,
          "display": true,
          "canBeUsedToMatch": true,
          "type": "string",
          "removed": false
        },
        {
          "id": "nome",
          "displayName": "nome",
          "required": false,
          "defaultMatch": false,
          "display": true,
          "canBeUsedToMatch": true,
          "type": "string",
          "removed": false
        },
        {
          "id": "telefono",
          "displayName": "telefono",
          "required": false,
          "defaultMatch": false,
          "display": true,
          "canBeUsedToMatch": true,
          "type": "string",
          "removed": false
        },
        {
          "id": "email",
          "displayName": "email",
          "required": false,
          "defaultMatch": false,
          "display": true,
          "canBeUsedToMatch": true,
          "type": "string",
          "removed": false
        },
        {
          "id": "data_input",
          "displayName": "data_input",
          "required": false,
          "defaultMatch": false,
          "display": true,
          "canBeUsedToMatch": true,
          "type": "string",
          "removed": false
        },
        {
          "id": "orario",
          "displayName": "orario",
          "required": false,
          "defaultMatch": false,
          "display": true,
          "canBeUsedToMatch": true,
          "type": "string",
          "removed": false
        },
        {
          "id": "note",
          "displayName": "note",
          "required": false,
          "defaultMatch": false,
          "display": true,
          "canBeUsedToMatch": true,
          "type": "string",
          "removed": false
        }
      ],
      "attemptToConvertTypes": false,
      "convertFieldsToString": false
    }
  },
  "type": "@n8n/n8n-nodes-langchain.toolWorkflow",
  "typeVersion": 2.2,
  "name": "Call 'Zirèl - Registra_Appuntamento'"
}
```

Collegamento:

```json
{
  "Call 'Zirèl - Registra_Appuntamento'": {
    "ai_tool": [
      [
        {
          "node": "AI Agent",
          "type": "ai_tool",
          "index": 0
        }
      ]
    ]
  }
}
```

## 2. Aggiornamento `Build Prompt`

Nel ramo `professional` del tuo nodo `Build Prompt`, aggiungi queste regole.

```text
- Se l'utente vuole un appuntamento, identifica prima il tipo corretto (per ora: `demo_request`).
- Raccogli i dati in modo progressivo: nome, telefono, email quando richiesta, data, orario, note.
- Quando hai tutti i dati, fai un solo riepilogo finale e chiedi esplicitamente: "Confermi?".
- Usa il tool Registra_Appuntamento solo dopo una conferma esplicita del cliente.
- Non dire mai che l'appuntamento è prenotato, registrato o inoltrato prima dell'esecuzione riuscita del tool.
- Se il tool non è disponibile o fallisce, spiega chiaramente che hai raccolto i dati ma non hai registrato ancora la richiesta.
- Se l'utente usa richieste vaghe come "settimana prossima" o "di mattina", chiedi una data precisa e un orario preciso.
```

## 3. Aggiornamento blocco `[UTILIZZO TOOLS]`

Nel `final_system_prompt`, estendi il blocco tools così:

```text
- Registra_Appuntamento:
  - Usalo solo per i settori supportati diversi da restaurant.
  - Per ora il tipo attivo e solo `demo_request`.
  - Usalo solo quando hai gia raccolto il tipo di appuntamento e tutti i dati obbligatori.
  - Per `demo_request`, Email e obbligatoria.
  - Le note sono opzionali ma utili.
  - Prima del tool devi sempre fare un riepilogo e chiedere conferma esplicita.
  - Non usare il tool se manca anche uno solo dei dati obbligatori.
  - Non dire mai che l'appuntamento e confermato prima che il tool abbia restituito successo.
```

## 4. Nota pratica

Finché il nodo non è collegato e testato, il prompt deve restare conservativo:

- il bot può raccogliere dati;
- il bot non deve dire "ti ho fissato l'appuntamento";
- il bot deve dire che sta solo preparando la richiesta o raccogliendo le informazioni necessarie.
