/**
 * Storage layer for authentication data.
 * Handles persistence in sessionStorage/localStorage with cosmetic obfuscation.
 */

import type { AuthPersistenceMode } from './types';

const TOKEN_KEY = '_z_sid';
const TENANT_ID_KEY = '_z_tid';

/**
 * Basic obfuscation to reduce casual plain-text exposure in storage inspection.
 * This is not a security control.
 */
const obfuscate = (str: string): string => {
    try {
        return btoa(str);
    } catch {
        return str;
    }
};

const deobfuscate = (str: string): string => {
    try {
        return atob(str);
    } catch {
        return str;
    }
};

// ===== Token Storage =====

/**
 * Persists the token locally with cosmetic obfuscation.
 * Session mode is the default to avoid persisting credentials longer than needed.
 */
export const saveAuthToken = (token: string, mode: AuthPersistenceMode = 'session'): void => {
    const encoded = obfuscate(token);
    sessionStorage.setItem(TOKEN_KEY, encoded);

    if (mode === 'persistent') {
        localStorage.setItem(TOKEN_KEY, encoded);
        return;
    }

    localStorage.removeItem(TOKEN_KEY);
};

/**
 * Retrieves the stored token, checking sessionStorage first.
 */
export const getAuthToken = (): string | null => {
    let encoded = sessionStorage.getItem(TOKEN_KEY);
    if (!encoded) {
        encoded = localStorage.getItem(TOKEN_KEY);
        // Sync back to session storage for performance
        if (encoded) sessionStorage.setItem(TOKEN_KEY, encoded);
    }
    return encoded ? deobfuscate(encoded) : null;
};

/**
 * Removes the stored token from all storages.
 */
export const clearAuthToken = (): void => {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    // Compatibility cleanup for old key
    localStorage.removeItem('zirel_api_token');
};

// ===== Tenant ID Storage =====

/**
 * Persists the tenant ID locally with cosmetic obfuscation.
 */
export const saveTenantId = (tenantId: string, mode: AuthPersistenceMode = 'session'): void => {
    const encoded = obfuscate(tenantId);
    sessionStorage.setItem(TENANT_ID_KEY, encoded);

    if (mode === 'persistent') {
        localStorage.setItem(TENANT_ID_KEY, encoded);
        return;
    }

    localStorage.removeItem(TENANT_ID_KEY);
};

/**
 * Retrieves the stored tenant ID, checking sessionStorage first.
 */
export const getTenantId = (): string | null => {
    let encoded = sessionStorage.getItem(TENANT_ID_KEY);
    if (!encoded) {
        encoded = localStorage.getItem(TENANT_ID_KEY);
        // Sync back to session storage for performance
        if (encoded) sessionStorage.setItem(TENANT_ID_KEY, encoded);
    }
    return encoded ? deobfuscate(encoded) : null;
};

/**
 * Removes the stored tenant ID from all storages.
 */
export const clearTenantId = (): void => {
    sessionStorage.removeItem(TENANT_ID_KEY);
    localStorage.removeItem(TENANT_ID_KEY);
};

/**
 * Clears all authentication data from storage.
 */
export const clearAllAuthData = (): void => {
    clearAuthToken();
    clearTenantId();
};
