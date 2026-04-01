import fs from 'fs';
import path from 'path';

const inputPath = '/Users/bronovito/Desktop/Zirèl - Notifiche Dispatcher.json';
const outputPath = path.resolve('n8n_workflows/Zirèl - Notifiche Dispatcher.fixed.json');

const workflow = JSON.parse(fs.readFileSync(inputPath, 'utf8'));

const findNode = (name) => {
  const node = workflow.nodes.find((item) => item.name === name);
  if (!node) {
    throw new Error(`Node not found: ${name}`);
  }
  return node;
};

const emailNode = findNode('Render Email Payload');
emailNode.parameters.jsCode = emailNode.parameters.jsCode.replace(
`} else if (template === 'hotel_reception_request_internal') {
  subject = \`Nuova richiesta reception • \${activity}\`;
  text = \`Nuova richiesta reception

Struttura: \${activity}
Camera: \${payload.room || 'N/D'}
Area: \${payload.area || 'N/D'}
Ospite: \${payload.guest_name || 'N/D'}
Telefono: \${payload.telefono || 'N/D'}
Tipo richiesta: \${payload.request_type || 'generic_request'}
Quando: \${payload.requested_time || 'Appena possibile'}
Richiesta: \${payload.request_text || 'N/D'}
Origine: \${payload.source || 'chat_widget'}
Trace: \${payload.trace_id || 'N/D'}\`;

  html = renderShell(
    'Nuova richiesta reception',
    \`È arrivata una nuova richiesta operativa per <strong>\${activity}</strong>.\`,
    [
      { label: 'Camera', value: payload.room || 'N/D' },
      { label: 'Area', value: payload.area || 'N/D' },
      { label: 'Ospite', value: payload.guest_name || 'N/D' },
      { label: 'Telefono', value: payload.telefono || 'N/D' },
      { label: 'Tipo richiesta', value: payload.request_type || 'generic_request' },
      { label: 'Quando', value: payload.requested_time || 'Appena possibile' },
      { label: 'Richiesta', value: payload.request_text || 'N/D' },
      { label: 'Origine', value: payload.source || 'chat_widget' },
      { label: 'Trace', value: payload.trace_id || 'N/D' },
    ],
    'La richiesta è stata inoltrata automaticamente alla reception. Gestiscila appena possibile.'
  );`,
`} else if (template === 'hotel_reception_request_internal') {
  const requestTypeLabelMap = {
    housekeeping: 'Housekeeping',
    maintenance: 'Manutenzione',
    amenities: 'Amenities',
    taxi_booking: 'Taxi',
    wakeup_call: 'Sveglia',
    reception_callback: 'Richiamo reception',
    generic_request: 'Richiesta generica',
  };

  const roomValue = String(payload.room || '').trim();
  const isRoomRequest = !!roomValue || String(payload.source || '').trim() === 'qr_room';
  const roomLabel = roomValue ? \`Camera \${roomValue}\` : 'Camera non specificata';
  const typeLabel = requestTypeLabelMap[payload.request_type] || payload.request_type || 'Richiesta generica';
  const requestText = payload.request_text || 'N/D';

  if (isRoomRequest) {
    subject = \`\${roomLabel} • Nuova richiesta reception\`;
    text = \`Nuova richiesta reception

\${roomLabel}
Tipo: \${typeLabel}

RICHIESTA
\${requestText}

Dettagli
- Ospite: \${payload.guest_name || 'N/D'}
- Telefono: \${payload.telefono || 'N/D'}
- Quando: \${payload.requested_time || 'Appena possibile'}
- Area: \${payload.area || 'N/D'}
- Origine: \${payload.source || 'chat_widget'}
- Trace: \${payload.trace_id || 'N/D'}\`;

    html = \`
  <div style="font-family:Helvetica,Arial,sans-serif;background:#f8fafc;padding:24px;color:#0f172a;">
    <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden;">
      <div style="padding:24px 28px;background:linear-gradient(135deg,#0f3b52 0%,#ff8c42 100%);color:#ffffff;">
        <p style="margin:0 0 8px;font-size:12px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.82;">Zirèl Notification Center</p>
        <h1 style="margin:0;font-size:28px;line-height:1.15;">Nuova richiesta reception</h1>
        <p style="margin:12px 0 0;font-size:18px;line-height:1.4;font-weight:700;">\${roomLabel}\${typeLabel ? \` • \${typeLabel}\` : ''}</p>
      </div>
      <div style="padding:28px;">
        <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#475569;">È arrivata una nuova richiesta operativa per <strong>\${activity}</strong>.</p>

        <div style="margin:0 0 24px;padding:20px 22px;border-radius:18px;background:#fff7ed;border:1px solid #fdba74;">
          <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#9a3412;">Richiesta</p>
          <p style="margin:0;font-size:24px;line-height:1.35;font-weight:700;color:#0f172a;">\${requestText}</p>
        </div>

        <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:16px;overflow:hidden;background:#fff;">
          <tr><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;width:38%;font-weight:600;color:#0f172a;">Camera</td><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;color:#334155;">\${roomValue || 'N/D'}</td></tr>
          <tr><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#0f172a;">Ospite</td><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;color:#334155;">\${payload.guest_name || 'N/D'}</td></tr>
          <tr><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#0f172a;">Telefono</td><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;color:#334155;">\${payload.telefono || 'N/D'}</td></tr>
          <tr><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#0f172a;">Quando</td><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;color:#334155;">\${payload.requested_time || 'Appena possibile'}</td></tr>
          <tr><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#0f172a;">Area</td><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;color:#334155;">\${payload.area || 'N/D'}</td></tr>
          <tr><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#0f172a;">Origine</td><td style="padding:12px 14px;border-bottom:1px solid #e5e7eb;color:#334155;">\${payload.source || 'chat_widget'}</td></tr>
          <tr><td style="padding:12px 14px;font-weight:600;color:#0f172a;">Trace</td><td style="padding:12px 14px;color:#64748b;font-size:13px;">\${payload.trace_id || 'N/D'}</td></tr>
        </table>

        <p style="margin:18px 0 0;font-size:15px;line-height:1.7;color:#334155;">Gestisci la richiesta appena possibile.</p>
      </div>
    </div>
  </div>\`;
  } else {
    subject = \`Nuova richiesta reception • \${activity}\`;
    text = \`Nuova richiesta reception

Struttura: \${activity}
Area: \${payload.area || 'N/D'}
Ospite: \${payload.guest_name || 'N/D'}
Telefono: \${payload.telefono || 'N/D'}
Tipo richiesta: \${typeLabel}
Quando: \${payload.requested_time || 'Appena possibile'}
Richiesta: \${requestText}
Origine: \${payload.source || 'chat_widget'}
Trace: \${payload.trace_id || 'N/D'}\`;

    html = renderShell(
      'Nuova richiesta reception',
      \`È arrivata una nuova richiesta operativa per <strong>\${activity}</strong>.\`,
      [
        { label: 'Area', value: payload.area || 'N/D' },
        { label: 'Ospite', value: payload.guest_name || 'N/D' },
        { label: 'Telefono', value: payload.telefono || 'N/D' },
        { label: 'Tipo richiesta', value: typeLabel },
        { label: 'Quando', value: payload.requested_time || 'Appena possibile' },
        { label: 'Richiesta', value: requestText },
        { label: 'Origine', value: payload.source || 'chat_widget' },
        { label: 'Trace', value: payload.trace_id || 'N/D' },
      ],
      'La richiesta è stata inoltrata automaticamente alla reception. Gestiscila appena possibile.'
    );
  }`
);

