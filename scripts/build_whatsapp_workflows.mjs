import fs from 'node:fs';
import crypto from 'node:crypto';
import { repoRoot, whatsappWorkflowFiles } from './workflow-manifest.mjs';

const root = repoRoot;
const paths = whatsappWorkflowFiles;

const credentials = {
  supabaseApi: {
    id: 'bEyN805IWleebXdC',
    name: 'Supabase account - Zirèl',
  },
};

const writeJson = (path, data) => {
  fs.mkdirSync(root + '/n8n_workflows', { recursive: true });
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
    event_type: input.body?.object || 'webhook',
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

const processorCode = String.raw`const claimedRows = [];
const supabaseUrl = String($env.SUPABASE_URL || '').trim();
const serviceKey = String($env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl || !serviceKey) {
  return [{
    json: {
      id: 'missing-env',
      processed: false,
      event_status: 'failed',
      error_message: 'RETRY: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    }
  }];
}

const defaultHeaders = {
  apikey: serviceKey,
  Authorization: 'Bearer ' + serviceKey,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

const encode = (value) => encodeURIComponent(String(value ?? ''));
const normalizePhone = (value) => String(value || '').replace(/[^\d+]/g, '');
const truncate = (value, max = 500) => String(value || '').slice(0, max);

const rest = async (method, path, body) => {
  try {
    return await this.helpers.httpRequest({
      method,
      url: supabaseUrl + '/rest/v1/' + path,
      headers: defaultHeaders,
      body: body === undefined ? undefined : body,
      json: true,
    });
  } catch (error) {
    const responseBody =
      error?.response?.body === undefined
        ? ''
        : typeof error.response.body === 'string'
          ? error.response.body
          : JSON.stringify(error.response.body);
    const details = truncate(responseBody || error?.message || error);
    throw new Error('Supabase ' + method + ' ' + path + ' failed: ' + details);
  }
};

const selectCandidates = async () => {
  const rows = await rest(
    'GET',
    'channel_webhook_events?select=id,payload_json,processed,event_status,error_message,created_at&event_status=in.(pending,failed)&order=created_at.asc&limit=50'
  );
  return Array.isArray(rows) ? rows : [];
};

const claimRow = async (rowId) => {
  const claimedAt = new Date().toISOString();
  const rows = await rest(
    'PATCH',
    'channel_webhook_events?id=eq.' + encode(rowId) + '&event_status=in.(pending,failed)',
    {
      event_status: 'processing',
      error_message: 'PROCESSING:' + claimedAt,
      processed: false,
    }
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
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
  const rows = await rest(
    'GET',
    'tenant_whatsapp_accounts?select=id,tenant_id,meta_phone_number_id,credential_mode,credential_provider,webhook_verified_at,last_webhook_at&meta_phone_number_id=eq.' +
      encode(phoneNumberId) +
      '&limit=1'
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

const getExistingConversation = async (tenantId, externalContactId, normalizedPhone) => {
  if (!tenantId) return null;
  const orConditions = [];
  if (externalContactId) orConditions.push('external_contact_id.eq.' + externalContactId);
  if (normalizedPhone) orConditions.push('customer_phone_normalized.eq.' + normalizedPhone);
  if (!orConditions.length) return null;

  const query = [
    'tenant_conversations?select=id,status,last_inbound_message_id,last_outbound_message_id,last_message_at,ai_processing_status',
    'tenant_id=eq.' + encode(tenantId),
    'channel=eq.whatsapp',
    'or=' + encode('(' + orConditions.join(',') + ')'),
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
    first_message_at: event.message_timestamp || new Date().toISOString(),
    last_message_at: event.message_timestamp || new Date().toISOString(),
    last_inbound_at: event.message_timestamp || new Date().toISOString(),
  };

  const rows = await rest('POST', 'tenant_conversations', body);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

const getExistingMessage = async (tenantId, wamid) => {
  if (!tenantId || !wamid) return null;
  const rows = await rest(
    'GET',
    'conversation_messages?select=id,conversation_id,external_message_id,delivery_status&tenant_id=eq.' +
      encode(tenantId) +
      '&external_message_id=eq.' +
      encode(wamid) +
      '&limit=1'
  );
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
  return rest(
    'PATCH',
    'tenant_conversations?id=eq.' +
      encode(conversationId) +
      '&select=id,status,last_inbound_message_id,last_message_at,last_inbound_at,ai_processing_status',
    body
  );
};

const patchMessage = async (messageId, body) => {
  if (!messageId) return [];
  return rest('PATCH', 'conversation_messages?id=eq.' + encode(messageId), body);
};

const patchTenantAccount = async (tenantAccountId, body) => {
  if (!tenantAccountId) return [];
  return rest('PATCH', 'tenant_whatsapp_accounts?id=eq.' + encode(tenantAccountId), body);
};

const buildStatusPatch = (event) => {
  const patch = {
    delivery_status: event.delivery_status || null,
  };

  const statusTimestamp = event.status_timestamp || new Date().toISOString();

  if (event.delivery_status === 'sent') {
    patch.sent_at = statusTimestamp;
  } else if (event.delivery_status === 'delivered') {
    patch.delivered_at = statusTimestamp;
  } else if (event.delivery_status === 'read') {
    patch.read_at = statusTimestamp;
  } else if (event.delivery_status === 'failed') {
    patch.failed_at = statusTimestamp;
  }

  const providerErrors = Array.isArray(event?.event_data?.errors) ? event.event_data.errors : [];
  if (providerErrors.length) {
    const firstError = providerErrors[0] || {};
    patch.error_code = firstError.code ? String(firstError.code) : null;
    patch.error_message =
      firstError.title ||
      firstError.message ||
      firstError.details ||
      patch.error_message ||
      null;
  }

  return patch;
};

const outcomes = [];

for (const candidate of await selectCandidates()) {
  const claimed = await claimRow(candidate.id);
  if (claimed?.id) {
    claimedRows.push(claimed);
  }
}

if (!claimedRows.length) {
  return [];
}

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
        rowNotes.push('ORPHAN_TENANT:' + (event.phone_number_id || 'missing_phone_number_id'));
        continue;
      }

      const webhookTimestamp =
        event.message_timestamp ||
        event.status_timestamp ||
        new Date().toISOString();
      const tenantAccountPatch = {
        last_webhook_at: webhookTimestamp,
      };
      if (!tenantAccount.webhook_verified_at) {
        tenantAccountPatch.webhook_verified_at = webhookTimestamp;
        tenantAccount.webhook_verified_at = webhookTimestamp;
      }
      await patchTenantAccount(tenantAccount.id, tenantAccountPatch);

      if (!event.wamid) {
        rowNotes.push('INVALID_EVENT:missing_wamid');
        continue;
      }

      if (event.type === 'message') {
        if (!event.customer_phone_raw && !event.customer_phone_normalized) {
          rowNotes.push('INVALID_MESSAGE_PHONE:' + event.wamid);
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

        if (conversation.status === 'closed') {
          const reopenedRows = await patchConversation(conversation.id, {
            status: 'ai_active',
            ai_processing_status: 'idle',
          });
          conversation = Array.isArray(reopenedRows) && reopenedRows.length > 0
            ? { ...conversation, ...reopenedRows[0] }
            : { ...conversation, status: 'ai_active', ai_processing_status: 'idle' };
        }

        let message = await getExistingMessage(tenantAccount.tenant_id, event.wamid);
        if (!message) {
          message = await insertMessage(conversation.id, tenantAccount.tenant_id, event);
        }

        if (!message?.id) {
          retryReason = 'message_insert_failed:' + event.wamid;
          break;
        }

        let patchedConversationRows = await patchConversation(conversation.id, {
          last_message_at: event.message_timestamp,
          last_inbound_at: event.message_timestamp,
          customer_phone_normalized: event.customer_phone_normalized || null,
          external_contact_id: event.customer_phone_raw || event.customer_phone_normalized || null,
          customer_name: event.customer_name || null,
          last_inbound_message_id: message.id,
        });
        let patchedConversation = Array.isArray(patchedConversationRows) ? patchedConversationRows[0] : null;

        if (patchedConversation?.last_inbound_message_id !== message.id) {
          patchedConversationRows = await patchConversation(conversation.id, {
            last_inbound_message_id: message.id,
            last_inbound_at: event.message_timestamp,
          });
          patchedConversation = Array.isArray(patchedConversationRows) ? patchedConversationRows[0] : null;
        }

        if (patchedConversation?.last_inbound_message_id !== message.id) {
          retryReason = 'conversation_pointer_update_failed:' + event.wamid;
          break;
        }
        hadSuccessfulMutation = true;
      } else if (event.type === 'status') {
        const message = await getExistingMessage(tenantAccount.tenant_id, event.wamid);
        if (!message?.id) {
          rowNotes.push('ORPHAN_STATUS:' + event.wamid);
          continue;
        }

        await patchMessage(message.id, buildStatusPatch(event));
        hadSuccessfulMutation = true;
      }
    }

    if (retryReason) {
      outcomes.push({
        json: {
          id: row.id,
          processed: false,
          event_status: 'failed',
          error_message: 'RETRY: ' + truncate(retryReason),
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
        error_message: 'RETRY: ' + truncate(error.message || error),
      },
    });
  }
}

return outcomes;`;

const outboundSenderCode = String.raw`const claimedRows = [];
const supabaseUrl = String($env.SUPABASE_URL || '').trim();
const serviceKey = String($env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const graphVersion = String($env.WHATSAPP_GRAPH_VERSION || 'v23.0').trim();

if (!supabaseUrl || !serviceKey) {
  return [{
    json: {
      id: 'missing-env',
      processing_status: 'error',
      delivery_status: 'failed',
      error_message: 'RETRY: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    }
  }];
}

const defaultHeaders = {
  apikey: serviceKey,
  Authorization: 'Bearer ' + serviceKey,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

const encode = (value) => encodeURIComponent(String(value ?? ''));
const truncate = (value, max = 1000) => String(value || '').slice(0, max);
const sanitizeRef = (value) => String(value || '').trim().replace(/[^A-Za-z0-9_]/g, '_').toUpperCase();

const rest = async (method, path, body) => {
  try {
    return await this.helpers.httpRequest({
      method,
      url: supabaseUrl + '/rest/v1/' + path,
      headers: defaultHeaders,
      body: body === undefined ? undefined : body,
      json: true,
    });
  } catch (error) {
    const responseBody =
      error?.response?.body === undefined
        ? ''
        : typeof error.response.body === 'string'
          ? error.response.body
          : JSON.stringify(error.response.body);
    const details = truncate(responseBody || error?.message || error);
    throw new Error('Supabase ' + method + ' ' + path + ' failed: ' + details);
  }
};

const graphRequest = async (phoneNumberId, accessToken, body) => {
  try {
    return await this.helpers.httpRequest({
      method: 'POST',
      url: 'https://graph.facebook.com/' + graphVersion + '/' + encode(phoneNumberId) + '/messages',
      headers: {
        Authorization: 'Bearer ' + accessToken,
        'Content-Type': 'application/json',
      },
      body,
      json: true,
    });
  } catch (error) {
    const responseBody =
      error?.response?.body === undefined
        ? ''
        : typeof error.response.body === 'string'
          ? error.response.body
          : JSON.stringify(error.response.body);
    const details = truncate(responseBody || error?.message || error);
    throw new Error('Meta send failed: ' + details);
  }
};

const selectCandidates = async () => {
  const rows = await rest(
    'GET',
    'conversation_messages?select=id,conversation_id,tenant_id,channel,direction,external_message_id,delivery_status,processing_status,content_text,provider_payload_json,created_at,sender_role,message_type&direction=eq.outbound&channel=eq.whatsapp&external_message_id=is.null&processing_status=eq.done&order=created_at.asc&limit=50'
  );
  return Array.isArray(rows) ? rows : [];
};

const claimRow = async (rowId) => {
  const rows = await rest(
    'PATCH',
    'conversation_messages?id=eq.' + encode(rowId) + '&external_message_id=is.null&processing_status=eq.done',
    {
      processing_status: 'processing',
    }
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

const getTenantAccount = async (tenantId) => {
  if (!tenantId) return null;
  const rows = await rest(
    'GET',
    'tenant_whatsapp_accounts?select=id,tenant_id,meta_phone_number_id,credential_mode,credential_provider,access_token_ref&tenant_id=eq.' +
      encode(tenantId) +
      '&order=created_at.asc.nullslast&limit=1'
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

const getConversation = async (conversationId) => {
  if (!conversationId) return null;
  const rows = await rest(
    'GET',
    'tenant_conversations?select=id,tenant_id,external_contact_id,customer_phone_normalized,last_outbound_message_id,last_message_at,last_outbound_at&' +
      'id=eq.' +
      encode(conversationId) +
      '&limit=1'
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

const getTenantAccount = async (tenantId) => {
  if (!tenantId) return null;
  const rows = await rest(
    'GET',
    'tenant_whatsapp_accounts?select=id,tenant_id,ai_enabled,human_handoff_enabled&tenant_id=eq.' +
      encode(tenantId) +
      '&order=updated_at.desc.nullslast&limit=1'
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

const resolveRecipient = (conversation, message) => {
  const explicitRecipient = message?.provider_payload_json?.recipient_phone || message?.provider_payload_json?.to || null;
  return explicitRecipient || conversation?.customer_phone_normalized || conversation?.external_contact_id || null;
};

const resolveTextBody = (message) => {
  const body =
    message?.content_text ||
    message?.provider_payload_json?.text_content ||
    message?.provider_payload_json?.text?.body ||
    null;
  return typeof body === 'string' ? body.trim() : null;
};

const resolveAccessToken = (account) => {
  if (!account) return null;

  const accessTokenRef = String(account.access_token_ref || '').trim();
  const directPlatform =
    String($env.WHATSAPP_PLATFORM_ACCESS_TOKEN || '').trim() ||
    String($env.WHATSAPP_ACCESS_TOKEN || '').trim() ||
    '';

  if (String(account.credential_mode || '') === 'platform_managed') {
    if (directPlatform) return directPlatform;
  }

  if (accessTokenRef) {
    if (accessTokenRef.startsWith('env:')) {
      const envName = accessTokenRef.slice(4).trim();
      if (envName && String($env[envName] || '').trim()) {
        return String($env[envName]).trim();
      }
    }

    const refEnvName = 'WHATSAPP_TOKEN_REF_' + sanitizeRef(accessTokenRef);
    if (String($env[refEnvName] || '').trim()) {
      return String($env[refEnvName]).trim();
    }
  }

  return directPlatform || null;
};

const patchMessage = async (messageId, body) => {
  if (!messageId) return [];
  return rest('PATCH', 'conversation_messages?id=eq.' + encode(messageId), body);
};

const patchConversation = async (conversationId, body) => {
  if (!conversationId) return [];
  return rest('PATCH', 'tenant_conversations?id=eq.' + encode(conversationId), body);
};

const outcomes = [];

for (const candidate of await selectCandidates()) {
  const claimed = await claimRow(candidate.id);
  if (claimed?.id) {
    claimedRows.push({ ...candidate, ...claimed });
  }
}

if (!claimedRows.length) {
  return [];
}

for (const row of claimedRows) {
  try {
    if (!row?.tenant_id || !row?.conversation_id) {
      outcomes.push({
        json: {
          id: row.id,
          processing_status: 'error',
          delivery_status: 'failed',
          error_message: 'RETRY: missing tenant_id or conversation_id',
        },
      });
      continue;
    }

    const tenantAccount = await getTenantAccount(row.tenant_id);
    if (!tenantAccount?.meta_phone_number_id) {
      outcomes.push({
        json: {
          id: row.id,
          processing_status: 'error',
          delivery_status: 'failed',
          error_message: 'RETRY: missing tenant whatsapp account',
        },
      });
      continue;
    }

    const accessToken = resolveAccessToken(tenantAccount);
    if (!accessToken) {
      outcomes.push({
        json: {
          id: row.id,
          processing_status: 'error',
          delivery_status: 'failed',
          error_message: 'RETRY: missing access token for sender',
        },
      });
      continue;
    }

    const conversation = await getConversation(row.conversation_id);
    const recipientPhone = resolveRecipient(conversation, row);
    const bodyText = resolveTextBody(row);

    if (!recipientPhone) {
      outcomes.push({
        json: {
          id: row.id,
          processing_status: 'error',
          delivery_status: 'failed',
          error_message: 'RETRY: missing outbound recipient phone',
        },
      });
      continue;
    }

    if (!bodyText) {
      outcomes.push({
        json: {
          id: row.id,
          processing_status: 'error',
          delivery_status: 'failed',
          error_message: 'RETRY: missing outbound text body',
        },
      });
      continue;
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: recipientPhone,
      type: 'text',
      text: { body: bodyText },
    };

    const response = await graphRequest(tenantAccount.meta_phone_number_id, accessToken, payload);
    const externalMessageId = Array.isArray(response?.messages) && response.messages[0]?.id ? response.messages[0].id : null;

    if (!externalMessageId) {
      outcomes.push({
        json: {
          id: row.id,
          processing_status: 'error',
          delivery_status: 'failed',
          error_message: 'RETRY: missing external_message_id from Meta',
        },
      });
      continue;
    }

    await patchConversation(row.conversation_id, {
      last_message_at: new Date().toISOString(),
      last_outbound_at: new Date().toISOString(),
      last_outbound_message_id: row.id,
    });

    outcomes.push({
      json: {
        id: row.id,
        processing_status: 'done',
        delivery_status: 'sent',
        sent_at: new Date().toISOString(),
        failed_at: null,
        external_message_id: externalMessageId,
        provider_payload_json: {
          ...(row.provider_payload_json || {}),
          sender_meta_phone_number_id: tenantAccount.meta_phone_number_id,
          sender_account_id: tenantAccount.id,
          sender_payload: payload,
          sender_response: response,
        },
        error_message: null,
      },
    });
  } catch (error) {
    outcomes.push({
      json: {
        id: row.id,
        processing_status: 'error',
        delivery_status: 'failed',
        failed_at: new Date().toISOString(),
        error_message: 'RETRY: ' + truncate(error.message || error),
      },
    });
  }
}

return outcomes;`;

const aiOrchestratorCode = String.raw`const claimedRows = [];
const supabaseUrl = String($env.SUPABASE_URL || '').trim();
const serviceKey = String($env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const aiCoreUrl = String($env.ZIREL_AI_CORE_WEBHOOK_URL || $env.AI_CORE_WEBHOOK_URL || '').trim();
const aiCoreBearerToken = String($env.ZIREL_AI_CORE_BEARER_TOKEN || $env.AI_CORE_BEARER_TOKEN || '').trim();

if (!supabaseUrl || !serviceKey) {
  return [{
    json: {
      id: 'missing-env',
      processing_status: 'error',
      conversation_ai_processing_status: 'error',
      error_message: 'RETRY: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'
    }
  }];
}

if (!aiCoreUrl) {
  return [{
    json: {
      id: 'missing-ai-core-url',
      processing_status: 'error',
      conversation_ai_processing_status: 'error',
      error_message: 'RETRY: missing ZIREL_AI_CORE_WEBHOOK_URL or AI_CORE_WEBHOOK_URL'
    }
  }];
}

const defaultHeaders = {
  apikey: serviceKey,
  Authorization: 'Bearer ' + serviceKey,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

const encode = (value) => encodeURIComponent(String(value ?? ''));
const truncate = (value, max = 1000) => String(value || '').slice(0, max);

const rest = async (method, path, body) => {
  try {
    return await this.helpers.httpRequest({
      method,
      url: supabaseUrl + '/rest/v1/' + path,
      headers: defaultHeaders,
      body: body === undefined ? undefined : body,
      json: true,
    });
  } catch (error) {
    const responseBody =
      error?.response?.body === undefined
        ? ''
        : typeof error.response.body === 'string'
          ? error.response.body
          : JSON.stringify(error.response.body);
    const details = truncate(responseBody || error?.message || error);
    throw new Error('Supabase ' + method + ' ' + path + ' failed: ' + details);
  }
};

const callAiCore = async (body) => {
  try {
    const headers = aiCoreBearerToken
      ? {
          Authorization: 'Bearer ' + aiCoreBearerToken,
          'Content-Type': 'application/json',
        }
      : {
          'Content-Type': 'application/json',
        };

    return await this.helpers.httpRequest({
      method: 'POST',
      url: aiCoreUrl,
      headers,
      body,
      json: true,
    });
  } catch (error) {
    const responseBody =
      error?.response?.body === undefined
        ? ''
        : typeof error.response.body === 'string'
          ? error.response.body
          : JSON.stringify(error.response.body);
    const details = truncate(responseBody || error?.message || error);
    throw new Error('AI Core call failed: ' + details);
  }
};

const selectCandidates = async () => {
  const rows = await rest(
    'GET',
    'conversation_messages?select=id,conversation_id,tenant_id,channel,direction,sender_role,external_message_id,processing_status,content_text,provider_payload_json,created_at&direction=eq.inbound&channel=eq.whatsapp&processing_status=eq.pending_ai&order=created_at.asc&limit=25'
  );
  return Array.isArray(rows) ? rows : [];
};

const claimRow = async (rowId) => {
  const rows = await rest(
    'PATCH',
    'conversation_messages?id=eq.' + encode(rowId) + '&processing_status=eq.pending_ai',
    {
      processing_status: 'processing',
    }
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

const getTenantAccount = async (tenantId) => {
  if (!tenantId) return null;
  const rows = await rest(
    'GET',
    'tenant_whatsapp_accounts?select=id,tenant_id,ai_enabled,human_handoff_enabled&tenant_id=eq.' +
      encode(tenantId) +
      '&order=updated_at.desc.nullslast&limit=1'
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

const getConversation = async (conversationId) => {
  if (!conversationId) return null;
  const rows = await rest(
    'GET',
    'tenant_conversations?select=id,tenant_id,status,ai_processing_status,customer_name,customer_phone_normalized,external_contact_id,last_inbound_message_id,last_outbound_message_id&' +
      'id=eq.' +
      encode(conversationId) +
      '&limit=1'
  );
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

const getRecentMessages = async (conversationId) => {
  if (!conversationId) return [];
  const rows = await rest(
    'GET',
    'conversation_messages?select=id,direction,sender_role,content_text,created_at,provider_payload_json,message_type&conversation_id=eq.' +
      encode(conversationId) +
      '&order=created_at.desc&limit=12'
  );
  return Array.isArray(rows) ? rows.reverse() : [];
};

const getExistingOutboundForInbound = async (conversationId, inboundMessageId) => {
  if (!conversationId || !inboundMessageId) return null;
  const rows = await rest(
    'GET',
    'conversation_messages?select=id,external_message_id,processing_status,delivery_status,provider_payload_json,created_at&conversation_id=eq.' +
      encode(conversationId) +
      '&direction=eq.outbound&sender_role=eq.ai&order=created_at.desc&limit=20'
  );

  const matches = Array.isArray(rows) ? rows : [];
  return (
    matches.find(
      (item) => String(item?.provider_payload_json?.source_inbound_message_id || '') === String(inboundMessageId)
    ) || null
  );
};

const extractInboundText = (row) => {
  const provider = row?.provider_payload_json || {};
  return (
    row?.content_text ||
    provider?.text_content ||
    provider?.message_payload?.text?.body ||
    null
  );
};

const normalizeContextMessages = (rows) =>
  rows.map((item) => ({
    id: item.id,
    direction: item.direction,
    sender_role: item.sender_role,
    message_type: item.message_type || null,
    content_text:
      item.content_text ||
      item?.provider_payload_json?.text_content ||
      item?.provider_payload_json?.message_payload?.text?.body ||
      null,
    created_at: item.created_at,
  }));

const resolveAiReply = (response) => {
  const candidates = [
    response?.final_reply,
    response?.reply,
    response?.message,
    response?.text,
    response?.output,
    response?.data?.final_reply,
    response?.data?.reply,
    response?.data?.message,
    response?.result?.final_reply,
    response?.result?.reply,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate.trim();
    }
  }

  return null;
};

const patchMessage = async (messageId, body) => {
  if (!messageId) return [];
  return rest('PATCH', 'conversation_messages?id=eq.' + encode(messageId), body);
};

const patchConversation = async (conversationId, body) => {
  if (!conversationId) return [];
  return rest('PATCH', 'tenant_conversations?id=eq.' + encode(conversationId), body);
};

const insertOutboundMessage = async (conversation, inboundRow, replyText, aiResponse) => {
  const body = {
    conversation_id: conversation.id,
    tenant_id: conversation.tenant_id,
    channel: 'whatsapp',
    direction: 'outbound',
    sender_role: 'ai',
    message_type: 'text',
    content_text: replyText,
    processing_status: 'done',
    provider_payload_json: {
      text_content: replyText,
      recipient_phone: conversation.customer_phone_normalized || conversation.external_contact_id || null,
      source_inbound_message_id: inboundRow.id,
      ai_response: aiResponse,
    },
  };

  const rows = await rest('POST', 'conversation_messages', body);
  return Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
};

const outcomes = [];

for (const candidate of await selectCandidates()) {
  const claimed = await claimRow(candidate.id);
  if (claimed?.id) {
    claimedRows.push({ ...candidate, ...claimed });
  }
}

if (!claimedRows.length) {
  return [];
}

for (const row of claimedRows) {
  try {
    const conversation = await getConversation(row.conversation_id);
    if (!conversation?.id) {
      outcomes.push({
        json: {
          id: row.id,
          processing_status: 'error',
          conversation_ai_processing_status: 'error',
          error_message: 'RETRY: conversation not found',
        },
      });
      continue;
    }

    const tenantAccount = await getTenantAccount(conversation.tenant_id);
    if (tenantAccount && tenantAccount.ai_enabled === false) {
      outcomes.push({
        json: {
          id: row.id,
          processing_status: 'skipped_hho',
          conversation_ai_processing_status: 'skipped',
          error_message: 'SKIPPED:ai_disabled',
        },
      });
      continue;
    }

    if (conversation.status === 'human_handoff' || conversation.status === 'closed') {
      outcomes.push({
        json: {
          id: row.id,
          processing_status: 'skipped_hho',
          conversation_ai_processing_status: 'skipped',
          error_message: 'SKIPPED:' + conversation.status,
        },
      });
      continue;
    }

    await patchConversation(conversation.id, {
      ai_processing_status: 'processing',
    });

    const recentMessages = await getRecentMessages(conversation.id);
    const inboundText = extractInboundText(row);

    if (!inboundText) {
      outcomes.push({
        json: {
          id: row.id,
          processing_status: 'error',
          conversation_ai_processing_status: 'error',
          error_message: 'RETRY: missing inbound text content',
        },
      });
      continue;
    }

    const aiPayload = {
      chatInput: inboundText,
      metadata: {
        tenant_id: conversation.tenant_id,
        session_id: conversation.id,
        trace_id: row.id,
        source: 'whatsapp',
        channel: 'whatsapp',
        conversation_id: conversation.id,
        inbound_message_id: row.id,
        external_message_id: row.external_message_id || null,
        customer_name: conversation.customer_name || null,
        customer_phone: conversation.customer_phone_normalized || conversation.external_contact_id || null,
        recent_messages: normalizeContextMessages(recentMessages),
      },
    };

    const aiResponse = await callAiCore(aiPayload);
    const replyText = resolveAiReply(aiResponse);

    if (!replyText) {
      outcomes.push({
        json: {
          id: row.id,
          processing_status: 'error',
          conversation_ai_processing_status: 'error',
          error_message: 'RETRY: AI Core returned no usable reply text',
        },
      });
      continue;
    }

    const existingOutbound = await getExistingOutboundForInbound(conversation.id, row.id);
    if (existingOutbound?.id) {
      await patchConversation(conversation.id, {
        ai_processing_status: 'done',
      });

      outcomes.push({
        json: {
          id: row.id,
          processing_status: 'done',
          conversation_ai_processing_status: 'done',
          error_message: 'DEDUP: existing outbound ' + existingOutbound.id,
        },
      });
      continue;
    }

    const outboundMessage = await insertOutboundMessage(conversation, row, replyText, aiResponse);
    if (!outboundMessage?.id) {
      outcomes.push({
        json: {
          id: row.id,
          processing_status: 'error',
          conversation_ai_processing_status: 'error',
          error_message: 'RETRY: failed to create outbound message row',
        },
      });
      continue;
    }

    await patchConversation(conversation.id, {
      ai_processing_status: 'done',
    });

    outcomes.push({
      json: {
        id: row.id,
        processing_status: 'done',
        conversation_ai_processing_status: 'done',
        error_message: null,
      },
    });
  } catch (error) {
    outcomes.push({
      json: {
        id: row.id,
        processing_status: 'error',
        conversation_ai_processing_status: 'error',
        error_message: 'RETRY: ' + truncate(error.message || error),
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
          { fieldId: 'event_type', fieldValue: '={{ $json.event_type }}' },
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
    codeNode('Code: Claim + Process Events', [360, 200], processorCode, {
      id: 'wa-processor-code',
      notesInFlow: true,
      notes: 'Claima la coda via Supabase REST usando event_status, poi esegue parsing Meta, tenant resolution, conversation match/create, inbound insert idempotente e status update.',
    }),
    supabaseNode('Supabase: Persist Event Outcome', [720, 200], {
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
    { from: 'Cron (1 min)', to: 'Code: Claim + Process Events', type: 'main', branch: 0 },
    { from: 'Code: Claim + Process Events', to: 'Supabase: Persist Event Outcome', type: 'main', branch: 0 },
  ]),
});

const buildOutboundSenderWorkflow = () => ({
  name: 'WhatsApp 3 - Outbound Sender (V3.2 Hardened)',
  nodes: [
    scheduleNode('Cron (1 min)', [0, 200], 1),
    codeNode('Code: Claim + Send Outbound', [360, 200], outboundSenderCode, {
      id: 'wa-sender-code',
      notesInFlow: true,
      notes: 'Legge la queue outbound, risolve account/token, invia via Meta Cloud API e aggiorna messaggi/conversazioni.',
    }),
    supabaseNode('Supabase: Persist Send Outcome', [760, 200], {
      operation: 'update',
      tableId: 'conversation_messages',
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
          { fieldId: 'processing_status', fieldValue: '={{ $json.processing_status }}' },
          { fieldId: 'delivery_status', fieldValue: '={{ $json.delivery_status }}' },
          { fieldId: 'external_message_id', fieldValue: '={{ $json.external_message_id || null }}' },
          { fieldId: 'sent_at', fieldValue: '={{ $json.sent_at || null }}' },
          { fieldId: 'failed_at', fieldValue: '={{ $json.failed_at || null }}' },
          { fieldId: 'provider_payload_json', fieldValue: '={{ $json.provider_payload_json || null }}' },
          { fieldId: 'error_message', fieldValue: '={{ $json.error_message || null }}' },
        ],
      },
    }, {
      id: 'wa-sender-update',
      notesInFlow: true,
      notes: 'Persistenza finale dell’esito outbound. La queue e definita dai messaggi outbound con external_message_id nullo.',
    }),
  ],
  connections: buildConnections([
    { from: 'Cron (1 min)', to: 'Code: Claim + Send Outbound', type: 'main', branch: 0 },
    { from: 'Code: Claim + Send Outbound', to: 'Supabase: Persist Send Outcome', type: 'main', branch: 0 },
  ]),
});

const buildAiOrchestratorWorkflow = () => ({
  name: 'WhatsApp 4 - AI Orchestrator (V3.2 Hardened)',
  nodes: [
    scheduleNode('Cron (1 min)', [0, 200], 1),
    codeNode('Code: Claim + Orchestrate AI', [360, 200], aiOrchestratorCode, {
      id: 'wa-ai-code',
      notesInFlow: true,
      notes: 'Legge inbound pending_ai, rispetta ai_enabled globale, salta human_handoff/closed, chiama AI Core e crea outbound pronti per il sender.',
    }),
    supabaseNode('Supabase: Persist AI Outcome', [760, 200], {
      operation: 'update',
      tableId: 'conversation_messages',
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
          { fieldId: 'processing_status', fieldValue: '={{ $json.processing_status }}' },
          { fieldId: 'error_message', fieldValue: '={{ $json.error_message || null }}' },
        ],
      },
    }, {
      id: 'wa-ai-update-message',
      notesInFlow: true,
      notes: 'Aggiorna lo stato del messaggio inbound processato dall’orchestrator.',
    }),
    supabaseNode('Supabase: Persist Conversation AI Status', [1120, 200], {
      operation: 'update',
      tableId: 'tenant_conversations',
      filters: {
        conditions: [
          {
            keyName: 'last_inbound_message_id',
            condition: 'eq',
            keyValue: '={{ $json.id }}',
          },
        ],
      },
      fieldsUi: {
        fieldValues: [
          { fieldId: 'ai_processing_status', fieldValue: '={{ $json.conversation_ai_processing_status || "done" }}' },
        ],
      },
    }, {
      id: 'wa-ai-update-conversation',
      notesInFlow: true,
      notes: 'Persistenza finale sullo stato AI della conversation.',
    }),
  ],
  connections: buildConnections([
    { from: 'Cron (1 min)', to: 'Code: Claim + Orchestrate AI', type: 'main', branch: 0 },
    { from: 'Code: Claim + Orchestrate AI', to: 'Supabase: Persist AI Outcome', type: 'main', branch: 0 },
    { from: 'Supabase: Persist AI Outcome', to: 'Supabase: Persist Conversation AI Status', type: 'main', branch: 0 },
  ]),
});

writeJson(paths.ingestion, buildIngestionWorkflow());
writeJson(paths.processor, buildProcessorWorkflow());
writeJson(paths.outboundSender, buildOutboundSenderWorkflow());
writeJson(paths.aiOrchestrator, buildAiOrchestratorWorkflow());

console.log('Built WhatsApp workflows:');
console.log(`- ${paths.ingestion}`);
console.log(`- ${paths.processor}`);
console.log(`- ${paths.outboundSender}`);
console.log(`- ${paths.aiOrchestrator}`);
