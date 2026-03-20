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
        return { ok: false, status: 401, error_code: 'WHATSAPP_DISCONNECT_UNAUTHORIZED', error_message: 'Missing tenant API token' };
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
        return { ok: false, status: 401, error_code: 'WHATSAPP_DISCONNECT_UNAUTHORIZED', error_message: 'Invalid tenant API token' };
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
        console.error('[whatsapp-disconnect] env error', error);
        return json(res, 500, {
            ok: false,
            error_code: 'WHATSAPP_DISCONNECT_INTERNAL_ERROR',
            error_message: 'Server environment is not configured',
        });
    }

    const tenant = await resolveTenantId(supabase, req);
    if (!tenant.ok) {
        return json(res, tenant.status, tenant);
    }

    try {
        const { data, error } = await supabase
            .from('tenant_whatsapp_accounts')
            .update({
                meta_phone_number_id: null,
                display_phone_number: null,
                verified_name: null,
                connection_status: 'not_connected',
                onboarding_error: null,
                last_sync_at: new Date().toISOString(),
            })
            .eq('tenant_id', tenant.tenant_id)
            .select('id, tenant_id, connection_status')
            .limit(1)
            .maybeSingle();

        if (error) throw error;

        return json(res, 200, {
            ok: true,
            tenant_id: tenant.tenant_id,
            connection_status: String(data?.connection_status || 'not_connected'),
            next_step: 'refresh_channel_status',
        });
    } catch (error) {
        console.error('[whatsapp-disconnect] internal error', {
            tenant_id: tenant.tenant_id,
            error: error instanceof Error ? error.message : String(error),
        });

        return json(res, 500, {
            ok: false,
            error_code: 'WHATSAPP_DISCONNECT_INTERNAL_ERROR',
            error_message: error instanceof Error ? error.message : 'Unknown server error',
        });
    }
}
