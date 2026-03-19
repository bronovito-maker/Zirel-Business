export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'GET') {
      return handleMetaChallenge(url, env);
    }

    if (request.method === 'POST') {
      return handleMetaWebhook(request, env);
    }

    return jsonResponse({ error: 'Method Not Allowed' }, 405);
  },
};

async function handleMetaChallenge(url, env) {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  if (mode !== 'subscribe') {
    return new Response('Unsupported hub.mode', { status: 400 });
  }

  if (!env.META_VERIFY_TOKEN) {
    return new Response('Missing META_VERIFY_TOKEN', { status: 500 });
  }

  if (token !== env.META_VERIFY_TOKEN) {
    return new Response('Forbidden', { status: 403 });
  }

  return new Response(challenge || '', {
    status: 200,
    headers: {
      'content-type': 'text/plain; charset=utf-8',
    },
  });
}

async function handleMetaWebhook(request, env) {
  if (!env.META_APP_SECRET) {
    return jsonResponse({ error: 'Missing META_APP_SECRET' }, 500);
  }

  if (!env.N8N_WHATSAPP_WEBHOOK_URL) {
    return jsonResponse({ error: 'Missing N8N_WHATSAPP_WEBHOOK_URL' }, 500);
  }

  const signatureHeader = request.headers.get('x-hub-signature-256') || '';
  if (!signatureHeader.startsWith('sha256=')) {
    return jsonResponse({ error: 'Missing or invalid x-hub-signature-256' }, 401);
  }

  const rawBody = await request.arrayBuffer();
  const isValid = await verifyMetaSignature(rawBody, env.META_APP_SECRET, signatureHeader);
  if (!isValid) {
    return jsonResponse({ error: 'Invalid signature' }, 403);
  }

  const forwardHeaders = buildForwardHeaders(request.headers, env);
  const forwardResponse = await fetch(env.N8N_WHATSAPP_WEBHOOK_URL, {
    method: 'POST',
    headers: forwardHeaders,
    body: rawBody,
  });

  const bodyText = await forwardResponse.text();
  return new Response(bodyText, {
    status: forwardResponse.status,
    headers: {
      'content-type': forwardResponse.headers.get('content-type') || 'application/json; charset=utf-8',
    },
  });
}

function buildForwardHeaders(sourceHeaders, env) {
  const headers = new Headers();

  const contentType = sourceHeaders.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  const contentLength = sourceHeaders.get('content-length');
  if (contentLength) headers.set('content-length', contentLength);

  headers.set('x-zirel-wa-verified', 'true');
  headers.set('x-zirel-wa-proxy', 'cloudflare-worker');

  const originalSignature = sourceHeaders.get('x-hub-signature-256');
  if (originalSignature) headers.set('x-hub-signature-256', originalSignature);

  const userAgent = sourceHeaders.get('user-agent');
  if (userAgent) headers.set('user-agent', userAgent);

  if (env.INTERNAL_FORWARD_SECRET) {
    headers.set('x-zirel-forward-secret', env.INTERNAL_FORWARD_SECRET);
  }

  return headers;
}

async function verifyMetaSignature(rawBody, appSecret, signatureHeader) {
  const providedHex = signatureHeader.slice('sha256='.length).trim().toLowerCase();
  if (!providedHex) return false;

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(appSecret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, rawBody);
  const expectedHex = toHex(signature);

  return timingSafeEqual(expectedHex, providedHex);
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
    },
  });
}
