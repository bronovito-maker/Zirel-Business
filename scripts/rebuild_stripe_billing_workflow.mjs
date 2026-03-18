import fs from 'node:fs';

const path = 'Zirèl - Stripe Billing Manager.json';

const supabaseCred = { supabaseApi: { id: 'supabase-cred-id', name: 'Supabase account' } };

const node = (name, type, typeVersion, position, parameters, extra = {}) => ({
  name,
  type,
  typeVersion,
  position,
  parameters,
  ...extra,
});

const webhook = (name, position, pathName, noResponse = false) =>
  node(name, 'n8n-nodes-base.webhook', 1, position, {
    httpMethod: 'POST',
    path: pathName,
    ...(noResponse ? {} : { responseMode: 'responseNode' }),
    options: noResponse ? { noResponse: true, verifyStripeSignature: true } : {},
  });

const code = (name, position, jsCode) =>
  node(name, 'n8n-nodes-base.code', 2, position, { jsCode });

const ifNode = (name, position, expr) =>
  node(name, 'n8n-nodes-base.if', 1, position, {
    conditions: {
      boolean: [{ value1: expr, value2: true }],
    },
  });

const respond = (name, position, bodyExpr, codeExpr = '={{ $json.http_status || 200 }}') =>
  node(name, 'n8n-nodes-base.respondToWebhook', 1, position, {
    options: { responseCode: codeExpr },
    responseBody: bodyExpr,
  });

const supabase = (name, position, parameters) =>
  node(name, 'n8n-nodes-base.supabase', 1, position, parameters, { credentials: supabaseCred });

const switchNode = (name, position, parameters) =>
  node(name, 'n8n-nodes-base.switch', 1, position, parameters);

const checkoutNormalize = `const body = $json.body || {};
const normalize = (v) => String(v || '').trim();
const tenant_id = normalize(body.tenant_id || body.tenantId);
const api_token = normalize(body.api_token || body.apiToken);
const price_id = normalize(body.price_id || body.priceId);
const email = normalize(body.email).toLowerCase();
const business_name = normalize(body.hotel_name || body.business_name || body.nome_attivita);
const missing = [];
if (!tenant_id) missing.push('tenant_id');
if (!api_token) missing.push('api_token');
if (!price_id) missing.push('price_id');
if (!email) missing.push('email');
return [{ json: { tenant_id, api_token, price_id, email, business_name, is_valid_request: missing.length === 0, missing_fields: missing, http_status: missing.length ? 400 : 200 } }];`;

const portalNormalize = `const body = $json.body || {};
const normalize = (v) => String(v || '').trim();
const tenant_id = normalize(body.tenant_id || body.tenantId);
const api_token = normalize(body.api_token || body.apiToken);
const missing = [];
if (!tenant_id) missing.push('tenant_id');
if (!api_token) missing.push('api_token');
return [{ json: { tenant_id, api_token, is_valid_request: missing.length === 0, missing_fields: missing, http_status: missing.length ? 400 : 200 } }];`;

const verifyTenant = `const input = $json;
if (!input.is_valid_request) {
  return [{ json: { ...input, authorized: false, http_status: 400, error: 'Missing required fields', details: input.missing_fields } }];
}

const supabaseUrl = String($env.SUPABASE_URL || '').trim();
const serviceKey = String($env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl || !serviceKey) {
  return [{ json: { ...input, authorized: false, http_status: 500, error: 'Missing Supabase env for billing auth' } }];
}

const qs = new URLSearchParams({
  select: 'tenant_id,api_token,mail,billing_email,stripe_customer_id',
  tenant_id: 'eq.' + input.tenant_id,
  api_token: 'eq.' + input.api_token,
  limit: '1',
});

const response = await fetch(\`\${supabaseUrl}/rest/v1/tenants?\${qs.toString()}\`, {
  headers: {
    apikey: serviceKey,
    Authorization: \`Bearer \${serviceKey}\`,
  },
});

if (!response.ok) {
  const text = await response.text();
  return [{ json: { ...input, authorized: false, http_status: 502, error: 'Tenant auth lookup failed', provider_error: text.slice(0, 500) } }];
}

const rows = await response.json();
const tenant = Array.isArray(rows) ? rows[0] : null;

if (!tenant?.tenant_id) {
  return [{ json: { ...input, authorized: false, http_status: 401, error: 'Unauthorized tenant or api_token' } }];
}

return [{
  json: {
    ...input,
    authorized: true,
    tenant_record: tenant,
    tenant_id: tenant.tenant_id,
    billing_email: tenant.billing_email || tenant.mail || input.email || '',
    stripe_customer_id: tenant.stripe_customer_id || '',
    http_status: 200,
  },
}];`;

