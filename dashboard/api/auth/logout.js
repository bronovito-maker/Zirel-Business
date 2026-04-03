import { json } from '../_lib/whatsapp-server-auth.js';
import { clearSessionCookie } from '../_lib/auth-session.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return json(res, 405, {
            ok: false,
            error_code: 'METHOD_NOT_ALLOWED',
            error_message: 'Use POST for this endpoint',
        });
    }

    clearSessionCookie(res);
    return json(res, 200, { ok: true });
}
