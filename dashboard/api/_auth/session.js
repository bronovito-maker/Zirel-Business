import { json } from '../_lib/whatsapp-server-auth.js';
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

    return json(res, 200, {
        ok: true,
        tenant_id: session.tenant_id,
        auth_mode: 'cookie',
    });
}
