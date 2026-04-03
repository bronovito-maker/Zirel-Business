import fs from 'node:fs';
import crypto from 'node:crypto';
import { repoRoot, zirelWorkflowFiles } from './workflow-manifest.mjs';

const root = repoRoot;
const files = zirelWorkflowFiles;

const credentials = {
  supabase: {
    supabaseApi: {
      id: 'bEyN805IWleebXdC',
      name: 'Supabase account - Zirèl',
    },
  },
  telegram: {
    telegramApi: {
      id: 'MHrNkPgbqU0Q6vyM',
      name: 'TG_Zirèl',
    },
  },
  resend: {
    httpHeaderAuth: {
      id: 'o5v5J8779y7QCWIE',
      name: 'Header Auth account 2',
    },
  },
  postgres: {
    postgres: {
      id: 'y26w3cf5oDEAQXdB',
      name: 'Postgres account',
    },
  },
  gemini: {
    googlePalmApi: {
      id: 'UlhMJWQVjXFDMzf8',
      name: 'Google Gemini(PaLM) Api account',
    },
  },
};

const readWorkflow = (path) => {
  if (!fs.existsSync(path)) {
    return { nodes: [], connections: {}, pinData: {} };
  }
  return JSON.parse(fs.readFileSync(path, 'utf8'));
};

const writeWorkflow = (path, workflow) => {
  fs.mkdirSync(root + '/n8n_workflows', { recursive: true });
  fs.writeFileSync(path, `${JSON.stringify(workflow, null, 2)}\n`);
};

const nodeBase = (name, type, typeVersion, position, parameters, extras = {}) => ({
  parameters,
  type,
  typeVersion,
  position,
  id: extras.id || crypto.randomUUID(),
  name,
  ...Object.fromEntries(
    Object.entries(extras).filter(([key]) => key !== 'id')
  ),
});

const connect = (from, to, branch = 0, channel = 'main', index = 0) => ({
  from,
  to,
  branch,
  channel,
  index,
});

const buildConnections = (links) => {
  const connections = {};

  for (const link of links) {
    if (!connections[link.from]) {
      connections[link.from] = {};
    }
    if (!connections[link.from][link.channel]) {
      connections[link.from][link.channel] = [];
    }
    while (connections[link.from][link.channel].length <= link.branch) {
      connections[link.from][link.channel].push([]);
    }
    connections[link.from][link.channel][link.branch].push({
      node: link.to,
      type: link.channel,
      index: link.index,
    });
  }

  return connections;
};

const triggerNode = (name, inputs, position, extras = {}) =>
  nodeBase(
    name,
    'n8n-nodes-base.executeWorkflowTrigger',
    1.1,
    position,
    {
      workflowInputs: {
        values: inputs.map((input) => ({ name: input })),
      },
    },
    extras
  );

