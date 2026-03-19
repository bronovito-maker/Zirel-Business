import http from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env.PORT || 3000);
const META_APP_SECRET = String(process.env.META_APP_SECRET || '').trim();
const META_VERIFY_TOKEN = String(process.env.META_VERIFY_TOKEN || '').trim();
const N8N_WHATSAPP_WEBHOOK_URL = String(process.env.N8N_WHATSAPP_WEBHOOK_URL || '').trim();
const INTERNAL_FORWARD_SECRET = String(process.env.INTERNAL_FORWARD_SECRET || '').trim();

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    if (req.method === 'GET') {
      return handleMetaChallenge(url, res);
    }

    if (req.method === 'POST') {
      return await handleMetaWebhook(req, res);
    }

    return writeJson(res, 405, { error: 'Method Not Allowed' });
  } catch (error) {
    return writeJson(res, 500, { error: 'Unhandled proxy error', detail: String(error?.message || error) });
  }
});

server.listen(PORT, () => {
  console.log(`WhatsApp webhook proxy listening on port ${PORT}`);
});

function handleMetaChallenge(url, res) {
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge') || '';

  if (mode !== 'subscribe') {
    return writeText(res, 400, 'Unsupported hub.mode');
  }

  if (!META_VERIFY_TOKEN) {
    return writeText(res, 500, 'Missing META_VERIFY_TOKEN');
  }

  if (token !== META_VERIFY_TOKEN) {
    return writeText(res, 403, 'Forbidden');
  }

  return writeText(res, 200, challenge);
}

async function handleMetaWebhook(req, res) {
  if (!META_APP_SECRET) {
    return writeJson(res, 500, { error: 'Missing META_APP_SECRET' });
  }

  if (!N8N_WHATSAPP_WEBHOOK_URL) {
    return writeJson(res, 500, { error: 'Missing N8N_WHATSAPP_WEBHOOK_URL' });
  }

  const signatureHeader = String(req.headers['x-hub-signature-256'] || '').trim();
  if (!signatureHeader.startsWith('sha256=')) {
    return writeJson(res, 401, { error: 'Missing or invalid x-hub-signature-256' });
  }

  const rawBody = await readRawBody(req);
  const signatureIsValid = verifyMetaSignature(rawBody, META_APP_SECRET, signatureHeader);
  if (!signatureIsValid) {
    return writeJson(res, 403, { error: 'Invalid signature' });
  }

  const forwardHeaders = buildForwardHeaders(req.headers, rawBody);
  const forwardResponse = await fetch(N8N_WHATSAPP_WEBHOOK_URL, {
    method: 'POST',
    headers: forwardHeaders,
    body: rawBody,
  });

  const responseText = await forwardResponse.text();
  res.writeHead(forwardResponse.status, {
    'content-type': forwardResponse.headers.get('content-type') || 'application/json; charset=utf-8',
  });
  res.end(responseText);
}

function buildForwardHeaders(sourceHeaders, rawBody) {
  const headers = new Headers();

  const contentType = sourceHeaders['content-type'];
  if (contentType) headers.set('content-type', Array.isArray(contentType) ? contentType[0] : contentType);

  headers.set('content-length', String(rawBody.length));
  headers.set('x-zirel-wa-verified', 'true');
  headers.set('x-zirel-wa-proxy', 'railway-proxy');

  const originalSignature = sourceHeaders['x-hub-signature-256'];
  if (originalSignature) headers.set('x-hub-signature-256', Array.isArray(originalSignature) ? originalSignature[0] : originalSignature);

  const userAgent = sourceHeaders['user-agent'];
  if (userAgent) headers.set('user-agent', Array.isArray(userAgent) ? userAgent[0] : userAgent);

  if (INTERNAL_FORWARD_SECRET) {
    headers.set('x-zirel-forward-secret', INTERNAL_FORWARD_SECRET);
  }

  return headers;
}

function verifyMetaSignature(rawBody, appSecret, signatureHeader) {
  const providedHex = signatureHeader.slice('sha256='.length).trim().toLowerCase();
  if (!providedHex) return false;

  const expectedHex = createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const expected = Buffer.from(expectedHex, 'utf8');
  const provided = Buffer.from(providedHex, 'utf8');

  if (expected.length !== provided.length) return false;
  return timingSafeEqual(expected, provided);
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];

    req.on('data', (chunk) => {
      chunks.push(chunk);
    });

    req.on('end', () => {
      resolve(Buffer.concat(chunks));
    });

    req.on('error', (error) => {
      reject(error);
    });
  });
}

function writeJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
  });
  res.end(JSON.stringify(payload));
}

function writeText(res, status, text) {
  res.writeHead(status, {
    'content-type': 'text/plain; charset=utf-8',
  });
  res.end(text);
}