findNode('Render Telegram Payload').parameters.jsCode = `const payload = typeof $json.payload === 'string' ? JSON.parse($json.payload) : ($json.payload || {});
const template = String($json.template_key || '').trim();
const relatedType = String($json.related_entity_type || '').trim();
const relatedId = String($json.related_entity_id || '').trim();

const statusLabel = ({
  confirmed: 'Confermata',
  confermata: 'Confermata',
  manual_review: 'Verifica manuale',
  rejected: 'Non disponibile',
  rifiutata: 'Non disponibile',
  annullata: 'Non disponibile',
  pending: 'In lavorazione',
  change_proposed: 'Proposta inviata',
})[String(payload.booking_status || payload.status || payload.availability_status || '').trim().toLowerCase()] || 'In lavorazione';

const phoneRaw = String(payload.telefono || '').trim();
const emailRaw = String(payload.email || '').trim().toLowerCase();

const escapeTelegramText = (value) =>
  String(value || '').replace(/[&<>]/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
  }[char] || char));

let text = 'Nuova richiesta Zirèl';
let telegram_actions_disabled = false;

if (template === 'hotel_reception_request_internal') {
  telegram_actions_disabled = true;
  text = [
    'Nuova richiesta reception',
    '',
    'Struttura: ' + (payload.nome_struttura || 'Hotel'),
    'Camera: ' + (payload.room || 'N/D'),
    'Area: ' + (payload.area || 'N/D'),
    'Ospite: ' + (payload.guest_name || 'N/D'),
    'Telefono: ' + (phoneRaw || 'N/D'),
    'Tipo: ' + (payload.request_type || 'generic_request'),
    'Quando: ' + (payload.requested_time || 'Appena possibile'),
    'Richiesta: ' + (payload.request_text || 'N/D'),
    'Origine: ' + (payload.source || 'chat_widget'),
    'Trace: ' + (payload.trace_id || 'N/D'),
  ].join('\\n');
} else if (template === 'hotel_internal_alert') {
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
  ].join('\\n');
}

const callbackSuffix = relatedType && relatedId
  ? [relatedType, relatedId].join('|')
  : '';

return [{
  json: {
    ...$json,
    rendered_telegram_text: escapeTelegramText(text),
    telegram_actions_disabled,
    telegram_accept_callback_data: telegram_actions_disabled ? '' : (callbackSuffix ? \`accept|\${callbackSuffix}\` : ''),
    telegram_reject_callback_data: telegram_actions_disabled ? '' : (callbackSuffix ? \`reject|\${callbackSuffix}\` : ''),
  },
}];`;