const codeNode = (name, jsCode, position, extras = {}) =>
  nodeBase(
    name,
    'n8n-nodes-base.code',
    2,
    position,
    {
      jsCode: jsCode
        .replace(/\\`/g, '`')
        .replace(/\\\$\{/g, '${'),
    },
    extras
  );

const ifNode = (name, leftValue, operation, rightValue, position, extras = {}) =>
  nodeBase(
    name,
    'n8n-nodes-base.if',
    2.2,
    position,
    {
      conditions: {
        options: {
          caseSensitive: true,
          leftValue: '',
          typeValidation: 'strict',
          version: 2,
        },
        conditions: [
          {
            id: crypto.randomUUID(),
            leftValue,
            rightValue,
            operator: {
              type: typeof rightValue === 'number' ? 'number' : typeof rightValue === 'boolean' ? 'boolean' : 'string',
              operation,
              ...(typeof rightValue === 'boolean' ? { singleValue: true } : {}),
            },
          },
        ],
        combinator: 'and',
      },
      options: {},
    },
    extras
  );

const setNode = (name, assignments, position, extras = {}) =>
  nodeBase(
    name,
    'n8n-nodes-base.set',
    3.4,
    position,
    {
      assignments: {
        assignments: assignments.map((assignment) => ({
          id: assignment.id || crypto.randomUUID(),
          ...assignment,
        })),
      },
      options: {},
    },
    extras
  );

const supabaseNode = (name, parameters, position, extras = {}) =>
  nodeBase(name, 'n8n-nodes-base.supabase', 1, position, parameters, {
    credentials: credentials.supabase,
    ...extras,
  });

const httpNode = (name, parameters, position, extras = {}) =>
  nodeBase(name, 'n8n-nodes-base.httpRequest', 4.4, position, parameters, extras);

const telegramNode = (name, parameters, position, extras = {}) =>
  nodeBase(name, 'n8n-nodes-base.telegram', 1.2, position, parameters, {
    credentials: credentials.telegram,
    ...extras,
  });

const scheduleNode = (name, position, extras = {}) =>
  nodeBase(
    name,
    'n8n-nodes-base.scheduleTrigger',
    1.2,
    position,
    {
      rule: {
        interval: [
          {
            field: 'minutes',
            minutesInterval: 1,
          },
        ],
      },
    },
    extras
  );

const normalizeAppointmentCode = String.raw`const input = $json;

const normalizeSpaces = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const now = new Date();
const trace_id = normalizeSpaces(input.trace_id) || (globalThis.crypto?.randomUUID?.() || \`trace_\${Date.now()}\`);
const session_id = normalizeSpaces(input.session_id || input.conversation_id) || \`session_\${Date.now()}\`;
const source = normalizeSpaces(input.source || 'chat_widget') || 'chat_widget';

const normalizedBusinessType = normalizeSpaces(input.business_type).toLowerCase();
const normalizedAppointmentType = normalizeSpaces(input.appointment_type || 'standard_appointment').toLowerCase();
const nome = normalizeSpaces(input.nome)
  .split(' ')
  .filter(Boolean)
  .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
  .join(' ');
const telefono = normalizeSpaces(input.telefono).replace(/[^\d+\s]/g, '');
const email = normalizeSpaces(input.email).toLowerCase();
const motivo = normalizeSpaces(input.motivo);
const note = normalizeSpaces(input.note);
const tenant_id = normalizeSpaces(input.tenant_id);

const SUPPORTED_SECTORS = ['professional', 'medical', 'legal', 'hotel'];
const SUPPORTED_TYPES = ['standard_appointment', 'demo_request', 'intro_call', 'first_consultation', 'callback_request'];

function getRomeDay(offsetDays = 0) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const year = Number(parts.find((part) => part.type === 'year')?.value);
  const month = Number(parts.find((part) => part.type === 'month')?.value);
  const day = Number(parts.find((part) => part.type === 'day')?.value);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date;
}

function toIso(date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return \`\${y}-\${m}-\${d}\`;
}

function formatItalianLabel(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function getNextWeekday(weekday) {
  const base = getRomeDay(0);
  const current = base.getUTCDay();
  let diff = weekday - current;
  if (diff <= 0) diff += 7;
  base.setUTCDate(base.getUTCDate() + diff);
  return toIso(base);
}

function normalizeTime(inputTime) {
  const raw = normalizeSpaces(inputTime).toLowerCase();
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2})(?::|\.|,)?(\d{2})?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] || '00');
  if (hour > 23 || minute > 59) return null;
  return \`\${String(hour).padStart(2, '0')}:\${String(minute).padStart(2, '0')}\`;
}

function normalizeDate(dataInput) {
  const raw = normalizeSpaces(dataInput).toLowerCase();
  if (!raw) {
    return { iso: null, code: 'MISSING_REQUIRED_FIELDS', message: 'Data appuntamento mancante.' };
  }
  if (['oggi'].includes(raw)) return { iso: toIso(getRomeDay(0)) };
  if (['domani'].includes(raw)) return { iso: toIso(getRomeDay(1)) };

  const weekdayMap = {
    domenica: 0,
    lunedi: 1,
    'lunedì': 1,
    martedi: 2,
    'martedì': 2,
    mercoledi: 3,
    'mercoledì': 3,
    giovedi: 4,
    'giovedì': 4,
    venerdi: 5,
    'venerdì': 5,
    sabato: 6,
  };

  if (weekdayMap[raw] !== undefined) {
    return { iso: getNextWeekday(weekdayMap[raw]) };
  }

  const ddmmyyyy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    return {
      iso: \`\${ddmmyyyy[3]}-\${String(ddmmyyyy[2]).padStart(2, '0')}-\${String(ddmmyyyy[1]).padStart(2, '0')}\`,
    };
  }

  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { iso: raw };

  return {
    iso: null,
    code: 'NEED_EXACT_SLOT',
    message: 'Data o orario non abbastanza precisi.',
  };
}

const parsedDate = normalizeDate(input.data_input);
const normalizedTime = normalizeTime(input.orario);
const requiredEmail = normalizedAppointmentType === 'demo_request';
const hasRequiredFields = Boolean(
  tenant_id &&
  nome &&
  telefono &&
  motivo &&
  parsedDate.iso &&
  normalizedTime &&
  (!requiredEmail || email)
);

let validation_code = '';
let validation_message = '';

if (!SUPPORTED_SECTORS.includes(normalizedBusinessType)) {
  validation_code = 'UNSUPPORTED_SECTOR';
  validation_message = 'Questo workflow gestisce solo appuntamenti per settori supportati diversi da restaurant.';
} else if (!SUPPORTED_TYPES.includes(normalizedAppointmentType)) {
  validation_code = 'UNSUPPORTED_APPOINTMENT_TYPE';
  validation_message = 'Tipo appuntamento non supportato.';
} else if (parsedDate.code) {
  validation_code = parsedDate.code;
  validation_message = parsedDate.message;
} else if (!normalizedTime) {
  validation_code = 'NEED_EXACT_SLOT';
  validation_message = 'Per registrare l’appuntamento serve un orario preciso.';
} else if (!hasRequiredFields) {
  validation_code = 'MISSING_REQUIRED_FIELDS';
  validation_message = 'Mancano uno o più campi obbligatori per registrare l’appuntamento.';
}

const data_appuntamento = parsedDate.iso;
const data_appuntamento_label = formatItalianLabel(data_appuntamento);

return [{
  json: {
    ...input,
    tenant_id,
    source,
    trace_id,
    session_id,
    conversation_id: session_id,
    business_type: normalizedBusinessType,
    appointment_type: normalizedAppointmentType,
    nome,
    telefono,
    email,
    motivo,
    note,
    orario: normalizedTime,
    data_appuntamento,
    data_appuntamento_label,
    requested_slot_iso: data_appuntamento && normalizedTime ? \`\${data_appuntamento}T\${normalizedTime}:00+01:00\` : null,
    is_supported_sector: SUPPORTED_SECTORS.includes(normalizedBusinessType),
    is_supported_type: SUPPORTED_TYPES.includes(normalizedAppointmentType),
    has_required_fields: hasRequiredFields,
    validation_code,
    validation_message,
    availability_status: validation_code ? 'validation_failed' : 'pending_check',
    business_status: validation_code ? 'rejected' : 'pending_check',
    retryable: false,
    final_reply: '',
    message: '',
    code: validation_code || '',
  },
}];`;

const buildAppointmentAvailabilityCode = String.raw`const input = $json;
const provider = String(
  input.appointment_calendar_provider ||
  input.calendar_provider ||
  ''
).trim().toLowerCase() || 'manual';
const provider_api_url = String(
  input.appointment_calendar_api_url ||
  input.calendar_api_url ||
  input.availability_api_url ||
  ''
).trim();
const test_mode = String(input.adapter_test_mode ?? '').trim().toLowerCase() === 'true';

return [{
  json: {
    ...input,
    provider,
    provider_api_url,
    adapter_test_mode: test_mode || !provider_api_url,
    availability_payload: {
      tenant_id: input.tenant_id,
      business_type: input.business_type,
      action: 'confirm_appointment',
      trace_id: input.trace_id,
      session_id: input.session_id,
      customer: {
        nome: input.nome,
        telefono: input.telefono,
        email: input.email || null,
      },
      slot: {
        date: input.data_appuntamento,
        time: input.orario,
        iso: input.requested_slot_iso,
        appointment_type: input.appointment_type,
        motivo: input.motivo,
        note: input.note || null,
      },
    },
  },
}];`;

const normalizeAppointmentAvailabilityCode = String.raw`const input = $json;
const fromHttp = input.body || input.data || null;
const adapter = input.adapter_test_mode
  ? {
      success: false,
      code: 'AVAILABILITY_ADAPTER_NOT_CONFIGURED',
      availability_status: 'manual_review',
      reference: null,
      retryable: true,
      provider: input.provider || 'manual',
    }
  : (fromHttp || input);

const success = Boolean(adapter.success);
const availability_status = String(adapter.availability_status || (success ? 'confirmed' : 'manual_review')).toLowerCase();
const business_status = success && ['available', 'reserved', 'confirmed'].includes(availability_status)
  ? 'confirmed'
  : (availability_status === 'unavailable' ? 'rejected' : 'manual_review');
const code = String(adapter.code || (success ? 'APPOINTMENT_SLOT_CONFIRMED' : 'APPOINTMENT_MANUAL_REVIEW'));
const retryable = Boolean(adapter.retryable ?? !success);
const reference = adapter.reference || adapter.booking_reference || adapter.slot_reference || null;

let final_reply = '';
let message = '';

if (business_status === 'confirmed') {
  message = 'Appuntamento registrato correttamente.';
  final_reply = \`Perfetto, ho registrato la tua richiesta per \${input.data_appuntamento_label} alle \${input.orario}. Il team ti contatterà a breve.\`;
} else if (business_status === 'rejected') {
  message = 'Slot non disponibile.';
  final_reply = \`Ho raccolto la richiesta, ma \${input.data_appuntamento_label} alle \${input.orario} non risulta disponibile. Possiamo cercare un altro orario.\`;
} else {
  message = 'Richiesta salvata per verifica manuale.';
  final_reply = \`Ho raccolto tutti i dati, ma non posso confermare subito la disponibilità per \${input.data_appuntamento_label} alle \${input.orario}. Il team verificherà e ti ricontatterà a breve.\`;
}

return [{
  json: {
    ...input,
    success: business_status === 'confirmed',
    code,
    message,
    final_reply,
    retryable,
    reference,
    availability_status,
    business_status,
    raw_provider_response: adapter,
  },
}];`;

const appointmentOutboxCode = String.raw`const input = $('Normalize Availability Response1').item.json;
const record = $('Create a row1').item.json;
const basePayload = {
  trace_id: input.trace_id,
  session_id: input.session_id,
  tenant_id: input.tenant_id,
  business_type: input.business_type,
  appointment_type: input.appointment_type,
  appointment_id: record.id || null,
  nome: input.nome,
  telefono: input.telefono,
  email: input.email || null,
  motivo: input.motivo,
  note: input.note || '',
  data_appuntamento: input.data_appuntamento,
  data_appuntamento_label: input.data_appuntamento_label,
  orario: input.orario,
  status: input.business_status,
  provider_reference: input.reference || null,
  internal_email: input.notification_email || input.internal_notification_email || input.internal_email || input.billing_email || null,
  telegram_chat_id: input.telegram_chat_id || input.internal_telegram_chat_id || null,
};

const internalEmail = String(
  input.notification_email ||
  input.internal_notification_email ||
  input.internal_email ||
  input.billing_email ||
  ''
).trim().toLowerCase();

const rows = [{
  json: {
    tenant_id: input.tenant_id,
    channel: 'telegram_internal_appointment',
      template_key: 'appointment_internal_alert',
      related_entity_type: 'appointment',
      related_entity_id: record.id || null,
      status: 'pending',
      retry_count: 0,
      max_retries: 5,
      next_retry_at: new Date().toISOString(),
      trace_id: input.trace_id,
      dedupe_key: input.tenant_id + ':telegram_internal_appointment:' + (record.id || input.trace_id),
      payload: basePayload,
    },
  }];

if (input.email) {
  rows.push({
    json: {
      tenant_id: input.tenant_id,
      channel: 'email_guest_appointment',
      template_key: 'appointment_guest_confirmation',
      related_entity_type: 'appointment',
      related_entity_id: record.id || null,
      status: 'pending',
      retry_count: 0,
      max_retries: 5,
      next_retry_at: new Date().toISOString(),
      trace_id: input.trace_id,
      dedupe_key: input.tenant_id + ':email_guest_appointment:' + (record.id || input.trace_id),
      payload: basePayload,
    },
  });
}

if (internalEmail) {
  rows.push({
    json: {
      tenant_id: input.tenant_id,
      channel: 'email_internal_appointment',
      template_key: 'appointment_internal_alert',
      related_entity_type: 'appointment',
      related_entity_id: record.id || null,
      status: 'pending',
      retry_count: 0,
      max_retries: 5,
      next_retry_at: new Date().toISOString(),
      trace_id: input.trace_id,
      dedupe_key: input.tenant_id + ':email_internal_appointment:' + (record.id || input.trace_id),
      recipient_email: internalEmail,
      payload: basePayload,
    },
  });
}

return rows;`;

const appointmentFinalCode = String.raw`const input = $('Normalize Availability Response1').item.json;
const record = $('Create a row1').item.json;
return [{
  json: {
    success: Boolean(input.success),
    code: input.code || 'APPOINTMENT_RESULT_UNKNOWN',
    message: input.message || 'Richiesta appuntamento processata.',
    final_reply: input.final_reply || 'Ho raccolto la tua richiesta.',
    tenant_id: input.tenant_id,
    trace_id: input.trace_id,
    session_id: input.session_id,
    lead_id: record.id || null,
    appointment_id: record.id || null,
    appointment_type: input.appointment_type,
    business_type: input.business_type,
    data_appuntamento: input.data_appuntamento,
    data_appuntamento_label: input.data_appuntamento_label,
    orario: input.orario,
    nome: input.nome,
    telefono: input.telefono,
    email: input.email || '',
    note: input.note || '',
    motivo: input.motivo || '',
    booking_summary: \`\${input.appointment_type || 'appointment'} da \${input.nome} per \${input.data_appuntamento_label} alle \${input.orario}.\`,
    availability_status: input.availability_status,
    business_status: input.business_status,
    reference: input.reference || null,
    retryable: Boolean(input.retryable),
  },
}];`;

const normalizeRestaurantCode = String.raw`const input = $json;

const normalizeSpaces = (value) => String(value || '').replace(/\s+/g, ' ').trim();
const tenant_id = normalizeSpaces(input.tenant_id);
const trace_id = normalizeSpaces(input.trace_id) || (globalThis.crypto?.randomUUID?.() || \`trace_\${Date.now()}\`);
const session_id = normalizeSpaces(input.session_id || input.conversation_id) || \`session_\${Date.now()}\`;
const source = normalizeSpaces(input.source || 'chat_widget') || 'chat_widget';
const business_type = normalizeSpaces(input.business_type).toLowerCase();
const nome_cliente = normalizeSpaces(input.nome_cliente)
  .split(' ')
  .filter(Boolean)
  .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
  .join(' ');
const telefono = normalizeSpaces(input.telefono).replace(/[^\d+\s]/g, '');
const note_prenotazione = normalizeSpaces(input.note_prenotazione);

function todayRome() {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Rome',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  return new Date(Date.UTC(
    Number(parts.find((part) => part.type === 'year')?.value),
    Number(parts.find((part) => part.type === 'month')?.value) - 1,
    Number(parts.find((part) => part.type === 'day')?.value)
  ));
}

function toIso(date) {
  return \`\${date.getUTCFullYear()}-\${String(date.getUTCMonth() + 1).padStart(2, '0')}-\${String(date.getUTCDate()).padStart(2, '0')}\`;
}

function nextWeekday(index) {
  const base = todayRome();
  let diff = index - base.getUTCDay();
  if (diff <= 0) diff += 7;
  base.setUTCDate(base.getUTCDate() + diff);
  return toIso(base);
}

function normalizeDate(rawValue) {
  const raw = normalizeSpaces(rawValue).toLowerCase();
  if (!raw) return { iso: null, code: 'MISSING_REQUIRED_FIELDS', message: 'Data prenotazione mancante.' };
  if (raw === 'oggi') return { iso: toIso(todayRome()) };
  if (raw === 'domani') {
    const date = todayRome();
    date.setUTCDate(date.getUTCDate() + 1);
    return { iso: toIso(date) };
  }
  const weekdayMap = {
    domenica: 0,
    lunedi: 1,
    'lunedì': 1,
    martedi: 2,
    'martedì': 2,
    mercoledi: 3,
    'mercoledì': 3,
    giovedi: 4,
    'giovedì': 4,
    venerdi: 5,
    'venerdì': 5,
    sabato: 6,
  };
  if (weekdayMap[raw] !== undefined) return { iso: nextWeekday(weekdayMap[raw]) };
  const ddmmyyyy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    return {
      iso: \`\${ddmmyyyy[3]}-\${String(ddmmyyyy[2]).padStart(2, '0')}-\${String(ddmmyyyy[1]).padStart(2, '0')}\`,
    };
  }
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return { iso: raw };
  return { iso: null, code: 'NEED_EXACT_SLOT', message: 'Data prenotazione non abbastanza precisa.' };
}

function normalizeTime(rawValue) {
  const raw = normalizeSpaces(rawValue).toLowerCase();
  if (!raw) return null;
  const match = raw.match(/^(\d{1,2})(?::|\.|,)?(\d{2})?$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2] || '00');
  if (hour > 23 || minute > 59) return null;
  return \`\${String(hour).padStart(2, '0')}:\${String(minute).padStart(2, '0')}\`;
}

function formatLabel(isoDate) {
  if (!isoDate) return '';
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Intl.DateTimeFormat('it-IT', {
    timeZone: 'Europe/Rome',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

const parsedDate = normalizeDate(input.data_input);
const ora = normalizeTime(input.ora);
const persone = Number(String(input.persone || '').trim());

let validation_code = '';
let validation_message = '';
if (business_type !== 'restaurant') {
  validation_code = 'UNSUPPORTED_SECTOR';
  validation_message = 'Questo workflow funziona solo per tenant restaurant.';
} else if (!tenant_id || !nome_cliente || !telefono || !parsedDate.iso || !ora || Number.isNaN(persone) || persone <= 0) {
  validation_code = parsedDate.code || (!ora ? 'NEED_EXACT_SLOT' : 'MISSING_REQUIRED_FIELDS');
  validation_message = parsedDate.message || (!ora ? 'Per registrare la prenotazione serve un orario preciso.' : 'Mancano uno o più campi obbligatori.');
} else if (persone >= 10) {
  validation_code = 'GROUP_REQUIRES_MANUAL_HANDLING';
  validation_message = 'Gruppo numeroso da gestire manualmente.';
}

const data_prenotazione = parsedDate.iso;
const data_prenotazione_label = formatLabel(data_prenotazione);

return [{
  json: {
    ...input,
    tenant_id,
    trace_id,
    session_id,
    conversation_id: session_id,
    source,
    business_type,
    nome_cliente,
    telefono,
    note_prenotazione,
    data_prenotazione,
    data_prenotazione_label,
    ora,
    persone: Number.isNaN(persone) ? null : persone,
    requested_slot_iso: data_prenotazione && ora ? \`\${data_prenotazione}T\${ora}:00+01:00\` : null,
    validation_code,
    validation_message,
    availability_status: validation_code ? 'validation_failed' : 'pending_check',
    business_status: validation_code === 'GROUP_REQUIRES_MANUAL_HANDLING' ? 'manual_review' : (validation_code ? 'rejected' : 'pending_check'),
    retryable: false,
  },
}];`;

const buildRestaurantAvailabilityCode = String.raw`const input = $json;
const provider = String(
  input.restaurant_booking_provider ||
  input.booking_provider ||
  ''
).trim().toLowerCase() || 'manual';
const provider_api_url = String(
  input.restaurant_booking_api_url ||
  input.restaurant_calendar_api_url ||
  input.availability_api_url ||
  ''
).trim();
const test_mode = String(input.adapter_test_mode ?? '').trim().toLowerCase() === 'true';

return [{
  json: {
    ...input,
    provider,
    provider_api_url,
    adapter_test_mode: test_mode || !provider_api_url,
    availability_payload: {
      tenant_id: input.tenant_id,
      business_type: input.business_type,
      action: 'confirm_booking',
      trace_id: input.trace_id,
      session_id: input.session_id,
      customer: {
        nome_cliente: input.nome_cliente,
        telefono: input.telefono,
      },
      reservation: {
        date: input.data_prenotazione,
        time: input.ora,
        iso: input.requested_slot_iso,
        persone: input.persone,
        note_prenotazione: input.note_prenotazione || null,
      },
    },
  },
}];`;

const normalizeRestaurantAvailabilityCode = String.raw`const input = $json;
const fromHttp = input.body || input.data || null;
const adapter = input.adapter_test_mode
  ? {
      success: false,
      code: input.validation_code === 'GROUP_REQUIRES_MANUAL_HANDLING' ? 'GROUP_REQUIRES_MANUAL_HANDLING' : 'AVAILABILITY_ADAPTER_NOT_CONFIGURED',
      availability_status: input.validation_code === 'GROUP_REQUIRES_MANUAL_HANDLING' ? 'manual_review' : 'manual_review',
      reference: null,
      retryable: true,
    }
  : (fromHttp || input);

let availability_status = String(adapter.availability_status || '').toLowerCase();
if (!availability_status) {
  availability_status = adapter.success ? 'confirmed' : (input.validation_code === 'GROUP_REQUIRES_MANUAL_HANDLING' ? 'manual_review' : 'manual_review');
}

const business_status = availability_status === 'confirmed'
  ? 'confirmed'
  : availability_status === 'unavailable'
    ? 'rejected'
    : 'manual_review';

let code = String(adapter.code || '');
if (!code) {
  code = business_status === 'confirmed'
    ? 'RESTAURANT_BOOKING_CONFIRMED'
    : business_status === 'rejected'
      ? 'RESTAURANT_SLOT_UNAVAILABLE'
      : 'RESTAURANT_BOOKING_MANUAL_REVIEW';
}

let message = '';
let final_reply = '';
if (business_status === 'confirmed') {
  message = 'Prenotazione registrata correttamente.';
  final_reply = \`Perfetto, ho registrato la prenotazione per \${input.nome_cliente} il \${input.data_prenotazione_label} alle \${input.ora} per \${input.persone} persone.\`;
} else if (business_status === 'rejected') {
  message = 'Slot non disponibile.';
  final_reply = \`Ho raccolto la richiesta, ma \${input.data_prenotazione_label} alle \${input.ora} non risulta disponibile. Possiamo cercare un altro orario.\`;
} else {
  message = 'Richiesta salvata per verifica manuale.';
  final_reply = input.validation_code === 'GROUP_REQUIRES_MANUAL_HANDLING'
    ? 'Ho raccolto la richiesta per il gruppo numeroso, ma serve una gestione manuale del locale. Ti ricontatteranno al più presto.'
    : \`Ho raccolto la richiesta, ma non posso confermare subito il tavolo per \${input.data_prenotazione_label} alle \${input.ora}. Il locale verificherà e ti ricontatterà a breve.\`;
}

return [{
  json: {
    ...input,
    success: business_status === 'confirmed',
    code,
    message,
    final_reply,
    reference: adapter.reference || adapter.booking_reference || null,
    availability_status,
    business_status,
    retryable: Boolean(adapter.retryable ?? business_status !== 'confirmed'),
    raw_provider_response: adapter,
  },
}];`;

const restaurantOutboxCode = String.raw`const input = $('Normalize Availability Response1').item.json;
const record = $('Create a row').item.json;
const basePayload = {
  trace_id: input.trace_id,
  session_id: input.session_id,
  tenant_id: input.tenant_id,
  business_type: input.business_type,
  reservation_id: record.id || null,
  nome_cliente: input.nome_cliente,
  telefono: input.telefono,
  data_prenotazione: input.data_prenotazione,
  data_prenotazione_label: input.data_prenotazione_label,
  ora: input.ora,
  persone: input.persone,
  note_prenotazione: input.note_prenotazione || '',
  status: input.business_status,
  reference: input.reference || null,
  nome_attivita: input.nome_attivita || null,
  internal_email: input.notification_email || input.internal_notification_email || input.internal_email || input.billing_email || null,
  telegram_chat_id: input.telegram_chat_id || input.internal_telegram_chat_id || null,
};

const rows = [
  {
    json: {
      tenant_id: input.tenant_id,
      channel: 'telegram_internal_restaurant',
      template_key: 'restaurant_internal_alert',
      related_entity_type: 'restaurant_booking',
      related_entity_id: record.id || null,
      status: 'pending',
      retry_count: 0,
      max_retries: 5,
      next_retry_at: new Date().toISOString(),
      trace_id: input.trace_id,
      dedupe_key: input.tenant_id + ':telegram_internal_restaurant:' + (record.id || input.trace_id),
      payload: basePayload,
    },
  },
  {
    json: {
      tenant_id: input.tenant_id,
      channel: 'email_guest_restaurant',
      template_key: 'restaurant_guest_confirmation',
      related_entity_type: 'restaurant_booking',
      related_entity_id: record.id || null,
      status: 'pending',
      retry_count: 0,
      max_retries: 5,
      next_retry_at: new Date().toISOString(),
      trace_id: input.trace_id,
      dedupe_key: input.tenant_id + ':email_guest_restaurant:' + (record.id || input.trace_id),
      payload: basePayload,
    },
  },
];

const internalEmail = String(
  input.notification_email ||
  input.internal_notification_email ||
  input.internal_email ||
  input.billing_email ||
  ''
).trim().toLowerCase();

if (internalEmail) {
  rows.push({
    json: {
      tenant_id: input.tenant_id,
      channel: 'email_internal_restaurant',
      template_key: 'restaurant_internal_alert',
      related_entity_type: 'restaurant_booking',
      related_entity_id: record.id || null,
      status: 'pending',
      retry_count: 0,
      max_retries: 5,
      next_retry_at: new Date().toISOString(),
      trace_id: input.trace_id,
      dedupe_key: input.tenant_id + ':email_internal_restaurant:' + (record.id || input.trace_id),
      recipient_email: internalEmail,
      payload: basePayload,
    },
  });
}

return rows;`;

const restaurantFinalCode = String.raw`const input = $('Normalize Availability Response1').item.json;
const record = $('Create a row').item.json;
return [{
  json: {
    success: Boolean(input.success),
    code: input.code || 'RESTAURANT_BOOKING_RESULT_UNKNOWN',
    message: input.message || 'Richiesta prenotazione processata.',
    final_reply: input.final_reply || 'Ho raccolto la richiesta di prenotazione.',
    tenant_id: input.tenant_id,
    trace_id: input.trace_id,
    session_id: input.session_id,
    reservation_id: record.id || null,
    nome_cliente: input.nome_cliente,
    telefono: input.telefono,
    data_prenotazione: input.data_prenotazione,
    data_prenotazione_label: input.data_prenotazione_label,
    ora: input.ora,
    persone: input.persone,
    note_prenotazione: input.note_prenotazione || '',
    booking_summary: \`Tavolo per \${input.persone} persone il \${input.data_prenotazione_label} alle \${input.ora} a nome \${input.nome_cliente}.\`,
    availability_status: input.availability_status,
    business_status: input.business_status,
    reference: input.reference || null,
    retryable: Boolean(input.retryable),
  },
}];`;

const normalizeHotelCode = String.raw`const value = $json;

const normalize = (v) => String(v || '').replace(/\s+/g, ' ').trim();
const normalizeDate = (input) => {
  const raw = normalize(input).toLowerCase();
  if (!raw) return null;
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return raw;
  const it = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (it) return \`\${it[3]}-\${String(it[2]).padStart(2, '0')}-\${String(it[1]).padStart(2, '0')}\`;
  return null;
};

const trace_id = normalize(value.trace_id) || (globalThis.crypto?.randomUUID?.() || \`trace_\${Date.now()}\`);
const session_id = normalize(value.session_id || value.conversation_id) || \`session_\${Date.now()}\`;
const source = normalize(value.source || 'chat_widget') || 'chat_widget';
const tenant_id = normalize(value.tenant_id) || 'hotel_rivamare_demo_001';
const business_type = 'hotel';
const booking_type = normalize(value.booking_type || 'standard_room_booking').toLowerCase();
const nome = normalize(value.nome);
const telefono = normalize(value.telefono).replace(/[^\d+\s]/g, '');
const email = normalize(value.email).toLowerCase();
const checkin_date = normalizeDate(value.checkin_input);
const checkout_date = normalizeDate(value.checkout_input);
const ospiti_adulti = Number(String(value.ospiti_adulti || '').trim());
const ospiti_bambini = Number(String(value.ospiti_bambini || '0').trim() || '0');
const room_type_requested = normalize(value.room_type_requested);
const servizi_richiesti = normalize(value.servizi_richiesti);
const note_prenotazione = normalize(value.note_prenotazione);
const lingua_cliente = normalize(value.lingua_cliente || 'it').toLowerCase();

let validation_code = '';
let validation_message = '';

if (!nome || !telefono || !email || !checkin_date || !checkout_date || Number.isNaN(ospiti_adulti) || ospiti_adulti <= 0) {
  validation_code = 'MISSING_REQUIRED_FIELDS';
  validation_message = 'Dati obbligatori mancanti o non validi.';
}

if (!validation_code) {
  const ci = new Date(\`\${checkin_date}T00:00:00Z\`);
  const co = new Date(\`\${checkout_date}T00:00:00Z\`);
  if (!(co > ci)) {
    validation_code = 'INVALID_STAY_RANGE';
    validation_message = 'Check-out deve essere successivo al check-in.';
  }
}

return [{
  json: {
    ...value,
    tenant_id,
    source,
    trace_id,
    session_id,
    conversation_id: session_id,
    business_type,
    booking_type,
    nome,
    telefono,
    email,
    checkin_date,
    checkout_date,
    ospiti_adulti,
    ospiti_bambini,
    room_type_requested,
    servizi_richiesti,
    note_prenotazione,
    lingua_cliente,
    validation_code,
    validation_message,
    is_valid_payload: !validation_code,
  },
}];`;

const buildHotelPayloadCode = String.raw`const input = $json;

const providerRaw = String(input.booking_manager_provider || input.pms_provider || '').trim().toLowerCase();
const hasExternalBookingLink = !!String(input.link_booking_esterno || '').trim();
const adapter_test_mode = String(input.adapter_test_mode ?? '').trim().toLowerCase() === 'true';

const endpointByProvider = {
  mews: String(input.hotel_middleware_mews_url || '').trim(),
  cloudbeds: String(input.hotel_middleware_cloudbeds_url || '').trim(),
  siteminder: String(input.hotel_middleware_siteminder_url || '').trim(),
  cinque_stelle: String(input.hotel_middleware_5stelle_url || '').trim(),
};

const provider = endpointByProvider[providerRaw] ? providerRaw : 'manual';
const provider_api_url = endpointByProvider[provider] || String(input.hotel_middleware_fallback_url || input.availability_api_url || '').trim();

const integration_mode = provider === 'manual'
  ? (hasExternalBookingLink ? 'manual_with_external_link' : 'manual_no_link')
  : 'booking_manager_live';

return [{
  json: {
    ...input,
    provider,
    integration_mode,
    provider_api_url,
    adapter_test_mode: adapter_test_mode || !provider_api_url,
    booking_payload: {
      tenant_id: input.tenant_id,
      business_type: input.business_type,
      action: 'confirm_booking',
      trace_id: input.trace_id,
      session_id: input.session_id,
      provider,
      booking_type: input.booking_type,
      guest: {
        nome: input.nome,
        telefono: input.telefono,
        email: input.email,
        lingua_cliente: input.lingua_cliente || 'it',
      },
      stay: {
        checkin_date: input.checkin_date,
        checkout_date: input.checkout_date,
        ospiti_adulti: Number(input.ospiti_adulti || 0),
        ospiti_bambini: Number(input.ospiti_bambini || 0),
        room_type_requested: input.room_type_requested || null,
        servizi_richiesti: input.servizi_richiesti || null,
        note_prenotazione: input.note_prenotazione || null,
      },
    },
  },
}];`;

const normalizeHotelAvailabilityCode = String.raw`const input = $json;

const fromHttp = input.body || input.data || null;
const adapter = input.adapter_test_mode
  ? {
      success: false,
      code: 'AVAILABILITY_ADAPTER_NOT_CONFIGURED',
      availability_status: 'manual_review',
      booking_status: 'manual_review',
      payment_required: false,
      payment_url: null,
      booking_reference: null,
      room_type: input.room_type_requested || 'camera standard',
      total_amount: null,
      currency: 'EUR',
      retryable: true,
      mode: 'fallback_test_mode',
    }
  : (fromHttp || input);

const success = Boolean(adapter.success);
const availability_status = String(adapter.availability_status || adapter.booking_status || (success ? 'confirmed' : 'manual_review')).toLowerCase();
const booking_status = String(adapter.booking_status || availability_status || (success ? 'confirmed' : 'manual_review')).toLowerCase();
const payment_required = Boolean(adapter.payment_required);
const booking_reference = adapter.booking_reference || null;
const payment_url = adapter.payment_url || null;
const total_amount = adapter.total_amount ?? null;
const currency = adapter.currency || 'EUR';
const room_type_assigned = adapter.room_type || input.room_type_requested || 'camera standard';
const business_status = booking_status === 'confirmed'
  ? 'confirmed'
  : booking_status === 'unavailable'
    ? 'rejected'
    : 'manual_review';

let code = String(adapter.code || '');
if (!code) {
  code = business_status === 'confirmed'
    ? 'HOTEL_BOOKING_CONFIRMED'
    : business_status === 'rejected'
      ? 'HOTEL_STAY_UNAVAILABLE'
      : 'HOTEL_BOOKING_MANUAL_REVIEW';
}

let final_reply = '';
let message = '';
if (business_status === 'confirmed' && payment_required && payment_url) {
  message = 'Disponibilità trovata: pagamento richiesto.';
  final_reply = \`Ho trovato disponibilità per \${room_type_assigned}. Per completare la prenotazione devi finalizzare il pagamento qui: \${payment_url}\`;
} else if (business_status === 'confirmed') {
  message = 'Richiesta soggiorno registrata correttamente.';
  final_reply = \`Prenotazione confermata con riferimento \${booking_reference || 'in elaborazione'}.\`;
} else if (business_status === 'rejected') {
  message = 'Soggiorno non disponibile per le date richieste.';
  final_reply = 'Ho raccolto la richiesta, ma al momento non risulta disponibilità per le date indicate. Possiamo verificare un’alternativa.';
} else {
  message = 'Richiesta soggiorno salvata per verifica manuale.';
  final_reply = 'Ho raccolto tutti i dati, ma non posso confermare subito la disponibilità. La struttura verificherà e ti ricontatterà a breve.';
}

return [{
  json: {
    ...input,
    success: business_status === 'confirmed',
    code,
    message,
    final_reply,
    retryable: Boolean(adapter.retryable ?? business_status !== 'confirmed'),
    adapter_success: success,
    availability_status,
    booking_status,
    business_status,
    payment_required,
    payment_url,
    booking_reference,
    total_amount,
    currency,
    room_type_assigned,
    adapter_raw: adapter,
  },
}];`;

const hotelOutboxCode = String.raw`const input = $('Normalize Adapter Response').item.json;
const record = $('Create Hotel Booking Row').item.json;
const payload = {
  trace_id: input.trace_id,
  session_id: input.session_id,
  tenant_id: input.tenant_id,
  nome_struttura: input.nome_attivita || 'Hotel',
  hotel_booking_id: record.id || null,
  booking_status: input.booking_status,
  availability_status: input.availability_status,
  booking_reference: input.booking_reference || null,
  payment_required: Boolean(input.payment_required),
  payment_url: input.payment_url || null,
  nome: input.nome,
  telefono: input.telefono,
  email: input.email,
  checkin_date: input.checkin_date,
  checkout_date: input.checkout_date,
  ospiti_adulti: input.ospiti_adulti,
  ospiti_bambini: input.ospiti_bambini,
  ospiti_totali: Number(input.ospiti_adulti || 0) + Number(input.ospiti_bambini || 0),
  room_type_requested: input.room_type_requested || null,
  room_type_assigned: input.room_type_assigned || null,
  servizi_richiesti: input.servizi_richiesti || null,
  note_prenotazione: input.note_prenotazione || null,
  internal_email: input.notification_email || input.internal_notification_email || input.internal_email || input.billing_email || null,
  telegram_chat_id: input.telegram_chat_id || input.internal_telegram_chat_id || null,
};

const internalEmail = String(
  input.notification_email ||
  input.internal_notification_email ||
  input.internal_email ||
  input.billing_email ||
  ''
).trim().toLowerCase();

const rows = [{
  json: {
    tenant_id: input.tenant_id,
    channel: 'telegram_internal_hotel',
      template_key: 'hotel_internal_alert',
      related_entity_type: 'hotel_booking',
      related_entity_id: record.id || null,
      status: 'pending',
      retry_count: 0,
      max_retries: 5,
      next_retry_at: new Date().toISOString(),
      trace_id: input.trace_id,
      dedupe_key: input.tenant_id + ':telegram_internal_hotel:' + (record.id || input.trace_id),
      payload,
    },
  }];

if (input.email) {
  rows.push({
    json: {
      tenant_id: input.tenant_id,
      channel: 'email_guest_hotel',
      template_key: 'hotel_guest_confirmation',
      related_entity_type: 'hotel_booking',
      related_entity_id: record.id || null,
      status: 'pending',
      retry_count: 0,
      max_retries: 5,
      next_retry_at: new Date().toISOString(),
      trace_id: input.trace_id,
      dedupe_key: input.tenant_id + ':email_guest_hotel:' + (record.id || input.trace_id),
      payload,
    },
  });
}

if (internalEmail) {
  rows.push({
    json: {
      tenant_id: input.tenant_id,
      channel: 'email_internal_hotel',
      template_key: 'hotel_internal_alert',
      related_entity_type: 'hotel_booking',
      related_entity_id: record.id || null,
      status: 'pending',
      retry_count: 0,
      max_retries: 5,
      next_retry_at: new Date().toISOString(),
      trace_id: input.trace_id,
      dedupe_key: input.tenant_id + ':email_internal_hotel:' + (record.id || input.trace_id),
      recipient_email: internalEmail,
      payload,
    },
  });
}

return rows;`;

const hotelFinalCode = String.raw`const i = $('Normalize Adapter Response').item.json;
const record = $('Create Hotel Booking Row').item.json;

return [{
  json: {
    success: Boolean(i.success),
    code: i.code || 'HOTEL_BOOKING_RESULT_UNKNOWN',
    message: i.message || 'Richiesta prenotazione hotel processata.',
    tenant_id: i.tenant_id,
    trace_id: i.trace_id,
    session_id: i.session_id,
    booking_id: record.id || null,
    booking_type: i.booking_type,
    booking_status: i.booking_status,
    availability_status: i.availability_status,
    business_status: i.business_status,
    booking_reference: i.booking_reference || null,
    nome_attivita: i.nome_attivita || null,
    checkin_date: i.checkin_date,
    checkout_date: i.checkout_date,
    room_type_assigned: i.room_type_assigned || null,
    payment_required: Boolean(i.payment_required),
    payment_url: i.payment_url || null,
    total_amount: i.total_amount || null,
    currency: i.currency || 'EUR',
    integration_mode: i.integration_mode,
    provider: i.provider,
    final_reply: i.final_reply || 'Richiesta soggiorno registrata.',
    retryable: Boolean(i.retryable),
  },
}];`;

const aiBuildPromptCode = String.raw`const tenant = $json;
const now = new Date();
const dateStr = now.toLocaleDateString('it-IT', { timeZone: 'Europe/Rome' });
const timeStr = now.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' });

const rawType = String(tenant.business_type || 'professional').toLowerCase().trim();
let businessType = 'professional';
if (['restaurant', 'ristorante', 'locale', 'chiringuito', 'pizzeria'].includes(rawType)) businessType = 'restaurant';
else if (['hotel', 'albergo', 'b&b', 'bnb', 'struttura'].includes(rawType)) businessType = 'hotel';
else if (['medical', 'medico', 'studio_medico', 'clinica'].includes(rawType)) businessType = 'medical';
else if (['legal', 'legale', 'avvocato', 'studio_legale'].includes(rawType)) businessType = 'legal';

const addField = (fields, label, value) => {
  if (value && String(value).trim() !== '') fields.push(\`- \${label}: \${value}\`);
};

const fields = [];
addField(fields, 'Nome Attività', tenant.nome_attivita);
addField(fields, 'Telefono', tenant.telefono);
addField(fields, 'Email', tenant.mail);
addField(fields, 'Indirizzo', tenant.indirizzo);
addField(fields, 'Orari Apertura', tenant.orari_apertura);
addField(fields, 'Check-in/out', tenant.orari_checkin_checkout);
addField(fields, 'Servizi Inclusi', tenant.servizi_inclusi);
addField(fields, 'Prezzi', tenant.prezzo_medio);
addField(fields, 'Link Booking', tenant.link_booking_esterno);
addField(fields, 'Link Prenotazione Tavoli', tenant.link_prenotazione_tavoli);
addField(fields, 'Info Utili', tenant.dati_testuali_brevi);

const final_system_prompt = [
  'Oggi è il giorno: ' + dateStr,
  'Ora attuale: ' + timeStr,
  'Fuso orario: Europe/Rome',
  '',
  '[IDENTITÀ]',
  tenant.prompt_base || 'Sei un assistente AI professionale, cordiale e affidabile.',
  '',
  '[REGOLE BULLETPROOF]',
  '1. Non inventare mai disponibilità, conferme, prezzi o stati di pagamento.',
  '2. Nessuna prenotazione o appuntamento è confermata prima del successo del tool corretto.',
  '3. Se un tool restituisce success:false o un codice di errore, usa il final_reply del tool oppure spiega che la richiesta è stata raccolta ma non confermata.',
  '4. Se l’utente corregge un dato, il valore più recente sostituisce sempre il precedente.',
  '5. Dopo una conferma finale già inviata, non ripetere automaticamente i dettagli nei messaggi sociali successivi.',
  '6. Se la richiesta è vaga su data/orario, chiedi una data precisa e un orario preciso.',
  '7. Non menzionare mai tenant_id, trace_id, session_id o dettagli tecnici all’utente.',
  '8. Rispondi in modo breve, naturale e focalizzato sul prossimo passo utile.',
  '',
  '[MACCHINA A STATI CONVERSAZIONALE]',
  '- Raccolta dati: chiedi solo il prossimo dato mancante.',
  '- Riepilogo: quando hai tutti i dati obbligatori, fai un solo riepilogo chiaro.',
  '- Conferma esplicita: prima di chiamare il tool devi ottenere un “sì / confermo / ok” esplicito.',
  '- Chiamata tool: usa il tool una sola volta con i dati più recenti.',
  '- Post-tool: se successo, usa la risposta del tool; se fallisce, non improvvisare.',
  '',
  '[SETTORE]',
  'Business type normalizzato: ' + businessType,
  '',
  '[REGOLE SETTORIALI]',
  businessType === 'restaurant' ? '- Per prenotazioni tavolo raccogli: nome_cliente, telefono, data_input, ora, persone, note_prenotazione opzionali.' : '',
  businessType === 'restaurant' ? '- Non confermare disponibilità tavoli senza il tool Registra_Prenotazione.' : '',
  businessType === 'restaurant' ? '- Gruppi numerosi devono andare in manual review o contatto diretto.' : '',
  businessType === 'hotel' ? '- Per soggiorni raccogli: nome, telefono, email, check-in, check-out, ospiti.' : '',
  businessType === 'hotel' ? '- Non confermare disponibilità camere senza il tool Registra_Prenotazione_Hotel.' : '',
  businessType === 'hotel' ? '- Se il tool restituisce payment_url, condividilo senza dire che la prenotazione è conclusa finché lo stato non è confirmed.' : '',
  ['professional', 'medical', 'legal', 'hotel'].includes(businessType) ? '- Per appuntamenti e demo raccogli: nome, telefono, email quando richiesta, data precisa, orario preciso, motivo.' : '',
  ['professional', 'medical', 'legal', 'hotel'].includes(businessType) ? '- Usa appointment_type = standard_appointment per richieste operative, sopralluoghi, interventi, consulenze standard o appuntamenti generici.' : '',
  ['professional', 'medical', 'legal', 'hotel'].includes(businessType) ? '- Usa appointment_type = demo_request solo per demo commerciali, presentazioni prodotto o richieste esplicite di demo.' : '',
  ['professional', 'medical', 'legal', 'hotel'].includes(businessType) ? '- Non confermare slot reali senza il tool Registra_Appuntamento.' : '',
  '',
  '[CONTESTO ATTIVITÀ]',
  fields.join('\n'),
  '',
  '[UTILIZZO TOOLS]',
  '- company_knowledge_base:',
  '  - Usalo per documenti lunghi, FAQ dettagliate, menu o listini.',
  '- Registra_Prenotazione:',
  '  - Solo per business_type restaurant.',
  '  - Richiede tenant_id, trace_id, session_id, nome_cliente, telefono, data_input, ora, persone.',
  '  - Prima del tool: riepilogo + conferma esplicita.',
  '  - Se il tool non conferma, non dichiarare mai prenotazione registrata.',
  '- Registra_Appuntamento:',
  '  - Solo per settori supportati diversi da restaurant.',
  '  - appointment_type supportati: standard_appointment, demo_request, intro_call, first_consultation, callback_request.',
  '  - Richiede tenant_id, trace_id, session_id, nome, telefono, data_input, orario, motivo.',
  '  - Per standard_appointment email non è obbligatoria.',
  '  - Per demo_request email è obbligatoria.',
  '  - Prima del tool: riepilogo + conferma esplicita.',
  '  - Se il tool ritorna manual_review o errore, usa il final_reply del tool.',
  '- Registra_Prenotazione_Hotel:',
  '  - Solo per business_type hotel.',
  '  - Richiede tenant_id, trace_id, session_id, nome, telefono, email, checkin_input, checkout_input, ospiti_adulti.',
  '  - Prima del tool: riepilogo + conferma esplicita.',
  '  - Se il tool ritorna manual_review, non dichiarare disponibilità o conferma.',
].filter(Boolean).join('\n');

return {
  normalized_business_type: businessType,
  final_system_prompt,
};`;

const notificationRenderEmailCode = String.raw`const payload = $json.payload || {};
const template = String($json.template_key || '').trim();
const channel = String($json.channel || '').trim();
const activity = payload.nome_struttura || payload.nome_attivita || 'Zirèl';
const recipientEmail = String(payload.email || '').trim().toLowerCase();

let subject = 'Richiesta ricevuta';
let text = '';
let html = '';

if (template === 'hotel_guest_confirmation' || channel === 'email_guest_hotel') {
  const adulti = Number(payload.ospiti_adulti ?? 0);
  const bambini = Number(payload.ospiti_bambini ?? 0);
  const tot = Number(payload.ospiti_totali ?? (adulti + bambini));
  subject = \`Richiesta soggiorno ricevuta - \${activity}\`;
  text = \`Ciao \${payload.nome || 'Cliente'},\\n\\nabbiamo ricevuto correttamente la tua richiesta di soggiorno presso \${activity}.\\n\\nRiepilogo richiesta:\\n- Check-in: \${payload.checkin_date || 'N/D'}\\n- Check-out: \${payload.checkout_date || 'N/D'}\\n- Ospiti: \${adulti} adulti / \${bambini} bambini (totale \${tot})\\n- Camera richiesta: \${payload.room_type_requested || 'Non specificata'}\\n- Stato: \${payload.booking_status || payload.status || 'in verifica'}\\n\\nTi contatteremo a breve con aggiornamenti.\\n\\nA presto,\\n\${activity}\`;
  html = \`<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#1f2937;max-width:680px;margin:0 auto;padding:16px;"><h2>Richiesta soggiorno ricevuta</h2><p>Ciao <strong>\${payload.nome || 'Cliente'}</strong>,</p><p>abbiamo ricevuto correttamente la tua richiesta presso <strong>\${activity}</strong>.</p><p><strong>Check-in:</strong> \${payload.checkin_date || 'N/D'}<br><strong>Check-out:</strong> \${payload.checkout_date || 'N/D'}<br><strong>Camera richiesta:</strong> \${payload.room_type_requested || 'Non specificata'}<br><strong>Stato:</strong> \${payload.booking_status || payload.status || 'in verifica'}</p><p>Ti contatteremo a breve con aggiornamenti.</p></div>\`;
} else if (template === 'restaurant_guest_confirmation' || channel === 'email_guest_restaurant') {
  subject = \`Richiesta tavolo ricevuta - \${activity}\`;
  text = \`Ciao \${payload.nome_cliente || 'Cliente'},\\n\\nabbiamo ricevuto la tua richiesta di prenotazione tavolo presso \${activity}.\\n\\nRiepilogo:\\n- Data: \${payload.data_prenotazione_label || payload.data_prenotazione || 'N/D'}\\n- Ora: \${payload.ora || 'N/D'}\\n- Persone: \${payload.persone || 'N/D'}\\n- Stato: \${payload.status || 'in verifica'}\\n\\nTi aggiorneremo al più presto.\\n\\nA presto,\\n\${activity}\`;
  html = \`<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#1f2937;max-width:680px;margin:0 auto;padding:16px;"><h2>Richiesta tavolo ricevuta</h2><p>Ciao <strong>\${payload.nome_cliente || 'Cliente'}</strong>,</p><p>abbiamo ricevuto la tua richiesta di prenotazione presso <strong>\${activity}</strong>.</p><p><strong>Data:</strong> \${payload.data_prenotazione_label || payload.data_prenotazione || 'N/D'}<br><strong>Ora:</strong> \${payload.ora || 'N/D'}<br><strong>Persone:</strong> \${payload.persone || 'N/D'}<br><strong>Stato:</strong> \${payload.status || 'in verifica'}</p><p>Ti aggiorneremo al più presto.</p></div>\`;
} else {
  subject = \`Richiesta ricevuta - \${activity}\`;
  text = \`Ciao \${payload.nome || 'Cliente'},\\n\\nabbiamo ricevuto correttamente la tua richiesta di appuntamento con \${activity}.\\n\\nRiepilogo:\\n- Data: \${payload.data_appuntamento_label || payload.data_appuntamento || 'N/D'}\\n- Ora: \${payload.orario || 'N/D'}\\n- Motivo: \${payload.motivo || 'N/D'}\\n- Stato: \${payload.status || 'in verifica'}\\n\\nTi contatteremo a breve.\\n\\nA presto,\\n\${activity}\`;
  html = \`<div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;color:#1f2937;max-width:680px;margin:0 auto;padding:16px;"><h2>Richiesta ricevuta</h2><p>Ciao <strong>\${payload.nome || 'Cliente'}</strong>,</p><p>abbiamo ricevuto correttamente la tua richiesta con <strong>\${activity}</strong>.</p><p><strong>Data:</strong> \${payload.data_appuntamento_label || payload.data_appuntamento || 'N/D'}<br><strong>Ora:</strong> \${payload.orario || 'N/D'}<br><strong>Motivo:</strong> \${payload.motivo || 'N/D'}<br><strong>Stato:</strong> \${payload.status || 'in verifica'}</p><p>Ti contatteremo a breve.</p></div>\`;
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

const notificationRenderTelegramCode = String.raw`const payload = $json.payload || {};
const template = String($json.template_key || '').trim();

let text = 'Nuova richiesta Zirèl';
if (template === 'hotel_internal_alert') {
  text = \`Nuova prenotazione hotel\\n\\nStruttura: \${payload.nome_struttura || 'Hotel'}\\nCliente: \${payload.nome || 'N/D'}\\nTelefono: \${payload.telefono || 'N/D'}\\nEmail: \${payload.email || 'N/D'}\\nSoggiorno: \${payload.checkin_date || 'N/D'} -> \${payload.checkout_date || 'N/D'}\\nStato: \${payload.booking_status || payload.availability_status || 'manual_review'}\\nRiferimento: \${payload.booking_reference || 'N/D'}\`;
} else if (template === 'restaurant_internal_alert') {
  text = \`Nuova prenotazione ristorante\\n\\nCliente: \${payload.nome_cliente || 'N/D'}\\nTelefono: \${payload.telefono || 'N/D'}\\nData: \${payload.data_prenotazione_label || payload.data_prenotazione || 'N/D'}\\nOra: \${payload.ora || 'N/D'}\\nPersone: \${payload.persone || 'N/D'}\\nStato: \${payload.status || 'manual_review'}\`;
} else {
  text = \`Nuovo appuntamento\\n\\nCliente: \${payload.nome || 'N/D'}\\nTelefono: \${payload.telefono || 'N/D'}\\nEmail: \${payload.email || 'N/D'}\\nData: \${payload.data_appuntamento_label || payload.data_appuntamento || 'N/D'}\\nOra: \${payload.orario || 'N/D'}\\nMotivo: \${payload.motivo || 'N/D'}\\nStato: \${payload.status || 'manual_review'}\`;
}

return [{
  json: {
    ...$json,
    rendered_telegram_text: text,
  },
}];`;

const buildAppointmentWorkflow = () => {
  const current = readWorkflow(files.appointment);
  const nodes = [
    triggerNode(
      'When Executed by Another Workflow',
      ['tenant_id', 'business_type', 'appointment_type', 'nome', 'telefono', 'email', 'data_input', 'orario', 'note', 'motivo', 'trace_id', 'session_id', 'source', 'appointment_calendar_provider', 'appointment_calendar_api_url', 'availability_api_url', 'adapter_test_mode', 'notification_email', 'internal_notification_email', 'internal_email', 'billing_email', 'telegram_chat_id', 'internal_telegram_chat_id'],
      [-3920, -1200],
      { id: current.nodes.find((node) => node.name === 'When Executed by Another Workflow')?.id }
    ),
    codeNode('Normalize Appointment Request1', normalizeAppointmentCode, [-3648, -1200]),
    ifNode('Check Supported Sector1', '={{ $json.validation_code === "UNSUPPORTED_SECTOR" }}', 'true', true, [-3376, -1344]),
    setNode(
      'Unsupported Sector Response1',
      [
        { name: 'success', value: false, type: 'boolean' },
        { name: 'code', value: 'UNSUPPORTED_SECTOR', type: 'string' },
        { name: 'message', value: 'Questo workflow gestisce solo appuntamenti per settori supportati diversi da restaurant.', type: 'string' },
        { name: 'final_reply', value: 'Posso raccogliere i dati, ma questa richiesta non può essere registrata da questo flusso.', type: 'string' },
      ],
      [-3104, -1424]
    ),
    ifNode('Check Required Fields1', '={{ !!$json.validation_code }}', 'true', true, [-3376, -1120]),
    setNode(
      'Validation Error Response1',
      [
        { name: 'success', value: false, type: 'boolean' },
        { name: 'code', value: '={{ $json.validation_code }}', type: 'string' },
        { name: 'message', value: '={{ $json.validation_message }}', type: 'string' },
        { name: 'final_reply', value: '={{ $json.validation_code === "NEED_EXACT_SLOT" ? "Per registrare davvero l’appuntamento mi serve una data precisa e un orario preciso." : "Per registrare l’appuntamento mi servono tutti i dati obbligatori, compreso il motivo della richiesta." }}', type: 'string' },
        { name: 'tenant_id', value: '={{ $json.tenant_id }}', type: 'string' },
        { name: 'trace_id', value: '={{ $json.trace_id }}', type: 'string' },
      ],
      [-3104, -992]
    ),
    codeNode('Build Availability Payload1', buildAppointmentAvailabilityCode, [-3104, -1200]),
    ifNode('Use Live Availability Adapter1', '={{ !!String($json.provider_api_url || "").trim() && !$json.adapter_test_mode }}', 'true', true, [-2832, -1200]),
    httpNode(
      'Availability Adapter1',
      {
        method: 'POST',
        url: '={{ $json.provider_api_url }}',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'X-TENANT-ID', value: '={{ $json.tenant_id }}' },
            { name: 'X-TRACE-ID', value: '={{ $json.trace_id }}' },
          ],
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ $json.availability_payload }}',
        options: { timeout: 15000 },
      },
      [-2576, -1296],
      { onError: 'continueRegularOutput' }
    ),
    codeNode('Normalize Availability Response1', normalizeAppointmentAvailabilityCode, [-2320, -1200]),
    supabaseNode(
      'Create a row1',
      {
        tableId: 'appointments',
        fieldsUi: {
          fieldValues: [
            { fieldId: 'tenant_id', fieldValue: '={{ $json.tenant_id }}' },
            { fieldId: 'business_type', fieldValue: '={{ $json.business_type }}' },
            { fieldId: 'appointment_type', fieldValue: '={{ $json.appointment_type }}' },
            { fieldId: 'nome', fieldValue: '={{ $json.nome }}' },
            { fieldId: 'telefono', fieldValue: '={{ $json.telefono }}' },
            { fieldId: 'email', fieldValue: '={{ $json.email || null }}' },
            { fieldId: 'data_appuntamento', fieldValue: '={{ $json.data_appuntamento }}' },
            { fieldId: 'orario', fieldValue: '={{ $json.orario }}' },
            { fieldId: 'note', fieldValue: '={{ ($json.note || "") + (($json.motivo || "").trim() ? (($json.note || "").trim() ? " | Motivo: " : "Motivo: ") + $json.motivo : "") || null }}' },
            { fieldId: 'stato', fieldValue: '={{ $json.business_status || "manual_review" }}' },
            { fieldId: 'source', fieldValue: '={{ $json.source || "chat_widget" }}' },
          ],
        },
      },
      [-2048, -1200],
      { id: current.nodes.find((node) => node.name === 'Create a row1')?.id }
    ),
    codeNode('Build Notification Outbox Rows1', appointmentOutboxCode, [-1776, -1296]),
    supabaseNode(
      'Insert Outbox Rows1',
      {
        tableId: 'notification_outbox',
        fieldsUi: {
          fieldValues: [
            { fieldId: 'tenant_id', fieldValue: '={{ $json.tenant_id }}' },
            { fieldId: 'channel', fieldValue: '={{ $json.channel }}' },
            { fieldId: 'template_key', fieldValue: '={{ $json.template_key }}' },
            { fieldId: 'related_entity_type', fieldValue: '={{ $json.related_entity_type }}' },
            { fieldId: 'related_entity_id', fieldValue: '={{ $json.related_entity_id || null }}' },
            { fieldId: 'status', fieldValue: '={{ $json.status }}' },
            { fieldId: 'retry_count', fieldValue: '={{ $json.retry_count }}' },
            { fieldId: 'max_retries', fieldValue: '={{ $json.max_retries }}' },
            { fieldId: 'next_retry_at', fieldValue: '={{ $json.next_retry_at }}' },
            { fieldId: 'trace_id', fieldValue: '={{ $json.trace_id }}' },
            { fieldId: 'booking_reference', fieldValue: '={{ $json.payload?.booking_reference || null }}' },
            { fieldId: 'nome_attivita', fieldValue: '={{ $json.payload?.nome_struttura || null }}' },
            { fieldId: 'dedupe_key', fieldValue: '={{ $json.dedupe_key }}' },
            { fieldId: 'payload', fieldValue: '={{ $json.payload }}' },
          ],
        },
      },
      [-1504, -1296]
    ),
    codeNode('Build Final Response1', appointmentFinalCode, [-1776, -1072]),
  ];

  const connections = buildConnections([
    connect('When Executed by Another Workflow', 'Normalize Appointment Request1'),
    connect('Normalize Appointment Request1', 'Check Supported Sector1'),
    connect('Check Supported Sector1', 'Unsupported Sector Response1', 0),
    connect('Check Supported Sector1', 'Check Required Fields1', 1),
    connect('Check Required Fields1', 'Validation Error Response1', 0),
    connect('Check Required Fields1', 'Build Availability Payload1', 1),
    connect('Build Availability Payload1', 'Use Live Availability Adapter1'),
    connect('Use Live Availability Adapter1', 'Availability Adapter1', 0),
    connect('Use Live Availability Adapter1', 'Normalize Availability Response1', 1),
    connect('Availability Adapter1', 'Normalize Availability Response1'),
    connect('Normalize Availability Response1', 'Create a row1'),
    connect('Create a row1', 'Build Notification Outbox Rows1'),
    connect('Create a row1', 'Build Final Response1'),
    connect('Build Notification Outbox Rows1', 'Insert Outbox Rows1'),
  ]);

  return {
    ...current,
    versionId: crypto.randomUUID(),
    nodes,
    connections,
    pinData: {},
  };
};

