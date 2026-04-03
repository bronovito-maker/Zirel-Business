import { createClient } from '@supabase/supabase-js';
import { extractBearerToken } from '../_lib/whatsapp-embedded-signup.js';

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

async function resolveTenantId(supabase, req) {
    const requestBody = req.body && typeof req.body === 'object' ? req.body : {};
    const authHeader = req.headers.authorization;
    const apiToken =
        extractBearerToken(requestBody.tenant_api_token) ||
        extractBearerToken(authHeader) ||
        extractBearerToken(req.headers['x-zirel-api-token']);
    const expectedTenantId =
        String(requestBody.tenant_id || req.headers['x-zirel-tenant-id'] || '').trim() || null;

    if (!apiToken) {
        return { ok: false, status: 401, error_code: 'WHATSAPP_OPS_UNAUTHORIZED', error_message: 'Missing tenant API token' };
    }

    let query = supabase
        .from('tenants')
        .select('tenant_id')
        .eq('api_token', apiToken);

    if (expectedTenantId) {
        query = query.eq('tenant_id', expectedTenantId);
    }

    const { data, error } = await query.single();

    if (error || !data?.tenant_id) {
        return { ok: false, status: 401, error_code: 'WHATSAPP_OPS_UNAUTHORIZED', error_message: 'Invalid tenant API token' };
    }

    return { ok: true, tenant_id: String(data.tenant_id) };
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return json(res, 405, {
            ok: false,
            error_code: 'METHOD_NOT_ALLOWED',
            error_message: 'Use POST for this endpoint',
        });
    }

    let supabase;
    try {
        supabase = createSupabaseAdmin();
    } catch (error) {
        console.error('[whatsapp-channel-ops] env error', error);
        return json(res, 500, {
            ok: false,
            error_code: 'WHATSAPP_OPS_INTERNAL_ERROR',
            error_message: 'Server environment is not configured',
        });
    }

    const tenant = await resolveTenantId(supabase, req);
    if (!tenant.ok) {
        return json(res, tenant.status, tenant);
    }

    try {
        const [failedOutboundResult, webhookEventsResult] = await Promise.all([
            supabase
                .from('conversation_messages')
                .select('id, conversation_id, processing_status, delivery_status, error_message, created_at, failed_at')
                .eq('tenant_id', tenant.tenant_id)
                .eq('channel', 'whatsapp')
                .eq('direction', 'outbound')
                .eq('processing_status', 'error')
                .order('created_at', { ascending: false })
                .limit(5),
            supabase
                .from('channel_webhook_events')
                .select('id, event_type, event_status, error_message, created_at')
                .eq('channel', 'whatsapp')
                .order('created_at', { ascending: false })
                .limit(5),
        ]);

        if (failedOutboundResult.error) throw failedOutboundResult.error;
        if (webhookEventsResult.error) throw webhookEventsResult.error;

        return json(res, 200, {
            ok: true,
            tenant_id: tenant.tenant_id,
            failed_outbound: failedOutboundResult.data || [],
            recent_webhook_events: webhookEventsResult.data || [],
        });
    } catch (error) {
        console.error('[whatsapp-channel-ops] internal error', {
            tenant_id: tenant.tenant_id,
            error: error instanceof Error ? error.message : String(error),
        });

        return json(res, 500, {
            ok: false,
            error_code: 'WHATSAPP_OPS_INTERNAL_ERROR',
            error_message: error instanceof Error ? error.message : 'Unknown server error',
        });
    }
}