const removeNodeByName = (name) => {
  workflow.nodes = workflow.nodes.filter((node) => node.name !== name);
  delete workflow.connections[name];
  for (const key of Object.keys(workflow.connections)) {
    const conn = workflow.connections[key];
    if (!conn?.main) continue;
    workflow.connections[key].main = conn.main.map((branch) =>
      branch.filter((edge) => edge.node !== name)
    );
  }
};

removeNodeByName('Send Telegram1');

workflow.nodes.push({
  parameters: {
    conditions: {
      options: {
        caseSensitive: true,
        leftValue: '',
        typeValidation: 'strict',
        version: 2,
      },
      conditions: [
        {
          id: 'telegram-actions-disabled-check',
          leftValue: '={{ !!$json.telegram_actions_disabled }}',
          rightValue: true,
          operator: {
            type: 'boolean',
            operation: 'true',
            singleValue: true,
          },
        },
      ],
      combinator: 'and',
    },
    options: {},
  },
  name: 'If Telegram Actions Disabled?1',
  type: 'n8n-nodes-base.if',
  typeVersion: 2.2,
  position: [-5280, 12672],
  id: '7b297f26-0d8b-4c4b-b61f-telegram-actions-if',
});

workflow.nodes.push({
  parameters: {
    chatId: '={{ $json.telegram_chat_id || $json.payload?.telegram_chat_id || $env.ZIREL_INTERNAL_TELEGRAM_CHAT_ID || "112661106" }}',
    text: '={{ $json.rendered_telegram_text }}',
    additionalFields: {
      appendAttribution: false,
      disableWebPagePreview: true,
      parseMode: 'HTML',
    },
  },
  name: 'Send Telegram No Actions1',
  type: 'n8n-nodes-base.telegram',
  typeVersion: 1.2,
  position: [-5056, 12576],
  id: '0c4e2c0c-4b86-4c61-9cbf-telegram-no-actions',
  webhookId: '7456a1d2-129e-4de4-b430-03ab679d931b',
  credentials: {
    telegramApi: {
      id: 'MHrNkPgbqU0Q6vyM',
      name: 'TG_Zirèl',
    },
  },
  onError: 'continueRegularOutput',
});