const buildRestaurantWorkflow = () => {
  const current = readWorkflow(files.restaurant);
  const nodes = [
    triggerNode(
      'When Executed by Another Workflow',
      ['tenant_id', 'nome_cliente', 'telefono', 'data_input', 'ora', 'persone', 'note_prenotazione', 'business_type', 'trace_id', 'session_id', 'source', 'restaurant_booking_provider', 'restaurant_booking_api_url', 'restaurant_calendar_api_url', 'availability_api_url', 'adapter_test_mode'],
      [-3584, -896],
      { id: current.nodes.find((node) => node.name === 'When Executed by Another Workflow')?.id }
    ),
    codeNode('Normalize Reservation Request1', normalizeRestaurantCode, [-3328, -896]),
    ifNode('Check Validation Error1', '={{ !!$json.validation_code && $json.validation_code !== "GROUP_REQUIRES_MANUAL_HANDLING" }}', 'true', true, [-3072, -1024]),
    setNode(
      'Validation Error Response1',
      [
        { name: 'success', value: false, type: 'boolean' },
        { name: 'code', value: '={{ $json.validation_code }}', type: 'string' },
        { name: 'message', value: '={{ $json.validation_message }}', type: 'string' },
        { name: 'final_reply', value: '={{ $json.validation_code === "UNSUPPORTED_SECTOR" ? "Al momento la prenotazione automatica non è disponibile per questo tipo di attività." : "Per registrare davvero la prenotazione mi servono tutti i dati obbligatori, con una data e un orario precisi." }}', type: 'string' },
        { name: 'tenant_id', value: '={{ $json.tenant_id }}', type: 'string' },
        { name: 'trace_id', value: '={{ $json.trace_id }}', type: 'string' },
      ],
      [-2816, -1040]
    ),
    codeNode('Build Availability Payload1', buildRestaurantAvailabilityCode, [-2816, -896]),
    ifNode('Use Live Availability Adapter1', '={{ !!String($json.provider_api_url || "").trim() && !$json.adapter_test_mode && $json.validation_code !== "GROUP_REQUIRES_MANUAL_HANDLING" }}', 'true', true, [-2560, -896]),
    httpNode(
      'Availability Adapter1',
      {
        method: 'POST',
        url: '={{ $json.provider_api_url }}',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'X-TENANT-ID', value: '={{ $json.tenant_id }}' },
            { name: 'X-TRACE-ID', value: '={{ $json.trace_id }}' },
          ],
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ $json.availability_payload }}',
        options: { timeout: 15000 },
      },
      [-2304, -992],
      { onError: 'continueRegularOutput' }
    ),
    codeNode('Normalize Availability Response1', normalizeRestaurantAvailabilityCode, [-2048, -896]),
    supabaseNode(
      'Create a row1',
      {
        tableId: 'prenotazioni',
        fieldsUi: {
          fieldValues: [
            { fieldId: 'nome_cliente', fieldValue: '={{ $json.nome_cliente }}' },
            { fieldId: 'tenant_id', fieldValue: '={{ $json.tenant_id }}' },
            { fieldId: 'telefono', fieldValue: '={{ $json.telefono }}' },
            { fieldId: 'data_prenotazione', fieldValue: '={{ $json.data_prenotazione }}' },
            { fieldId: 'ora', fieldValue: '={{ $json.ora }}' },
            { fieldId: 'persone', fieldValue: '={{ $json.persone }}' },
            { fieldId: 'stato', fieldValue: '={{ $json.business_status || "manual_review" }}' },
            { fieldId: 'note_prenotazione', fieldValue: '={{ $json.note_prenotazione || "" }}' },
          ],
        },
      },
      [-1792, -896],
      { id: current.nodes.find((node) => node.name === 'Create a row')?.id }
    ),
    codeNode('Build Notification Outbox Rows1', restaurantOutboxCode, [-1536, -992]),
    supabaseNode(
      'Insert Outbox Rows1',
      {
        tableId: 'notification_outbox',
        fieldsUi: {
          fieldValues: [
            { fieldId: 'tenant_id', fieldValue: '={{ $json.tenant_id }}' },
            { fieldId: 'channel', fieldValue: '={{ $json.channel }}' },
            { fieldId: 'template_key', fieldValue: '={{ $json.template_key }}' },
            { fieldId: 'related_entity_type', fieldValue: '={{ $json.related_entity_type }}' },
            { fieldId: 'related_entity_id', fieldValue: '={{ $json.related_entity_id || null }}' },
            { fieldId: 'status', fieldValue: '={{ $json.status }}' },
            { fieldId: 'retry_count', fieldValue: '={{ $json.retry_count }}' },
            { fieldId: 'max_retries', fieldValue: '={{ $json.max_retries }}' },
            { fieldId: 'next_retry_at', fieldValue: '={{ $json.next_retry_at }}' },
            { fieldId: 'trace_id', fieldValue: '={{ $json.trace_id }}' },
            { fieldId: 'booking_reference', fieldValue: '={{ $json.payload?.booking_reference || null }}' },
            { fieldId: 'nome_attivita', fieldValue: '={{ $json.payload?.nome_struttura || null }}' },
            { fieldId: 'dedupe_key', fieldValue: '={{ $json.dedupe_key }}' },
            { fieldId: 'payload', fieldValue: '={{ $json.payload }}' },
          ],
        },
      },
      [-1280, -992]
    ),
    codeNode('Build Final Response1', restaurantFinalCode, [-1536, -768]),
  ];

  nodes[8].name = 'Create a row';

  const connections = buildConnections([
    connect('When Executed by Another Workflow', 'Normalize Reservation Request1'),
    connect('Normalize Reservation Request1', 'Check Validation Error1'),
    connect('Check Validation Error1', 'Validation Error Response1', 0),
    connect('Check Validation Error1', 'Build Availability Payload1', 1),
    connect('Build Availability Payload1', 'Use Live Availability Adapter1'),
    connect('Use Live Availability Adapter1', 'Availability Adapter1', 0),
    connect('Use Live Availability Adapter1', 'Normalize Availability Response1', 1),
    connect('Availability Adapter1', 'Normalize Availability Response1'),
    connect('Normalize Availability Response1', 'Create a row'),
    connect('Create a row', 'Build Notification Outbox Rows1'),
    connect('Create a row', 'Build Final Response1'),
    connect('Build Notification Outbox Rows1', 'Insert Outbox Rows1'),
  ]);

  return {
    ...current,
    versionId: crypto.randomUUID(),
    nodes,
    connections,
    pinData: {},
  };
};

