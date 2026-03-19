import fs from 'node:fs';
import crypto from 'node:crypto';

const root = '/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl';

const credentials = {
  supabaseApi: {
    id: 'bEyN805IWleebXdC',
    name: 'Supabase account - Zirèl',
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
  nodeBase('Schedule Trigger', 'n8n-nodes-base.scheduleTrigger', 1.2, [-2736, -176], {
    rule: {
      interval: [{ field: 'minutes', minutesInterval: 1440 }],
    },
  });

const triggerNode = (inputs) =>
  nodeBase(
    'When Executed by Another Workflow',
    'n8n-nodes-base.executeWorkflowTrigger',
    1.1,
    [-2736, 256],
    {
      workflowInputs: {
        values: inputs.map((name) => ({ name })),
      },
    }
  );

const supabaseNode = (name, position, parameters, extra = {}) =>
  nodeBase(name, 'n8n-nodes-base.supabase', 1, position, parameters, {
    credentials: { supabaseApi: credentials.supabaseApi },
    ...extra,
  });

const codeNode = (name, position, jsCode) =>
  nodeBase(name, 'n8n-nodes-base.code', 2, position, { jsCode });

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

const scheduledReminderCode = `const today = new Date();
const romeNow = new Date(today.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
romeNow.setHours(0, 0, 0, 0);

const parseDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const romeDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Rome' }));
  romeDate.setHours(0, 0, 0, 0);
  return romeDate;
};

const diffDays = (target) => Math.round((target.getTime() - romeNow.getTime()) / 86400000);

const rows = [];

for (const item of items) {
  const tenant = item.json || {};
  const tenantId = String(tenant.tenant_id || '').trim();
  if (!tenantId) continue;

  const status = String(tenant.subscription_status || 'trialing').trim().toLowerCase();
  const billingEmail = String(tenant.billing_email || tenant.mail || '').trim().toLowerCase();
  const trialEndsAt = parseDateOnly(tenant.trial_ends_at);
  const businessName = tenant.hotel_name || tenant.nome_attivita || tenant.nome_ristorante || tenant.tenant_id || 'Zirèl';

  if (!trialEndsAt || status !== 'trialing' || !billingEmail) continue;

  const daysToTrialEnd = diffDays(trialEndsAt);
  const basePayload = {
    tenant_id: tenantId,
    business_name: businessName,
    billing_email: billingEmail,
    trial_ends_at: tenant.trial_ends_at || null,
    billing_plan_code: tenant.billing_plan_code || null,
    billing_cycle: tenant.billing_cycle || null,
    current_period_end: tenant.current_period_end || null,
    subscription_status: status,
    dashboard_url: 'https://dashboard.zirel.org?tab=abbonamento',
  };

  if (daysToTrialEnd === 3) {
    rows.push({
      json: {
        tenant_id: tenantId,
        channel: 'email_billing_customer',
        template_key: 'billing_trial_ending',
        related_entity_type: 'billing_subscription',
        related_entity_id: tenant.stripe_subscription_id || tenantId,
        status: 'pending',
        retry_count: 0,
        max_retries: 5,
        next_retry_at: new Date().toISOString(),
        trace_id: 'billing-schedule:' + tenantId + ':trial_ending:' + (tenant.trial_ends_at || ''),
        recipient_email: billingEmail,
        dedupe_key: tenantId + ':billing_trial_ending:' + (tenant.trial_ends_at || ''),
        payload: basePayload,
      },
    });
  }

  if (daysToTrialEnd === 0) {
    rows.push({
      json: {
        tenant_id: tenantId,
        channel: 'email_billing_customer',
        template_key: 'billing_trial_expired',
        related_entity_type: 'billing_subscription',
        related_entity_id: tenant.stripe_subscription_id || tenantId,
        status: 'pending',
        retry_count: 0,
        max_retries: 5,
        next_retry_at: new Date().toISOString(),
        trace_id: 'billing-schedule:' + tenantId + ':trial_expired:' + (tenant.trial_ends_at || ''),
        recipient_email: billingEmail,
        dedupe_key: tenantId + ':billing_trial_expired:' + (tenant.trial_ends_at || ''),
        payload: basePayload,
      },
    });
  }
}

return rows;`;

const eventReminderCode = `const input = $json || {};
const tenantId = String(input.tenant_id || '').trim();
const eventType = String(input.event_type || '').trim();
const billingEmail = String(input.billing_email || '').trim().toLowerCase();
const internalEmail = String(input.internal_email || $env.ZIREL_BILLING_ALERT_EMAIL || '').trim().toLowerCase();
const eventId = String(input.event_id || '').trim() || ('manual-' + Date.now());
const businessName = input.business_name || input.hotel_name || input.nome_attivita || input.nome_ristorante || tenantId || 'Zirèl';

if (!tenantId || !eventType) {
  return [];
}

const basePayload = {
  tenant_id: tenantId,
  business_name: businessName,
  billing_email: billingEmail || null,
  billing_plan_code: input.billing_plan_code || null,
  billing_cycle: input.billing_cycle || null,
  current_period_end: input.current_period_end || null,
  trial_ends_at: input.trial_ends_at || null,
  subscription_status: input.subscription_status || null,
  event_id: eventId,
  dashboard_url: 'https://dashboard.zirel.org?tab=abbonamento',
  portal_url: 'https://dashboard.zirel.org?tab=abbonamento',
};

const makeRow = (channel, templateKey, recipient, suffix) => ({
  json: {
    tenant_id: tenantId,
    channel,
    template_key: templateKey,
    related_entity_type: 'billing_subscription',
    related_entity_id: input.subscription_id || tenantId,
    status: 'pending',
    retry_count: 0,
    max_retries: 5,
    next_retry_at: new Date().toISOString(),
    trace_id: 'billing-event:' + eventType + ':' + eventId,
    recipient_email: recipient,
    dedupe_key: tenantId + ':' + eventType + ':' + suffix + ':' + eventId,
    payload: basePayload,
  },
});

const rows = [];

if (eventType === 'invoice.payment_failed') {
  if (billingEmail) rows.push(makeRow('email_billing_customer', 'billing_payment_failed', billingEmail, 'customer'));
  if (internalEmail) rows.push(makeRow('email_billing_internal', 'billing_payment_failed_internal', internalEmail, 'internal'));
} else if (eventType === 'invoice.paid') {
  if (billingEmail) rows.push(makeRow('email_billing_customer', 'billing_payment_succeeded', billingEmail, 'customer'));
} else if (eventType === 'customer.subscription.deleted') {
  if (billingEmail) rows.push(makeRow('email_billing_customer', 'billing_subscription_canceled', billingEmail, 'customer'));
  if (internalEmail) rows.push(makeRow('email_billing_internal', 'billing_subscription_canceled_internal', internalEmail, 'internal'));
} else if (eventType === 'customer.subscription.trial_will_end') {
  if (billingEmail) rows.push(makeRow('email_billing_customer', 'billing_trial_ending', billingEmail, 'customer'));
}

return rows;`;

const workflow = {
  name: 'Zirèl - Billing Reminder Engine',
  nodes: [
    scheduleNode(),
    supabaseNode('Get Billing Tenants', [-2480, -176], {
      operation: 'getAll',
      tableId: 'tenants',
    }),
    codeNode('Build Scheduled Reminder Rows', [-2192, -176], scheduledReminderCode),
    triggerNode([
      'event_type',
      'event_id',
      'tenant_id',
      'billing_email',
      'internal_email',
      'business_name',
      'billing_plan_code',
      'billing_cycle',
      'current_period_end',
      'trial_ends_at',
      'subscription_status',
      'subscription_id',
    ]),
    codeNode('Build Event Reminder Rows', [-2480, 256], eventReminderCode),
    supabaseNode('Insert Billing Outbox Rows', [-1888, 32], {
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
          { fieldId: 'recipient_email', fieldValue: '={{ $json.recipient_email || null }}' },
          { fieldId: 'dedupe_key', fieldValue: '={{ $json.dedupe_key }}' },
          { fieldId: 'payload', fieldValue: '={{ $json.payload }}' },
        ],
      },
    }),
  ],
  connections: buildConnections([
    { from: 'Schedule Trigger', to: 'Get Billing Tenants', type: 'main', branch: 0 },
    { from: 'Get Billing Tenants', to: 'Build Scheduled Reminder Rows', type: 'main', branch: 0 },
    { from: 'Build Scheduled Reminder Rows', to: 'Insert Billing Outbox Rows', type: 'main', branch: 0 },
    { from: 'When Executed by Another Workflow', to: 'Build Event Reminder Rows', type: 'main', branch: 0 },
    { from: 'Build Event Reminder Rows', to: 'Insert Billing Outbox Rows', type: 'main', branch: 0 },
  ]),
  active: false,
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
  id: 'ZirelBillingReminderEngine',
  tags: [],
  pinData: {},
};

fs.writeFileSync(`${root}/Zirèl - Billing Reminder Engine.json`, `${JSON.stringify(workflow, null, 2)}\n`);

console.log('Billing reminder workflow generato.');
