import fs from 'node:fs';
import crypto from 'node:crypto';

const root = '/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl';

const paths = {
  ingestion: `${root}/n8n_workflows/whatsapp_v3_ingestion.json`,
  processor: `${root}/n8n_workflows/whatsapp_v3_processor.json`,
};

const credentials = {
  supabaseApi: {
    id: 'bEyN805IWleebXdC',
    name: 'Supabase account - Zirèl',
  },
  postgres: {
    id: 'y26w3cf5oDEAQXdB',
    name: 'Postgres account',
  },
};

const writeJson = (path, data) => {
  fs.writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
};

const nodeBase = (name, type, typeVersion, position, parameters, extras = {}) => ({
  parameters,
  name,
  type,
  typeVersion,
  position,
  id: extras.id || crypto.randomUUID(),
  ...Object.fromEntries(Object.entries(extras).filter(([key]) => key !== 'id')),
});

const webhookNode = (name, position, parameters, extras = {}) =>
  nodeBase(name, 'n8n-nodes-base.webhook', 1.1, position, parameters, extras);

const respondNode = (name, position, parameters, extras = {}) =>
  nodeBase(name, 'n8n-nodes-base.respondToWebhook', 1, position, parameters, extras);

const ifBooleanNode = (name, position, expression, extras = {}) =>
  nodeBase(
    name,
    'n8n-nodes-base.if',
    1,
    position,
    {
      conditions: {
        boolean: [{ value1: expression, value2: true }],
      },
    },
    extras
  );

const ifStringNode = (name, position, value1, value2, extras = {}) =>
  nodeBase(
    name,
    'n8n-nodes-base.if',
    2,
    position,
    {
      conditions: {
        string: [{ value1, value2 }],
      },
    },
    extras
  );

const scheduleNode = (name, position, minutesInterval) =>
  nodeBase(name, 'n8n-nodes-base.scheduleTrigger', 1.1, position, {
    rule: {
      interval: [{ field: 'minutes', minutesInterval }],
    },
  });

const codeNode = (name, position, jsCode, extras = {}) =>
  nodeBase(name, 'n8n-nodes-base.code', 2, position, { jsCode }, extras);

const supabaseNode = (name, position, parameters, extras = {}) =>
  nodeBase(name, 'n8n-nodes-base.supabase', 1, position, parameters, {
    credentials: { supabaseApi: credentials.supabaseApi },
    ...extras,
  });

const postgresNode = (name, position, parameters, extras = {}) =>
  nodeBase(name, 'n8n-nodes-base.postgres', 2, position, parameters, {
    credentials: { postgres: credentials.postgres },
    ...extras,
  });

const buildConnections = (defs) => {
  const connections = {};
  for (const def of defs) {
    connections[def.from] ??= {};
    connections[def.from][def.type] ??= [];
    while (connections[def.from][def.type].length <= def.branch) {
      connections[def.from][def.type].push([]);
    }
    connections[def.from][def.type][def.branch].push({
      node: def.to,
      type: def.type,
      index: def.index ?? 0,
    });
  }
  return connections;
};

const ingestionCode = String.raw`const input = $json || {};
const headersSource = input.headers || {};
const headers = Object.fromEntries(Object.entries(headersSource).map(([key, value]) => [String(key || '').toLowerCase(), value]));
const hmacMode = String($env.WHATSAPP_HMAC_MODE || 'proxy_required').trim().toLowerCase();
const requireProxyVerification = hmacMode === 'proxy_required';
const proxyVerified = String(headers['x-zirel-wa-verified'] || '').trim().toLowerCase() === 'true';
const rawBodyCandidate = input.rawBody || input.bodyRaw || input.raw_body || null;
const signatureHeader = headers['x-hub-signature-256'] || null;

let signatureVerificationStatus = 'not_verified_in_n8n';
let signatureVerificationReason = 'n8n non verifica in modo affidabile il raw body HMAC; usare preferibilmente un pre-handler esterno.';

if (proxyVerified) {
  signatureVerificationStatus = 'verified_by_proxy';
  signatureVerificationReason = 'Header x-zirel-wa-verified=true ricevuto da pre-handler fidato.';
} else if (requireProxyVerification) {
  signatureVerificationStatus = 'missing_proxy_verification';
  signatureVerificationReason = 'WHATSAPP_HMAC_MODE=proxy_required ma manca x-zirel-wa-verified=true.';
}

return [{
  json: {
    allow_persist: proxyVerified || !requireProxyVerification,
    channel: 'whatsapp',
    processed: false,
    event_status: 'pending',
    payload_json: {
      body: input.body || null,
      headers,
      meta: {
        received_at: new Date().toISOString(),
        verification_mode: requireProxyVerification ? 'proxy_required' : 'warn_only',
        signature_header: signatureHeader,
        signature_verification_status: signatureVerificationStatus,
        signature_verification_reason: signatureVerificationReason,
        raw_body_present: Boolean(rawBodyCandidate),
        raw_body_preview: typeof rawBodyCandidate === 'string' ? rawBodyCandidate.slice(0, 500) : null
      }
    }
  }
}];`;