const buildHotelWorkflow = () => {
  const current = readWorkflow(files.hotel);
  const trigger = current.nodes.find((node) => node.name === 'When Executed by Another Workflow');
  const createHotelNodeId = current.nodes.find((node) => node.name === 'Create Hotel Booking Row')?.id;
  const nodes = [
    triggerNode(
      'When Executed by Another Workflow',
      ['tenant_id', 'business_type', 'booking_type', 'nome', 'telefono', 'email', 'checkin_input', 'checkout_input', 'ospiti_adulti', 'ospiti_bambini', 'room_type_requested', 'servizi_richiesti', 'note_prenotazione', 'lingua_cliente', 'nome_attivita', 'trace_id', 'session_id', 'source', 'booking_manager_provider', 'link_booking_esterno', 'hotel_middleware_mews_url', 'hotel_middleware_cloudbeds_url', 'hotel_middleware_siteminder_url', 'hotel_middleware_5stelle_url', 'hotel_middleware_fallback_url', 'availability_api_url', 'adapter_test_mode'],
      [-5568, -592],
      { id: trigger?.id }
    ),
    ifNode('Check Hotel Sector', '={{ String($json.business_type || "").trim().toLowerCase() === "hotel" || !String($json.business_type || "").trim() }}', 'true', true, [-5312, -592], { id: current.nodes.find((node) => node.name === 'Check Hotel Sector')?.id }),
    setNode(
      'Unsupported Sector Response',
      [
        { name: 'success', value: false, type: 'boolean' },
        { name: 'code', value: 'UNSUPPORTED_SECTOR', type: 'string' },
        { name: 'message', value: 'Questo workflow gestisce solo richieste hotel.', type: 'string' },
        { name: 'final_reply', value: 'Posso raccogliere i dati, ma questa richiesta non può essere registrata da questo flusso hotel.', type: 'string' },
      ],
      [-5056, -384],
      { id: current.nodes.find((node) => node.name === 'Unsupported Sector Response')?.id }
    ),
    codeNode('Normalize & Validate Booking Data', normalizeHotelCode, [-5056, -592], { id: current.nodes.find((node) => node.name === 'Normalize & Validate Booking Data')?.id }),
    ifNode('Check Valid Payload', '={{ !!$json.validation_code }}', 'true', true, [-4800, -592], { id: current.nodes.find((node) => node.name === 'Check Valid Payload')?.id }),
    setNode(
      'Invalid Payload Response',
      [
        { name: 'success', value: false, type: 'boolean' },
        { name: 'code', value: '={{ $json.validation_code }}', type: 'string' },
        { name: 'message', value: '={{ $json.validation_message }}', type: 'string' },
        { name: 'final_reply', value: 'Per registrare davvero il soggiorno mi servono tutti i dati obbligatori, con date di check-in e check-out valide.', type: 'string' },
        { name: 'tenant_id', value: '={{ $json.tenant_id }}', type: 'string' },
        { name: 'trace_id', value: '={{ $json.trace_id }}', type: 'string' },
      ],
      [-4544, -384],
      { id: current.nodes.find((node) => node.name === 'Invalid Payload Response')?.id }
    ),
    codeNode('Build Booking Manager Payload', buildHotelPayloadCode, [-4544, -592], { id: current.nodes.find((node) => node.name === 'Build Booking Manager Payload')?.id }),
    ifNode('Use Live Booking Adapter?', '={{ !!String($json.provider_api_url || "").trim() && !$json.adapter_test_mode }}', 'true', true, [-4288, -592], { id: current.nodes.find((node) => node.name === 'Use Live Booking Adapter?')?.id }),
    httpNode(
      'Booking Manager Adapter',
      {
        method: 'POST',
        url: '={{ $json.provider_api_url || "" }}',
        sendHeaders: true,
        headerParameters: {
          parameters: [
            { name: 'Content-Type', value: 'application/json' },
            { name: 'X-TENANT-ID', value: '={{ $json.tenant_id }}' },
            { name: 'X-TRACE-ID', value: '={{ $json.trace_id }}' },
          ],
        },
        sendBody: true,
        specifyBody: 'json',
        jsonBody: '={{ $json.booking_payload }}',
        options: { timeout: 15000 },
      },
      [-4032, -688],
      { id: current.nodes.find((node) => node.name === 'Booking Manager Adapter')?.id, onError: 'continueRegularOutput' }
    ),
    codeNode('Normalize Adapter Response', normalizeHotelAvailabilityCode, [-3776, -592], { id: current.nodes.find((node) => node.name === 'Normalize Adapter Response')?.id }),
    supabaseNode(
      'Create Hotel Booking Row',
      {
        tableId: 'hotel_bookings',
        fieldsUi: {
          fieldValues: [
            { fieldId: 'tenant_id', fieldValue: '={{ $json.tenant_id }}' },
            { fieldId: 'business_type', fieldValue: 'hotel' },
            { fieldId: 'booking_type', fieldValue: '={{ $json.booking_type }}' },
            { fieldId: 'nome_cliente', fieldValue: '={{ $json.nome }}' },
            { fieldId: 'telefono', fieldValue: '={{ $json.telefono }}' },
            { fieldId: 'email', fieldValue: '={{ $json.email }}' },
            { fieldId: 'checkin_date', fieldValue: '={{ $json.checkin_date }}' },
            { fieldId: 'checkout_date', fieldValue: '={{ $json.checkout_date }}' },
            { fieldId: 'ospiti_adulti', fieldValue: '={{ $json.ospiti_adulti }}' },
            { fieldId: 'ospiti_bambini', fieldValue: '={{ $json.ospiti_bambini }}' },
            { fieldId: 'room_type_requested', fieldValue: '={{ $json.room_type_requested || null }}' },
            { fieldId: 'room_type_assigned', fieldValue: '={{ $json.room_type_assigned || null }}' },
            { fieldId: 'servizi_richiesti', fieldValue: '={{ $json.servizi_richiesti || null }}' },
            { fieldId: 'note_prenotazione', fieldValue: '={{ $json.note_prenotazione || null }}' },
            { fieldId: 'booking_manager_provider', fieldValue: '={{ $json.provider || "manual" }}' },
            { fieldId: 'integration_mode', fieldValue: '={{ $json.integration_mode }}' },
            { fieldId: 'booking_reference', fieldValue: '={{ $json.booking_reference || null }}' },
            { fieldId: 'booking_status', fieldValue: '={{ $json.booking_status }}' },
            { fieldId: 'payment_required', fieldValue: '={{ $json.payment_required }}' },
            { fieldId: 'payment_url', fieldValue: '={{ $json.payment_url || null }}' },
            { fieldId: 'total_amount', fieldValue: '={{ $json.total_amount || null }}' },
            { fieldId: 'currency', fieldValue: '={{ $json.currency || "EUR" }}' },
            { fieldId: 'source', fieldValue: '={{ $json.source || "chat_widget" }}' },
            { fieldId: 'raw_adapter_response', fieldValue: '={{ JSON.stringify($json.adapter_raw || {}) }}' },
          ],
        },
      },
      [-3520, -592],
      { id: createHotelNodeId }
    ),
    codeNode('Build Notification Outbox Rows', hotelOutboxCode, [-3264, -688], { id: current.nodes.find((node) => node.name === 'Build Notification Outbox Rows')?.id }),
    supabaseNode(
      'Insert Outbox Rows',
      {
        tableId: 'notification_outbox',
        fieldsUi: {
          fieldValues: [
            { fieldId: 'tenant_id', fieldValue: '={{ $json.tenant_id }}' },
            { fieldId: 'channel', fieldValue: '={{ $json.channel }}' },
            { fieldId: 'template_key', fieldValue: '={{ $json.template_key }}' },
            { fieldId: 'related_entity_type', fieldValue: '={{ $json.related_entity_type }}' },
            { fieldId: 'related_entity_id', fieldValue: '={{ $json.related_entity_id || null }}' },
            { fieldId: 'status', fieldValue: '={{ $json.status }}' },
            { fieldId: 'retry_count', fieldValue: '={{ $json.retry_count }}' },
            { fieldId: 'max_retries', fieldValue: '={{ $json.max_retries }}' },
            { fieldId: 'next_retry_at', fieldValue: '={{ $json.next_retry_at }}' },
            { fieldId: 'trace_id', fieldValue: '={{ $json.trace_id }}' },
            { fieldId: 'booking_reference', fieldValue: '={{ $json.payload?.booking_reference || null }}' },
            { fieldId: 'nome_attivita', fieldValue: '={{ $json.payload?.nome_struttura || null }}' },
            { fieldId: 'dedupe_key', fieldValue: '={{ $json.dedupe_key }}' },
            { fieldId: 'payload', fieldValue: '={{ $json.payload }}' },
          ],
        },
      },
      [-3008, -688],
      { id: current.nodes.find((node) => node.name === 'Insert Outbox Rows')?.id }
    ),
    codeNode('Build Final Response', hotelFinalCode, [-3264, -464], { id: current.nodes.find((node) => node.name === 'Build Final Response')?.id }),
  ];

  const connections = buildConnections([
    connect('When Executed by Another Workflow', 'Check Hotel Sector'),
    connect('Check Hotel Sector', 'Normalize & Validate Booking Data', 0),
    connect('Check Hotel Sector', 'Unsupported Sector Response', 1),
    connect('Normalize & Validate Booking Data', 'Check Valid Payload'),
    connect('Check Valid Payload', 'Invalid Payload Response', 0),
    connect('Check Valid Payload', 'Build Booking Manager Payload', 1),
    connect('Build Booking Manager Payload', 'Use Live Booking Adapter?'),
    connect('Use Live Booking Adapter?', 'Booking Manager Adapter', 0),
    connect('Use Live Booking Adapter?', 'Normalize Adapter Response', 1),
    connect('Booking Manager Adapter', 'Normalize Adapter Response'),
    connect('Normalize Adapter Response', 'Create Hotel Booking Row'),
    connect('Create Hotel Booking Row', 'Build Notification Outbox Rows'),
    connect('Create Hotel Booking Row', 'Build Final Response'),
    connect('Build Notification Outbox Rows', 'Insert Outbox Rows'),
  ]);

  return {
    ...current,
    versionId: crypto.randomUUID(),
    nodes,
    connections,
    pinData: {},
  };
};

