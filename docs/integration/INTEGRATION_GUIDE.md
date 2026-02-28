# Zirèl: Integrazione e Configurazione 🛠️

Questa guida è destinata a webmaster, agenzie web e tecnici incaricati di integrare il Concierge AI Zirèl sul sito web del cliente (WordPress, Wix, custom, ecc.) e di configurarne il database.

---

## 1. Configurare il Database (Google Sheets)

La genialità di Zirèl risiede nella semplicità della gestione dati. Il "cervello" dell'AI si nutre di un Google Sheet che il cliente stesso può aggiornare.

### Passo 1: Copia il Template
1. Fai una copia del nostro **[Template Google Sheet Zirèl Master]** (Link generico) per il tuo cliente.
2. Assicurati di impostare i permessi in lettura: *"Chiunque abbia il link può visualizzare"*.

### Passo 2: Struttura dei Fogli
Il documento deve contenere le seguenti schede (tabs):

| Nome Scheda | Descrizione & Utilizzo |
| :--- | :--- |
| **Generali** | Orari, indirizzo, telefono, regole di base, policy cani. |
| **Listino** | Menu (se ristorante), tariffe camere (se hotel), servizi (se estate). |
| **Eventi** | Cosa succede oggi/questa settimana (serate a tema, musica dal vivo). |

### Passo 3: Collega il Foglio a n8n
Nelle impostazioni del workflow su n8n (che ti verranno fornite), incolla l'ID del Google Sheet appena creato per permettere all'AI di leggerne i dati in tempo reale.

---

## 2. Installazione del Widget Chat (Webmaster)

L'integrazione del widget sul sito web del cliente è un processo "plug & play". 

### Per siti Custom / HTML
Inserisci il seguente script prima della chiusura del tag `</body>` in tutte le pagine dove vuoi mostrare Zirèl:

```html
<!-- Zirèl AI Concierge Widget -->
<script src="https://cdn.zirel.ai/widget/v1/zirel.js" async></script>
<script>
  window.ZirelConfig = {
    clientId: 'INSERISCI_QUI_IL_CLIENT_ID',       // Es: 'chiringuito_gino'
    themeColor: '#FF6B35',                        // Colore principale (HEX)
    welcomeMessage: 'Ciao! 👋 Sono Zirèl...'      // Msg personalizzato
  };
</script>
```

### Per WordPress
Hai due opzioni:
1. Usare il plugin **"Insert Headers and Footers"** (incolla lo snippet sopra nel footer).
2. O usare il **Plugin Zirèl per WP** (attualmente in beta), dove basterà inserire il `clientId` nel pannello impostazioni.

---

## 3. Troubleshooting Comune

* **Il widget non si apre:** Controlla la console del browser per errori CORS. Assicurati che il dominio del cliente sia stato aggiunto alla *Whitelist* nel pannello di controllo Zirèl.
* **L'AI dà informazioni vecchie:** Richiede circa 60 secondi perché l'AI si accorga delle modifiche fatte su Google Sheets. Prova ad aggiornare la pagina. Se il problema persiste, controlla che n8n stia leggendo dal Foglio Google corretto.
