import { createSupabaseAdmin, json } from '../_lib/whatsapp-server-auth.js';
import { setSessionCookie } from '../_lib/auth-session.js';

function normalizeString(value) {
    return String(value || '').trim();
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

    const token = normalizeString(req.body?.token);
    const persistence = normalizeString(req.body?.persistence) === 'persistent';

    if (!token || token.length < 12) {
        return json(res, 400, {
            ok: false,
            error_code: 'INVALID_FORMAT',
            error_message: 'Token format is invalid',
        });
    }

    try {
        const supabase = createSupabaseAdmin();
        const { data, error } = await supabase
            .from('tenants')
            .select('tenant_id, api_token')
            .eq('api_token', token)
            .single();

        if (error || !data?.tenant_id || !data?.api_token) {
            return json(res, 401, {
                ok: false,
                error_code: 'AUTH_FAILED',
                error_message: 'Invalid credentials',
            });
        }

        setSessionCookie(res, {
            tenant_id: String(data.tenant_id),
            api_token: String(data.api_token),
        }, persistence);

        return json(res, 200, {
            ok: true,
            tenant_id: String(data.tenant_id),
            auth_mode: 'cookie',
        });
    } catch (error) {
        console.error('[auth-login] internal error', error);
        return json(res, 500, {
            ok: false,
            error_code: 'CONNECTION_ERROR',
            error_message: 'Authentication backend unavailable',
        });
    }
}
