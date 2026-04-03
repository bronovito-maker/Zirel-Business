import { createSupabaseAdmin, json } from '../_lib/whatsapp-server-auth.js';
import { readSession } from '../_lib/auth-session.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        return json(res, 405, {
            ok: false,
            error_code: 'METHOD_NOT_ALLOWED',
            error_message: 'Use GET for this endpoint',
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

    try {
        const supabase = createSupabaseAdmin();
        const { data, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('tenant_id', session.tenant_id)
            .eq('api_token', session.api_token)
            .single();

        if (error || !data) throw error || new Error('TENANT_NOT_FOUND');

        return json(res, 200, {
            ok: true,
            tenant: data,
        });
    } catch (error) {
        console.error('[auth-tenant] internal error', error);
        return json(res, 500, {
            ok: false,
            error_code: 'TENANT_FETCH_FAILED',
            error_message: error instanceof Error ? error.message : 'Unknown error',
        });
    }
}