const buildNotificationsWorkflow = () => {
  const current = readWorkflow(files.notifications);
  const nodes = [
    scheduleNode('Schedule Trigger1', [-2400, -320], { id: current.nodes.find((node) => node.name === 'Schedule Trigger1')?.id }),
    supabaseNode(
      'Get Pending Outbox',
      {
        operation: 'getAll',
        tableId: 'notification_outbox',
        filters: {
          conditions: [
            { keyName: 'status', condition: 'eq', keyValue: 'pending' },
          ],
        },
      },
      [-2160, -320],
      { id: current.nodes.find((node) => node.name === 'Get Pending Outbox')?.id }
    ),
    codeNode(
      'Filter Due Now',
      String.raw`const now = Date.now();
return items.filter((item) => {
  const nextRetry = item.json.next_retry_at;
  if (!nextRetry) return true;
  const ts = new Date(nextRetry).getTime();
  return !Number.isNaN(ts) && ts <= now;
});`,
      [-1920, -320],
      { id: current.nodes.find((node) => node.name === 'Filter Due Now')?.id }
    ),
    codeNode('Render Email Payload', notificationRenderEmailCode, [-1680, -432]),
    ifNode('If Email Channel?', '={{ String($json.channel || "").startsWith("email_") }}', 'true', true, [-1440, -432], { id: current.nodes.find((node) => node.name === 'If Email Channel?')?.id }),
    httpNode(
      'Send Email',
      {
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
      },
      [-1200, -432],
      { id: current.nodes.find((node) => node.name === 'Send Email')?.id, credentials: credentials.resend, onError: 'continueRegularOutput' }
    ),
    ifNode('If Email Sent?', '={{ !!String($json.id || "").trim() }}', 'true', true, [-960, -432], { id: current.nodes.find((node) => node.name === 'If Email Sent?')?.id }),
    codeNode(
      'Prepare Email Sent Update',
      String.raw`const src = $('If Email Channel?').item.json;
return [{ json: { id: src.id, status: 'sent', sent_at: new Date().toISOString(), last_error: null } }];`,
      [-720, -544],
      { id: current.nodes.find((node) => node.name === 'Prepare Email Sent Update')?.id }
    ),
    codeNode(
      'Prepare Email Retry Update',
      String.raw`const src = $('If Email Channel?').item.json;
const retry = Number(src.retry_count || 0) + 1;
const max = Number(src.max_retries || 5);
const failed = retry >= max;
const backoffMin = Math.min(60, Math.pow(2, retry));
return [{ json: { id: src.id, status: failed ? 'failed' : 'pending', retry_count: retry, next_retry_at: new Date(Date.now() + backoffMin * 60 * 1000).toISOString(), last_error: 'EMAIL_SEND_FAILED' } }];`,
      [-720, -320],
      { id: current.nodes.find((node) => node.name === 'Prepare Email Retry Update')?.id }
    ),
    supabaseNode(
      'Update Outbox Email Sent',
      {
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
      },
      [-480, -544],
      { id: current.nodes.find((node) => node.name === 'Update Outbox Email Sent')?.id }
    ),
    supabaseNode(
      'Update Outbox Email Retry',
      {
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
      },
      [-480, -320],
      { id: current.nodes.find((node) => node.name === 'Update Outbox Email Retry')?.id }
    ),
    codeNode('Render Telegram Payload', notificationRenderTelegramCode, [-1680, -96]),
    ifNode('If Telegram Channel?', '={{ String($json.channel || "").startsWith("telegram_") }}', 'true', true, [-1440, -96], { id: current.nodes.find((node) => node.name === 'If Telegram Channel?')?.id }),
    telegramNode(
      'Send Telegram',
      {
        chatId: '112661106',
        text: '={{ $json.rendered_telegram_text }}',
        additionalFields: {},
      },
      [-1200, -96],
      { id: current.nodes.find((node) => node.name === 'Send Telegram')?.id, webhookId: '7456a1d2-129e-4de4-b430-03ab679d931b', onError: 'continueRegularOutput' }
    ),
    ifNode('If Telegram Sent?', '={{ !!String($json.message_id || $json.result?.message_id || "").trim() }}', 'true', true, [-960, -96], { id: current.nodes.find((node) => node.name === 'If Telegram Sent?')?.id }),
    codeNode(
      'Prepare Telegram Sent Update',
      String.raw`const src = $('If Telegram Channel?').item.json;
return [{ json: { id: src.id, status: 'sent', sent_at: new Date().toISOString(), last_error: null } }];`,
      [-720, -208],
      { id: current.nodes.find((node) => node.name === 'Prepare Telegram Sent Update')?.id }
    ),
    codeNode(
      'Prepare Telegram Retry Update',
      String.raw`const src = $('If Telegram Channel?').item.json;
const retry = Number(src.retry_count || 0) + 1;
const max = Number(src.max_retries || 5);
const failed = retry >= max;
const backoffMin = Math.min(60, Math.pow(2, retry));
return [{ json: { id: src.id, status: failed ? 'failed' : 'pending', retry_count: retry, next_retry_at: new Date(Date.now() + backoffMin * 60 * 1000).toISOString(), last_error: 'TELEGRAM_SEND_FAILED' } }];`,
      [-720, 16],
      { id: current.nodes.find((node) => node.name === 'Prepare Telegram Retry Update')?.id }
    ),
    supabaseNode(
      'Update Outbox Telegram Sent',
      {
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
      },
      [-480, -208],
      { id: current.nodes.find((node) => node.name === 'Update Outbox Telegram Sent')?.id }
    ),
    supabaseNode(
      'Update Outbox Telegram Retry',
      {
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
      },
      [-480, 16],
      { id: current.nodes.find((node) => node.name === 'Update Outbox Telegram Retry')?.id }
    ),
  ];

  const connections = buildConnections([
    connect('Schedule Trigger1', 'Get Pending Outbox'),
    connect('Get Pending Outbox', 'Filter Due Now'),
    connect('Filter Due Now', 'Render Email Payload'),
    connect('Filter Due Now', 'Render Telegram Payload'),
    connect('Render Email Payload', 'If Email Channel?'),
    connect('If Email Channel?', 'Send Email', 0),
    connect('Send Email', 'If Email Sent?'),
    connect('If Email Sent?', 'Prepare Email Sent Update', 0),
    connect('If Email Sent?', 'Prepare Email Retry Update', 1),
    connect('Prepare Email Sent Update', 'Update Outbox Email Sent'),
    connect('Prepare Email Retry Update', 'Update Outbox Email Retry'),
    connect('Render Telegram Payload', 'If Telegram Channel?'),
    connect('If Telegram Channel?', 'Send Telegram', 0),
    connect('Send Telegram', 'If Telegram Sent?'),
    connect('If Telegram Sent?', 'Prepare Telegram Sent Update', 0),
    connect('If Telegram Sent?', 'Prepare Telegram Retry Update', 1),
    connect('Prepare Telegram Sent Update', 'Update Outbox Telegram Sent'),
    connect('Prepare Telegram Retry Update', 'Update Outbox Telegram Retry'),
  ]);

  return {
    ...current,
    versionId: crypto.randomUUID(),
    nodes,
    connections,
    pinData: {},
  };
};

