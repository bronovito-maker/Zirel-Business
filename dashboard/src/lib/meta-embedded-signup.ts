declare global {
    interface Window {
        fbAsyncInit?: () => void;
        FB?: {
            init: (params: Record<string, unknown>) => void;
            login: (
                callback: (response: Record<string, unknown>) => void,
                options?: Record<string, unknown>
            ) => void;
        };
    }
}

let sdkLoadPromise: Promise<void> | null = null;

export interface EmbeddedSignupLaunchResult {
    code?: string | null;
    event?: Record<string, unknown> | null;
}

export interface EmbeddedSignupIdentifiers {
    meta_phone_number_id?: string | null;
    waba_id?: string | null;
    business_id?: string | null;
    display_phone_number?: string | null;
    verified_name?: string | null;
}

const META_SDK_URL = 'https://connect.facebook.net/en_US/sdk.js';

const getRequiredEnv = (key: string) => String(import.meta.env[key] || '').trim();

export const getEmbeddedSignupConfig = () => ({
    appId: getRequiredEnv('VITE_META_APP_ID'),
    configId: getRequiredEnv('VITE_META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID'),
    apiVersion: getRequiredEnv('VITE_META_API_VERSION') || 'v25.0',
    flowVersion: getRequiredEnv('VITE_META_EMBEDDED_SIGNUP_FLOW_VERSION') || '2',
});

export const isEmbeddedSignupConfigured = () => {
    const config = getEmbeddedSignupConfig();
    return Boolean(config.appId && config.configId);
};

export const loadFacebookSdk = async (): Promise<void> => {
    if (window.FB) return;
    if (sdkLoadPromise) return sdkLoadPromise;

    const config = getEmbeddedSignupConfig();
    if (!config.appId) {
        throw new Error('VITE_META_APP_ID non configurata');
    }

    sdkLoadPromise = new Promise<void>((resolve, reject) => {
        window.fbAsyncInit = () => {
            try {
                window.FB?.init({
                    appId: config.appId,
                    cookie: true,
                    xfbml: false,
                    version: config.apiVersion,
                });
                resolve();
            } catch (error) {
                reject(error);
            }
        };

        const existing = document.querySelector<HTMLScriptElement>('script[data-meta-sdk="true"]');
        if (existing) return;

        const script = document.createElement('script');
        script.async = true;
        script.defer = true;
        script.src = META_SDK_URL;
        script.dataset.metaSdk = 'true';
        script.onload = () => {
            if (window.FB && window.fbAsyncInit) {
                window.fbAsyncInit();
            }
        };
        script.onerror = () => reject(new Error('Impossibile caricare Meta SDK'));
        document.head.appendChild(script);
    });

    return sdkLoadPromise;
};

const readString = (value: unknown): string | null => {
    const normalized = String(value ?? '').trim();
    return normalized || null;
};

const searchValue = (source: unknown, keys: string[]): string | null => {
    if (!source || typeof source !== 'object') return null;
    const record = source as Record<string, unknown>;

    for (const key of keys) {
        const direct = readString(record[key]);
        if (direct) return direct;
    }

    for (const value of Object.values(record)) {
        if (value && typeof value === 'object') {
            const nested = searchValue(value, keys);
            if (nested) return nested;
        }
    }

    return null;
};

export const extractEmbeddedSignupIdentifiers = (payload: unknown): EmbeddedSignupIdentifiers => ({
    meta_phone_number_id: searchValue(payload, ['phone_number_id', 'meta_phone_number_id', 'phoneNumberId']),
    waba_id: searchValue(payload, ['waba_id', 'whatsapp_business_account_id', 'whatsappBusinessAccountId']),
    business_id: searchValue(payload, ['business_id', 'businessId']),
    display_phone_number: searchValue(payload, ['display_phone_number', 'displayPhoneNumber']),
    verified_name: searchValue(payload, ['verified_name', 'verifiedName']),
});

export const launchEmbeddedSignup = async (): Promise<EmbeddedSignupLaunchResult> => {
    const config = getEmbeddedSignupConfig();
    if (!config.configId) {
        throw new Error('VITE_META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID non configurata');
    }

    await loadFacebookSdk();

    return new Promise<EmbeddedSignupLaunchResult>((resolve, reject) => {
        const timeout = window.setTimeout(() => {
            cleanup();
            resolve({ code: null, event: null });
        }, 120000);

        const onMessage = (event: MessageEvent) => {
            if (!event?.data) return;

            const data = typeof event.data === 'string'
                ? (() => {
                    try {
                        return JSON.parse(event.data);
                    } catch {
                        return null;
                    }
                })()
                : event.data;

            if (!data || typeof data !== 'object') return;
            const type = String((data as Record<string, unknown>).type || '').toLowerCase();
            if (!type.includes('whatsapp') && !type.includes('embedded')) return;

            cleanup();
            resolve({
                code: null,
                event: data as Record<string, unknown>,
            });
        };

        const cleanup = () => {
            window.clearTimeout(timeout);
            window.removeEventListener('message', onMessage);
        };

        window.addEventListener('message', onMessage);

        try {
            window.FB?.login(
                (response) => {
                    const authResponse = response?.authResponse as Record<string, unknown> | undefined;
                    const code = readString(authResponse?.code) || readString((response as Record<string, unknown>)?.code);

                    if (code) {
                        cleanup();
                        resolve({
                            code,
                            event: response,
                        });
                        return;
                    }

                    const status = String((response as Record<string, unknown>)?.status || '').trim().toLowerCase();
                    if (status === 'unknown' || response === null) {
                        cleanup();
                        reject(new Error('Flusso Meta annullato o non completato'));
                    }
                },
                {
                    config_id: config.configId,
                    response_type: 'code',
                    override_default_response_type: true,
                    extras: {
                        version: config.flowVersion,
                    },
                }
            );
        } catch (error) {
            cleanup();
            reject(error);
        }
    });
};
