import { createSupabaseAdmin, json, resolveTenantId } from '../_lib/whatsapp-server-auth.js';

function normalizeSummary(row, tenantId) {
    if (!row) {
        return {
            tenant_id: tenantId,
            connection_status: 'not_connected',
        };
    }

    const connectionStatus = String(row.connection_status || '').trim().toLowerCase();
    const hasPhoneId = Boolean(row.meta_phone_number_id);
    const hasDisplayPhone = Boolean(row.display_phone_number);
    const hasVerifiedName = Boolean(row.verified_name);
    const hasBlockingError = Boolean(row.onboarding_error);

    let derivedStatus = ['not_connected', 'connection_in_progress', 'connected', 'requires_attention', 'error'].includes(connectionStatus)
        ? connectionStatus
        : hasPhoneId
            ? 'connected'
            : 'not_connected';

    if (derivedStatus === 'connected' && (!hasDisplayPhone || !hasVerifiedName)) {
        derivedStatus = 'requires_attention';
    }

    if (hasBlockingError) {
        derivedStatus = 'error';
    }

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
        ai_enabled: row.ai_enabled !== false,
        human_handoff_enabled: row.human_handoff_enabled !== false,
        last_sync_at: row.last_sync_at || null,
        last_webhook_at: row.last_webhook_at || null,
        webhook_verified_at: row.webhook_verified_at || null,
        onboarding_error: row.onboarding_error || null,
    };
}

export default async function handler(req, res) {
    if (!['POST'].includes(req.method || '')) {
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
        console.error('[whatsapp-channel-summary] env error', error);
        return json(res, 500, {
            ok: false,
            error_code: 'WHATSAPP_SUMMARY_INTERNAL_ERROR',
            error_message: 'Server environment is not configured',
        });
    }

    const tenant = await resolveTenantId(supabase, req, 'WHATSAPP_SUMMARY_UNAUTHORIZED');
    if (!tenant.ok) {
        return json(res, tenant.status, tenant);
    }

    try {
        const { data, error } = await supabase
            .from('tenant_whatsapp_accounts')
            .select('id, tenant_id, meta_phone_number_id, credential_mode, credential_provider, access_token_ref, meta_business_account_id, meta_waba_id, waba_id, display_phone_number, verified_name, connection_status, ai_enabled, human_handoff_enabled, last_sync_at, last_webhook_at, webhook_verified_at, onboarding_error')
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
