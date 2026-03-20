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
const outboundSender = readJson('n8n_workflows/whatsapp_v3_outbound_sender.json');
const aiOrchestrator = readJson('n8n_workflows/whatsapp_v3_ai_orchestrator.json');

assert.equal(ingestion.name, 'WhatsApp 1 - Webhook Ingestion (V3.2 Hardened)');
assert.equal(processor.name, 'WhatsApp 2 - Event Processor (V3.2 Hardened)');
assert.equal(outboundSender.name, 'WhatsApp 3 - Outbound Sender (V3.2 Hardened)');
assert.equal(aiOrchestrator.name, 'WhatsApp 4 - AI Orchestrator (V3.2 Hardened)');

const buildPersistableEvent = getNode(ingestion, 'Build Persistable Event');
assert.ok(buildPersistableEvent.parameters.jsCode.includes('WHATSAPP_HMAC_MODE'));
assert.ok(buildPersistableEvent.parameters.jsCode.includes('verified_by_proxy'));
assert.ok(buildPersistableEvent.parameters.jsCode.includes("proxy_required"));
assert.ok(buildPersistableEvent.parameters.jsCode.includes('payload_json'));
assert.ok(buildPersistableEvent.parameters.jsCode.includes('event_type'));

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
assert.ok(
  ingestionPersist.parameters.fieldsUi.fieldValues.some((field) => field.fieldId === 'event_type')
);

const processorNode = getNode(processor, 'Code: Claim + Process Events');
assert.ok(processorNode.parameters.jsCode.includes('selectCandidates'));
assert.ok(processorNode.parameters.jsCode.includes('claimRow'));
assert.ok(processorNode.parameters.jsCode.includes('flattenWebhookRow'));
assert.ok(processorNode.parameters.jsCode.includes('tenant_whatsapp_accounts'));
assert.ok(processorNode.parameters.jsCode.includes('tenant_conversations'));
assert.ok(processorNode.parameters.jsCode.includes('conversation_messages'));
assert.ok(processorNode.parameters.jsCode.includes('ORPHAN_STATUS'));
assert.ok(processorNode.parameters.jsCode.includes('buildStatusPatch'));
assert.ok(processorNode.parameters.jsCode.includes('delivered_at'));
assert.ok(processorNode.parameters.jsCode.includes('read_at'));
assert.ok(processorNode.parameters.jsCode.includes('failed_at'));
assert.ok(processorNode.parameters.jsCode.includes('patchTenantAccount'));
assert.ok(processorNode.parameters.jsCode.includes('last_webhook_at'));
assert.ok(processorNode.parameters.jsCode.includes('webhook_verified_at'));
assert.ok(processorNode.parameters.jsCode.includes('pending_ai'));
assert.ok(processorNode.parameters.jsCode.includes('channel_webhook_events?select='));
assert.ok(processorNode.parameters.jsCode.includes("event_status=in.(pending,failed)"));

const outcomeNode = getNode(processor, 'Supabase: Persist Event Outcome');
assert.ok(
  outcomeNode.parameters.fieldsUi.fieldValues.some((field) => field.fieldId === 'event_status')
);
assert.ok(
  outcomeNode.parameters.fieldsUi.fieldValues.some((field) => field.fieldId === 'error_message')
);

const senderNode = getNode(outboundSender, 'Code: Claim + Send Outbound');
assert.ok(senderNode.parameters.jsCode.includes('conversation_messages?select='));
assert.ok(senderNode.parameters.jsCode.includes('&external_message_id=is.null'));
assert.ok(senderNode.parameters.jsCode.includes('&processing_status=eq.done'));
assert.ok(senderNode.parameters.jsCode.includes('tenant_whatsapp_accounts'));
assert.ok(senderNode.parameters.jsCode.includes('resolveAccessToken'));
assert.ok(senderNode.parameters.jsCode.includes('WHATSAPP_PLATFORM_ACCESS_TOKEN'));
assert.ok(senderNode.parameters.jsCode.includes('graph.facebook.com'));
assert.ok(senderNode.parameters.jsCode.includes("type: 'text'"));
assert.ok(senderNode.parameters.jsCode.includes('last_outbound_message_id'));
assert.ok(senderNode.parameters.jsCode.includes("processing_status: 'processing'"));
assert.ok(senderNode.parameters.jsCode.includes("processing_status: 'done'"));
assert.ok(senderNode.parameters.jsCode.includes("processing_status: 'error'"));
assert.ok(senderNode.parameters.jsCode.includes('sent_at'));
assert.ok(senderNode.parameters.jsCode.includes('failed_at'));

const senderOutcomeNode = getNode(outboundSender, 'Supabase: Persist Send Outcome');
assert.ok(
  senderOutcomeNode.parameters.fieldsUi.fieldValues.some((field) => field.fieldId === 'processing_status')
);
assert.ok(
  senderOutcomeNode.parameters.fieldsUi.fieldValues.some((field) => field.fieldId === 'delivery_status')
);
assert.ok(
  senderOutcomeNode.parameters.fieldsUi.fieldValues.some((field) => field.fieldId === 'external_message_id')
);
assert.ok(
  senderOutcomeNode.parameters.fieldsUi.fieldValues.some((field) => field.fieldId === 'sent_at')
);
assert.ok(
  senderOutcomeNode.parameters.fieldsUi.fieldValues.some((field) => field.fieldId === 'failed_at')
);

const orchestratorNode = getNode(aiOrchestrator, 'Code: Claim + Orchestrate AI');
assert.ok(orchestratorNode.parameters.jsCode.includes('ZIREL_AI_CORE_WEBHOOK_URL'));
assert.ok(orchestratorNode.parameters.jsCode.includes('AI_CORE_WEBHOOK_URL'));
assert.ok(orchestratorNode.parameters.jsCode.includes('pending_ai'));
assert.ok(orchestratorNode.parameters.jsCode.includes('human_handoff'));
assert.ok(orchestratorNode.parameters.jsCode.includes('closed'));
assert.ok(orchestratorNode.parameters.jsCode.includes('callAiCore'));
assert.ok(orchestratorNode.parameters.jsCode.includes('insertOutboundMessage'));
assert.ok(orchestratorNode.parameters.jsCode.includes('getExistingOutboundForInbound'));
assert.ok(orchestratorNode.parameters.jsCode.includes('DEDUP: existing outbound'));
assert.ok(orchestratorNode.parameters.jsCode.includes("direction: 'outbound'"));
assert.ok(orchestratorNode.parameters.jsCode.includes("sender_role: 'ai'"));

const orchestratorOutcomeNode = getNode(aiOrchestrator, 'Supabase: Persist AI Outcome');
assert.ok(
  orchestratorOutcomeNode.parameters.fieldsUi.fieldValues.some((field) => field.fieldId === 'processing_status')
);
assert.ok(
  orchestratorOutcomeNode.parameters.fieldsUi.fieldValues.some((field) => field.fieldId === 'error_message')
);

const orchestratorConversationNode = getNode(aiOrchestrator, 'Supabase: Persist Conversation AI Status');
assert.ok(
  orchestratorConversationNode.parameters.fieldsUi.fieldValues.some((field) => field.fieldId === 'ai_processing_status')
);

console.log('WhatsApp workflow contract checks passed.');