workflow.nodes.push({
  parameters: {
    chatId: '={{ $json.telegram_chat_id || $json.payload?.telegram_chat_id || $env.ZIREL_INTERNAL_TELEGRAM_CHAT_ID || "112661106" }}',
    text: '={{ $json.rendered_telegram_text }}',
    replyMarkup: 'inlineKeyboard',
    inlineKeyboard: {
      rows: [
        {
          row: {
            buttons: [
              {
                text: '✅ Accetta',
                additionalFields: {
                  callback_data: '={{ $json.telegram_accept_callback_data || "" }}',
                },
              },
              {
                text: '❌ Rifiuta',
                additionalFields: {
                  callback_data: '={{ $json.telegram_reject_callback_data || "" }}',
                },
              },
            ],
          },
        },
      ],
    },
    additionalFields: {
      appendAttribution: false,
      disableWebPagePreview: true,
      parseMode: 'HTML',
    },
  },
  name: 'Send Telegram With Actions1',
  type: 'n8n-nodes-base.telegram',
  typeVersion: 1.2,
  position: [-5056, 12768],
  id: '8cf9dfa7-4556-4faa-a70b-telegram-with-actions',
  webhookId: '7456a1d2-129e-4de4-b430-03ab679d931b',
  credentials: {
    telegramApi: {
      id: 'MHrNkPgbqU0Q6vyM',
      name: 'TG_Zirèl',
    },
  },
  onError: 'continueRegularOutput',
});

findNode('Prepare Telegram Sent Update1').parameters.jsCode = `const sources = $('If Telegram Channel?1').all();

return items
  .map((item, index) => {
    const src = sources[index]?.json || {};
    const id = src.id || item.json.id || '';
    if (!id) return null;

    return {
      json: {
        id,
        status: 'sent',
        sent_at: new Date().toISOString(),
        last_error: null
      }
    };
  })
  .filter(Boolean);`;

findNode('Prepare Telegram Retry Update1').parameters.jsCode = `const sources = $('If Telegram Channel?1').all();

return items
  .map((item, index) => {
    const src = sources[index]?.json || {};
    const id = src.id || item.json.id || '';
    if (!id) return null;

    const retry = Number(src.retry_count || 0) + 1;
    const max = Number(src.max_retries || 5);
    const failed = retry >= max;
    const backoffMin = Math.min(60, Math.pow(2, retry));

    return {
      json: {
        id,
        status: failed ? 'failed' : 'pending',
        retry_count: retry,
        next_retry_at: new Date(Date.now() + backoffMin * 60 * 1000).toISOString(),
        last_error: 'TELEGRAM_SEND_FAILED'
      }
    };
  })
  .filter(Boolean);`;

workflow.name = 'Zirèl - Notifiche Dispatcher (Fixed)';

workflow.connections['If Telegram Channel?1'] = {
  main: [[{ node: 'If Telegram Actions Disabled?1', type: 'main', index: 0 }]],
};

workflow.connections['If Telegram Actions Disabled?1'] = {
  main: [
    [{ node: 'Send Telegram No Actions1', type: 'main', index: 0 }],
    [{ node: 'Send Telegram With Actions1', type: 'main', index: 0 }],
  ],
};

workflow.connections['Send Telegram No Actions1'] = {
  main: [[{ node: 'If Telegram Sent?1', type: 'main', index: 0 }]],
};

workflow.connections['Send Telegram With Actions1'] = {
  main: [[{ node: 'If Telegram Sent?1', type: 'main', index: 0 }]],
};

fs.writeFileSync(outputPath, JSON.stringify(workflow, null, 2) + '\n');
console.log(outputPath);
