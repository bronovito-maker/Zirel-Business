import crypto from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const DASHBOARD_BASE_URL = 'https://dashboard.zirel.org';
const TRIAL_DAYS = 7;

function setCorsHeaders(req, res) {
    const origin = String(req.headers.origin || '').trim();
    const allowedOrigin = /^https?:\/\/([a-z0-9-]+\.)*zirel\.org$/i.test(origin) || /^http:\/\/localhost:\d+$/i.test(origin)
        ? origin
        : 'https://zirel.org';

    res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function json(req, res, status, body) {
    setCorsHeaders(req, res);
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

function normalizeEmail(value) {
    return normalizeString(value).toLowerCase();
}

function normalizeUrl(value) {
    const raw = normalizeString(value);
    if (!raw) return '';

    try {
        const candidate = raw.startsWith('http://') || raw.startsWith('https://') ? raw : `https://${raw}`;
        const url = new URL(candidate);
        return url.toString();
    } catch {
        return '';
    }
}

function slugify(value) {
    return normalizeString(value)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '')
        .replace(/_{2,}/g, '_')
        .slice(0, 48);
}

function mapBusinessType(rawValue) {
    const normalized = normalizeString(rawValue).toLowerCase();

    if (normalized.includes('hotel') || normalized.includes('albergo')) {
        return 'hotel';
    }

    if (normalized.includes('ristor') || normalized.includes('bar')) {
        return 'restaurant';
    }

    return 'professional';
}

function buildTenantDefaults({ businessName, businessType, email, website, tenantId, apiToken, nowIso, trialEndsAt }) {
    const basePayload = {
        tenant_id: tenantId,
        api_token: apiToken,
        api_token_revealed: false,
        api_token_generated_at: nowIso,
        subscription_status: 'trialing',
        trial_ends_at: trialEndsAt,
        nome_attivita: businessName,
        mail: email,
        billing_email: email,
        notification_email: email,
        internal_email: email,
        sito_web_url: website || null,
        widget_title: businessName,
        widget_color: '#FF8C42',
    };

    if (businessType === 'hotel') {
        return {
            ...basePayload,
            business_type: 'hotel',
            hotel_name: businessName,
            widget_subtitle: 'Reception online',
            widget_icon: '🏨',
        };
    }

    if (businessType === 'restaurant') {
        return {
            ...basePayload,
            business_type: 'restaurant',
            nome_ristorante: businessName,
            widget_subtitle: 'Prenotazioni e richieste',
            widget_icon: '🍝',
        };
    }

    return {
        ...basePayload,
        business_type: 'professional',
        widget_subtitle: 'Assistente online',
        widget_icon: '💬',
    };
}

async function tenantExists(supabase, tenantId) {
    const { data, error } = await supabase
        .from('tenants')
        .select('tenant_id')
        .eq('tenant_id', tenantId)
        .maybeSingle();

    if (error) throw error;
    return Boolean(data?.tenant_id);
}

async function generateUniqueTenantId(supabase, businessName) {
    const base = slugify(businessName) || 'tenant';
    const prefix = `zrl_${base}`.slice(0, 64);

    for (let attempt = 0; attempt < 25; attempt += 1) {
        const suffix = attempt === 0 ? '' : `_${crypto.randomBytes(2).toString('hex')}`;
        const candidate = `${prefix}${suffix}`.slice(0, 72);

        if (!(await tenantExists(supabase, candidate))) {
            return candidate;
        }
    }

    throw new Error('TENANT_ID_GENERATION_FAILED');
}

async function queueTokenEmail(supabase, { tenantId, businessName, email, apiToken, nowIso }) {
    const payload = {
        tenant_id: tenantId,
        business_name: businessName,
        api_token: apiToken,
        email,
        billing_email: email,
        dashboard_url: `${DASHBOARD_BASE_URL}?tab=sicurezza`,
    };

    const outboxRow = {
        tenant_id: tenantId,
        channel: 'email_tenant_security',
        template_key: 'tenant_api_token_created',
        related_entity_type: 'tenant',
        related_entity_id: tenantId,
        status: 'pending',
        retry_count: 0,
        max_retries: 5,
        next_retry_at: nowIso,
        trace_id: `tenant-signup:${tenantId}:${nowIso}`,
        recipient_email: email,
        dedupe_key: `${tenantId}:tenant_api_token_created:${nowIso}`,
        payload,
    };

    const { error } = await supabase.from('notification_outbox').insert(outboxRow);
    if (error) throw error;
}

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        setCorsHeaders(req, res);
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST, OPTIONS');
        return json(req, res, 405, {
            ok: false,
            error_code: 'METHOD_NOT_ALLOWED',
            error_message: 'Use POST for this endpoint',
        });
    }

    let supabase;
    try {
        supabase = createSupabaseAdmin();
    } catch (error) {
        console.error('[public-register] env error', error);
        return json(req, res, 500, {
            ok: false,
            error_code: 'PUBLIC_REGISTER_ENV_ERROR',
            error_message: 'Server environment is not configured',
        });
    }

    try {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const businessName = normalizeString(body.business_name);
        const email = normalizeEmail(body.email);
        const website = normalizeUrl(body.website);
        const businessType = mapBusinessType(body.business_type);

        const missingFields = [];
        if (!businessName) missingFields.push('business_name');
        if (!email) missingFields.push('email');

        if (missingFields.length > 0) {
            return json(req, res, 400, {
                ok: false,
                error_code: 'MISSING_REQUIRED_FIELDS',
                error_message: 'Compila i campi obbligatori per continuare',
                missing_fields: missingFields,
            });
        }

        const now = new Date();
        const nowIso = now.toISOString();
        const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
        const tenantId = await generateUniqueTenantId(supabase, businessName);
        const apiToken = crypto.randomBytes(18).toString('hex');

        const tenantPayload = buildTenantDefaults({
            businessName,
            businessType,
            email,
            website,
            tenantId,
            apiToken,
            nowIso,
            trialEndsAt,
        });

        const { error: tenantInsertError } = await supabase
            .from('tenants')
            .insert(tenantPayload);

        if (tenantInsertError) {
            throw tenantInsertError;
        }

        let emailQueued = true;
        try {
            await queueTokenEmail(supabase, {
                tenantId,
                businessName,
                email,
                apiToken,
                nowIso,
            });
        } catch (emailError) {
            emailQueued = false;
            console.error('[public-register] token email enqueue failed', {
                tenant_id: tenantId,
                error: emailError instanceof Error ? emailError.message : String(emailError),
            });
        }

        return json(req, res, 201, {
            ok: true,
            tenant_id: tenantId,
            business_name: businessName,
            business_type: businessType,
            trial_ends_at: trialEndsAt,
            email_queued: emailQueued,
            login_url: `${DASHBOARD_BASE_URL}?signup=ok&email=${encodeURIComponent(email)}`,
        });
    } catch (error) {
        console.error('[public-register] internal error', error);
        return json(req, res, 500, {
            ok: false,
            error_code: 'PUBLIC_REGISTER_INTERNAL_ERROR',
            error_message: error instanceof Error ? error.message : 'Unknown server error',
        });
    }
}
