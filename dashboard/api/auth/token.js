import { createSupabaseAdmin, json } from '../_lib/whatsapp-server-auth.js';
import { readSession, setSessionCookie } from '../_lib/auth-session.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return json(res, 405, {
            ok: false,
            error_code: 'METHOD_NOT_ALLOWED',
            error_message: 'Use POST for this endpoint',
        });
    }

    const session = readSession(req);
    if (!session) {
        return json(res, 401, {
            ok: false,
            error_code: 'NOT_AUTHENTICATED',
            error_message: 'No active session',
        });
    }

    const action = String(req.body?.action || '').trim();

    try {
        const supabase = createSupabaseAdmin();

        if (action === 'mark_revealed') {
            const { error } = await supabase
                .from('tenants')
                .update({ api_token_revealed: true })
                .eq('tenant_id', session.tenant_id)
                .eq('api_token', session.api_token);

            if (error) throw error;
            return json(res, 200, { ok: true });
        }

        if (action === 'regenerate') {
            const { data, error } = await supabase.rpc('regenerate_tenant_token', { p_tenant_id: session.tenant_id });
            if (error || !data) throw error || new Error('TOKEN_REGEN_FAILED');
            setSessionCookie(res, {
                tenant_id: session.tenant_id,
                api_token: String(data),
            }, true);
            return json(res, 200, { ok: true, api_token: data });
        }

        return json(res, 400, {
            ok: false,
            error_code: 'INVALID_ACTION',
            error_message: 'Unsupported token action',
        });
    } catch (error) {
        console.error('[auth-token] internal error', error);
        return json(res, 500, {
            ok: false,
            error_code: 'TOKEN_ACTION_FAILED',
            error_message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
