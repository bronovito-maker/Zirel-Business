import { createClient } from '@supabase/supabase-js';

const DEFAULT_WIDGET_COLOR = '#FF8C42';
const DASHBOARD_BASE_URL = 'https://dashboard.zirel.org';

function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(res, status, body) {
    setCorsHeaders(res);
    res.status(status).setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(JSON.stringify(body));
}

function createSupabaseAdmin() {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('MISSING_SUPABASE_SERVER_ENV');
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

function normalizeString(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
}

function sanitizeTenantId(value) {
    const raw = normalizeString(value);
    return /^[a-z0-9_:-]{3,80}$/i.test(raw) ? raw : '';
}

function normalizeQuickReplies(rawValue) {
    if (Array.isArray(rawValue)) {
        return rawValue
            .map((item) => {
                if (typeof item === 'string') {
                    const value = normalizeString(item);
                    return value ? { label: value, prompt: value } : null;
                }

                if (!item || typeof item !== 'object') return null;

                const label = normalizeString(item.label);
                const prompt = normalizeString(item.prompt || item.message || label);
                if (!label || !prompt) return null;

                return { label, prompt };
            })
            .filter(Boolean)
            .slice(0, 4);
    }

    if (typeof rawValue === 'string' && rawValue.trim()) {
        try {
            return normalizeQuickReplies(JSON.parse(rawValue));
        } catch {
            return rawValue
                .split('\n')
                .map((line) => normalizeString(line))
                .filter(Boolean)
                .slice(0, 4)
                .map((value) => ({ label: value, prompt: value }));
        }
    }

    return [];
}

function normalizeTeaserMessages(rawValue) {
    if (Array.isArray(rawValue)) {
        return rawValue
            .map((item) => normalizeString(typeof item === 'string' ? item : item?.message || item?.label))
            .filter(Boolean)
            .slice(0, 4);
    }

    if (typeof rawValue === 'string' && rawValue.trim()) {
        try {
            return normalizeTeaserMessages(JSON.parse(rawValue));
        } catch {
            return rawValue
                .split('\n')
                .map((line) => normalizeString(line))
                .filter(Boolean)
                .slice(0, 4);
        }
    }

    return [];
}

function buildDefaultWelcomeMessage(row, title) {
    const businessType = normalizeString(row.business_type).toLowerCase();

    if (businessType === 'restaurant') {
        return `Ciao! Sono l'assistente di ${title}. Posso aiutarti con prenotazioni, orari e informazioni utili del locale.`;
    }

    if (businessType === 'hotel') {
        return `Ciao! Sono l'assistente di ${title}. Posso aiutarti con richieste soggiorno, camere e informazioni utili sulla struttura.`;
    }

    return `Ciao! Sono l'assistente di ${title}. Posso aiutarti con informazioni, richieste e appuntamenti.`;
}

function buildDefaultQuickReplies(row) {
    const businessType = normalizeString(row.business_type).toLowerCase();

    if (businessType === 'restaurant') {
        return [
            { label: '🍽️ Prenota un tavolo', prompt: 'Vorrei prenotare un tavolo' },
            { label: '🕒 Orari del locale', prompt: 'Quali sono i vostri orari?' },
            { label: '📍 Come arrivare', prompt: 'Mi mandi il link per arrivare al locale?' },
        ];
    }

    if (businessType === 'hotel') {
        return [
            { label: '🛏️ Richiesta soggiorno', prompt: 'Vorrei fare una richiesta soggiorno' },
            { label: '🕒 Check-in / Check-out', prompt: 'Quali sono gli orari di check-in e check-out?' },
            { label: '📍 Come arrivare', prompt: 'Mi mandi il link per arrivare in struttura?' },
        ];
    }

    return [
        { label: '📞 Contatto rapido', prompt: 'Vorrei un contatto rapido' },
        { label: '🛠️ Richiedi un intervento', prompt: 'Vorrei richiedere un intervento' },
        { label: '📅 Fissa un appuntamento', prompt: 'Vorrei fissare un appuntamento' },
    ];
}

function buildDefaultTeaserMessages(row) {
    const businessType = normalizeString(row.business_type).toLowerCase();

    if (businessType === 'restaurant') {
        return [
            'Hai fame? Ti aiuto subito con tavoli e orari. 🍽️',
            'Prenotare un tavolo richiede un attimo. 💬',
            'Se vuoi, ti mando subito orari e indicazioni. 📍',
        ];
    }

    if (businessType === 'hotel') {
        return [
            'Cerchi una camera? Ti aiuto subito. 🛎️',
            'Posso aiutarti con soggiorni, orari e informazioni. 💬',
            'Vuoi inviare una richiesta soggiorno? Ci siamo. ✨',
        ];
    }

    return [
        'Hai una domanda? Ti aiuto subito. 💬',
        'Posso raccogliere richieste e appuntamenti in un attimo. ✨',
        'Scrivimi pure: ti rispondo subito. 🚀',
    ];
}

function buildPublicWidgetConfig(row) {
    const businessName =
        normalizeString(row.widget_title) ||
        normalizeString(row.nome_attivita) ||
        normalizeString(row.nome_ristorante) ||
        normalizeString(row.hotel_name) ||
        normalizeString(row.tenant_id) ||
        'Zirèl Assistant';

    const quickReplies =
        normalizeQuickReplies(row.widget_quick_replies) ||
        normalizeQuickReplies(row.widget_quick_replies_json);
    const teaserMessages =
        normalizeTeaserMessages(row.widget_teaser_messages) ||
        normalizeTeaserMessages(row.widget_teaser_messages_json);

    return {
        tenant_id: normalizeString(row.tenant_id),
        service_status: normalizeString(row.service_status || 'active').toLowerCase() || 'active',
        service_public_message:
            normalizeString(row.service_public_message) ||
            'Il servizio chat di questa struttura è temporaneamente non disponibile. Per assistenza contatta direttamente la struttura.',
        disabled: normalizeString(row.service_status || 'active').toLowerCase() !== 'active',
        widget_title: businessName,
        widget_subtitle: normalizeString(row.widget_subtitle) || 'Assistente online',
        widget_color: normalizeString(row.widget_color) || DEFAULT_WIDGET_COLOR,
        widget_icon: normalizeString(row.widget_icon) || '💬',
        welcome_message:
            normalizeString(row.widget_welcome_message) ||
            buildDefaultWelcomeMessage(row, businessName),
        quick_replies: quickReplies.length ? quickReplies : buildDefaultQuickReplies(row),
        teaser_messages: teaserMessages.length ? teaserMessages : buildDefaultTeaserMessages(row),
        links: {
            website: normalizeString(row.sito_web_url) || '',
            maps: normalizeString(row.google_maps_link) || '',
            booking: normalizeString(row.link_booking_esterno || row.link_prenotazione_tavoli) || '',
            dashboard: DASHBOARD_BASE_URL,
        },
    };
}

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(res);
        return res.status(204).end();
    }

    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET, OPTIONS');
        return json(res, 405, {
            ok: false,
            error_code: 'METHOD_NOT_ALLOWED',
            error_message: 'Use GET for this endpoint',
        });
    }

    const tenantId = sanitizeTenantId(req.query?.tenant_id);
    if (!tenantId) {
        return json(res, 400, {
            ok: false,
            error_code: 'MISSING_TENANT_ID',
            error_message: 'tenant_id is required',
        });
    }

    let supabase;
    try {
        supabase = createSupabaseAdmin();
    } catch (error) {
        console.error('[widget-config] env error', error);
        return json(res, 500, {
            ok: false,
            error_code: 'WIDGET_CONFIG_ENV_ERROR',
            error_message: 'Server environment is not configured',
        });
    }

    try {
        const { data, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('tenant_id', tenantId)
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            return json(res, 404, {
                ok: false,
                error_code: 'TENANT_NOT_FOUND',
                error_message: 'Tenant not found',
            });
        }

        const serviceStatus = normalizeString(data.service_status || 'active').toLowerCase() || 'active';
        const disabled = serviceStatus !== 'active';

        return json(res, 200, {
            ok: true,
            disabled,
            service_status: serviceStatus,
            service_public_message:
                normalizeString(data.service_public_message) ||
                'Il servizio chat di questa struttura è temporaneamente non disponibile. Per assistenza contatta direttamente la struttura.',
            config: buildPublicWidgetConfig(data),
        });
    } catch (error) {
        console.error('[widget-config] internal error', error);
        return json(res, 500, {
            ok: false,
            error_code: 'WIDGET_CONFIG_INTERNAL_ERROR',
            error_message: 'Unable to load widget config',
        });
    }
}
