import deauthorizeHandler from '../_meta/deauthorize.js';

export default async function handler(req, res) {
    const action = req.query.action;
    
    switch (action) {
        case 'deauthorize': return deauthorizeHandler(req, res);
        default: return res.status(404).json({ ok: false, error: 'Meta endpoint not found' });
    }
}
