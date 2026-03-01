// config.template.js — Template di configurazione per Zirèl
//
// ISTRUZIONI:
//   1. Copia questo file e rinominalo "config.js" nella stessa cartella (demo/).
//   2. Sostituisci i valori placeholder con quelli reali del tuo cliente.
//   3. NON fare il commit di "config.js" nel repository (è già in .gitignore).
//
// NOTA: ogni istanza per un cliente diverso ha il proprio config.js.
//       Basta duplicare il template e cambiare i valori.

const ZirelConfig = {
    // URL del webhook n8n che riceve i messaggi della chat
    webhookUrl: 'INSERISCI_URL_WEBHOOK_QUI',   // es: 'https://tuo-n8n.railway.app/webhook/...'

    // ID univoco del cliente/tenant (usato per identificare la configurazione corretta in n8n)
    tenantId: 'INSERISCI_TENANT_ID_QUI',        // es: 'ristorante_rossi_001'
};

window.ZirelConfig = ZirelConfig;