const normalizeEvent = `const event = $json.body || {};
const object = event.data?.object || {};
const priceId = object.items?.data?.[0]?.price?.id || object.plan?.id || '';
const productId = object.items?.data?.[0]?.price?.product || object.plan?.product || '';
const tenantId = object.client_reference_id || object.metadata?.tenant_id || '';
const billingEmail = object.customer_details?.email || object.customer_email || object.receipt_email || '';
const planCode = priceId && priceId === String($env.STRIPE_PRICE_PREMIUM_ID || '') ? 'premium'
  : priceId && priceId === String($env.STRIPE_PRICE_BASE_ID || '') ? 'base'
  : '';

return [{
  json: {
    raw_event: event,
    event_type: String(event.type || ''),
    event_id: String(event.id || ''),
    tenant_id: tenantId,
    customer_id: String(object.customer || ''),
    subscription_id: String(object.subscription || object.id || ''),
    billing_email: billingEmail,
    stripe_price_id: priceId,
    stripe_product_id: productId,
    billing_plan_code: planCode,
    subscription_status: event.type === 'customer.subscription.deleted'
      ? 'canceled'
      : event.type === 'invoice.payment_failed'
        ? 'past_due'
        : String(object.status || 'active'),
  },
}];`;

const createCheckoutSession = `const input = $json;
const secretKey = String($env.STRIPE_SECRET_KEY || '').trim();
if (!secretKey) {
  return [{ json: { ...input, http_status: 500, error: 'Missing STRIPE_SECRET_KEY' } }];
}

const params = new URLSearchParams();
params.set('mode', 'subscription');
params.set('success_url', String($env.STRIPE_SUCCESS_URL || 'https://dashboard.zirel.org?status=success'));
params.set('cancel_url', String($env.STRIPE_CANCEL_URL || 'https://dashboard.zirel.org?status=cancel'));
params.set('customer_email', input.billing_email || input.email);
params.set('client_reference_id', input.tenant_id);
params.set('line_items[0][price]', input.price_id);
params.set('line_items[0][quantity]', '1');
params.set('metadata[tenant_id]', input.tenant_id);
params.set('metadata[billing_email]', input.billing_email || input.email || '');
params.set('metadata[business_name]', input.business_name || '');

const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer ' + secretKey,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: params.toString(),
});

const data = await response.json();
if (!response.ok) {
  return [{ json: { ...input, http_status: response.status || 502, error: 'Stripe checkout creation failed', stripe_error: data } }];
}

return [{ json: { ...input, url: data.url, stripe_checkout_session_id: data.id, stripe_raw: data, http_status: 200 } }];`;

const createPortalSession = `const input = $json;
const secretKey = String($env.STRIPE_SECRET_KEY || '').trim();
if (!secretKey) {
  return [{ json: { ...input, http_status: 500, error: 'Missing STRIPE_SECRET_KEY' } }];
}
if (!input.stripe_customer_id) {
  return [{ json: { ...input, http_status: 400, error: 'Missing stripe_customer_id for portal session' } }];
}

const params = new URLSearchParams();
params.set('customer', input.stripe_customer_id);
params.set('return_url', String($env.STRIPE_PORTAL_RETURN_URL || $env.STRIPE_SUCCESS_URL || 'https://dashboard.zirel.org/abbonamento'));

const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
  method: 'POST',
  headers: {
    Authorization: 'Bearer ' + secretKey,
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: params.toString(),
});

const data = await response.json();
if (!response.ok) {
  return [{ json: { ...input, http_status: response.status || 502, error: 'Stripe portal creation failed', stripe_error: data } }];
}

return [{ json: { ...input, url: data.url, stripe_portal_session_id: data.id, stripe_raw: data, http_status: 200 } }];`;

