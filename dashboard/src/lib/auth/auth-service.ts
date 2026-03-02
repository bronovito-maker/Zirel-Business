/**
 * Token-based authentication service.
 * Encapsulates all authentication logic using API tokens.
 *
 * In the future, this can be replaced with JWTAuthService or CookieAuthService
 * without changing the public API exposed by auth/index.ts
 */

import { supabase } from '../supabaseClient';
import { validateTokenFormat } from '../validators';
import type { TenantData } from '../../types';
import type { AuthResult, LoginCredentials, AuthSession, AuthPersistenceMode } from './types';
import {
    saveAuthToken,
    getAuthToken,
    saveTenantId,
    getTenantId,
    clearAllAuthData,
} from './storage';

class TokenAuthService {
    private readonly defaultPersistence: AuthPersistenceMode = 'session';

    /**
     * Authenticates a tenant by their API token.
     * Validates format, queries Supabase, and stores session data.
     */
    async authenticate(credentials: LoginCredentials): Promise<void> {
        const { token } = credentials;

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

            const authResult = data as AuthResult;

            // Store session data
            this.storeSession(authResult);
        } catch (err: unknown) {
            if (err instanceof Error) {
                if (err.message === 'INVALID_FORMAT' || err.message === 'AUTH_FAILED') {
                    throw err;
                }
            }
            throw new Error('CONNECTION_ERROR');
        }
    }

    /**
     * Fetches tenant data for the current authenticated session.
     */
    async getTenantData(): Promise<TenantData> {
        const token = getAuthToken();
        if (!token) {
            throw new Error('NOT_AUTHENTICATED');
        }

        const { data, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('api_token', token.trim())
            .single();

        if (error) throw error;
        return data as TenantData;
    }

    /**
     * Checks if the user is currently authenticated.
     */
    isAuthenticated(): boolean {
        return getAuthToken() !== null;
    }

    /**
     * Gets the current tenant ID from storage.
     */
    getCurrentTenantId(): string | null {
        return getTenantId();
    }

    /**
     * Gets the current session information.
     */
    getCurrentSession(): AuthSession | null {
        const token = getAuthToken();
        const tenantId = getTenantId();

        if (!token || !tenantId) {
            return null;
        }

        return {
            token,
            tenantId,
            isAuthenticated: true,
        };
    }

    /**
     * Stores authentication session data.
     */
    storeSession(authResult: AuthResult): void {
        saveAuthToken(authResult.api_token, this.defaultPersistence);
        saveTenantId(authResult.tenant_id, this.defaultPersistence);
    }

    /**
     * Clears the authentication session.
     */
    clearSession(): void {
        clearAllAuthData();
    }
}

// Singleton instance
export const authService = new TokenAuthService();
