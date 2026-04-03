import registerHandler from '../_public/register.js';
import widgetConfigHandler from '../_public/widget-config.js';

export default async function handler(req, res) {
    const action = req.query.action;
    
    switch (action) {
        case 'register': return registerHandler(req, res);
        case 'widget-config': return widgetConfigHandler(req, res);
        default: return res.status(404).json({ ok: false, error: 'Public endpoint not found' });
    }
}
