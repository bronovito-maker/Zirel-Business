import loginHandler from '../_auth/login.js';
import logoutHandler from '../_auth/logout.js';
import sessionHandler from '../_auth/session.js';
import tenantHandler from '../_auth/tenant.js';
import tokenHandler from '../_auth/token.js';

export default async function handler(req, res) {
    const action = req.query.action;
    
    switch (action) {
        case 'login': return loginHandler(req, res);
        case 'logout': return logoutHandler(req, res);
        case 'session': return sessionHandler(req, res);
        case 'tenant': return tenantHandler(req, res);
        case 'token': return tokenHandler(req, res);
        default: return res.status(404).json({ ok: false, error: 'Auth endpoint not found' });
    }
}
