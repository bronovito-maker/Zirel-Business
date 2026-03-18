import fs from 'fs';

const workflowPath = '/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/Zirèl - Stripe Billing Manager.json';
const workflow = JSON.parse(fs.readFileSync(workflowPath, 'utf8'));

const setCode = (name, jsCode) => {
  const node = workflow.nodes.find((item) => item.name === name);
  if (!node) throw new Error(`Node not found: ${name}`);
  node.parameters.jsCode = jsCode;
};

setCode(
  'Normalize Checkout Request',
  `const source = $json.body || $json || {};
const normalize = (v) => String(v || '').trim();

const tenant_id = normalize(source.tenant_id || source.tenantId);
const api_token = normalize(source.api_token || source.apiToken);
const price_id = normalize(source.price_id || source.priceId);
const email = normalize(source.email).toLowerCase();
const business_name = normalize(source.hotel_name || source.business_name || source.nome_attivita);

const missing = [];
if (!tenant_id) missing.push('tenant_id');
if (!api_token) missing.push('api_token');
if (!price_id) missing.push('price_id');
if (!email) missing.push('email');

return [{
  json: {
    tenant_id,
    api_token,
    price_id,
    email,
    business_name,
    is_valid_request: missing.length === 0,
    missing_fields: missing,
    http_status: missing.length ? 400 : 200,
  }
}];`
);

const verifyTenantCode = `const input = $json;

if (!input.is_valid_request) {
  return [{
    json: {
      ...input,
      authorized: false,
      http_status: 400,
      error: 'Missing required fields',
      details: input.missing_fields,
    }
  }];
}

const supabaseUrl = String($env.SUPABASE_URL || '').trim();
const serviceKey = String($env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

if (!supabaseUrl || !serviceKey) {
  return [{
    json: {
      ...input,
      authorized: false,
      http_status: 500,
      error: 'Missing Supabase env for billing auth',
    }
  }];
}

const qs = [
  ['select', 'tenant_id,api_token,mail,billing_email,stripe_customer_id'],
  ['tenant_id', 'eq.' + input.tenant_id],
  ['api_token', 'eq.' + input.api_token],
  ['limit', '1'],
]
  .map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(value))
  .join('&');

let rows;
try {
  rows = await this.helpers.httpRequest({
    method: 'GET',
    url: supabaseUrl + '/rest/v1/tenants?' + qs,
    headers: {
      apikey: serviceKey,
      Authorization: 'Bearer ' + serviceKey,
    },
    json: true,
  });
} catch (error) {
  return [{
    json: {
      ...input,
      authorized: false,
      http_status: 502,
      error: 'Tenant auth lookup failed',
      provider_error: String(error?.message || error).slice(0, 500),
    }
  }];
}

const tenant = Array.isArray(rows) ? rows[0] : null;

if (!tenant?.tenant_id) {
  return [{
    json: {
      ...input,
      authorized: false,
      http_status: 401,
      error: 'Unauthorized tenant or api_token',
    }
  }];
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
  }
}];`;

setCode('Verify Checkout Tenant', verifyTenantCode);

setCode(
  'Stripe: Create Checkout',
  `const input = $json;
const secretKey = String($env.STRIPE_SECRET_KEY || '').trim();

if (!secretKey) {
  return [{
    json: {
      ...input,
      http_status: 500,
      error: 'Missing STRIPE_SECRET_KEY'
    }
  }];
}

const formBody = [
  ['mode', 'subscription'],
  ['success_url', String($env.STRIPE_SUCCESS_URL || 'https://dashboard.zirel.org?tab=abbonamento&status=success')],
  ['cancel_url', String($env.STRIPE_CANCEL_URL || 'https://dashboard.zirel.org?tab=abbonamento&status=cancel')],
  ['customer_email', input.billing_email || input.email || ''],
  ['client_reference_id', input.tenant_id || ''],
  ['line_items[0][price]', input.price_id || ''],
  ['line_items[0][quantity]', '1'],
  ['metadata[tenant_id]', input.tenant_id || ''],
  ['metadata[billing_email]', input.billing_email || input.email || ''],
  ['metadata[business_name]', input.business_name || ''],
]
  .map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(String(value)))
  .join('&');

let data;
try {
  data = await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.stripe.com/v1/checkout/sessions',
    headers: {
      Authorization: 'Bearer ' + secretKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
    json: true,
  });
} catch (error) {
  return [{
    json: {
      ...input,
      http_status: 502,
      error: 'Stripe checkout creation failed',
      stripe_error: String(error?.message || error).slice(0, 1000),
    }
  }];
}

return [{
  json: {
    ...input,
    url: data.url,
    stripe_checkout_session_id: data.id,
    stripe_raw: data,
    http_status: 200,
  }
}];`
);

setCode(
  'Normalize Portal Request',
  `const source = $json.body || $json || {};
const normalize = (v) => String(v || '').trim();

const tenant_id = normalize(source.tenant_id || source.tenantId);
const api_token = normalize(source.api_token || source.apiToken);

const missing = [];
if (!tenant_id) missing.push('tenant_id');
if (!api_token) missing.push('api_token');

return [{
  json: {
    tenant_id,
    api_token,
    is_valid_request: missing.length === 0,
    missing_fields: missing,
    http_status: missing.length ? 400 : 200,
  }
}];`
);

setCode('Verify Portal Tenant', verifyTenantCode);

setCode(
  'Stripe: Create Portal',
  `const input = $json;
const secretKey = String($env.STRIPE_SECRET_KEY || '').trim();

if (!secretKey) {
  return [{
    json: {
      ...input,
      http_status: 500,
      error: 'Missing STRIPE_SECRET_KEY'
    }
  }];
}

if (!input.stripe_customer_id) {
  return [{
    json: {
      ...input,
      http_status: 400,
      error: 'Missing stripe_customer_id for portal session'
    }
  }];
}

const formBody = [
  ['customer', input.stripe_customer_id],
  ['return_url', String($env.STRIPE_PORTAL_RETURN_URL || $env.STRIPE_SUCCESS_URL || 'https://dashboard.zirel.org?tab=abbonamento')],
]
  .map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(String(value)))
  .join('&');

let data;
try {
  data = await this.helpers.httpRequest({
    method: 'POST',
    url: 'https://api.stripe.com/v1/billing_portal/sessions',
    headers: {
      Authorization: 'Bearer ' + secretKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: formBody,
    json: true,
  });
} catch (error) {
  return [{
    json: {
      ...input,
      http_status: 502,
      error: 'Stripe portal creation failed',
      stripe_error: String(error?.message || error).slice(0, 1000),
    }
  }];
}

return [{
  json: {
    ...input,
    url: data.url,
    stripe_portal_session_id: data.id,
    stripe_raw: data,
    http_status: 200,
  }
}];`
);

fs.writeFileSync(workflowPath, JSON.stringify(workflow, null, 2));
console.log(workflowPath);
