# Guida Manuale: Costruire il Ponte n8n (Zirèl)

Visto che i nodi potrebbero variare tra le versioni, ecco come creare e configurare tutto da zero pezzo per pezzo, esattamente come nello screenshot.

## 1. Il Nucleo: L'AI Agent
Cerca e trascina il nodo **AI Agent** al centro. È il coordinatore di tutto.
*   **Agent**: Scegli `Conversational Agent`.
*   **Prompt**: Impostalo su `={{ $json.chatInput }}`.
*   **System Message**: Qui devi incollare il testo del file `system_prompt.md`. È qui che gli dici di essere "l'Oste Romagnolo".

---

## 2. Collegare i "Sotto-Nodi" (Gli Input dell'Agent)
Questi nodi vanno collegati ai **punti di ingresso tratteggiati** sotto l'AI Agent (vedi screenshot).

### A. OpenAI Chat Model (Input: Model)
*   Cerca **OpenAI Chat Model**.
*   **Credentials**: Inserisci le tue API Key di OpenAI.
*   **Model**: Scegli `gpt-4o` o `gpt-4-turbo`.

### B. Window Buffer Memory (Input: Memory)
*   Cerca **Window Buffer Memory**.
*   **Window Size**: 5 o 10 (indica quanti messaggi passati l'AI deve ricordare).
*   **Session ID**: Lascia il default di n8n (o usa `={{ $json.sessionId }}`).

---

## 3. Gli Strumenti (Input: Tools)
Collega questi due nodi all'ingresso **Tools** dell'AI Agent.

### C. Google Sheets Tool #1 (Il Lettore)
*   Cerca **Google Sheets Tool**.
*   **Label**: Chiamalo "Lettore_Dati_Attivita".
*   **Description**: "Usa questo per leggere orari, prezzi e info da Info_Attività e Listino_Prezzi".
*   **Operation**: `Get many rows`.
*   **Document ID**: L'ID del tuo Google Sheet Master.

### D. Google Sheets Tool #2 (Lo Scrittore)
*   Aggiungi un altro **Google Sheets Tool**.
*   **Label**: Chiamalo "Registra_Prenotazione".
*   **Description**: "Usa questo SOLO per salvare una prenotazione quando hai Nome, Telefono, Data, Ora e Persone".
*   **Operation**: `Append row`.
*   **Sheet ID**: Lo stesso di sopra.
*   **Sheet Name**: `Prenotazioni_Log`.

---

## 4. L'Innesco: AI Chat Trigger
Trascina il nodo **AI Chat Trigger** a sinistra.
*   **Connections**: Trascina una linea dal pallino di uscita dell'AI Chat Trigger al pallino di ingresso (pieno, sopra) dell'**AI Agent**.

---

## 5. Come Collegare Tutto (Schema Visivo)
*   **AI Chat Trigger**  ➡️ (Ingresso Principale) ➡️ **AI Agent**
*   **OpenAI Model**     ➡️ (Ingresso Model)      ➡️ **AI Agent**
*   **Window Memory**   ➡️ (Ingresso Memory)     ➡️ **AI Agent**
*   **GS Reader Tool**   ➡️ (Ingresso Tools)      ➡️ **AI Agent**
*   **GS Writer Tool**   ➡️ (Ingresso Tools)      ➡️ **AI Agent**

## 6. Configurazione della Memoria
Dallo screenshot che hai inviato, n8n ti mostra diverse opzioni. La più semplice e adatta per iniziare è:
1.  Cerca **Window Buffer Memory**.
    *   *Nota:* Se non la vedi subito tra le icone principali, scrivi "Window Buffer" nella barra di ricerca.
2.  **Perché questa?** Perché tiene in memoria gli ultimi X messaggi (es. 5-10) in modo che l'AI non si dimentichi cosa avete detto 2 minuti prima.
3.  **Configurazione**:
    *   **Context Window Size**: Impostalo a `10`.
    *   **Session ID**: Lascialo vuoto o scrivi `={{ $json.sessionId }}` se vuoi che riconosca utenti diversi.

---

## 7. Struttura dei Fogli Google Sheet (Database Universale)
Crea un unico file Google Sheet chiamato **"Master Zirèl"** e aggiungi questi tre fogli (tab) in basso:

### Tab 1: `Info_Attività`
Questa è l'anagrafica del locale. Inserisci queste colonne nella prima riga:
*   `Nome_Attività` | `Indirizzo` | `Orari_Apertura` | `Descrizione` | `Sito_Web`

### Tab 2: `Listino_Prezzi`
Metti qui cosa vendono. Colonne:
*   `Voce_Menu` | `Prezzo` | `Categoria` (es. Pizza, Drink, Servizio) | `Descrizione_Piatto`

### Tab 3: `Prenotazioni_Log`
**Fondamentale:** Qui l'AI scriverà i dati. Le colonne devono essere identiche a quelle che mapperai nel nodo "GS Writer":
*   `ID` | `Timestamp` | `Nome_Cliente` | `Telefono` | `Data_Prenotazione` | `Ora` | `Persone` | `Stato` (es. PENDING)

---

## 8. Mappatura Precisa delle Colonne (Zirèl)
Per far sì che l'AI scriva correttamente i dati estratti nel foglio `Prenotazioni_Log`, configura il nodo **Registra_Prenotazione** così:

1.  Apri il nodo **Registra_Prenotazione**.
2.  In **Columns to send**, aggiungi queste righe (clicca su "Add Column"):

| Column Name (Nel Foglio) | Expression (Valore in n8n) |
| :--- | :--- |
| `Nome_Cliente` | `={{ $json.Nome }}` |
| `Telefono` | `={{ $json.Telefono }}` |
| `Data_Prenotazione` | `={{ $json.Data }}` |
| `Ora` | `={{ $json.Ora }}` |
| `Persone` | `={{ $json.Persone }}` |
| `Timestamp` | `={{ new Date().toLocaleString() }}` |
| `Stato` | `PENDING` |

> [!TIP]
> Assicurati che il nome della colonna nel foglio Google Sheet sia **esattamente** quello scritto nella colonna di sinistra della tabella qui sopra.

---

## 9. Come Eseguire il Test della Chat
In n8n, quando usi il nodo **AI Chat Trigger**, hai un modo molto semplice per testare tutto senza uscire dall'editor:

1.  **Attiva il Test**: Clicca sul pulsante **"Test Workflow"** in basso al centro (o in alto a destra, a seconda della versione).
2.  **Apri la Chat**: Una volta che il workflow è in "attesa", clicca sul pulsante **"Chat"** che compare in basso a destra nella schermata di n8n.
3.  **Simula un Cliente**: Si aprirà una finestrella di chat. Scrivi qualcosa come: *"Ciao, chi sei?"* o *"Vorrei prenotare un tavolo"*.
4.  **Controlla i nodi**: Mentre l'AI risponde, vedrai i nodi (Gemini, Postgres, Google Sheets) illuminarsi di verde se il passaggio ha successo.
5.  **Verifica il Foglio**: Se hai simulato una prenotazione, corri a vedere il tuo Google Sheet: dovrebbe essere apparsa la riga!

---

## 10. Nota sulla Memoria Postgres
Se hai configurato la **Postgres Chat Memory**:
*   Assicurati di aver creato una tabella dedicata (o lascia che n8n la crei se ha i permessi).
---

## 11. Risoluzione Errori (Troubleshooting)

### Problema: L'AI mette "oggi" anche se chiedo "domani"
L'AI non ha un orologio interno aggiornato al secondo. Se gli chiedi "prenota per domani", lui non sa che giorno è oggi e potrebbe sbagliare.

**Soluzione:**
1.  Apri il nodo **AI Agent**.
2.  Nel **System Message**, all'inizio di tutto, aggiungi questa riga:
    `Oggi è il giorno: {{ new Date().toLocaleDateString('it-IT') }}`
3.  In questo modo, l'AI saprà sempre la data corretta e potrà calcolare "domani" o "sabato prossimo" senza errori.

---

### Verificare la Mappatura
Assicurati che nel nodo **Registra_Prenotazione**:
*   La colonna `Data_Prenotazione` abbia come espressione `={{ $json.Data }}`.
*   La colonna `Timestamp` (che è l'ora di creazione del record) abbia `={{ new Date().toLocaleString() }}`.
*   **Non scambiarle!** Se metti `new Date()` su `Data_Prenotazione`, scriverà sempre il momento attuale.

---

# FASE 2: Il Ponte delle Notifiche (Telegram)

Ora colleghiamo il Google Sheet a Telegram per ricevere un avviso sul cellulare ogni volta che qualcuno prenota.

## 1. Creare il Bot Telegram
1. Apri Telegram e cerca **@BotFather**.
2. Scrivi `/newbot` e segui le istruzioni per dare un nome al bot (es. `Zirel_Booking_Bot`).
3. BotFather ti darà un **API Token** (una stringa lunga di lettere e numeri). Copiala.
4. Avvia la chat con il tuo nuovo bot cliccando sul link che ti dà BotFather (es. `t.me/tuo_bot_name`) e scrivi `/start`.

## 2. Configurazione su n8n (Nuovo Workflow)
Ti consiglio di creare un **secondo workflow** separato per le notifiche, così è più pulito.

### A. Google Sheets Trigger
Cerca il nodo **Google Sheets Trigger**.
*   **Event**: `Row Added`.
*   **Document**: Seleziona il tuo foglio "Master Zirèl".
*   **Sheet**: `Prenotazioni_Log`.
*   **Poll Times**: Impostalo ogni 1 minuto (o meno, per notifiche istantanee).

### B. Telegram Node
Collega il trigger a un nodo **Telegram**.
*   **Resource**: `Message`.
*   **Operation**: `Send Text Message`.
*   **Chat ID**: Per sapere il tuo Chat ID, scrivi `/start` al bot e poi in n8n puoi usare un'espressione o cercare il tuo ID. (In alternativa, usa il bot `@userinfobot` su Telegram per avere il tuo ID numerico).
*   **Text**: Copia questo template:
    ```text
    🔔 **NUOVA PRENOTAZIONE ZIRÈL!**
    
    👤 **Cliente**: {{ $json.Nome_Cliente }}
    📅 **Data**: {{ $json.Data_Prenotazione }}
    ⏰ **Ora**: {{ $json.Ora }}
    👥 **Persone**: {{ $json.Persone }}
    📞 **Telefono**: {{ $json.Telefono }}
    
    _Controlla il foglio Google per i dettagli!_
    ```

## 3. Test della Notifica
1. Torna sul sito o sulla chat di test di n8n e fai una prenotazione.
2. Aspetta un minuto (o clicca "Test Workflow" nel nuovo workflow delle notifiche).
3. Se tutto è ok, il tuo telefono vibrerà con i dettagli della prenotazione! 🚀
