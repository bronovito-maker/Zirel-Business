/**
 * @deprecated This file is deprecated. Use `lib/auth/index.ts` instead.
 *
 * This file contains the old authentication implementation and will be removed in a future version.
 * All new code should import from `lib/auth` (the directory) instead of `lib/auth.ts` (this file).
 *
 * Migration guide:
 * - `authenticateTenant(token)` → `login({ token })`
 * - `saveAuthToken(token)` → `saveAuthToken(token)` (still exported from lib/auth for backward compatibility)
 * - `getAuthToken()` → `getAuthToken()` (still exported from lib/auth for backward compatibility)
 * - `clearAuthToken()` → `logout()`
 */

import { supabase } from './supabaseClient';
import type { AuthResult } from '../types';
import { validateTokenFormat } from './validators';

const TOKEN_KEY = '_z_sid';

/**
 * Basic obfuscation to reduce casual plain-text exposure.
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

/**
 * @deprecated Use `login({ token })` from `lib/auth` instead.
 *
 * Authenticates a tenant by their API token.
 * Returns the tenant data or throws an error.
 */
export const authenticateTenant = async (token: string): Promise<AuthResult> => {
    if (!validateTokenFormat(token)) {
        throw new Error('INVALID_FORMAT');
    }

    try {
        const { data, error } = await supabase
            .from('tenants')
            .select('tenant_id, api_token, api_token_revealed')
            .eq('api_token', token.trim())
            .single();

        if (error || !data) {
            throw new Error('AUTH_FAILED');
        }

        return data as AuthResult;
    } catch (err: unknown) {
        if (err instanceof Error) {
            if (err.message === 'INVALID_FORMAT' || err.message === 'AUTH_FAILED') {
                throw err;
            }
        }
        // console.error('Authentication backend error'); 
        throw new Error('CONNECTION_ERROR');
    }
};

/**
 * @deprecated This function is still exported from `lib/auth` for backward compatibility.
 * Consider using the new auth API instead.
 *
 * Persists the token locally with cosmetic obfuscation and legacy dual-storage.
 */
export const saveAuthToken = (token: string): void => {
    const encoded = obfuscate(token);
    sessionStorage.setItem(TOKEN_KEY, encoded);
    localStorage.setItem(TOKEN_KEY, encoded);
};

/**
 * @deprecated This function is still exported from `lib/auth` for backward compatibility.
 * Consider using `isAuthenticated()` or `getCurrentSession()` from `lib/auth` instead.
 *
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
 * @deprecated Use `logout()` from `lib/auth` instead.
 *
 * Removes the stored token from all storages.
 */
export const clearAuthToken = (): void => {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    // Compatibility cleanup for old key
    localStorage.removeItem('zirel_api_token');
};
