import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const repoRoot = path.resolve(__dirname, '..');
export const n8nWorkflowsDir = path.join(repoRoot, 'n8n_workflows');

export const zirelWorkflowFiles = {
  aiCore: path.join(n8nWorkflowsDir, 'Zirèl - AI Core.json'),
  appointment: path.join(n8nWorkflowsDir, 'Zirèl - Registra_Appuntamento.json'),
  restaurant: path.join(n8nWorkflowsDir, 'Zirèl - Registra_Prenotazione.json'),
  hotel: path.join(n8nWorkflowsDir, 'Zirèl - Registra_Prenotazione_Hotel.json'),
  notifications: path.join(n8nWorkflowsDir, 'Zirèl - Notifiche Dispatcher.json'),
};

export const whatsappWorkflowFiles = {
  ingestion: path.join(n8nWorkflowsDir, 'WhatsApp 1 - Webhook Ingestion (V3.2 Hardened).json'),
  processor: path.join(n8nWorkflowsDir, 'WhatsApp 2 - Event Processor (V3.2 Hardened).json'),
  outboundSender: path.join(n8nWorkflowsDir, 'WhatsApp 3 - Outbound Sender (V3.2 Hardened).json'),
  aiOrchestrator: path.join(n8nWorkflowsDir, 'WhatsApp 4 - AI Orchestrator (V3.2 Hardened).json'),
};