const processorCode = String.raw`const claimedRows = $input.all().map((item) => item.json || {}).filter((row) => row && row.id);
if (!claimedRows.length) {
  return [];
}

const supabaseUrl = String($env.SUPABASE_URL || '').trim();
const serviceKey = String($env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl || !serviceKey) {
      return claimedRows.map((row) => ({
        json: {
          id: row.id,
          processed: false,
          event_status: 'failed',
          error_message: 'RETRY: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
        }
      }));
}

const defaultHeaders = {
  apikey: serviceKey,
  Authorization: \`Bearer \${serviceKey}\`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

const encode = (value) => encodeURIComponent(String(value ?? ''));
const normalizePhone = (value) => String(value || '').replace(/[^\d+]/g, '');
const truncate = (value, max = 500) => String(value || '').slice(0, max);

const rest = async (method, path, body) => {
  const response = await fetch(\`\${supabaseUrl}/rest/v1/\${path}\`, {
    method,
    headers: defaultHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    throw new Error(\`Supabase \${method} \${path} failed: \${response.status} \${truncate(typeof data === 'string' ? data : JSON.stringify(data))}\`);
  }

  return data;
};

const extractText = (message) => {
  if (!message || typeof message !== 'object') return null;
  if (message.text?.body) return String(message.text.body).trim() || null;
  if (message.button?.text) return String(message.button.text).trim() || null;
  if (message.interactive?.button_reply?.title) return String(message.interactive.button_reply.title).trim() || null;
  if (message.interactive?.list_reply?.title) return String(message.interactive.list_reply.title).trim() || null;
  if (message.image?.caption) return String(message.image.caption).trim() || null;
  if (message.document?.caption) return String(message.document.caption).trim() || null;
  return null;
};

const flattenWebhookRow = (row) => {
  const payload = row?.payload_json?.body || row?.payload_json || {};
  const entries = Array.isArray(payload.entry) ? payload.entry : [];
  const events = [];

  for (const entry of entries) {
    const changes = Array.isArray(entry?.changes) ? entry.changes : [];
    for (const change of changes) {
      const value = change?.value;
      if (!value || typeof value !== 'object') continue;

      const phoneNumberId = value?.metadata?.phone_number_id || null;
      const contacts = Array.isArray(value?.contacts) ? value.contacts : [];
      const messages = Array.isArray(value?.messages) ? value.messages : [];
      const statuses = Array.isArray(value?.statuses) ? value.statuses : [];

      for (const message of messages) {
        const rawPhone = message?.from || null;
        const matchingContact = contacts.find((contact) => String(contact?.wa_id || '') === String(rawPhone || '')) || contacts[0] || null;
        events.push({
          type: 'message',
          webhook_row_id: row.id,
          phone_number_id: phoneNumberId,
          wamid: message?.id || null,
          customer_phone_raw: rawPhone,
          customer_phone_normalized: normalizePhone(rawPhone),
          customer_name: matchingContact?.profile?.name || null,
          text_content: extractText(message),
          message_timestamp: message?.timestamp ? new Date(Number(message.timestamp) * 1000).toISOString() : new Date().toISOString(),
          event_data: message,
        });
      }

      for (const status of statuses) {
        events.push({
          type: 'status',
          webhook_row_id: row.id,
          phone_number_id: phoneNumberId,
          wamid: status?.id || null,
          delivery_status: status?.status || null,
          status_timestamp: status?.timestamp ? new Date(Number(status.timestamp) * 1000).toISOString() : new Date().toISOString(),
          event_data: status,
        });
      }
    }
  }

  return events;
};

const getSingleTenantAccount = async (phoneNumberId) => {
  if (!phoneNumberId) return null;
  const rows = await rest('GET', \`tenant_whatsapp_accounts?select=id,tenant_id,meta_phone_number_id,credential_mode,credential_provider&meta_phone_number_id=eq.\${encode(phoneNumberId)}&limit=1\`);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

const getExistingConversation = async (tenantId, externalContactId, normalizedPhone) => {
  if (!tenantId) return null;
  const orConditions = [];
  if (externalContactId) orConditions.push(\`external_contact_id.eq.\${externalContactId}\`);
  if (normalizedPhone) orConditions.push(\`customer_phone_normalized.eq.\${normalizedPhone}\`);
  if (!orConditions.length) return null;

  const query = [
    'tenant_conversations?select=id,last_inbound_message_id,last_outbound_message_id,last_message_at,ai_processing_status',
    \`tenant_id=eq.\${encode(tenantId)}\`,
    'channel=eq.whatsapp',
    \`or=\${encode(\`(\${orConditions.join(',')})\`)}\`,
    'order=last_message_at.desc.nullslast',
    'limit=1',
  ].join('&');

  const rows = await rest('GET', query);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

const createConversation = async (tenantAccount, event) => {
  const body = {
    tenant_id: tenantAccount.tenant_id,
    channel: 'whatsapp',
    external_contact_id: event.customer_phone_raw || event.customer_phone_normalized || null,
    customer_phone_normalized: event.customer_phone_normalized || null,
    customer_name: event.customer_name || null,
    ai_processing_status: 'pending_ai',
    last_message_at: event.message_timestamp || new Date().toISOString(),
  };

  const rows = await rest('POST', 'tenant_conversations', body);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

const getExistingMessage = async (tenantId, wamid) => {
  if (!tenantId || !wamid) return null;
  const rows = await rest('GET', \`conversation_messages?select=id,conversation_id,external_message_id,delivery_status&tenant_id=eq.\${encode(tenantId)}&external_message_id=eq.\${encode(wamid)}&limit=1\`);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

const insertMessage = async (conversationId, tenantId, event) => {
  const body = {
    conversation_id: conversationId,
    tenant_id: tenantId,
    channel: 'whatsapp',
    direction: 'inbound',
    sender_role: 'customer',
    external_message_id: event.wamid,
    processing_status: 'pending_ai',
    provider_payload_json: {
      meta_phone_number_id: event.phone_number_id || null,
      customer_phone_normalized: event.customer_phone_normalized || null,
      customer_name: event.customer_name || null,
      text_content: event.text_content || null,
      message_payload: event.event_data || null,
    },
  };

  const rows = await rest('POST', 'conversation_messages', body);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

const patchConversation = async (conversationId, body) => {
  if (!conversationId) return [];
  return rest('PATCH', \`tenant_conversations?id=eq.\${encode(conversationId)}\`, body);
};

const patchMessage = async (messageId, body) => {
  if (!messageId) return [];
  return rest('PATCH', \`conversation_messages?id=eq.\${encode(messageId)}\`, body);
};

const outcomes = [];

for (const row of claimedRows) {
  try {
    const flattenedEvents = flattenWebhookRow(row);
    if (!flattenedEvents.length) {
      outcomes.push({ json: { id: row.id, processed: true, event_status: 'orphan', error_message: 'NO_SUPPORTED_EVENTS' } });
      continue;
    }

    const rowNotes = [];
    let retryReason = null;
    let hadSuccessfulMutation = false;

    for (const event of flattenedEvents) {
      const tenantAccount = await getSingleTenantAccount(event.phone_number_id);
      if (!tenantAccount?.tenant_id) {
        rowNotes.push(\`ORPHAN_TENANT:\${event.phone_number_id || 'missing_phone_number_id'}\`);
        continue;
      }

      if (!event.wamid) {
        rowNotes.push('INVALID_EVENT:missing_wamid');
        continue;
      }

      if (event.type === 'message') {
        if (!event.customer_phone_raw && !event.customer_phone_normalized) {
          rowNotes.push(\`INVALID_MESSAGE_PHONE:\${event.wamid}\`);
          continue;
        }

        let conversation = await getExistingConversation(
          tenantAccount.tenant_id,
          event.customer_phone_raw,
          event.customer_phone_normalized
        );

        if (!conversation) {
          conversation = await createConversation(tenantAccount, event);
        }

        if (!conversation?.id) {
          retryReason = 'conversation_create_failed';
          break;
        }

        let message = await getExistingMessage(tenantAccount.tenant_id, event.wamid);
        if (!message) {
          message = await insertMessage(conversation.id, tenantAccount.tenant_id, event);
        }

        if (!message?.id) {
          retryReason = \`message_insert_failed:\${event.wamid}\`;
          break;
        }

        await patchConversation(conversation.id, {
          last_message_at: event.message_timestamp,
          customer_phone_normalized: event.customer_phone_normalized || null,
          external_contact_id: event.customer_phone_raw || event.customer_phone_normalized || null,
          customer_name: event.customer_name || null,
          ai_processing_status: 'pending_ai',
          last_inbound_message_id: message.id,
        });
        hadSuccessfulMutation = true;
      } else if (event.type === 'status') {
        const message = await getExistingMessage(tenantAccount.tenant_id, event.wamid);
        if (!message?.id) {
          rowNotes.push(\`ORPHAN_STATUS:\${event.wamid}\`);
          continue;
        }

        await patchMessage(message.id, {
          delivery_status: event.delivery_status || null,
        });
        hadSuccessfulMutation = true;
      }
    }

    if (retryReason) {
      outcomes.push({
        json: {
          id: row.id,
          processed: false,
          event_status: 'failed',
          error_message: \`RETRY: \${truncate(retryReason)}\`,
        },
      });
      continue;
    }

    outcomes.push({
      json: {
        id: row.id,
        processed: true,
        event_status: hadSuccessfulMutation ? 'completed' : 'orphan',
        error_message: rowNotes.length ? truncate([...new Set(rowNotes)].join('|')) : null,
      },
    });
  } catch (error) {
    outcomes.push({
      json: {
        id: row.id,
        processed: false,
        event_status: 'failed',
        error_message: \`RETRY: \${truncate(error.message || error)}\`,
      },
    });
  }
}

return outcomes;`;

