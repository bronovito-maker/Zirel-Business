import fs from 'node:fs';
import crypto from 'node:crypto';

const root = '/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl';

const credentials = {
  supabaseApi: {
    id: 'bEyN805IWleebXdC',
    name: 'Supabase account - Zirèl',
  },
  telegramApi: {
    id: 'MHrNkPgbqU0Q6vyM',
    name: 'TG_Zirèl',
  },
  resend: {
    id: 'o5v5J8779y7QCWIE',
    name: 'Header Auth account 2',
  },
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

const scheduleNode = () =>
  nodeBase('Schedule Trigger', 'n8n-nodes-base.scheduleTrigger', 1.2, [-2928, 688], {
    rule: {
      interval: [{ field: 'minutes', minutesInterval: 1 }],
    },
  });

const supabaseNode = (name, position, parameters, extra = {}) =>
  nodeBase(name, 'n8n-nodes-base.supabase', 1, position, parameters, {
    credentials: { supabaseApi: credentials.supabaseApi },
    ...extra,
  });

const codeNode = (name, position, jsCode) =>
  nodeBase(name, 'n8n-nodes-base.code', 2, position, { jsCode });

const ifNode = (name, position, leftValue, type, operation, rightValue, singleValue = false) =>
  nodeBase(name, 'n8n-nodes-base.if', 2.2, position, {
    conditions: {
      options: {
        caseSensitive: true,
        leftValue: '',
        typeValidation: 'strict',
        version: 2,
      },
      conditions: [{
        id: crypto.randomUUID(),
        leftValue,
        rightValue,
        operator: {
          type,
          operation,
          ...(singleValue ? { singleValue: true } : {}),
        },
      }],
      combinator: 'and',
    },
    options: {},
  });

const httpNode = (name, position, parameters) =>
  nodeBase(name, 'n8n-nodes-base.httpRequest', 4.4, position, parameters, {
    credentials: {
      httpHeaderAuth: credentials.resend,
    },
    onError: 'continueRegularOutput',
  });

const telegramNode = (name, position, parameters, extra = {}) =>
  nodeBase(name, 'n8n-nodes-base.telegram', 1.2, position, parameters, {
    credentials: { telegramApi: credentials.telegramApi },
    ...extra,
  });

const telegramTriggerNode = () =>
  nodeBase(
    'Telegram Trigger',
    'n8n-nodes-base.telegramTrigger',
    1.2,
    [-1184, -224],
    {
      updates: ['callback_query'],
      additionalFields: {},
    },
    {
      credentials: { telegramApi: credentials.telegramApi },
      webhookId: 'fd1d2c92-80ee-4fc2-a423-78fb68f5fb45',
    }
  );

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

const dispatcherRenderEmail = `const payload = typeof $json.payload === 'string' ? JSON.parse($json.payload) : ($json.payload || {});
const template = String($json.template_key || '').trim();
const channel = String($json.channel || '').trim();
const activity = payload.nome_struttura || payload.nome_attivita || 'Zirèl';
const recipientEmail = String($json.recipient_email || payload.internal_email || payload.email || '').trim().toLowerCase();
const statusLabel = ({
  confirmed: 'Confermata',
  manual_review: 'Verifica manuale',
  rejected: 'Non disponibile',
  pending: 'In lavorazione',
})[String(payload.booking_status || payload.status || payload.availability_status || '').trim()] || 'In lavorazione';

const renderShell = (title, intro, bodyRows, outro) => {
  const rows = bodyRows.filter(Boolean).map((row) => \`<tr><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;width:38%;font-weight:600;color:#0f172a;">\${row.label}</td><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;color:#334155;">\${row.value}</td></tr>\`).join('');
  return \`<div style="font-family:Helvetica,Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
    <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
      <div style="padding:24px 28px;background:linear-gradient(135deg,#0f3b52 0%,#ff8c42 100%);color:#ffffff;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.82;">Zirèl Notification Center</p>
        <h1 style="margin:0;font-size:28px;line-height:1.15;">\${title}</h1>
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 18px;font-size:16px;line-height:1.6;color:#334155;">\${intro}</p>
        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;background:#fff;">\${rows}</table>
        <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#334155;">\${outro}</p>
      </div>
    </div>
  </div>\`;
};

let subject = 'Aggiornamento Zirèl';
let text = '';
let html = '';

if (template === 'hotel_guest_confirmation' || channel === 'email_guest_hotel') {
  subject = \`Richiesta soggiorno ricevuta • \${activity}\`;
  text = \`Ciao \${payload.nome || 'Cliente'},\\n\\nabbiamo ricevuto la tua richiesta di soggiorno presso \${activity}.\\n\\nCheck-in: \${payload.checkin_date || 'N/D'}\\nCheck-out: \${payload.checkout_date || 'N/D'}\\nOspiti: \${payload.ospiti_totali || 'N/D'}\\nCamera: \${payload.room_type_requested || 'Da definire'}\\nStato: \${statusLabel}\\n\\nIl nostro team ti contatterà a breve con il prossimo aggiornamento.\\n\\nA presto,\\n\${activity}\`;
  html = renderShell(
    'Richiesta soggiorno ricevuta',
    \`Ciao <strong>\${payload.nome || 'Cliente'}</strong>, abbiamo ricevuto correttamente la tua richiesta di soggiorno presso <strong>\${activity}</strong>.\`,
    [
      { label: 'Check-in', value: payload.checkin_date || 'N/D' },
      { label: 'Check-out', value: payload.checkout_date || 'N/D' },
      { label: 'Ospiti', value: String(payload.ospiti_totali || 'N/D') },
      { label: 'Camera richiesta', value: payload.room_type_requested || 'Da definire' },
      { label: 'Servizi richiesti', value: payload.servizi_richiesti || 'Nessuno' },
      { label: 'Stato richiesta', value: statusLabel },
    ],
    'Il nostro team verificherà la disponibilità e ti ricontatterà con il prossimo aggiornamento.'
  );
} else if (template === 'restaurant_guest_confirmation' || channel === 'email_guest_restaurant') {
  subject = \`Richiesta tavolo ricevuta • \${activity}\`;
  text = \`Ciao \${payload.nome_cliente || 'Cliente'},\\n\\nabbiamo ricevuto la tua richiesta di prenotazione presso \${activity}.\\n\\nData: \${payload.data_prenotazione_label || payload.data_prenotazione || 'N/D'}\\nOra: \${payload.ora || 'N/D'}\\nPersone: \${payload.persone || 'N/D'}\\nNote: \${payload.note_prenotazione || 'Nessuna'}\\nStato: \${statusLabel}\\n\\nTi aggiorneremo al più presto.\\n\\nA presto,\\n\${activity}\`;
  html = renderShell(
    'Richiesta tavolo ricevuta',
    \`Ciao <strong>\${payload.nome_cliente || 'Cliente'}</strong>, abbiamo preso in carico la tua richiesta di prenotazione presso <strong>\${activity}</strong>.\`,
    [
      { label: 'Data', value: payload.data_prenotazione_label || payload.data_prenotazione || 'N/D' },
      { label: 'Ora', value: payload.ora || 'N/D' },
      { label: 'Persone', value: String(payload.persone || 'N/D') },
      { label: 'Note', value: payload.note_prenotazione || 'Nessuna' },
      { label: 'Stato richiesta', value: statusLabel },
    ],
    'Lo staff verificherà la disponibilità del tavolo e ti confermerà al più presto.'
  );
} else if (template === 'appointment_guest_confirmation' || channel === 'email_guest_appointment') {
  subject = \`Richiesta ricevuta • \${activity}\`;
  text = \`Ciao \${payload.nome || 'Cliente'},\\n\\nabbiamo ricevuto la tua richiesta con \${activity}.\\n\\nData: \${payload.data_appuntamento_label || payload.data_appuntamento || 'N/D'}\\nOra: \${payload.orario || 'N/D'}\\nMotivo: \${payload.motivo || 'N/D'}\\nStato: \${statusLabel}\\n\\nTi contatteremo a breve con conferma e dettagli.\\n\\nA presto,\\n\${activity}\`;
  html = renderShell(
    'Richiesta ricevuta',
    \`Ciao <strong>\${payload.nome || 'Cliente'}</strong>, abbiamo preso in carico la tua richiesta con <strong>\${activity}</strong>.\`,
    [
      { label: 'Data', value: payload.data_appuntamento_label || payload.data_appuntamento || 'N/D' },
      { label: 'Ora', value: payload.orario || 'N/D' },
      { label: 'Motivo', value: payload.motivo || 'N/D' },
      { label: 'Stato richiesta', value: statusLabel },
    ],
    'Il team verificherà la disponibilità e ti ricontatterà con il prossimo aggiornamento.'
  );
} else if (template === 'hotel_internal_alert' || channel === 'email_internal_hotel') {
  subject = \`Nuova richiesta soggiorno interna • \${activity}\`;
  text = \`Nuova richiesta soggiorno\\n\\nStruttura: \${activity}\\nCliente: \${payload.nome || 'N/D'}\\nTelefono: \${payload.telefono || 'N/D'}\\nEmail: \${payload.email || 'N/D'}\\nCheck-in: \${payload.checkin_date || 'N/D'}\\nCheck-out: \${payload.checkout_date || 'N/D'}\\nCamera: \${payload.room_type_requested || 'Da definire'}\\nServizi: \${payload.servizi_richiesti || 'Nessuno'}\\nNote: \${payload.note_prenotazione || 'Nessuna'}\\nStato: \${statusLabel}\\nTrace: \${payload.trace_id || 'N/D'}\`;
  html = renderShell(
    'Nuova richiesta soggiorno',
    \`È stata ricevuta una nuova richiesta per <strong>\${activity}</strong>.\`,
    [
      { label: 'Cliente', value: payload.nome || 'N/D' },
      { label: 'Telefono', value: payload.telefono || 'N/D' },
      { label: 'Email', value: payload.email || 'N/D' },
      { label: 'Check-in', value: payload.checkin_date || 'N/D' },
      { label: 'Check-out', value: payload.checkout_date || 'N/D' },
      { label: 'Camera', value: payload.room_type_requested || 'Da definire' },
      { label: 'Servizi', value: payload.servizi_richiesti || 'Nessuno' },
      { label: 'Note', value: payload.note_prenotazione || 'Nessuna' },
      { label: 'Stato', value: statusLabel },
      { label: 'Trace', value: payload.trace_id || 'N/D' },
    ],
    'Apri il dashboard o il thread operativo per gestire la richiesta.'
  );
} else if (template === 'restaurant_internal_alert' || channel === 'email_internal_restaurant') {
  subject = \`Nuova richiesta tavolo interna • \${activity}\`;
  text = \`Nuova richiesta tavolo\\n\\nAttività: \${activity}\\nCliente: \${payload.nome_cliente || 'N/D'}\\nTelefono: \${payload.telefono || 'N/D'}\\nData: \${payload.data_prenotazione_label || payload.data_prenotazione || 'N/D'}\\nOra: \${payload.ora || 'N/D'}\\nPersone: \${payload.persone || 'N/D'}\\nNote: \${payload.note_prenotazione || 'Nessuna'}\\nStato: \${statusLabel}\\nTrace: \${payload.trace_id || 'N/D'}\`;
  html = renderShell(
    'Nuova richiesta tavolo',
    \`È arrivata una nuova richiesta tavolo per <strong>\${activity}</strong>.\`,
    [
      { label: 'Cliente', value: payload.nome_cliente || 'N/D' },
      { label: 'Telefono', value: payload.telefono || 'N/D' },
      { label: 'Data', value: payload.data_prenotazione_label || payload.data_prenotazione || 'N/D' },
      { label: 'Ora', value: payload.ora || 'N/D' },
      { label: 'Persone', value: String(payload.persone || 'N/D') },
      { label: 'Note', value: payload.note_prenotazione || 'Nessuna' },
      { label: 'Stato', value: statusLabel },
      { label: 'Trace', value: payload.trace_id || 'N/D' },
    ],
    'Verifica la disponibilità e conferma la gestione appena possibile.'
  );
} else {
  subject = \`Nuova richiesta interna • \${activity}\`;
  text = \`Nuova richiesta appuntamento\\n\\nAttività: \${activity}\\nCliente: \${payload.nome || 'N/D'}\\nTelefono: \${payload.telefono || 'N/D'}\\nEmail: \${payload.email || 'N/D'}\\nData: \${payload.data_appuntamento_label || payload.data_appuntamento || 'N/D'}\\nOra: \${payload.orario || 'N/D'}\\nMotivo: \${payload.motivo || 'N/D'}\\nStato: \${statusLabel}\\nTrace: \${payload.trace_id || 'N/D'}\`;
  html = renderShell(
    'Nuova richiesta appuntamento',
    \`È stata ricevuta una nuova richiesta da gestire per <strong>\${activity}</strong>.\`,
    [
      { label: 'Cliente', value: payload.nome || 'N/D' },
      { label: 'Telefono', value: payload.telefono || 'N/D' },
      { label: 'Email', value: payload.email || 'N/D' },
      { label: 'Data', value: payload.data_appuntamento_label || payload.data_appuntamento || 'N/D' },
      { label: 'Ora', value: payload.orario || 'N/D' },
      { label: 'Motivo', value: payload.motivo || 'N/D' },
      { label: 'Stato', value: statusLabel },
      { label: 'Trace', value: payload.trace_id || 'N/D' },
    ],
    'Apri il dashboard o il thread operativo per gestire la richiesta.'
  );
}

return [{
  json: {
    ...$json,
    rendered_email: {
      from: 'Zirèl <noreply@zirel.org>',
      to: recipientEmail ? [recipientEmail] : [],
      subject,
      text,
      html,
    },
  },
}];`;

const dispatcherRenderTelegram = `const payload = typeof $json.payload === 'string' ? JSON.parse($json.payload) : ($json.payload || {});
const template = String($json.template_key || '').trim();
const relatedType = String($json.related_entity_type || '').trim();
const relatedId = String($json.related_entity_id || '').trim();
const statusLabel = ({
  confirmed: 'Confermata',
  manual_review: 'Verifica manuale',
  rejected: 'Non disponibile',
  pending: 'In lavorazione',
})[String(payload.booking_status || payload.status || payload.availability_status || '').trim()] || 'In lavorazione';
const phoneRaw = String(payload.telefono || '').trim();
const emailRaw = String(payload.email || '').trim().toLowerCase();
const sanitizedPhone = phoneRaw.replace(/[^\\d+]/g, '');
const phoneAction = sanitizedPhone ? 'tel:' + sanitizedPhone : '';
const emailAction = emailRaw ? 'mailto:' + emailRaw : '';
let text = 'Nuova richiesta Zirèl';
if (template === 'hotel_internal_alert') {
  text = [
    'Nuova richiesta soggiorno',
    '',
    'Struttura: ' + (payload.nome_struttura || 'Hotel'),
    'Cliente: ' + (payload.nome || 'N/D'),
    'Telefono: ' + (phoneRaw || 'N/D'),
    'Email: ' + (emailRaw || 'N/D'),
    '',
    'Soggiorno: ' + (payload.checkin_date || 'N/D') + ' -> ' + (payload.checkout_date || 'N/D'),
    'Ospiti: ' + String(payload.ospiti_totali || 'N/D'),
    'Camera: ' + (payload.room_type_requested || 'Da definire'),
    'Servizi: ' + (payload.servizi_richiesti || 'Nessuno'),
    'Note: ' + (payload.note_prenotazione || 'Nessuna'),
    '',
    'Stato: ' + statusLabel,
    'Trace: ' + (payload.trace_id || 'N/D'),
  ].join('\\n');
} else if (template === 'restaurant_internal_alert') {
  text = [
    'Nuova richiesta tavolo',
    '',
    'Cliente: ' + (payload.nome_cliente || 'N/D'),
    'Telefono: ' + (phoneRaw || 'N/D'),
    ...(emailRaw ? ['Email: ' + emailRaw] : []),
    'Data: ' + (payload.data_prenotazione_label || payload.data_prenotazione || 'N/D'),
    'Ora: ' + (payload.ora || 'N/D'),
    'Persone: ' + String(payload.persone || 'N/D'),
    'Note: ' + (payload.note_prenotazione || 'Nessuna'),
    '',
    'Stato: ' + statusLabel,
    'Trace: ' + (payload.trace_id || 'N/D'),
  ].join('\\n');
} else {
  text = [
    'Nuova richiesta appuntamento',
    '',
    'Cliente: ' + (payload.nome || 'N/D'),
    'Telefono: ' + (phoneRaw || 'N/D'),
    'Email: ' + (emailRaw || 'N/D'),
    'Data: ' + (payload.data_appuntamento_label || payload.data_appuntamento || 'N/D'),
    'Ora: ' + (payload.orario || 'N/D'),
    'Motivo: ' + (payload.motivo || 'N/D'),
    '',
    'Stato: ' + statusLabel,
    'Trace: ' + (payload.trace_id || 'N/D'),
  ].join('\\n');
}

const callbackData = relatedType && relatedId ? ['accept', relatedType, relatedId].join('|') : '';
return [{
  json: {
    ...$json,
    rendered_telegram_text: text,
    telegram_accept_callback_data: callbackData,
  },
}];`;

const callbackParse = `const callback = $json.callback_query || {};
const data = String(callback.data || '').trim();
const [action, related_entity_type, related_entity_id] = data.split('|');

const mapping = {
  restaurant_booking: {
    table_name: 'prenotazioni',
    field_name: 'stato',
    new_status: 'CONFERMATA',
    status_label: 'Prenotazione ristorante confermata',
  },
  hotel_booking: {
    table_name: 'hotel_bookings',
    field_name: 'booking_status',
    new_status: 'confirmed',
    status_label: 'Richiesta soggiorno confermata',
  },
  appointment: {
    table_name: 'appointments',
    field_name: 'stato',
    new_status: 'confirmed',
    status_label: 'Appuntamento confermato',
  },
};

const target = mapping[related_entity_type] || null;
const operatorName = callback.from?.first_name || 'Team';
const originalText = callback.message?.text || 'Messaggio non disponibile';

return [{
  json: {
    ...$json,
    callback_action: action || '',
    related_entity_type: related_entity_type || '',
    related_entity_id: related_entity_id || '',
    operator_name: operatorName,
    original_text: originalText,
    ...target,
    is_supported: Boolean(target && action === 'accept' && related_entity_id),
  },
}];`;

const callbackBuildAccepted = `const input = $('Parse Callback Data').item.json;
return [{
  json: {
    ...input,
    callback_answer_text: input.status_label + ' da ' + input.operator_name,
    edited_message_text: [
      input.original_text,
      '',
      'Aggiornamento: accettata',
      'Accettata da: ' + input.operator_name,
    ].join('\\n'),
  },
}];`;

const callbackBuildUnsupported = `const input = $json;
return [{
  json: {
    ...input,
    callback_answer_text: 'Azione non supportata o dati callback non validi.',
    edited_message_text: input.original_text || 'Azione non supportata.',
  },
}];`;

function buildDispatcherWorkflow() {
  const workflow = {
    name: 'Zirèl - Notifiche Dispatcher',
    nodes: [
      scheduleNode(),
      supabaseNode('Get Pending Outbox', [-2672, 688], {
        operation: 'getAll',
        tableId: 'notification_outbox',
        filters: {
          conditions: [{ keyName: 'status', condition: 'eq', keyValue: 'pending' }],
        },
      }),
      codeNode('Filter Due Now', [-2400, 688], `const now = Date.now();
return items.filter((item) => {
  const nextRetry = item.json.next_retry_at;
  if (!nextRetry) return true;
  const ts = new Date(nextRetry).getTime();
  return !Number.isNaN(ts) && ts <= now;
});`),
      codeNode('Render Email Payload', [-2144, 496], dispatcherRenderEmail),
      codeNode('Render Telegram Payload', [-2144, 880], dispatcherRenderTelegram),
      ifNode('If Email Channel?', [-1872, 496], '={{ String($json.channel || "").startsWith("email_") }}', 'boolean', 'true', true, true),
      httpNode('Send Email', [-1616, 496], {
        method: 'POST',
        url: 'https://api.resend.com/emails',
        authentication: 'genericCredentialType',
        genericAuthType: 'httpHeaderAuth',
        sendHeaders: true,
        headerParameters: {
          parameters: [{ name: 'Content-Type', value: 'application/json' }],
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ $json.rendered_email }}',
        options: { timeout: 15000 },
      }),
      ifNode('If Email Sent?', [-1360, 496], '={{ !!String($json.id || "").trim() }}', 'boolean', 'true', true, true),
      codeNode('Prepare Email Sent Update', [-1104, 384], `const src = $('If Email Channel?').item.json;
return [{ json: { id: src.id, status: 'sent', sent_at: new Date().toISOString(), last_error: null } }];`),
      codeNode('Prepare Email Retry Update', [-1104, 608], `const src = $('If Email Channel?').item.json;
const retry = Number(src.retry_count || 0) + 1;
const max = Number(src.max_retries || 5);
const failed = retry >= max;
const backoffMin = Math.min(60, Math.pow(2, retry));
return [{ json: { id: src.id, status: failed ? 'failed' : 'pending', retry_count: retry, next_retry_at: new Date(Date.now() + backoffMin * 60 * 1000).toISOString(), last_error: 'EMAIL_SEND_FAILED' } }];`),
      supabaseNode('Update Outbox Email Sent', [-832, 384], {
        operation: 'update',
        tableId: 'notification_outbox',
        filters: {
          conditions: [{ keyName: 'id', condition: 'eq', keyValue: '={{ $json.id }}' }],
        },
        fieldsUi: {
          fieldValues: [
            { fieldId: 'status', fieldValue: '={{ $json.status }}' },
            { fieldId: 'sent_at', fieldValue: '={{ $json.sent_at || null }}' },
            { fieldId: 'last_error', fieldValue: '={{ $json.last_error }}' },
          ],
        },
      }),
      supabaseNode('Update Outbox Email Retry', [-832, 608], {
        operation: 'update',
        tableId: 'notification_outbox',
        filters: {
          conditions: [{ keyName: 'id', condition: 'eq', keyValue: '={{ $json.id }}' }],
        },
        fieldsUi: {
          fieldValues: [
            { fieldId: 'status', fieldValue: '={{ $json.status }}' },
            { fieldId: 'retry_count', fieldValue: '={{ $json.retry_count }}' },
            { fieldId: 'next_retry_at', fieldValue: '={{ $json.next_retry_at }}' },
            { fieldId: 'last_error', fieldValue: '={{ $json.last_error }}' },
          ],
        },
      }),
      ifNode('If Telegram Channel?', [-1872, 880], '={{ String($json.channel || "").startsWith("telegram_") }}', 'boolean', 'true', true, true),
      telegramNode('Send Telegram', [-1616, 880], {
        chatId: '={{ $json.telegram_chat_id || $json.payload?.telegram_chat_id || $env.ZIREL_INTERNAL_TELEGRAM_CHAT_ID || "112661106" }}',
        text: '={{ $json.rendered_telegram_text }}',
        replyMarkup: 'inlineKeyboard',
        inlineKeyboard: {
          rows: [{
            row: {
              buttons: [{
                text: '✅ Accetta',
                additionalFields: {
                  callback_data: '={{ $json.telegram_accept_callback_data || "" }}',
                },
              }],
            },
          }],
        },
        additionalFields: {
          appendAttribution: false,
          parseMode: 'HTML',
          disableWebPagePreview: true,
        },
      }, {
        webhookId: '7456a1d2-129e-4de4-b430-03ab679d931b',
        onError: 'continueRegularOutput',
      }),
      ifNode('If Telegram Sent?', [-1360, 880], '={{ !!String($json.message_id || $json.result?.message_id || "").trim() }}', 'boolean', 'true', true, true),
      codeNode('Prepare Telegram Sent Update', [-1104, 768], `const src = $('If Telegram Channel?').item.json;
return [{ json: { id: src.id, status: 'sent', sent_at: new Date().toISOString(), last_error: null } }];`),
      codeNode('Prepare Telegram Retry Update', [-1104, 992], `const src = $('If Telegram Channel?').item.json;
const retry = Number(src.retry_count || 0) + 1;
const max = Number(src.max_retries || 5);
const failed = retry >= max;
const backoffMin = Math.min(60, Math.pow(2, retry));
return [{ json: { id: src.id, status: failed ? 'failed' : 'pending', retry_count: retry, next_retry_at: new Date(Date.now() + backoffMin * 60 * 1000).toISOString(), last_error: 'TELEGRAM_SEND_FAILED' } }];`),
      supabaseNode('Update Outbox Telegram Sent', [-832, 768], {
        operation: 'update',
        tableId: 'notification_outbox',
        filters: {
          conditions: [{ keyName: 'id', condition: 'eq', keyValue: '={{ $json.id }}' }],
        },
        fieldsUi: {
          fieldValues: [
            { fieldId: 'status', fieldValue: '={{ $json.status }}' },
            { fieldId: 'sent_at', fieldValue: '={{ $json.sent_at || null }}' },
            { fieldId: 'last_error', fieldValue: '={{ $json.last_error }}' },
          ],
        },
      }),
      supabaseNode('Update Outbox Telegram Retry', [-832, 992], {
        operation: 'update',
        tableId: 'notification_outbox',
        filters: {
          conditions: [{ keyName: 'id', condition: 'eq', keyValue: '={{ $json.id }}' }],
        },
        fieldsUi: {
          fieldValues: [
            { fieldId: 'status', fieldValue: '={{ $json.status }}' },
            { fieldId: 'retry_count', fieldValue: '={{ $json.retry_count }}' },
            { fieldId: 'next_retry_at', fieldValue: '={{ $json.next_retry_at }}' },
            { fieldId: 'last_error', fieldValue: '={{ $json.last_error }}' },
          ],
        },
      }),
    ],
    connections: buildConnections([
      { from: 'Schedule Trigger', to: 'Get Pending Outbox', type: 'main', branch: 0 },
      { from: 'Get Pending Outbox', to: 'Filter Due Now', type: 'main', branch: 0 },
      { from: 'Filter Due Now', to: 'Render Email Payload', type: 'main', branch: 0 },
      { from: 'Filter Due Now', to: 'Render Telegram Payload', type: 'main', branch: 0 },
      { from: 'Render Email Payload', to: 'If Email Channel?', type: 'main', branch: 0 },
      { from: 'If Email Channel?', to: 'Send Email', type: 'main', branch: 0 },
      { from: 'Send Email', to: 'If Email Sent?', type: 'main', branch: 0 },
      { from: 'If Email Sent?', to: 'Prepare Email Sent Update', type: 'main', branch: 0 },
      { from: 'If Email Sent?', to: 'Prepare Email Retry Update', type: 'main', branch: 1 },
      { from: 'Prepare Email Sent Update', to: 'Update Outbox Email Sent', type: 'main', branch: 0 },
      { from: 'Prepare Email Retry Update', to: 'Update Outbox Email Retry', type: 'main', branch: 0 },
      { from: 'Render Telegram Payload', to: 'If Telegram Channel?', type: 'main', branch: 0 },
      { from: 'If Telegram Channel?', to: 'Send Telegram', type: 'main', branch: 0 },
      { from: 'Send Telegram', to: 'If Telegram Sent?', type: 'main', branch: 0 },
      { from: 'If Telegram Sent?', to: 'Prepare Telegram Sent Update', type: 'main', branch: 0 },
      { from: 'If Telegram Sent?', to: 'Prepare Telegram Retry Update', type: 'main', branch: 1 },
      { from: 'Prepare Telegram Sent Update', to: 'Update Outbox Telegram Sent', type: 'main', branch: 0 },
      { from: 'Prepare Telegram Retry Update', to: 'Update Outbox Telegram Retry', type: 'main', branch: 0 },
    ]),
    active: true,
    settings: {
      executionOrder: 'v1',
      binaryMode: 'separate',
      availableInMCP: false,
    },
    versionId: crypto.randomUUID(),
    meta: {
      templateCredsSetupCompleted: true,
      instanceId: 'e5e4156406eb2781358eadbaabf7ac25423788a2a1b74d65514ae4da6dc2f496',
    },
    id: 'ZirelNotificheDispatcher',
    tags: [],
    pinData: {},
  };

  return workflow;
}

