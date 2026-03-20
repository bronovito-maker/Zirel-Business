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
        String(requestBody.tenant_id || req.headers['x-zirel-tenant-id'] || req.query?.tenant_id || '').trim() || null;

    if (!apiToken) {
        return { ok: false, status: 401, error_code: 'WHATSAPP_SUMMARY_UNAUTHORIZED', error_message: 'Missing tenant API token' };
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
        return { ok: false, status: 401, error_code: 'WHATSAPP_SUMMARY_UNAUTHORIZED', error_message: 'Invalid tenant API token' };
    }

    return { ok: true, tenant_id: String(data.tenant_id) };
}

function normalizeSummary(row, tenantId) {
    if (!row) {
        return {
            tenant_id: tenantId,
            connection_status: 'not_connected',
        };
    }

    const connectionStatus = String(row.connection_status || '').trim().toLowerCase();
    const derivedStatus = ['not_connected', 'connection_in_progress', 'connected', 'requires_attention', 'error'].includes(connectionStatus)
        ? connectionStatus
        : row.meta_phone_number_id
            ? 'connected'
            : 'not_connected';

    return {
        id: row.id,
        tenant_id: row.tenant_id || tenantId,
        meta_phone_number_id: row.meta_phone_number_id || null,
        credential_mode: row.credential_mode || null,
        credential_provider: row.credential_provider || null,
        access_token_ref: row.access_token_ref || null,
        waba_id: row.waba_id || row.meta_waba_id || row.meta_business_account_id || null,
        display_phone_number: row.display_phone_number || null,
        verified_name: row.verified_name || null,
        connection_status: derivedStatus,
        last_sync_at: row.last_sync_at || null,
        onboarding_error: row.onboarding_error || null,
    };
}

export default async function handler(req, res) {
    if (!['GET', 'POST'].includes(req.method || '')) {
        res.setHeader('Allow', 'GET, POST');
        return json(res, 405, {
            ok: false,
            error_code: 'METHOD_NOT_ALLOWED',
            error_message: 'Use GET or POST for this endpoint',
        });
    }

    let supabase;
    try {
        supabase = createSupabaseAdmin();
    } catch (error) {
        console.error('[whatsapp-channel-summary] env error', error);
        return json(res, 500, {
            ok: false,
            error_code: 'WHATSAPP_SUMMARY_INTERNAL_ERROR',
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
            .select('id, tenant_id, meta_phone_number_id, credential_mode, credential_provider, access_token_ref, meta_business_account_id, meta_waba_id, waba_id, display_phone_number, verified_name, connection_status, last_sync_at, onboarding_error')
            .eq('tenant_id', tenant.tenant_id)
            .order('updated_at', { ascending: false, nullsFirst: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            throw error;
        }

        return json(res, 200, {
            ok: true,
            summary: normalizeSummary(data, tenant.tenant_id),
        });
    } catch (error) {
        console.error('[whatsapp-channel-summary] internal error', {
            tenant_id: tenant.tenant_id,
            error: error instanceof Error ? error.message : String(error),
        });

        return json(res, 500, {
            ok: false,
            error_code: 'WHATSAPP_SUMMARY_INTERNAL_ERROR',
            error_message: error instanceof Error ? error.message : 'Unknown server error',
        });
    }
}
