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

const runCodeNode = (workflow, name, json = {}, options = {}) => {
  const node = getNode(workflow, name);
  const code = node.parameters.jsCode;
  const fn = new Function('items', '$json', '$env', `${code}`);
  return fn(options.items || [{ json }], json, options.env || {});
};

const reminderWorkflow = readJson('Zirèl - Billing Reminder Engine.json');
const stripeWorkflow = readJson('Zirèl - Stripe Billing Manager.json');

assert.doesNotThrow(() => JSON.stringify(reminderWorkflow), 'Workflow reminder non serializzabile');
assert.doesNotThrow(() => JSON.stringify(stripeWorkflow), 'Workflow Stripe non serializzabile');

const trialSoon = new Date('2026-03-21T09:00:00.000Z').toISOString();
const trialToday = new Date('2026-03-18T09:00:00.000Z').toISOString();

const scheduledRows = runCodeNode(reminderWorkflow, 'Build Scheduled Reminder Rows', {}, {
  items: [
    {
      json: {
        tenant_id: 'zirel_trial_soon',
        subscription_status: 'trialing',
        billing_email: 'soon@example.com',
        billing_plan_code: 'premium',
        billing_cycle: 'monthly',
        stripe_subscription_id: 'sub_soon',
        trial_ends_at: trialSoon,
        hotel_name: 'Soon Hotel',
      },
    },
    {
      json: {
        tenant_id: 'zirel_trial_today',
        subscription_status: 'trialing',
        billing_email: 'today@example.com',
        billing_plan_code: 'base',
        billing_cycle: 'monthly',
        stripe_subscription_id: 'sub_today',
        trial_ends_at: trialToday,
        hotel_name: 'Today Hotel',
      },
    },
    {
      json: {
        tenant_id: 'zirel_active',
        subscription_status: 'active',
        billing_email: 'active@example.com',
        trial_ends_at: trialSoon,
      },
    },
  ],
});

assert.equal(scheduledRows.length, 2, 'Il workflow schedulato deve creare 2 reminder trial');
assert.deepEqual(
  scheduledRows.map((item) => item.json.template_key).sort(),
  ['billing_trial_ending', 'billing_trial_expired'],
);
assert.ok(scheduledRows.every((item) => item.json.channel === 'email_billing_customer'));
assert.ok(scheduledRows.every((item) => item.json.status === 'pending'));
assert.ok(scheduledRows.every((item) => item.json.dedupe_key));

const reminderFailed = runCodeNode(reminderWorkflow, 'Build Event Reminder Rows', {
  event_type: 'invoice.payment_failed',
  event_id: 'evt_failed_1',
  tenant_id: 'zirel_official',
  billing_email: 'billing@example.com',
  internal_email: 'team@example.com',
  business_name: 'Zirel Official',
  billing_plan_code: 'premium',
  billing_cycle: 'monthly',
  current_period_end: '2026-03-31T00:00:00.000Z',
  subscription_status: 'past_due',
  subscription_id: 'sub_123',
});

assert.equal(reminderFailed.length, 2, 'payment_failed deve produrre customer + internal');
assert.deepEqual(
  reminderFailed.map((item) => item.json.template_key).sort(),
  ['billing_payment_failed', 'billing_payment_failed_internal'],
);

const reminderPaid = runCodeNode(reminderWorkflow, 'Build Event Reminder Rows', {
  event_type: 'invoice.paid',
  event_id: 'evt_paid_1',
  tenant_id: 'zirel_official',
  billing_email: 'billing@example.com',
  business_name: 'Zirel Official',
  billing_plan_code: 'premium',
  billing_cycle: 'yearly',
  current_period_end: '2027-03-18T00:00:00.000Z',
  subscription_status: 'active',
  subscription_id: 'sub_123',
});

assert.equal(reminderPaid.length, 1, 'invoice.paid deve produrre solo reminder customer');
assert.equal(reminderPaid[0].json.template_key, 'billing_payment_succeeded');

const reminderCanceled = runCodeNode(reminderWorkflow, 'Build Event Reminder Rows', {
  event_type: 'customer.subscription.deleted',
  event_id: 'evt_deleted_1',
  tenant_id: 'zirel_official',
  billing_email: 'billing@example.com',
  internal_email: 'team@example.com',
  business_name: 'Zirel Official',
  billing_plan_code: 'base',
  billing_cycle: 'monthly',
  current_period_end: '2026-03-31T00:00:00.000Z',
  subscription_status: 'canceled',
  subscription_id: 'sub_123',
});

assert.equal(reminderCanceled.length, 2, 'subscription.deleted deve produrre customer + internal');
assert.deepEqual(
  reminderCanceled.map((item) => item.json.template_key).sort(),
  ['billing_subscription_canceled', 'billing_subscription_canceled_internal'],
);

const stripeOutboxRows = runCodeNode(stripeWorkflow, 'Build Billing Reminder Outbox Rows', {
  event_type: 'invoice.payment_failed',
  event_id: 'evt_failed_stripe_1',
  tenant_id: 'zirel_official',
  billing_email: 'billing@example.com',
  business_name: 'Zirel Official',
  billing_plan_code: 'premium',
  billing_cycle: 'monthly',
  current_period_end: '2026-03-31T00:00:00.000Z',
  subscription_status: 'past_due',
  subscription_id: 'sub_123',
}, {
  env: {
    ZIREL_BILLING_ALERT_EMAIL: 'team@example.com',
  },
});

assert.equal(stripeOutboxRows.length, 2, 'Il workflow Stripe deve enqueue due reminder per payment_failed');
assert.deepEqual(
  stripeOutboxRows.map((item) => item.json.channel).sort(),
  ['email_billing_customer', 'email_billing_internal'],
);

const stripeConnections = stripeWorkflow.connections['Switch: Event Type'];
assert(stripeConnections, 'Connessioni mancanti per Switch: Event Type');
assert.equal(stripeConnections.main.length, 3, 'Lo switch Stripe deve avere 3 uscite');
assert.ok(
  stripeConnections.main[1].some((edge) => edge.node === 'Build Billing Reminder Outbox Rows'),
  'Gli eventi subscription/invoice devono arrivare a Build Billing Reminder Outbox Rows',
);
assert.ok(
  stripeConnections.main[2].some((edge) => edge.node === 'Build Billing Reminder Outbox Rows'),
  'trial_will_end deve arrivare a Build Billing Reminder Outbox Rows',
);

console.log('Billing reminder workflow contracts: OK');
