import { createSupabaseAdmin, json, resolveTenantId } from '../_lib/whatsapp-server-auth.js';

function normalizeBoolean(value, fallback = true) {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'on', 'yes'].includes(normalized)) return true;
        if (['false', '0', 'off', 'no'].includes(normalized)) return false;
    }
    return fallback;
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
        return json(res, 500, {
            ok: false,
            error_code: 'WHATSAPP_AUTOMATION_INTERNAL_ERROR',
            error_message: 'Server environment is not configured',
        });
    }

    const tenant = await resolveTenantId(supabase, req, 'WHATSAPP_AUTOMATION_UNAUTHORIZED');
    if (!tenant.ok) {
        return json(res, tenant.status, tenant);
    }

    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const aiEnabled = normalizeBoolean(body.ai_enabled, true);

    try {
        const { error: updateError } = await supabase
            .from('tenant_whatsapp_accounts')
            .update({
                ai_enabled: aiEnabled,
                updated_at: new Date().toISOString(),
            })
            .eq('tenant_id', tenant.tenant_id);

        if (updateError) throw updateError;

        const { data, error: readError } = await supabase
            .from('tenant_whatsapp_accounts')
            .select('tenant_id, ai_enabled, human_handoff_enabled')
            .eq('tenant_id', tenant.tenant_id)
            .order('updated_at', { ascending: false, nullsFirst: false })
            .limit(1)
            .maybeSingle();

        if (readError) throw readError;

        return json(res, 200, {
            ok: true,
            tenant_id: tenant.tenant_id,
            ai_enabled: data?.ai_enabled !== false,
            human_handoff_enabled: data?.human_handoff_enabled !== false,
        });
    } catch (error) {
        return json(res, 500, {
            ok: false,
            error_code: 'WHATSAPP_AUTOMATION_INTERNAL_ERROR',
            error_message: error instanceof Error ? error.message : 'Unknown server error',
        });
    }
}