const buildAICoreWorkflow = () => {
  const current = readWorkflow(files.aiCore);
  const chatTrigger = current.nodes.find((node) => node.name === 'When chat message received');
  const crystalize = current.nodes.find((node) => node.name === 'Crystalize Context1');
  const tenantCheck = current.nodes.find((node) => node.name === 'Security: Tenant Check1');
  const getRow = current.nodes.find((node) => node.name === 'Get a row1');
  const agent = current.nodes.find((node) => node.name === 'AI Agent1');
  const memory = current.nodes.find((node) => node.name === 'Postgres Chat Memory1');
  const vector = current.nodes.find((node) => node.name === 'Supabase Vector Store1');
  const lm = current.nodes.find((node) => node.name === 'Google Gemini Chat Model1');
  const embedding = current.nodes.find((node) => node.name === 'Embeddings Google Gemini1');
  const buildPrompt = current.nodes.find((node) => node.name === 'Build Prompt1');
  const toolAppointment = current.nodes.find((node) => node.name === 'Registra_Appuntamento');
  const toolRestaurant = current.nodes.find((node) => node.name === 'Registra_Prenotazione');
  const toolHotel = current.nodes.find((node) => node.name === 'Registra_Prenotazione_Hotel');

  const nodes = [
    nodeBase(
      'When chat message received',
      '@n8n/n8n-nodes-langchain.chatTrigger',
      1.4,
      [6288, -240],
      {
        public: true,
        mode: 'webhook',
        options: {
          allowedOrigins: '*',
        },
      },
      {
        id: chatTrigger?.id,
        webhookId: chatTrigger?.webhookId,
        onError: 'continueRegularOutput',
      }
    ),
    nodeBase(
      'Crystalize Context1',
      'n8n-nodes-base.set',
      3.4,
      [6512, -240],
      {
        assignments: {
          assignments: [
            { id: 'tenant_id', name: 'tenant_id', value: '={{ $json.metadata?.tenant_id || $json.tenant_id || "" }}', type: 'string' },
            { id: 'sessionId', name: 'sessionId', value: '={{ $json.sessionId || $json.metadata?.session_id || `session_${Date.now()}` }}', type: 'string' },
            { id: 'trace_id', name: 'trace_id', value: '={{ $json.metadata?.trace_id || `trace_${Date.now()}` }}', type: 'string' },
            { id: 'source', name: 'source', value: '={{ $json.metadata?.source || "chat_widget" }}', type: 'string' },
            { id: 'chatInput', name: 'chatInput', value: '={{ String($json.chatInput || "").trim() }}', type: 'string' },
          ],
        },
        includeOtherFields: true,
        options: {},
      },
      { id: crystalize?.id }
    ),
    nodeBase(
      'Security: Tenant Check1',
      'n8n-nodes-base.filter',
      2.2,
      [6736, -240],
      {
        conditions: {
          options: {
            caseSensitive: true,
            leftValue: '',
            typeValidation: 'strict',
            version: 2,
          },
          conditions: [
            {
              id: 'check_tenant',
              leftValue: '={{ $json.tenant_id }}',
              rightValue: '',
              operator: { type: 'string', operation: 'notEmpty', singleValue: true },
            },
            {
              id: 'check_chat',
              leftValue: '={{ $json.chatInput }}',
              rightValue: '',
              operator: { type: 'string', operation: 'notEmpty', singleValue: true },
            },
          ],
          combinator: 'and',
        },
        options: {},
      },
      { id: tenantCheck?.id }
    ),
    supabaseNode(
      'Get a row1',
      {
        operation: 'get',
        tableId: 'tenants',
        filters: {
          conditions: [
            { keyName: 'tenant_id', keyValue: '={{ $(\'Crystalize Context1\').item.json.tenant_id }}' },
          ],
        },
      },
      [6960, -240],
      { id: getRow?.id }
    ),
    codeNode('Build Prompt1', aiBuildPromptCode, [7184, -240], { id: buildPrompt?.id }),
    nodeBase(
      'AI Agent1',
      '@n8n/n8n-nodes-langchain.agent',
      3.1,
      [7696, -240],
      {
        promptType: 'define',
        text: '={{ $(\'Crystalize Context1\').item.json.chatInput }}',
        options: {
          systemMessage: '={{ $json.final_system_prompt }}\n',
        },
      },
      {
        id: agent?.id,
        onError: 'continueRegularOutput',
      }
    ),
    nodeBase(
      'Postgres Chat Memory1',
      '@n8n/n8n-nodes-langchain.memoryPostgresChat',
      1.3,
      [7536, -16],
      {
        sessionIdType: 'customKey',
        sessionKey: '={{ $(\'Crystalize Context1\').item.json.sessionId }}',
        contextWindowLength: 8,
      },
      {
        id: memory?.id,
        credentials: credentials.postgres,
      }
    ),
    nodeBase(
      'Supabase Vector Store1',
      '@n8n/n8n-nodes-langchain.vectorStoreSupabase',
      1,
      [7792, -16],
      {
        mode: 'retrieve-as-tool',
        toolName: 'company_knowledge_base',
        toolDescription: 'Strumento per cercare documenti lunghi, listini, menu e FAQ con precisione tenant-scoped.',
        tableName: {
          __rl: true,
          value: 'zirel_vectors',
          mode: 'list',
          cachedResultName: 'zirel_vectors',
        },
        options: {
          queryName: 'match_documents',
          metadata: {
            metadataValues: [
              {
                name: 'tenant_id',
                value: '={{ $(\'Crystalize Context1\').item.json.tenant_id }}',
              },
            ],
          },
        },
      },
      {
        id: vector?.id,
        credentials: credentials.supabase,
      }
    ),
    nodeBase(
      'Google Gemini Chat Model1',
      '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
      1,
      [7408, -16],
      {
        modelName: 'models/gemini-2.0-flash',
        options: {},
      },
      {
        id: lm?.id,
        credentials: credentials.gemini,
      }
    ),
    nodeBase(
      'Embeddings Google Gemini1',
      '@n8n/n8n-nodes-langchain.embeddingsGoogleGemini',
      1,
      [7952, -16],
      {
        modelName: 'models/gemini-embedding-001',
        options: {},
      },
      {
        id: embedding?.id,
        credentials: credentials.gemini,
      }
    ),
    nodeBase(
      'Registra_Appuntamento',
      '@n8n/n8n-nodes-langchain.toolWorkflow',
      2.2,
      [8080, -16],
      {
        workflowId: toolAppointment?.parameters?.workflowId,
        workflowInputs: {
          mappingMode: 'defineBelow',
          value: {
            tenant_id: '={{ $(\'Crystalize Context1\').item.json.tenant_id }}',
            business_type: '={{ $(\'Build Prompt1\').item.json.normalized_business_type }}',
            appointment_type: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'appointment_type\', `standard_appointment`, \'string\') }}',
            note: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'note\', ``, \'string\') }}',
            orario: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'orario\', ``, \'string\') }}',
            data_input: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'data_input\', ``, \'string\') }}',
            email: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'email\', ``, \'string\') }}',
            telefono: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'telefono\', ``, \'string\') }}',
            nome: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'nome\', ``, \'string\') }}',
            motivo: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'motivo\', ``, \'string\') }}',
            trace_id: '={{ $(\'Crystalize Context1\').item.json.trace_id }}',
            session_id: '={{ $(\'Crystalize Context1\').item.json.sessionId }}',
            source: '={{ $(\'Crystalize Context1\').item.json.source }}',
            appointment_calendar_provider: '={{ $(\'Get a row1\').item.json.appointment_calendar_provider || $(\'Get a row1\').item.json.calendar_provider || "" }}',
            appointment_calendar_api_url: '={{ $(\'Get a row1\').item.json.appointment_calendar_api_url || $(\'Get a row1\').item.json.calendar_api_url || $(\'Get a row1\').item.json.availability_api_url || "" }}',
            availability_api_url: '={{ $(\'Get a row1\').item.json.availability_api_url || "" }}',
            adapter_test_mode: '={{ $(\'Get a row1\').item.json.adapter_test_mode || "false" }}',
            notification_email: '={{ $(\'Get a row1\').item.json.notification_email || "" }}',
            internal_notification_email: '={{ $(\'Get a row1\').item.json.internal_notification_email || "" }}',
            internal_email: '={{ $(\'Get a row1\').item.json.internal_email || $(\'Get a row1\').item.json.mail || "" }}',
            billing_email: '={{ $(\'Get a row1\').item.json.billing_email || "" }}',
            telegram_chat_id: '={{ $(\'Get a row1\').item.json.telegram_chat_id || "" }}',
            internal_telegram_chat_id: '={{ $(\'Get a row1\').item.json.internal_telegram_chat_id || "" }}',
          },
          matchingColumns: [],
          schema: [
            'tenant_id', 'business_type', 'appointment_type', 'nome', 'telefono', 'email', 'data_input', 'orario', 'note', 'motivo', 'trace_id', 'session_id', 'source', 'appointment_calendar_provider', 'appointment_calendar_api_url', 'availability_api_url', 'adapter_test_mode', 'notification_email', 'internal_notification_email', 'internal_email', 'billing_email', 'telegram_chat_id', 'internal_telegram_chat_id',
          ].map((id) => ({ id, displayName: id, required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string', removed: false })),
          attemptToConvertTypes: false,
          convertFieldsToString: false,
        },
      },
      { id: toolAppointment?.id }
    ),
    nodeBase(
      'Registra_Prenotazione',
      '@n8n/n8n-nodes-langchain.toolWorkflow',
      2.2,
      [8208, -16],
      {
        description: 'Salva una prenotazione ristorante reale solo dopo conferma esplicita del cliente e controllo disponibilità.',
        workflowId: toolRestaurant?.parameters?.workflowId,
        workflowInputs: {
          mappingMode: 'defineBelow',
          value: {
            tenant_id: '={{ $(\'Crystalize Context1\').item.json.tenant_id }}',
            nome_cliente: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'nome_cliente\', ``, \'string\') }}',
            telefono: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'telefono\', ``, \'string\') }}',
            data_input: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'data_input\', ``, \'string\') }}',
            note_prenotazione: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'note_prenotazione\', ``, \'string\') }}',
            persone: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'persone\', ``, \'string\') }}',
            ora: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'ora\', ``, \'string\') }}',
            business_type: '={{ $(\'Build Prompt1\').item.json.normalized_business_type }}',
            trace_id: '={{ $(\'Crystalize Context1\').item.json.trace_id }}',
            session_id: '={{ $(\'Crystalize Context1\').item.json.sessionId }}',
            source: '={{ $(\'Crystalize Context1\').item.json.source }}',
            restaurant_booking_provider: '={{ $(\'Get a row1\').item.json.restaurant_booking_provider || $(\'Get a row1\').item.json.booking_provider || "" }}',
            restaurant_booking_api_url: '={{ $(\'Get a row1\').item.json.restaurant_booking_api_url || $(\'Get a row1\').item.json.restaurant_calendar_api_url || $(\'Get a row1\').item.json.availability_api_url || "" }}',
            restaurant_calendar_api_url: '={{ $(\'Get a row1\').item.json.restaurant_calendar_api_url || "" }}',
            availability_api_url: '={{ $(\'Get a row1\').item.json.availability_api_url || "" }}',
            adapter_test_mode: '={{ $(\'Get a row1\').item.json.adapter_test_mode || "false" }}',
          },
          matchingColumns: [],
          schema: [
            'tenant_id', 'nome_cliente', 'telefono', 'data_input', 'ora', 'persone', 'note_prenotazione', 'business_type', 'trace_id', 'session_id', 'source', 'restaurant_booking_provider', 'restaurant_booking_api_url', 'restaurant_calendar_api_url', 'availability_api_url', 'adapter_test_mode',
          ].map((id) => ({ id, displayName: id, required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string', removed: false })),
          attemptToConvertTypes: false,
          convertFieldsToString: false,
        },
      },
      { id: toolRestaurant?.id }
    ),
    nodeBase(
      'Registra_Prenotazione_Hotel',
      '@n8n/n8n-nodes-langchain.toolWorkflow',
      2.2,
      [8336, -16],
      {
        description: 'Registra una prenotazione camera reale solo dopo conferma esplicita e controllo disponibilità.',
        workflowId: toolHotel?.parameters?.workflowId,
        workflowInputs: {
          mappingMode: 'defineBelow',
          value: {
            tenant_id: '={{ $(\'Crystalize Context1\').item.json.tenant_id }}',
            business_type: '={{ $(\'Build Prompt1\').item.json.normalized_business_type }}',
            booking_type: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'booking_type\', `standard_room_booking`, \'string\') }}',
            nome: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'nome\', ``, \'string\') }}',
            telefono: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'telefono\', ``, \'string\') }}',
            email: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'email\', ``, \'string\') }}',
            checkin_input: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'checkin_input\', ``, \'string\') }}',
            checkout_input: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'checkout_input\', ``, \'string\') }}',
            ospiti_adulti: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'ospiti_adulti\', ``, \'string\') }}',
            ospiti_bambini: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'ospiti_bambini\', `0`, \'string\') }}',
            room_type_requested: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'room_type_requested\', ``, \'string\') }}',
            servizi_richiesti: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'servizi_richiesti\', ``, \'string\') }}',
            note_prenotazione: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'note_prenotazione\', ``, \'string\') }}',
            lingua_cliente: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'lingua_cliente\', `it`, \'string\') }}',
            nome_attivita: '={{ $(\'Get a row1\').item.json.nome_attivita }}',
            trace_id: '={{ $(\'Crystalize Context1\').item.json.trace_id }}',
            session_id: '={{ $(\'Crystalize Context1\').item.json.sessionId }}',
            source: '={{ $(\'Crystalize Context1\').item.json.source }}',
            booking_manager_provider: '={{ $(\'Get a row1\').item.json.booking_manager_provider || "" }}',
            link_booking_esterno: '={{ $(\'Get a row1\').item.json.link_booking_esterno || "" }}',
            hotel_middleware_mews_url: '={{ $(\'Get a row1\').item.json.hotel_middleware_mews_url || "" }}',
            hotel_middleware_cloudbeds_url: '={{ $(\'Get a row1\').item.json.hotel_middleware_cloudbeds_url || "" }}',
            hotel_middleware_siteminder_url: '={{ $(\'Get a row1\').item.json.hotel_middleware_siteminder_url || "" }}',
            hotel_middleware_5stelle_url: '={{ $(\'Get a row1\').item.json.hotel_middleware_5stelle_url || "" }}',
            hotel_middleware_fallback_url: '={{ $(\'Get a row1\').item.json.hotel_middleware_fallback_url || $(\'Get a row1\').item.json.availability_api_url || "" }}',
            availability_api_url: '={{ $(\'Get a row1\').item.json.availability_api_url || "" }}',
            adapter_test_mode: '={{ $(\'Get a row1\').item.json.adapter_test_mode || "false" }}',
          },
          matchingColumns: [],
          schema: [
            'tenant_id', 'business_type', 'booking_type', 'nome', 'telefono', 'email', 'checkin_input', 'checkout_input', 'ospiti_adulti', 'ospiti_bambini', 'room_type_requested', 'servizi_richiesti', 'note_prenotazione', 'lingua_cliente', 'nome_attivita', 'trace_id', 'session_id', 'source', 'booking_manager_provider', 'link_booking_esterno', 'hotel_middleware_mews_url', 'hotel_middleware_cloudbeds_url', 'hotel_middleware_siteminder_url', 'hotel_middleware_5stelle_url', 'hotel_middleware_fallback_url', 'availability_api_url', 'adapter_test_mode',
          ].map((id) => ({ id, displayName: id, required: false, defaultMatch: false, display: true, canBeUsedToMatch: true, type: 'string', removed: false })),
          attemptToConvertTypes: false,
          convertFieldsToString: false,
        },
      },
      { id: toolHotel?.id }
    ),
  ];

  const connections = {
    'When chat message received': {
      main: [[{ node: 'Crystalize Context1', type: 'main', index: 0 }]],
    },
    'Crystalize Context1': {
      main: [[{ node: 'Security: Tenant Check1', type: 'main', index: 0 }]],
    },
    'Security: Tenant Check1': {
      main: [[{ node: 'Get a row1', type: 'main', index: 0 }]],
    },
    'Get a row1': {
      main: [[{ node: 'Build Prompt1', type: 'main', index: 0 }]],
    },
    'Build Prompt1': {
      main: [[{ node: 'AI Agent1', type: 'main', index: 0 }]],
    },
    'Postgres Chat Memory1': {
      ai_memory: [[{ node: 'AI Agent1', type: 'ai_memory', index: 0 }]],
    },
    'Supabase Vector Store1': {
      ai_tool: [[{ node: 'AI Agent1', type: 'ai_tool', index: 0 }]],
    },
    'Google Gemini Chat Model1': {
      ai_languageModel: [[{ node: 'AI Agent1', type: 'ai_languageModel', index: 0 }]],
    },
    'Embeddings Google Gemini1': {
      ai_embedding: [[{ node: 'Supabase Vector Store1', type: 'ai_embedding', index: 0 }]],
    },
    'Registra_Appuntamento': {
      ai_tool: [[{ node: 'AI Agent1', type: 'ai_tool', index: 0 }]],
    },
    'Registra_Prenotazione': {
      ai_tool: [[{ node: 'AI Agent1', type: 'ai_tool', index: 0 }]],
    },
    'Registra_Prenotazione_Hotel': {
      ai_tool: [[{ node: 'AI Agent1', type: 'ai_tool', index: 0 }]],
    },
  };

  return {
    ...current,
    versionId: crypto.randomUUID(),
    nodes,
    connections,
    pinData: {},
  };
};

writeWorkflow(files.appointment, buildAppointmentWorkflow());
writeWorkflow(files.restaurant, buildRestaurantWorkflow());
writeWorkflow(files.hotel, buildHotelWorkflow());
writeWorkflow(files.notifications, buildNotificationsWorkflow());
writeWorkflow(files.aiCore, buildAICoreWorkflow());

console.log('Workflow JSON rigenerati con hardening comune.');
