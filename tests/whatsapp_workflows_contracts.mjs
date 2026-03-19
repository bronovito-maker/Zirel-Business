import assert from 'node:assert/strict';
import fs from 'node:fs';

const root = '/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(`${root}/${relativePath}`, 'utf8'));

const getNode = (workflow, name) => {
  const node = workflow.nodes.find((item) => item.name === name);
  assert(node, `Nodo mancante: ${name}`);
  return node;
};

const ingestion = readJson('n8n_workflows/whatsapp_v3_ingestion.json');
const processor = readJson('n8n_workflows/whatsapp_v3_processor.json');

assert.equal(ingestion.name, 'WhatsApp 1 - Webhook Ingestion (V3.2 Hardened)');
assert.equal(processor.name, 'WhatsApp 2 - Event Processor (V3.2 Hardened)');

const buildPersistableEvent = getNode(ingestion, 'Build Persistable Event');
assert.ok(buildPersistableEvent.parameters.jsCode.includes('WHATSAPP_HMAC_MODE'));
assert.ok(buildPersistableEvent.parameters.jsCode.includes('verified_by_proxy'));
assert.ok(buildPersistableEvent.parameters.jsCode.includes("proxy_required"));
assert.ok(buildPersistableEvent.parameters.jsCode.includes('payload_json'));

const ingestionPersist = getNode(ingestion, 'Supabase: Persist Event');
assert.ok(
  ingestionPersist.parameters.fieldsUi.fieldValues.some((field) => field.fieldId === 'payload_json')
);
assert.ok(
  ingestionPersist.parameters.fieldsUi.fieldValues.some((field) => field.fieldId === 'processed')
);
assert.ok(
  ingestionPersist.parameters.fieldsUi.fieldValues.some((field) => field.fieldId === 'event_status')
);

const claimNode = getNode(processor, 'Postgres: Claim Pending Events');
assert.ok(claimNode.parameters.query.includes("event_status = 'processing'"));
assert.ok(claimNode.parameters.query.includes("IN ('pending', 'failed')"));
assert.ok(claimNode.parameters.query.includes("INTERVAL '15 minutes'"));
assert.ok(claimNode.parameters.query.includes("error_message NOT LIKE 'PROCESSING:%'"));
assert.ok(claimNode.parameters.query.includes('FOR UPDATE SKIP LOCKED'));

const processorNode = getNode(processor, 'Code: Process Claimed Events');
assert.ok(processorNode.parameters.jsCode.includes('flattenWebhookRow'));
assert.ok(processorNode.parameters.jsCode.includes('tenant_whatsapp_accounts'));
assert.ok(processorNode.parameters.jsCode.includes('tenant_conversations'));
assert.ok(processorNode.parameters.jsCode.includes('conversation_messages'));
assert.ok(processorNode.parameters.jsCode.includes('ORPHAN_STATUS'));
assert.ok(processorNode.parameters.jsCode.includes('pending_ai'));

const outcomeNode = getNode(processor, 'Supabase: Persist Event Outcome');
assert.ok(
  outcomeNode.parameters.fieldsUi.fieldValues.some((field) => field.fieldId === 'event_status')
);
assert.ok(
  outcomeNode.parameters.fieldsUi.fieldValues.some((field) => field.fieldId === 'error_message')
);

console.log('WhatsApp workflow contract checks passed.');
