const KNOWN_CONNECTION_STATUSES = new Set([
    'not_connected',
    'connection_in_progress',
    'connected',
    'requires_attention',
    'error',
]);

function cleanString(value: unknown): string | null {
    const normalized = String(value ?? '').trim();
    return normalized || null;
}

export function extractBearerToken(headerValue: unknown): string | null {
    const raw = cleanString(headerValue);
    if (!raw) return null;

    const match = /^Bearer\s+(.+)$/i.exec(raw);
    return cleanString(match?.[1] || raw);
}

export function normalizeConnectionStatus(value: unknown): string {
    const normalized = cleanString(value)?.toLowerCase();
    if (normalized && KNOWN_CONNECTION_STATUSES.has(normalized)) {
        return normalized;
    }

    return 'connected';
}

export type EmbeddedSignupPayloadNormalizationResult =
    | {
          ok: true;
          data: {
              signup_session_id: string | null;
              business_id: string | null;
              meta_phone_number_id: string;
              waba_id: string;
              display_phone_number: string | null;
              verified_name: string | null;
              connection_status: string;
              credential_mode: string;
              credential_provider: string;
              replace_existing: boolean;
          };
      }
    | {
          ok: false;
          error_code: string;
          error_message: string;
      };

export function normalizeEmbeddedSignupPayload(payload: unknown): EmbeddedSignupPayloadNormalizationResult {
    const source = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};

    const metaPhoneNumberId =
        cleanString(source.meta_phone_number_id) ||
        cleanString(source.phone_number_id) ||
        cleanString(source.phoneNumberId);

    if (!metaPhoneNumberId) {
        return {
            ok: false,
            error_code: 'WHATSAPP_SIGNUP_INVALID_PAYLOAD',
            error_message: 'Missing meta_phone_number_id',
        };
    }

    const wabaId =
        cleanString(source.waba_id) ||
        cleanString(source.whatsapp_business_account_id) ||
        cleanString(source.whatsappBusinessAccountId);

    if (!wabaId) {
        return {
            ok: false,
            error_code: 'WHATSAPP_SIGNUP_INVALID_PAYLOAD',
            error_message: 'Missing waba_id',
        };
    }

    return {
        ok: true,
        data: {
            signup_session_id:
                cleanString(source.signup_session_id) ||
                cleanString(source.session_id) ||
                cleanString(source.signupSessionId),
            business_id:
                cleanString(source.business_id) ||
                cleanString(source.businessId),
            meta_phone_number_id: metaPhoneNumberId,
            waba_id: wabaId,
            display_phone_number:
                cleanString(source.display_phone_number) ||
                cleanString(source.displayPhoneNumber),
            verified_name:
                cleanString(source.verified_name) ||
                cleanString(source.verifiedName),
            connection_status: normalizeConnectionStatus(
                source.connection_status ?? source.connection_state ?? source.connectionState
            ),
            credential_mode: cleanString(source.credential_mode) || 'platform_managed',
            credential_provider: cleanString(source.credential_provider) || 'n8n_credentials',
            replace_existing: source.replace_existing === true || source.replaceExisting === true,
        },
    };
}
