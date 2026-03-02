/**
 * Type definitions for authentication layer.
 */

export type AuthPersistenceMode = 'session' | 'persistent';

export interface LoginCredentials {
    token: string;
}

export interface AuthSession {
    tenantId: string;
    token: string;
    isAuthenticated: boolean;
}

export interface AuthResult {
    tenant_id: string;
    api_token: string;
    api_token_revealed?: boolean;
}
