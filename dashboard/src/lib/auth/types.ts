/**
 * Type definitions for authentication layer.
 */

export type AuthPersistenceMode = 'session' | 'persistent';

export interface LoginCredentials {
    token: string;
    persistence?: AuthPersistenceMode;
}

export interface AuthSession {
    tenantId: string;
    token: string | null;
    isAuthenticated: boolean;
    authMode?: 'cookie' | 'token';
}

export interface AuthResult {
    tenant_id: string;
    api_token: string;
    api_token_revealed?: boolean;
}
