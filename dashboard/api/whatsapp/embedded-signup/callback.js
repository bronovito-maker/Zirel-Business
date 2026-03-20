import { createClient } from '@supabase/supabase-js';
import {
    extractBearerToken,
    normalizeEmbeddedSignupPayload,
} from '../../_lib/whatsapp-embedded-signup.js';
import { syncTenantWhatsAppAccount } from '../../_lib/whatsapp-channel-sync.js';

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
        return { ok: false, status: 401, error_code: 'WHATSAPP_SIGNUP_UNAUTHORIZED', error_message: 'Missing tenant API token' };
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
        return { ok: false, status: 401, error_code: 'WHATSAPP_SIGNUP_UNAUTHORIZED', error_message: 'Invalid tenant API token' };
    }

    return { ok: true, tenant_id: String(data.tenant_id) };
}

async function findConflicts(supabase, tenantId, normalized) {
    const { data: phoneConflict, error: phoneConflictError } = await supabase
        .from('tenant_whatsapp_accounts')
        .select('id, tenant_id, meta_phone_number_id')
        .eq('meta_phone_number_id', normalized.meta_phone_number_id)
        .neq('tenant_id', tenantId)
        .limit(1)
        .maybeSingle();

    if (phoneConflictError) {
        throw phoneConflictError;
    }

    if (phoneConflict?.id) {
        return {
            ok: false,
            status: 409,
            error_code: 'WHATSAPP_SIGNUP_PHONE_CONFLICT',
            error_message: 'This WhatsApp number is already connected to another tenant',
        };
    }

    const { data: existingTenantRows, error: existingTenantError } = await supabase
        .from('tenant_whatsapp_accounts')
        .select('id, tenant_id, meta_phone_number_id')
        .eq('tenant_id', tenantId)
        .order('id', { ascending: true });

    if (existingTenantError) {
        throw existingTenantError;
    }

    const existingRows = Array.isArray(existingTenantRows) ? existingTenantRows : [];
    const exactMatch = existingRows.find((row) => String(row.meta_phone_number_id || '') === normalized.meta_phone_number_id) || null;
    const currentActive = existingRows[0] || null;

    if (!exactMatch && currentActive?.id && !normalized.replace_existing) {
        return {
            ok: false,
            status: 409,
            error_code: 'WHATSAPP_SIGNUP_ALREADY_CONNECTED',
            error_message: 'Tenant already has a WhatsApp number connected. Retry with replace_existing=true to replace it.',
        };
    }

    return {
        ok: true,
        targetRowId: exactMatch?.id || currentActive?.id || null,
    };
}

function buildUpsertPayload(tenantId, normalized, targetRowId) {
    const payload = {
        tenant_id: tenantId,
        meta_phone_number_id: normalized.meta_phone_number_id,
        credential_mode: normalized.credential_mode,
        credential_provider: normalized.credential_provider,
        waba_id: normalized.waba_id,
        display_phone_number: normalized.display_phone_number,
        verified_name: normalized.verified_name,
        connection_status: normalized.connection_status,
        onboarding_error: null,
        last_sync_at: new Date().toISOString(),
    };

    if (targetRowId) {
        return { id: targetRowId, ...payload };
    }

    return payload;
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
        console.error('[whatsapp-embedded-signup] env error', error);
        return json(res, 500, {
            ok: false,
            error_code: 'WHATSAPP_SIGNUP_INTERNAL_ERROR',
            error_message: 'Server environment is not configured',
        });
    }

    const tenant = await resolveTenantId(supabase, req);
    if (!tenant.ok) {
        console.warn('[whatsapp-embedded-signup] unauthorized', {
            error_code: tenant.error_code,
        });
        return json(res, tenant.status, tenant);
    }

    const normalized = normalizeEmbeddedSignupPayload(req.body);
    if (!normalized.ok) {
        console.warn('[whatsapp-embedded-signup] invalid payload', {
            tenant_id: tenant.tenant_id,
            error_code: normalized.error_code,
        });
        return json(res, 400, { ok: false, ...normalized });
    }

    try {
        const conflictCheck = await findConflicts(supabase, tenant.tenant_id, normalized.data);
        if (!conflictCheck.ok) {
            console.warn('[whatsapp-embedded-signup] conflict', {
                tenant_id: tenant.tenant_id,
                meta_phone_number_id: normalized.data.meta_phone_number_id,
                error_code: conflictCheck.error_code,
            });
            return json(res, conflictCheck.status, conflictCheck);
        }

        const payload = buildUpsertPayload(tenant.tenant_id, normalized.data, conflictCheck.targetRowId);
        const { data, error } = await supabase
            .from('tenant_whatsapp_accounts')
            .upsert(payload, {
                onConflict: 'id',
            })
            .select('id, tenant_id, meta_phone_number_id, credential_mode, credential_provider, access_token_ref, waba_id, display_phone_number, verified_name, quality_rating, connection_status, last_sync_at, last_webhook_at, webhook_verified_at, onboarding_error')
            .single();

        if (error || !data) {
            throw error || new Error('UPSERT_FAILED');
        }

        let enriched = data;
        try {
            const syncResult = await syncTenantWhatsAppAccount(supabase, data, process.env);
            if (syncResult.ok && syncResult.data) {
                enriched = syncResult.data;
            }
        } catch (syncError) {
            console.warn('[whatsapp-embedded-signup] post-upsert sync skipped', {
                tenant_id: tenant.tenant_id,
                meta_phone_number_id: normalized.data.meta_phone_number_id,
                error: syncError instanceof Error ? syncError.message : String(syncError),
            });
        }

        console.info('[whatsapp-embedded-signup] completed', {
            tenant_id: tenant.tenant_id,
            meta_phone_number_id: normalized.data.meta_phone_number_id,
            waba_id: normalized.data.waba_id,
            signup_session_id: normalized.data.signup_session_id,
        });

        return json(res, 200, {
            ok: true,
            tenant_id: String(enriched.tenant_id),
            connection_status: String(enriched.connection_status || normalized.data.connection_status),
            meta_phone_number_id: String(enriched.meta_phone_number_id || normalized.data.meta_phone_number_id),
            waba_id: String(enriched.waba_id || normalized.data.waba_id),
            display_phone_number: enriched.display_phone_number || normalized.data.display_phone_number,
            verified_name: enriched.verified_name || normalized.data.verified_name,
            next_step: 'refresh_channel_status',
        });
    } catch (error) {
        console.error('[whatsapp-embedded-signup] internal error', {
            tenant_id: tenant.tenant_id,
            error: error instanceof Error ? error.message : String(error),
        });

        return json(res, 500, {
            ok: false,
            connection_status: 'error',
            error_code: 'WHATSAPP_SIGNUP_INTERNAL_ERROR',
            error_message: error instanceof Error ? error.message : 'Unknown server error',
        });
    }
}