const workflow = {
  name: 'Zirèl - Stripe Billing Manager',
  nodes: [
    webhook('Webhook: Create Checkout', [160, 140], 'stripe-billing/create-checkout'),
    code('Normalize Checkout Request', [420, 140], checkoutNormalize),
    code('Verify Checkout Tenant', [680, 140], verifyTenant),
    ifNode('If Checkout Authorized', [930, 140], '={{ Boolean($json.authorized) }}'),
    code('Stripe: Create Checkout', [1190, 60], createCheckoutSession),
    respond('Response: Checkout URL', [1430, 60], '={{ JSON.stringify({ url: $json.url }, null, 2) }}', '200'),
    respond('Response: Checkout Error', [1190, 220], '={{ JSON.stringify({ error: $json.error || "Unauthorized", details: $json.details || $json.missing_fields || [] }, null, 2) }}'),

    webhook('Webhook: Create Portal', [160, 420], 'stripe-billing/create-portal'),
    code('Normalize Portal Request', [420, 420], portalNormalize),
    code('Verify Portal Tenant', [680, 420], verifyTenant),
    ifNode('If Portal Authorized', [930, 420], '={{ Boolean($json.authorized && $json.stripe_customer_id) }}'),
    code('Stripe: Create Portal', [1190, 340], createPortalSession),
    respond('Response: Portal URL', [1430, 340], '={{ JSON.stringify({ url: $json.url }, null, 2) }}', '200'),
    respond('Response: Portal Error', [1190, 500], '={{ JSON.stringify({ error: $json.error || "Unauthorized or missing Stripe customer", details: $json.details || $json.missing_fields || [] }, null, 2) }}'),

    webhook('Webhook: Stripe Events', [160, 760], 'stripe-webhook', true),
    code('Normalize Stripe Event', [420, 760], normalizeEvent),
    switchNode('Switch: Event Type', [680, 760], {
      dataType: 'string',
      value1: '={{ $json.event_type }}',
      rules: {
        rules: [
          { value2: 'checkout.session.completed', output: 0 },
          { value2: 'customer.subscription.created', output: 1 },
          { value2: 'customer.subscription.updated', output: 1 },
          { value2: 'customer.subscription.deleted', output: 1 },
          { value2: 'invoice.paid', output: 1 },
          { value2: 'invoice.payment_failed', output: 1 },
        ],
      },
    }),
    supabase('Supabase: Sync Checkout', [980, 680], {
      operation: 'update',
      tableId: 'tenants',
      filters: {
        conditions: [{ keyName: 'tenant_id', condition: 'eq', keyValue: '={{ $json.tenant_id }}' }],
      },
      fieldsUi: {
        fieldValues: [
          { fieldId: 'stripe_customer_id', fieldValue: '={{ $json.customer_id }}' },
          { fieldId: 'stripe_subscription_id', fieldValue: '={{ $json.subscription_id }}' },
          { fieldId: 'subscription_status', fieldValue: 'active' },
          { fieldId: 'billing_email', fieldValue: '={{ $json.billing_email || null }}' },
          { fieldId: 'billing_last_event_id', fieldValue: '={{ $json.event_id }}' },
        ],
      },
    }),
    supabase('Supabase: Sync Sub/Invoice', [980, 860], {
      operation: 'update',
      tableId: 'tenants',
      filters: {
        conditions: [{ keyName: 'stripe_customer_id', condition: 'eq', keyValue: '={{ $json.customer_id }}' }],
      },
      fieldsUi: {
        fieldValues: [
          { fieldId: 'subscription_status', fieldValue: '={{ $json.subscription_status }}' },
          { fieldId: 'stripe_subscription_id', fieldValue: '={{ $json.subscription_id || null }}' },
          { fieldId: 'stripe_price_id', fieldValue: '={{ $json.stripe_price_id || null }}' },
          { fieldId: 'stripe_product_id', fieldValue: '={{ $json.stripe_product_id || null }}' },
          { fieldId: 'billing_plan_code', fieldValue: '={{ $json.billing_plan_code || null }}' },
          { fieldId: 'billing_email', fieldValue: '={{ $json.billing_email || null }}' },
          { fieldId: 'billing_last_event_id', fieldValue: '={{ $json.event_id }}' },
        ],
      },
    }),
  ],
  connections: {
    'Webhook: Create Checkout': {
      main: [[{ node: 'Normalize Checkout Request', type: 'main', index: 0 }]],
    },
    'Normalize Checkout Request': {
      main: [[{ node: 'Verify Checkout Tenant', type: 'main', index: 0 }]],
    },
    'Verify Checkout Tenant': {
      main: [[{ node: 'If Checkout Authorized', type: 'main', index: 0 }]],
    },
    'If Checkout Authorized': {
      main: [
        [{ node: 'Stripe: Create Checkout', type: 'main', index: 0 }],
        [{ node: 'Response: Checkout Error', type: 'main', index: 0 }],
      ],
    },
    'Stripe: Create Checkout': {
      main: [[{ node: 'Response: Checkout URL', type: 'main', index: 0 }]],
    },

    'Webhook: Create Portal': {
      main: [[{ node: 'Normalize Portal Request', type: 'main', index: 0 }]],
    },
    'Normalize Portal Request': {
      main: [[{ node: 'Verify Portal Tenant', type: 'main', index: 0 }]],
    },
    'Verify Portal Tenant': {
      main: [[{ node: 'If Portal Authorized', type: 'main', index: 0 }]],
    },
    'If Portal Authorized': {
      main: [
        [{ node: 'Stripe: Create Portal', type: 'main', index: 0 }],
        [{ node: 'Response: Portal Error', type: 'main', index: 0 }],
      ],
    },
    'Stripe: Create Portal': {
      main: [[{ node: 'Response: Portal URL', type: 'main', index: 0 }]],
    },

    'Webhook: Stripe Events': {
      main: [[{ node: 'Normalize Stripe Event', type: 'main', index: 0 }]],
    },
    'Normalize Stripe Event': {
      main: [[{ node: 'Switch: Event Type', type: 'main', index: 0 }]],
    },
    'Switch: Event Type': {
      main: [
        [{ node: 'Supabase: Sync Checkout', type: 'main', index: 0 }],
        [{ node: 'Supabase: Sync Sub/Invoice', type: 'main', index: 0 }],
      ],
    },
  },
  settings: {},
  pinData: {},
  meta: null,
  active: false,
  versionId: 'stripe-billing-manager-v2',
};

fs.writeFileSync(path, JSON.stringify(workflow, null, 2) + '\n');
console.log('rewritten', path);