const buildIngestionWorkflow = () => ({
  name: 'WhatsApp 1 - Webhook Ingestion (V3.2 Hardened)',
  nodes: [
    webhookNode('Meta Challenge (GET)', [0, 0], {
      httpMethod: 'GET',
      path: 'whatsapp/webhook',
      responseMode: 'lastNode',
      options: {},
    }, { id: 'wa-get-webhook' }),
    ifStringNode(
      'If Verify Token Valid',
      [220, 0],
      "={{ $json.query['hub.verify_token'] }}",
      '={{ $env.META_VERIFY_TOKEN }}',
      {
        id: 'wa-if-verify-token',
        notesInFlow: true,
        notes: 'Verifica il challenge GET contro META_VERIFY_TOKEN.',
      }
    ),
    respondNode('Respond Challenge', [460, -80], {
      respondWith: 'text',
      responseBody: "={{ $json.query['hub.challenge'] }}",
      options: {},
    }, { id: 'wa-respond-challenge' }),
    respondNode('Respond 403', [460, 80], {
      respondWith: 'text',
      responseBody: 'Forbidden: Invalid Verify Token',
      status: 403,
      options: {},
    }, { id: 'wa-respond-forbidden' }),
    webhookNode('Inbound Webhook (POST)', [0, 320], {
      httpMethod: 'POST',
      path: 'whatsapp/webhook',
      responseMode: 'lastNode',
      options: {
        rawBody: true,
      },
    }, {
      id: 'wa-post-webhook',
      notesInFlow: true,
      notes: 'rawBody=true aiuta il troubleshooting, ma non garantisce da solo una validazione HMAC affidabile in n8n.',
    }),
    codeNode('Build Persistable Event', [240, 320], ingestionCode, {
      id: 'wa-build-event-payload',
      notesInFlow: true,
      notes: 'Persistiamo il contesto di verifica. La modalita di default e proxy_required: senza pre-handler fidato il webhook non viene accettato.',
    }),
    ifBooleanNode('If Event Is Trusted Enough', [500, 320], '={{ Boolean($json.allow_persist) }}', {
      id: 'wa-if-allow-persist',
    }),
    supabaseNode('Supabase: Persist Event', [760, 240], {
      tableId: 'channel_webhook_events',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'channel', fieldValue: '={{ $json.channel }}' },
          { fieldId: 'payload_json', fieldValue: '={{ $json.payload_json }}' },
          { fieldId: 'processed', fieldValue: '={{ $json.processed }}' },
          { fieldId: 'event_status', fieldValue: '={{ $json.event_status }}' },
        ],
      },
    }, {
      id: 'wa-persist-event',
      notesInFlow: true,
      notes: 'Persistenza sincrona del webhook. tenant_id resta volutamente NULL in questa fase.',
    }),
    respondNode('Respond 200 OK', [1010, 240], {
      respondWith: 'json',
      responseBody: "={{ JSON.stringify({ status: 'ok', verification_mode: $json.payload_json?.meta?.verification_mode || null, signature_verification_status: $json.payload_json?.meta?.signature_verification_status || null }, null, 2) }}",
      options: {},
    }, {
      id: 'wa-respond-ok',
      notesInFlow: true,
      notes: 'Meta riceve 200 solo dopo persistenza riuscita.',
    }),
    respondNode('Respond 503 Unverified', [760, 400], {
      respondWith: 'json',
      responseBody: "={{ JSON.stringify({ error: 'Proxy signature verification required', mode: $env.WHATSAPP_HMAC_MODE || 'proxy_required' }, null, 2) }}",
      options: {},
    }, {
      id: 'wa-respond-unverified',
      notesInFlow: true,
      notes: 'Per default il webhook deve arrivare gia pre-validato da proxy o edge handler.',
    }),
  ],
  connections: buildConnections([
    { from: 'Meta Challenge (GET)', to: 'If Verify Token Valid', type: 'main', branch: 0 },
    { from: 'If Verify Token Valid', to: 'Respond Challenge', type: 'main', branch: 0 },
    { from: 'If Verify Token Valid', to: 'Respond 403', type: 'main', branch: 1 },
    { from: 'Inbound Webhook (POST)', to: 'Build Persistable Event', type: 'main', branch: 0 },
    { from: 'Build Persistable Event', to: 'If Event Is Trusted Enough', type: 'main', branch: 0 },
    { from: 'If Event Is Trusted Enough', to: 'Supabase: Persist Event', type: 'main', branch: 0 },
    { from: 'If Event Is Trusted Enough', to: 'Respond 503 Unverified', type: 'main', branch: 1 },
    { from: 'Supabase: Persist Event', to: 'Respond 200 OK', type: 'main', branch: 0 },
  ]),
});

