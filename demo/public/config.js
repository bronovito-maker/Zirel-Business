// config.js — Configurazione della demo pubblica Zirèl
//
// Questo file è versionato nel repository. L'endpoint qui è intenzionalmente
// pubblico: è un URL client-side visibile a chiunque apra DevTools.
//
// Per deployare per un cliente reale, vedi client-deploy.js.

const defaultZirelConfig = {
    webhookUrl: 'https://primary-production-b2af.up.railway.app/webhook/d9e10e54-2d61-4643-98ed-7bbe6221699e/chat',
    tenantId: 'zirel_official',
};

// Non sovrascrivere configurazioni già impostate dalla pagina (es. demo in-character).
window.ZirelConfig = {
    ...defaultZirelConfig,
    ...(window.ZirelConfig || {}),
};
