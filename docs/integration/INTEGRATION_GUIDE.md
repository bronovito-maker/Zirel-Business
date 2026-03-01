# Zirèl: Integrazione e Configurazione 🛠️

Guida per webmaster e tecnici che installano il widget Zirèl su un sito cliente.

---

## 1. Database (Google Sheets)

Il "cervello" di Zirèl legge da un Google Sheet che il gestore aggiorna autonomamente.

### Setup
1. Copia il **Template Google Sheet Zirèl Master** per il cliente.
2. Imposta i permessi: *"Chiunque abbia il link può visualizzare"*.
3. Il documento deve avere queste schede:

| Scheda       | Contenuto                                          |
| :----------- | :------------------------------------------------- |
| **Generali** | Orari, indirizzo, telefono, regole, policy         |
| **Listino**  | Menu/tariffe/servizi                               |
| **Eventi**   | Serate, musica live, promozioni                    |

4. Incolla l'ID del foglio nel workflow n8n fornito da Zirèl.

---

## 2. Installazione Widget (Webmaster)

La modalità consigliata è hostare il **build statico** (`demo/dist/`) sul dominio del cliente.

### Step 1 — Clona il repository

```bash
git clone https://github.com/tuo-user/Zirel-Business.git
cd Zirel-Business/demo
npm install
```

### Step 2 — Configura le credenziali del cliente

Per un sito cliente reale, devi generare un `config.js` specifico usando lo script di configurazione fornito.

1. Esporta le variabili d'ambiente nel tuo terminale:
   ```bash
   export ZIREL_WEBHOOK_URL=https://tuo-n8n.railway.app/webhook/...
   export ZIREL_TENANT_ID=nome_cliente_001
   ```
2. Esegui il setup per il cliente o avvia l'ambiente di sviluppo locale. `npm run client:setup` leggerà le variabili e creerà il `config.js` reale in `demo/public/`.
   ```bash
   npm run client:setup
   npm run build
   ```

> **Nota**: Su **Vercel** o piattaforme simili, imposta `ZIREL_WEBHOOK_URL` e `ZIREL_TENANT_ID` nel dashboard delle Environment Variables. Poi imposta il comando di build personalizzato: `npm run client:setup && npm run build`.

> Per un riferimento dei campi disponibili e della struttura generata, vedi `demo/public/config.template.js`.

### Step 3 — Builda

```bash
npm run build
```

Il prebuild script (`client-deploy.js`) legge le variabili d'ambiente e sovrascrive `public/config.js` con le credenziali del cliente. Vite lo copia poi in `dist/config.js`.

> **Vercel Analytics**: Il tracciamento delle visite (Vercel Web Analytics) è già pre-installato e integrato nativamente via script in tutti i file HTML. Funzionerà automaticamente non appena la pagina sarà distribuita su Vercel.

### Step 4 — Pubblica `dist/`

Carica l'intera cartella `dist/` sul dominio del cliente (Vercel, FTP, S3, ecc.).

---

## 3. Deploy su Vercel (raccomandato)

| Impostazione       | Valore    |
| :----------------- | :-------- |
| Root Directory     | `demo`    |
| Build Command      | `npm run client:setup && npm run build` |
| Output Directory   | `dist`    |
| Env var 1          | `ZIREL_WEBHOOK_URL` |
| Env var 2          | `ZIREL_TENANT_ID`  |

---

## 4. Per WordPress

Usa il plugin **"Insert Headers and Footers"** per aggiungere gli script nel `<head>` del tema, e un blocco Custom HTML nel footer per il widget.

---

## 5. Troubleshooting

| Sintomo | Causa probabile | Soluzione |
| :--- | :--- | :--- |
| Chat non risponde | CORS bloccato | Aggiungi il dominio del cliente in n8n → Webhook → Header CORS |
| `config.js` non trovato | Env var mancanti in build | Controlla `.env.local` o le env var Vercel |
| Risposte AI datate | Cache webhook | Verifica che n8n legga dal Google Sheet corretto |
