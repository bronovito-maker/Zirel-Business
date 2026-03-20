function cleanString(value) {
    const normalized = String(value ?? '').trim();
    return normalized || null;
}

function sanitizeRef(value) {
    return String(value || '').trim().replace(/[^A-Za-z0-9_]/g, '_').toUpperCase();
}

export function resolveGraphAccessToken(account, env = process.env) {
    if (!account || typeof account !== 'object') return null;

    const accessTokenRef = cleanString(account.access_token_ref);
    const directPlatform =
        cleanString(env.WHATSAPP_PLATFORM_ACCESS_TOKEN) ||
        cleanString(env.WHATSAPP_ACCESS_TOKEN) ||
        null;

    if (String(account.credential_mode || '').trim().toLowerCase() === 'platform_managed') {
        if (directPlatform) return directPlatform;
    }

    if (accessTokenRef) {
        if (accessTokenRef.startsWith('env:')) {
            const envName = accessTokenRef.slice(4).trim();
            if (envName && cleanString(env[envName])) {
                return cleanString(env[envName]);
            }
        }

        const refEnvName = `WHATSAPP_TOKEN_REF_${sanitizeRef(accessTokenRef)}`;
        if (cleanString(env[refEnvName])) {
            return cleanString(env[refEnvName]);
        }
    }

    return directPlatform;
}

export async function fetchMetaPhoneProfile({ phoneNumberId, accessToken, graphVersion, fetchImpl = fetch }) {
    const normalizedPhoneId = cleanString(phoneNumberId);
    const normalizedToken = cleanString(accessToken);
    const normalizedVersion = cleanString(graphVersion) || 'v23.0';

    if (!normalizedPhoneId) {
        throw new Error('MISSING_META_PHONE_NUMBER_ID');
    }

    if (!normalizedToken) {
        throw new Error('MISSING_META_ACCESS_TOKEN');
    }

    const url = new URL(`https://graph.facebook.com/${normalizedVersion}/${encodeURIComponent(normalizedPhoneId)}`);
    url.searchParams.set('fields', 'id,display_phone_number,verified_name,quality_rating');

    const response = await fetchImpl(url.toString(), {
        method: 'GET',
        headers: {
            Authorization: `Bearer ${normalizedToken}`,
            'Content-Type': 'application/json',
        },
    });

    let body = null;
    try {
        body = await response.json();
    } catch {
        body = null;
    }

    if (!response.ok) {
        const details =
            body?.error?.message ||
            body?.message ||
            `META_GRAPH_HTTP_${response.status}`;
        throw new Error(`META_PHONE_PROFILE_FAILED:${details}`);
    }

    return {
        meta_phone_number_id: cleanString(body?.id) || normalizedPhoneId,
        display_phone_number: cleanString(body?.display_phone_number),
        verified_name: cleanString(body?.verified_name),
        quality_rating: cleanString(body?.quality_rating),
    };
}

export async function syncTenantWhatsAppAccount(supabase, row, env = process.env) {
    const phoneNumberId = cleanString(row?.meta_phone_number_id);
    if (!phoneNumberId || !row?.id) {
        return { ok: false, reason: 'missing_account_or_phone_id' };
    }

    const accessToken = resolveGraphAccessToken(row, env);
    if (!accessToken) {
        return { ok: false, reason: 'missing_access_token' };
    }

    const profile = await fetchMetaPhoneProfile({
        phoneNumberId,
        accessToken,
        graphVersion: env.WHATSAPP_GRAPH_VERSION || 'v23.0',
    });

    const patch = {
        display_phone_number: profile.display_phone_number,
        verified_name: profile.verified_name,
        quality_rating: profile.quality_rating,
        connection_status: 'connected',
        onboarding_error: null,
        last_sync_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from('tenant_whatsapp_accounts')
        .update(patch)
        .eq('id', row.id)
        .select('id, tenant_id, meta_phone_number_id, waba_id, display_phone_number, verified_name, quality_rating, connection_status, last_sync_at, last_webhook_at, webhook_verified_at, onboarding_error')
        .single();

    if (error || !data) {
        throw error || new Error('SYNC_UPDATE_FAILED');
    }

    return { ok: true, data };
}