const buildProcessorWorkflow = () => ({
  name: 'WhatsApp 2 - Event Processor (V3.2 Hardened)',
  nodes: [
    scheduleNode('Cron (1 min)', [0, 200], 1),
    postgresNode('Postgres: Claim Pending Events', [240, 200], {
      operation: 'executeQuery',
      query: `UPDATE public.channel_webhook_events
SET event_status = 'processing',
    error_message = CONCAT('PROCESSING:', NOW() AT TIME ZONE 'UTC')
WHERE id IN (
  SELECT id
  FROM public.channel_webhook_events
  WHERE event_status IN ('pending', 'failed')
     OR (
       event_status = 'processing'
       AND (
         error_message IS NULL
         OR error_message NOT LIKE 'PROCESSING:%'
         OR COALESCE(NULLIF(split_part(error_message, 'PROCESSING:', 2), ''), '1970-01-01 00:00:00')::timestamp <= ((NOW() AT TIME ZONE 'UTC') - INTERVAL '15 minutes')
       )
     )
  ORDER BY created_at ASC
  LIMIT 50
  FOR UPDATE SKIP LOCKED
)
RETURNING id, payload_json, processed, event_status, error_message;`,
      options: {},
    }, {
      id: 'wa-processor-claim',
      notesInFlow: true,
      notes: 'Claim queue basato su event_status, con requeue automatico dei record processing stantii dopo 15 minuti. processed resta per compatibilita e audit semplice.',
    }),
    codeNode('Code: Process Claimed Events', [560, 200], processorCode, {
      id: 'wa-processor-code',
      notesInFlow: true,
      notes: 'Esegue parsing Meta, tenant resolution, conversation match/create, inbound insert idempotente, status update e produce un outcome per webhook row.',
    }),
    supabaseNode('Supabase: Persist Event Outcome', [920, 200], {
      operation: 'update',
      tableId: 'channel_webhook_events',
      filters: {
        conditions: [
          {
            keyName: 'id',
            condition: 'eq',
            keyValue: '={{ $json.id }}',
          },
        ],
      },
      fieldsUi: {
        fieldValues: [
          { fieldId: 'processed', fieldValue: '={{ $json.processed }}' },
          { fieldId: 'event_status', fieldValue: '={{ $json.event_status }}' },
          { fieldId: 'error_message', fieldValue: '={{ $json.error_message || null }}' },
        ],
      },
    }, {
      id: 'wa-processor-update',
      notesInFlow: true,
      notes: 'processed=true solo a fine lavorazione della singola webhook row. RETRY:* resta claimabile al giro successivo.',
    }),
  ],
  connections: buildConnections([
    { from: 'Cron (1 min)', to: 'Postgres: Claim Pending Events', type: 'main', branch: 0 },
    { from: 'Postgres: Claim Pending Events', to: 'Code: Process Claimed Events', type: 'main', branch: 0 },
    { from: 'Code: Process Claimed Events', to: 'Supabase: Persist Event Outcome', type: 'main', branch: 0 },
  ]),
});

writeJson(paths.ingestion, buildIngestionWorkflow());
writeJson(paths.processor, buildProcessorWorkflow());

console.log('Built WhatsApp workflows:');
console.log(`- ${paths.ingestion}`);
console.log(`- ${paths.processor}`);
