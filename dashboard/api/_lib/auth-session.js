import crypto from 'node:crypto';

const COOKIE_NAME = 'zirel_session';
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const PERSISTENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret() {
    const secret = process.env.AUTH_SESSION_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!secret) {
        throw new Error('MISSING_AUTH_SESSION_SECRET');
    }
    return secret;
}

function base64urlEncode(value) {
    return Buffer.from(value).toString('base64url');
}

function base64urlDecode(value) {
    return Buffer.from(value, 'base64url').toString('utf8');
}

function sign(payload) {
    return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

function parseCookies(req) {
    const raw = String(req.headers.cookie || '');
    if (!raw) return {};

    return Object.fromEntries(
        raw
            .split(';')
            .map((entry) => entry.trim())
            .filter(Boolean)
            .map((entry) => {
                const index = entry.indexOf('=');
                return index === -1
                    ? [entry, '']
                    : [entry.slice(0, index), decodeURIComponent(entry.slice(index + 1))];
            }),
    );
}

export function createSessionValue(session, persistent = false) {
    const ttl = persistent ? PERSISTENT_TTL_MS : SESSION_TTL_MS;
    const payload = base64urlEncode(JSON.stringify({
        ...session,
        exp: Date.now() + ttl,
    }));
    const signature = sign(payload);
    return `${payload}.${signature}`;
}

export function readSession(req) {
    try {
        const cookies = parseCookies(req);
        const raw = cookies[COOKIE_NAME];
        if (!raw) return null;

        const [payload, signature] = raw.split('.');
        if (!payload || !signature || sign(payload) !== signature) {
            return null;
        }

        const parsed = JSON.parse(base64urlDecode(payload));
        if (!parsed?.tenant_id || !parsed?.api_token || !parsed?.exp || parsed.exp < Date.now()) {
            return null;
        }

        return parsed;
    } catch {
        return null;
    }
}

export function setSessionCookie(res, session, persistent = false) {
    const ttl = persistent ? PERSISTENT_TTL_MS : SESSION_TTL_MS;
    const parts = [
        `${COOKIE_NAME}=${encodeURIComponent(createSessionValue(session, persistent))}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
        'Secure',
        `Max-Age=${Math.floor(ttl / 1000)}`,
    ];

    res.setHeader('Set-Cookie', parts.join('; '));
}

export function clearSessionCookie(res) {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=0`);
}

export function getSessionCookieName() {
    return COOKIE_NAME;
}