function buildCallbackWorkflow() {
  const workflow = {
    name: 'Zirèl - Telegram Callback Handler',
    nodes: [
      telegramTriggerNode(),
      codeNode('Parse Callback Data', [-928, -224], callbackParse),
      ifNode('Check Supported Callback', [-688, -224], '={{ $json.is_supported }}', 'boolean', 'true', true, true),
      ifNode('If Restaurant Booking', [-448, -416], '={{ $json.related_entity_type === "restaurant_booking" }}', 'boolean', 'true', true, true),
      supabaseNode('Confirm Restaurant Booking', [-192, -480], {
        operation: 'update',
        tableId: 'prenotazioni',
        filters: {
          conditions: [{ keyName: 'id', condition: 'eq', keyValue: '={{ $json.related_entity_id }}' }],
        },
        fieldsUi: {
          fieldValues: [{ fieldId: 'stato', fieldValue: 'CONFERMATA' }],
        },
      }),
      ifNode('If Hotel Booking', [-448, -224], '={{ $json.related_entity_type === "hotel_booking" }}', 'boolean', 'true', true, true),
      supabaseNode('Confirm Hotel Booking', [-192, -288], {
        operation: 'update',
        tableId: 'hotel_bookings',
        filters: {
          conditions: [{ keyName: 'id', condition: 'eq', keyValue: '={{ $json.related_entity_id }}' }],
        },
        fieldsUi: {
          fieldValues: [{ fieldId: 'booking_status', fieldValue: 'confirmed' }],
        },
      }),
      ifNode('If Appointment', [-448, -32], '={{ $json.related_entity_type === "appointment" }}', 'boolean', 'true', true, true),
      supabaseNode('Confirm Appointment', [-192, -96], {
        operation: 'update',
        tableId: 'appointments',
        filters: {
          conditions: [{ keyName: 'id', condition: 'eq', keyValue: '={{ $json.related_entity_id }}' }],
        },
        fieldsUi: {
          fieldValues: [{ fieldId: 'stato', fieldValue: 'confirmed' }],
        },
      }),
      codeNode('Build Accepted Response', [64, -288], callbackBuildAccepted),
      codeNode('Build Unsupported Response', [64, 32], callbackBuildUnsupported),
      telegramNode('Answer Callback', [320, -160], {
        resource: 'callback',
        queryId: '={{ $("Telegram Trigger").item.json.callback_query.id }}',
        additionalFields: {
          text: '={{ $json.callback_answer_text }}',
        },
      }, {
        webhookId: 'abd248d7-be13-48d5-8e2a-a5ffb8a4bc7b',
      }),
      telegramNode('Edit Telegram Message', [576, -160], {
        operation: 'editMessageText',
        chatId: '={{ $("Telegram Trigger").item.json.callback_query.message.chat.id }}',
        messageId: '={{ $("Telegram Trigger").item.json.callback_query.message.message_id }}',
        text: '={{ $("Build Accepted Response").item.json.edited_message_text || $("Build Unsupported Response").item.json.edited_message_text || "Aggiornamento non disponibile." }}',
        replyMarkup: 'inlineKeyboard',
        inlineKeyboard: {
          rows: [],
        },
        additionalFields: {
          appendAttribution: false,
          disableWebPagePreview: true,
        },
      }, {
        webhookId: '68b12c2c-1683-4bce-9924-5c9aab2d129a',
      }),
    ],
    connections: buildConnections([
      { from: 'Telegram Trigger', to: 'Parse Callback Data', type: 'main', branch: 0 },
      { from: 'Parse Callback Data', to: 'Check Supported Callback', type: 'main', branch: 0 },
      { from: 'Check Supported Callback', to: 'If Restaurant Booking', type: 'main', branch: 0 },
      { from: 'Check Supported Callback', to: 'Build Unsupported Response', type: 'main', branch: 1 },
      { from: 'If Restaurant Booking', to: 'Confirm Restaurant Booking', type: 'main', branch: 0 },
      { from: 'If Restaurant Booking', to: 'If Hotel Booking', type: 'main', branch: 1 },
      { from: 'Confirm Restaurant Booking', to: 'Build Accepted Response', type: 'main', branch: 0 },
      { from: 'If Hotel Booking', to: 'Confirm Hotel Booking', type: 'main', branch: 0 },
      { from: 'If Hotel Booking', to: 'If Appointment', type: 'main', branch: 1 },
      { from: 'Confirm Hotel Booking', to: 'Build Accepted Response', type: 'main', branch: 0 },
      { from: 'If Appointment', to: 'Confirm Appointment', type: 'main', branch: 0 },
      { from: 'If Appointment', to: 'Build Unsupported Response', type: 'main', branch: 1 },
      { from: 'Confirm Appointment', to: 'Build Accepted Response', type: 'main', branch: 0 },
      { from: 'Build Accepted Response', to: 'Answer Callback', type: 'main', branch: 0 },
      { from: 'Build Unsupported Response', to: 'Answer Callback', type: 'main', branch: 0 },
      { from: 'Answer Callback', to: 'Edit Telegram Message', type: 'main', branch: 0 },
    ]),
    active: true,
    settings: {
      executionOrder: 'v1',
      binaryMode: 'separate',
      availableInMCP: false,
    },
    versionId: crypto.randomUUID(),
    meta: {
      templateCredsSetupCompleted: true,
      instanceId: 'e5e4156406eb2781358eadbaabf7ac25423788a2a1b74d65514ae4da6dc2f496',
    },
    id: 'ZirelTelegramCallbackHandler',
    tags: [],
    pinData: {},
  };

  return workflow;
}

fs.writeFileSync(`${root}/Zirèl - Notifiche Dispatcher.json`, `${JSON.stringify(buildDispatcherWorkflow(), null, 2)}\n`);
fs.writeFileSync(`${root}/Zirèl - Telegram Callback Handler.json`, `${JSON.stringify(buildCallbackWorkflow(), null, 2)}\n`);

console.log('Workflow notifiche unificati generati.');
