import { createClient } from '@supabase/supabase-js';
import {
    extractBearerToken,
    normalizeEmbeddedSignupPayload,
} from '../../_lib/whatsapp-embedded-signup.js';
import { syncTenantWhatsAppAccount } from '../../_lib/whatsapp-channel-sync.js';

function cleanString(value) {
    const normalized = String(value ?? '').trim();
    return normalized || null;
}

function collectNestedIds(source, matcher, results = new Set()) {
    if (!source || typeof source !== 'object') return results;
    const record = source;

    for (const [key, value] of Object.entries(record)) {
        const lowerKey = String(key).toLowerCase();
        if (matcher(lowerKey, value)) {
            if (Array.isArray(value)) {
                value.forEach((item) => {
                    const id = cleanString(item?.id);
                    if (id) results.add(id);
                });
            } else if (value && typeof value === 'object') {
                const id = cleanString(value.id);
                if (id) results.add(id);
            } else {
                const id = cleanString(value);
                if (id) results.add(id);
            }
        }

        if (value && typeof value === 'object') {
            collectNestedIds(value, matcher, results);
        }
    }

    return results;
}

function json(res, status, body) {
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

function getMetaConfig() {
    return {
        appId: cleanString(process.env.META_APP_ID) || cleanString(process.env.VITE_META_APP_ID),
        appSecret:
            cleanString(process.env.META_APP_SECRET) ||
            cleanString(process.env.FACEBOOK_APP_SECRET) ||
            cleanString(process.env.APP_SECRET),
        apiVersion:
            cleanString(process.env.META_API_VERSION) ||
            cleanString(process.env.VITE_META_API_VERSION) ||
            'v25.0',
        redirectUri:
            cleanString(process.env.META_EMBEDDED_SIGNUP_REDIRECT_URI) ||
            cleanString(process.env.WHATSAPP_EMBEDDED_SIGNUP_REDIRECT_URI),
    };
}

async function metaGraphRequest({ path, accessToken, apiVersion, method = 'GET', body, searchParams }) {
    const version = cleanString(apiVersion) || 'v25.0';
    const url = new URL(`https://graph.facebook.com/${version}/${String(path || '').replace(/^\/+/, '')}`);

    if (searchParams && typeof searchParams === 'object') {
        Object.entries(searchParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null && String(value).trim() !== '') {
                url.searchParams.set(key, String(value));
            }
        });
    }

    const response = await fetch(url.toString(), {
        method,
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok) {
        const details =
            payload?.error?.message ||
            payload?.message ||
            `META_GRAPH_HTTP_${response.status}`;
        throw new Error(`META_GRAPH_REQUEST_FAILED:${details}`);
    }

    return payload;
}

async function exchangeSignupCodeForAccessToken(signupCode) {
    const code = cleanString(signupCode);
    const config = getMetaConfig();

    if (!code) {
        throw new Error('MISSING_SIGNUP_CODE');
    }

    if (!config.appId || !config.appSecret) {
        throw new Error('MISSING_META_APP_CONFIG');
    }

    const url = new URL(`https://graph.facebook.com/${config.apiVersion}/oauth/access_token`);
    url.searchParams.set('client_id', config.appId);
    url.searchParams.set('client_secret', config.appSecret);
    url.searchParams.set('code', code);
    if (config.redirectUri) {
        url.searchParams.set('redirect_uri', config.redirectUri);
    }

    const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    let payload = null;
    try {
        payload = await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok) {
        const details =
            payload?.error?.message ||
            payload?.message ||
            `META_OAUTH_HTTP_${response.status}`;
        throw new Error(`META_CODE_EXCHANGE_FAILED:${details}`);
    }

    const accessToken = cleanString(payload?.access_token);
    if (!accessToken) {
        throw new Error('META_CODE_EXCHANGE_MISSING_ACCESS_TOKEN');
    }

    return {
        accessToken,
        tokenType: cleanString(payload?.token_type),
        expiresIn: payload?.expires_in ?? null,
    };
}

