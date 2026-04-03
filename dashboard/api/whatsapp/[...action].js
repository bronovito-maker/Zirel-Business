import automationSettingsHandler from '../_whatsapp/automation-settings.js';
import channelOpsHandler from '../_whatsapp/channel-ops.js';
import channelSummaryHandler from '../_whatsapp/channel-summary.js';
import disconnectHandler from '../_whatsapp/disconnect.js';
import humanSendHandler from '../_whatsapp/human-send.js';
import syncHandler from '../_whatsapp/sync.js';
import embeddedSignupCallbackHandler from '../_whatsapp/embedded-signup/callback.js';

export default async function handler(req, res) {
    // [...action] comes as an array of path segments in Vercel catch-all routes
    const pathSegments = req.query.action || [];
    const pathString = Array.isArray(pathSegments) ? pathSegments.join('/') : pathSegments;
    
    switch (pathString) {
        case 'automation-settings': return automationSettingsHandler(req, res);
        case 'channel-ops': return channelOpsHandler(req, res);
        case 'channel-summary': return channelSummaryHandler(req, res);
        case 'disconnect': return disconnectHandler(req, res);
        case 'human-send': return humanSendHandler(req, res);
        case 'sync': return syncHandler(req, res);
        case 'embedded-signup/callback': return embeddedSignupCallbackHandler(req, res);
        default: return res.status(404).json({ ok: false, error: 'Whatsapp endpoint not found' });
    }
}
