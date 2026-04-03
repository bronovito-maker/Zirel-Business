import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

function json(res, status, body) {
    res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(JSON.stringify(body));
}

function createSupabaseAdmin() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('MISSING_SUPABASE_SERVER_ENV');
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

function cleanString(value) {
    const normalized = String(value ?? '').trim();
    return normalized || null;
}

function decodeBase64Url(value) {
    if (!value) return null;
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    return Buffer.from(normalized + padding, 'base64');
}

function parseSignedRequest(signedRequest, appSecret) {
    const raw = cleanString(signedRequest);
    if (!raw) return null;

    const parts = raw.split('.');
    if (parts.length !== 2) {
        throw new Error('INVALID_SIGNED_REQUEST_FORMAT');
    }

    const [encodedSignature, encodedPayload] = parts;
    const signature = decodeBase64Url(encodedSignature);
    const payloadBuffer = decodeBase64Url(encodedPayload);

    if (!signature || !payloadBuffer) {
        throw new Error('INVALID_SIGNED_REQUEST_ENCODING');
    }

    const expected = crypto.createHmac('sha256', appSecret).update(encodedPayload).digest();

    if (expected.length !== signature.length || !crypto.timingSafeEqual(expected, signature)) {
        throw new Error('INVALID_SIGNED_REQUEST_SIGNATURE');
    }

    return JSON.parse(payloadBuffer.toString('utf8'));
}

async function readRequestBody(req) {
    if (req.body && typeof req.body === 'object') {
        return req.body;
    }

    if (typeof req.body === 'string') {
        const params = new URLSearchParams(req.body);
        return Object.fromEntries(params.entries());
    }

    const chunks = [];
    for await (const chunk of req) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const raw = Buffer.concat(chunks).toString('utf8');
    if (!raw) return {};

    const contentType = String(req.headers['content-type'] || '').toLowerCase();
    if (contentType.includes('application/json')) {
        return JSON.parse(raw);
    }

    const params = new URLSearchParams(raw);
    return Object.fromEntries(params.entries());
}

async function markChannelRequiresAttention(supabase, identifiers) {
    const { tenantId, metaPhoneNumberId, wabaId } = identifiers;

    let query = supabase
        .from('tenant_whatsapp_accounts')
        .update({
            connection_status: 'requires_attention',
            onboarding_error: 'META_DEAUTHORIZED',
            last_sync_at: new Date().toISOString(),
        });

    if (tenantId) {
        query = query.eq('tenant_id', tenantId);
    } else if (metaPhoneNumberId) {
        query = query.eq('meta_phone_number_id', metaPhoneNumberId);
    } else if (wabaId) {
        query = query.or(`waba_id.eq.${wabaId},meta_waba_id.eq.${wabaId},meta_business_account_id.eq.${wabaId}`);
    } else {
        return { updated: false, reason: 'NO_MATCHING_IDENTIFIER' };
    }

    const { data, error } = await query.select('id, tenant_id, connection_status').limit(1).maybeSingle();

    if (error) throw error;

    return {
        updated: Boolean(data?.id),
        tenant_id: data?.tenant_id || null,
        connection_status: data?.connection_status || 'requires_attention',
    };
}

export default async function handler(req, res) {
    if (req.method === 'GET') {
        return json(res, 200, {
            ok: true,
            endpoint: 'meta_deauthorize',
            status: 'ready',
            hint: 'Use POST with signed_request from Meta or explicit identifiers for internal testing.',
        });
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'GET, POST');
        return json(res, 405, {
            ok: false,
            error_code: 'METHOD_NOT_ALLOWED',
            error_message: 'Use GET or POST for this endpoint',
        });
    }

    let body;
    try {
        body = await readRequestBody(req);
    } catch (error) {
        return json(res, 400, {
            ok: false,
            error_code: 'META_DEAUTHORIZE_INVALID_BODY',
            error_message: error instanceof Error ? error.message : 'Invalid request body',
        });
    }

    const appSecret = process.env.META_APP_SECRET || process.env.FACEBOOK_APP_SECRET || null;
    const signedRequest = cleanString(body.signed_request);
    let signedPayload = null;

    if (signedRequest) {
        if (!appSecret) {
            return json(res, 500, {
                ok: false,
                error_code: 'META_DEAUTHORIZE_MISSING_APP_SECRET',
                error_message: 'META_APP_SECRET is required to verify signed_request payloads',
            });
        }

        try {
            signedPayload = parseSignedRequest(signedRequest, appSecret);
        } catch (error) {
            return json(res, 401, {
                ok: false,
                error_code: 'META_DEAUTHORIZE_INVALID_SIGNATURE',
                error_message: error instanceof Error ? error.message : 'Invalid signed_request',
            });
        }
    }

    let supabase;
    try {
        supabase = createSupabaseAdmin();
    } catch (error) {
        console.error('[meta-deauthorize] env error', error);
        return json(res, 500, {
            ok: false,
            error_code: 'META_DEAUTHORIZE_INTERNAL_ERROR',
            error_message: 'Server environment is not configured',
        });
    }

    const identifiers = {
        tenantId: cleanString(body.tenant_id) || cleanString(body.tenantId) || null,
        metaPhoneNumberId:
            cleanString(body.meta_phone_number_id) ||
            cleanString(body.phone_number_id) ||
            cleanString(body.phoneNumberId) ||
            null,
        wabaId:
            cleanString(body.waba_id) ||
            cleanString(body.whatsapp_business_account_id) ||
            cleanString(body.whatsappBusinessAccountId) ||
            null,
    };

    try {
        const result = await markChannelRequiresAttention(supabase, identifiers);

        console.info('[meta-deauthorize] processed', {
            tenant_id: result.tenant_id || identifiers.tenantId,
            updated: result.updated,
            has_signed_request: Boolean(signedPayload),
            user_id: signedPayload?.user_id || null,
        });

        return json(res, 200, {
            ok: true,
            status: 'received',
            updated: result.updated,
            tenant_id: result.tenant_id || identifiers.tenantId,
            connection_status: result.connection_status || 'requires_attention',
            data_deletion_url: 'https://dashboard.zirel.org/meta/data-deletion',
        });
    } catch (error) {
        console.error('[meta-deauthorize] internal error', {
            error: error instanceof Error ? error.message : String(error),
        });

        return json(res, 500, {
            ok: false,
            error_code: 'META_DEAUTHORIZE_INTERNAL_ERROR',
            error_message: error instanceof Error ? error.message : 'Unknown server error',
        });
    }
}
