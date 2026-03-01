/**
 * client-deploy.js — Strumento per deploy su sito cliente (NON per la demo)
 *
 * Per il sito demo Zirèl, non usare questo script.
 * public/config.js è già committato con la config demo pubblica.
 *
 * Questo script serve SOLO quando si installa Zirèl su un sito cliente reale.
 * Sovrascrive public/config.js con le credenziali del cliente, poi si builda.
 *
 * Uso:
 *   export ZIREL_WEBHOOK_URL=https://...
 *   export ZIREL_TENANT_ID=nome_cliente_001
 *   npm run client:setup && npm run build
 *
 * Su Vercel: imposta le env var nel dashboard — vengono iniettate automaticamente.
 *   Ma in quel caso disabilita l'auto-deploy: `npm run client:setup` deve girare
 *   PRIMA di `npm run build`, non è un prebuild automatico.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const webhookUrl = process.env.ZIREL_WEBHOOK_URL;
const tenantId   = process.env.ZIREL_TENANT_ID;

if (!webhookUrl || !tenantId) {
    console.error('\n❌ Variabili mancanti. Imposta prima:');
    console.error('   export ZIREL_WEBHOOK_URL=...');
    console.error('   export ZIREL_TENANT_ID=...\n');
    process.exit(1);
}

const configContent = `// config.js — generato da client-deploy.js
// Rigenera con: npm run client:setup
window.ZirelConfig = {
    webhookUrl: '${webhookUrl}',
    tenantId:   '${tenantId}',
};
`;

const outputPath = path.resolve(__dirname, 'public', 'config.js');
fs.writeFileSync(outputPath, configContent, 'utf8');
console.log(`\n✅ public/config.js aggiornato per tenant: ${tenantId}`);
console.log(`   Prossimo passo: npm run build\n`);
