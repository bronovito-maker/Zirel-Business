import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carica variabili da dashboard/.env
const envPath = path.join(__dirname, '../dashboard/.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
    if (match) {
      const key = match[1];
      let value = match[2] || '';
      value = value.trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      else if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
      process.env[key] = value;
    }
  });
}


const N8N_URL = process.env.N8N_URL || 'https://tuo-url-n8n.up.railway.app';
const N8N_API_KEY = process.env.N8N_API_KEY || 'inserisci_qui_la_tua_api_key';

// Salviamo nella cartella n8n_workflows root
const BACKUP_DIR = path.join(__dirname, '../n8n_workflows');

async function backupWorkflows() {
  if (N8N_API_KEY === 'inserisci_qui_la_tua_api_key') {
    console.error('❌ ERRORE: Devi configurare la tua N8N_API_KEY nello script o come variabile d\'ambiente.');
    process.exit(1);
  }

  console.log(`🌐 Recupero dei workflow da: ${N8N_URL}...`);

  try {
    const response = await fetch(`${N8N_URL}/api/v1/workflows`, {
      method: 'GET',
      headers: {
        'X-N8N-API-KEY': N8N_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Errore API: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const workflows = data.data;

    if (!workflows || workflows.length === 0) {
      console.log('Nessun workflow trovato.');
      return;
    }

    console.log(`✅ Trovati ${workflows.length} workflow. Inizio backup...`);

    // Svuota/Crea la directory
    if (fs.existsSync(BACKUP_DIR)) {
      fs.rmSync(BACKUP_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(BACKUP_DIR, { recursive: true });

    let successCount = 0;

    for (const wf of workflows) {
      // Pulisce il nome solo da caratteri non validi nei percorsi file
      const safeName = wf.name.replace(/[/\\?%*:|"<>]/g, '-');
      const fileName = `${safeName}.json`;
      const filePath = path.join(BACKUP_DIR, fileName);

      fs.writeFileSync(filePath, JSON.stringify(wf, null, 2));
      successCount++;
    }

    console.log(`\n🎉 Backup completato! ${successCount} workflow salvati in n8n_workflows/`);

  } catch (err) {
    console.error('❌ Si è verificato un errore durante il backup:', err);
  }
}

backupWorkflows();
