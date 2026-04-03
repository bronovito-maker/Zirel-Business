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

    private isServerSessionSupported(): boolean {
        return typeof window !== 'undefined' && typeof window.fetch === 'function';
    }

    /**
     * Authenticates a tenant by their API token.
     * Validates format, queries Supabase, and stores session data.
     */
    async authenticate(credentials: LoginCredentials): Promise<void> {
        const { token, persistence } = credentials;

        if (!validateTokenFormat(token)) {
            throw new Error('INVALID_FORMAT');
        }

        if (this.isServerSessionSupported()) {
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        token: token.trim(),
                        persistence: persistence || this.defaultPersistence,
                    }),
                });

                const body = await response.json().catch(() => null) as { ok?: boolean; tenant_id?: string; error_code?: string } | null;
                if (response.ok && body?.ok && body.tenant_id) {
                    saveTenantId(body.tenant_id, persistence || this.defaultPersistence);
                    return;
                }

                if (body?.error_code === 'INVALID_FORMAT' || body?.error_code === 'AUTH_FAILED') {
                    throw new Error(body.error_code);
                }
            } catch (err: unknown) {
                if (err instanceof Error && (err.message === 'INVALID_FORMAT' || err.message === 'AUTH_FAILED')) {
                    throw err;
                }
            }
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
            this.storeSession(authResult, persistence || this.defaultPersistence);
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
        if (this.isServerSessionSupported()) {
            try {
                const response = await fetch('/api/auth/tenant', {
                    method: 'GET',
                    credentials: 'include',
                });
                const body = await response.json().catch(() => null) as { ok?: boolean; tenant?: TenantData; error_code?: string } | null;
                if (response.ok && body?.ok && body.tenant) {
                    if (body.tenant.tenant_id) {
                        saveTenantId(body.tenant.tenant_id, this.defaultPersistence);
                    }
                    return body.tenant;
                }
            } catch {
                // Fall through to client-side compatibility path.
            }
        }

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
        return getTenantId() !== null || getAuthToken() !== null;
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
            authMode: token ? 'token' : 'cookie',
        };
    }

    async restoreSession(): Promise<boolean> {
        if (!this.isServerSessionSupported()) {
            return this.isAuthenticated();
        }

        try {
            const response = await fetch('/api/auth/session', {
                method: 'GET',
                credentials: 'include',
            });
            const body = await response.json().catch(() => null) as { ok?: boolean; tenant_id?: string } | null;
            if (response.ok && body?.ok && body.tenant_id) {
                saveTenantId(body.tenant_id, this.defaultPersistence);
                return true;
            }
        } catch {
            // Fall back to local compatibility mode.
        }

        return this.isAuthenticated();
    }

    /**
     * Stores authentication session data.
     */
    storeSession(authResult: AuthResult, persistence: AuthPersistenceMode = this.defaultPersistence): void {
        saveAuthToken(authResult.api_token, persistence);
        saveTenantId(authResult.tenant_id, persistence);
    }

    /**
     * Clears the authentication session.
     */
    async clearSession(): Promise<void> {
        if (this.isServerSessionSupported()) {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include',
                });
            } catch {
                // Continue clearing local state even if the server logout call fails.
            }
        }
        clearAllAuthData();
    }
}

// Singleton instance
export const authService = new TokenAuthService();