async function discoverWabaIds({ accessToken, apiVersion, preferredBusinessId }) {
    const wabaIds = new Set();
    const businessIds = new Set();

    if (preferredBusinessId) {
        businessIds.add(preferredBusinessId);
    }

    const meFieldCandidates = [
        'id,name,businesses{id,name},whatsapp_business_accounts{id,name}',
        'id,name,businesses{id,name}',
        'id,name',
    ];

    for (const fields of meFieldCandidates) {
        try {
            const mePayload = await metaGraphRequest({
                path: 'me',
                accessToken,
                apiVersion,
                searchParams: { fields },
            });

            collectNestedIds(
                mePayload,
                (key) => key.includes('whatsapp_business_account'),
                wabaIds
            );
            collectNestedIds(
                mePayload,
                (key) => key === 'businesses',
                businessIds
            );
            break;
        } catch (error) {
            console.warn('[whatsapp-embedded-signup] me lookup skipped', {
                fields,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    for (const businessId of businessIds) {
        const businessFieldCandidates = [
            'owned_whatsapp_business_accounts{id,name},client_whatsapp_business_accounts{id,name},whatsapp_business_accounts{id,name}',
            'whatsapp_business_accounts{id,name}',
            'owned_whatsapp_business_accounts{id,name}',
            'client_whatsapp_business_accounts{id,name}',
        ];

        for (const fields of businessFieldCandidates) {
            try {
                const businessPayload = await metaGraphRequest({
                    path: String(businessId),
                    accessToken,
                    apiVersion,
                    searchParams: { fields },
                });

                collectNestedIds(
                    businessPayload,
                    (key) => key.includes('whatsapp_business_account'),
                    wabaIds
                );

                if (wabaIds.size) break;
            } catch (error) {
                console.warn('[whatsapp-embedded-signup] business lookup skipped', {
                    business_id: businessId,
                    fields,
                    error: error instanceof Error ? error.message : String(error),
                });
            }
        }
    }

    return Array.from(wabaIds);
}

async function fetchPhoneNumbersForWaba({ accessToken, apiVersion, wabaId }) {
    const payload = await metaGraphRequest({
        path: `${wabaId}/phone_numbers`,
        accessToken,
        apiVersion,
        searchParams: {
            fields: 'id,display_phone_number,verified_name,quality_rating',
        },
    });

    return Array.isArray(payload?.data) ? payload.data : [];
}

async function resolveEmbeddedSignupFromCode(rawPayload) {
    const signupCode =
        cleanString(rawPayload?.signup_code) ||
        cleanString(rawPayload?.code) ||
        cleanString(rawPayload?.signup_session_id);

    if (!signupCode) {
        return null;
    }

    const metaConfig = getMetaConfig();
    const exchange = await exchangeSignupCodeForAccessToken(signupCode);
    const preferredBusinessId =
        cleanString(rawPayload?.business_id) ||
        cleanString(rawPayload?.businessId);
    const wabaIds = await discoverWabaIds({
        accessToken: exchange.accessToken,
        apiVersion: metaConfig.apiVersion,
        preferredBusinessId,
    });

    if (!wabaIds.length) {
        throw new Error('META_SIGNUP_DISCOVERY_FAILED:missing_waba_id');
    }

    for (const wabaId of wabaIds) {
        try {
            const phoneNumbers = await fetchPhoneNumbersForWaba({
                accessToken: exchange.accessToken,
                apiVersion: metaConfig.apiVersion,
                wabaId,
            });

            const firstPhone = Array.isArray(phoneNumbers) ? phoneNumbers[0] : null;
            const metaPhoneNumberId = cleanString(firstPhone?.id);
            if (!metaPhoneNumberId) continue;

            return {
                ok: true,
                data: {
                    signup_session_id:
                        cleanString(rawPayload?.signup_session_id) ||
                        cleanString(rawPayload?.session_id) ||
                        cleanString(rawPayload?.signupSessionId),
                    business_id: preferredBusinessId,
                    meta_phone_number_id: metaPhoneNumberId,
                    waba_id: wabaId,
                    display_phone_number: cleanString(firstPhone?.display_phone_number),
                    verified_name: cleanString(firstPhone?.verified_name),
                    connection_status: 'connected',
                    credential_mode: 'platform_managed',
                    credential_provider: 'n8n_credentials',
                    replace_existing: rawPayload?.replace_existing === true || rawPayload?.replaceExisting === true,
                },
                access_token: exchange.accessToken,
            };
        } catch (error) {
            console.warn('[whatsapp-embedded-signup] phone discovery skipped', {
                waba_id: wabaId,
                error: error instanceof Error ? error.message : String(error),
            });
        }
    }

    throw new Error('META_SIGNUP_DISCOVERY_FAILED:missing_phone_number_id');
}

async function resolveTenantId(supabase, req) {
    const requestBody = req.body && typeof req.body === 'object' ? req.body : {};
    const authHeader = req.headers.authorization;
    const apiToken =
        extractBearerToken(requestBody.tenant_api_token) ||
        extractBearerToken(authHeader) ||
        extractBearerToken(req.headers['x-zirel-api-token']);
    const expectedTenantId =
        String(requestBody.tenant_id || req.headers['x-zirel-tenant-id'] || '').trim() || null;

    if (!apiToken) {
        return { ok: false, status: 401, error_code: 'WHATSAPP_SIGNUP_UNAUTHORIZED', error_message: 'Missing tenant API token' };
    }

    let query = supabase
        .from('tenants')
        .select('tenant_id')
        .eq('api_token', apiToken);

    if (expectedTenantId) {
        query = query.eq('tenant_id', expectedTenantId);
    }

    const { data, error } = await query.single();

    if (error || !data?.tenant_id) {
        return { ok: false, status: 401, error_code: 'WHATSAPP_SIGNUP_UNAUTHORIZED', error_message: 'Invalid tenant API token' };
    }

    return { ok: true, tenant_id: String(data.tenant_id) };
}

async function findConflicts(supabase, tenantId, normalized) {
    const { data: phoneConflict, error: phoneConflictError } = await supabase
        .from('tenant_whatsapp_accounts')
        .select('id, tenant_id, meta_phone_number_id')
        .eq('meta_phone_number_id', normalized.meta_phone_number_id)
        .neq('tenant_id', tenantId)
        .limit(1)
        .maybeSingle();

    if (phoneConflictError) {
        throw phoneConflictError;
    }

    if (phoneConflict?.id) {
        return {
            ok: false,
            status: 409,
            error_code: 'WHATSAPP_SIGNUP_PHONE_CONFLICT',
            error_message: 'This WhatsApp number is already connected to another tenant',
        };
    }

    const { data: existingTenantRows, error: existingTenantError } = await supabase
        .from('tenant_whatsapp_accounts')
        .select('id, tenant_id, meta_phone_number_id')
        .eq('tenant_id', tenantId)
        .order('id', { ascending: true });

    if (existingTenantError) {
        throw existingTenantError;
    }

    const existingRows = Array.isArray(existingTenantRows) ? existingTenantRows : [];
    const exactMatch = existingRows.find((row) => String(row.meta_phone_number_id || '') === normalized.meta_phone_number_id) || null;
    const currentActive = existingRows[0] || null;

    if (!exactMatch && currentActive?.id && !normalized.replace_existing) {
        return {
            ok: false,
            status: 409,
            error_code: 'WHATSAPP_SIGNUP_ALREADY_CONNECTED',
            error_message: 'Tenant already has a WhatsApp number connected. Retry with replace_existing=true to replace it.',
        };
    }

    return {
        ok: true,
        targetRowId: exactMatch?.id || currentActive?.id || null,
    };
}

function buildUpsertPayload(tenantId, normalized, targetRowId) {
    const payload = {
        tenant_id: tenantId,
        meta_phone_number_id: normalized.meta_phone_number_id,
        credential_mode: normalized.credential_mode,
        credential_provider: normalized.credential_provider,
        waba_id: normalized.waba_id,
        display_phone_number: normalized.display_phone_number,
        verified_name: normalized.verified_name,
        connection_status: normalized.connection_status,
        onboarding_error: null,
        last_sync_at: new Date().toISOString(),
    };

    if (targetRowId) {
        return { id: targetRowId, ...payload };
    }

    return payload;
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

    let supabase;
    try {
        supabase = createSupabaseAdmin();
    } catch (error) {
        console.error('[whatsapp-embedded-signup] env error', error);
        return json(res, 500, {
            ok: false,
            error_code: 'WHATSAPP_SIGNUP_INTERNAL_ERROR',
            error_message: 'Server environment is not configured',
        });
    }

    const tenant = await resolveTenantId(supabase, req);
    if (!tenant.ok) {
        console.warn('[whatsapp-embedded-signup] unauthorized', {
            error_code: tenant.error_code,
        });
        return json(res, tenant.status, tenant);
    }

    let normalized = normalizeEmbeddedSignupPayload(req.body);
    let exchangedAccessToken = null;
    let codeExchangeFailure = null;
    if (!normalized.ok) {
        try {
            const resolved = await resolveEmbeddedSignupFromCode(req.body);
            if (resolved?.ok) {
                normalized = resolved;
                exchangedAccessToken = resolved.access_token || null;
            }
        } catch (exchangeError) {
            codeExchangeFailure = exchangeError instanceof Error ? exchangeError.message : String(exchangeError);
            console.warn('[whatsapp-embedded-signup] code exchange failed', {
                tenant_id: tenant.tenant_id,
                error: codeExchangeFailure,
            });
        }
    }

    if (!normalized.ok) {
        if (codeExchangeFailure) {
            return json(res, 400, {
                ok: false,
                error_code: 'WHATSAPP_SIGNUP_CODE_EXCHANGE_FAILED',
                error_message: codeExchangeFailure,
            });
        }
        console.warn('[whatsapp-embedded-signup] invalid payload', {
            tenant_id: tenant.tenant_id,
            error_code: normalized.error_code,
        });
        return json(res, 400, { ok: false, ...normalized });
    }

    try {
        const conflictCheck = await findConflicts(supabase, tenant.tenant_id, normalized.data);
        if (!conflictCheck.ok) {
            console.warn('[whatsapp-embedded-signup] conflict', {
                tenant_id: tenant.tenant_id,
                meta_phone_number_id: normalized.data.meta_phone_number_id,
                error_code: conflictCheck.error_code,
            });
            return json(res, conflictCheck.status, conflictCheck);
        }

        const payload = buildUpsertPayload(tenant.tenant_id, normalized.data, conflictCheck.targetRowId);
        const { data, error } = await supabase
            .from('tenant_whatsapp_accounts')
            .upsert(payload, {
                onConflict: 'id',
            })
            .select('id, tenant_id, meta_phone_number_id, credential_mode, credential_provider, access_token_ref, waba_id, display_phone_number, verified_name, quality_rating, connection_status, last_sync_at, last_webhook_at, webhook_verified_at, onboarding_error')
            .single();

        if (error || !data) {
            throw error || new Error('UPSERT_FAILED');
        }

        let enriched = data;
        try {
            const syncResult = await syncTenantWhatsAppAccount(supabase, data, process.env);
            if (syncResult.ok && syncResult.data) {
                enriched = syncResult.data;
            }
        } catch (syncError) {
            console.warn('[whatsapp-embedded-signup] post-upsert sync skipped', {
                tenant_id: tenant.tenant_id,
                meta_phone_number_id: normalized.data.meta_phone_number_id,
                error: syncError instanceof Error ? syncError.message : String(syncError),
            });
        }

        console.info('[whatsapp-embedded-signup] completed', {
            tenant_id: tenant.tenant_id,
            meta_phone_number_id: normalized.data.meta_phone_number_id,
            waba_id: normalized.data.waba_id,
            signup_session_id: normalized.data.signup_session_id,
            resolved_via_code_exchange: Boolean(exchangedAccessToken),
        });

        return json(res, 200, {
            ok: true,
            tenant_id: String(enriched.tenant_id),
            connection_status: String(enriched.connection_status || normalized.data.connection_status),
            meta_phone_number_id: String(enriched.meta_phone_number_id || normalized.data.meta_phone_number_id),
            waba_id: String(enriched.waba_id || normalized.data.waba_id),
            display_phone_number: enriched.display_phone_number || normalized.data.display_phone_number,
            verified_name: enriched.verified_name || normalized.data.verified_name,
            next_step: 'refresh_channel_status',
        });
    } catch (error) {
        console.error('[whatsapp-embedded-signup] internal error', {
            tenant_id: tenant.tenant_id,
            error: error instanceof Error ? error.message : String(error),
        });

        return json(res, 500, {
            ok: false,
            connection_status: 'error',
            error_code: 'WHATSAPP_SIGNUP_INTERNAL_ERROR',
            error_message: error instanceof Error ? error.message : 'Unknown server error',
        });
    }
}
