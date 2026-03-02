/**
 * Public authentication API.
 *
 * This module provides a facade over the authentication implementation.
 * Components should only import from this file, never directly from auth-service or storage.
 *
 * Benefits:
 * - Decouples UI from auth mechanism (token, JWT, cookies, etc.)
 * - Makes it easy to swap implementations in the future
 * - Provides clean, simple API for components
 */

import type { TenantData } from '../../types';
import type { LoginCredentials, AuthSession } from './types';
import { authService } from './auth-service';

// ===== Primary API =====

/**
 * Authenticates a user with the provided credentials.
 * Stores session data on success.
 *
 * @throws {Error} 'INVALID_FORMAT' | 'AUTH_FAILED' | 'CONNECTION_ERROR'
 */
export async function login(credentials: LoginCredentials): Promise<void> {
    await authService.authenticate(credentials);
}

/**
 * Logs out the current user and clears all session data.
 */
export async function logout(): Promise<void> {
    authService.clearSession();
}

/**
 * Checks if a user is currently authenticated.
 */
export function isAuthenticated(): boolean {
    return authService.isAuthenticated();
}

/**
 * Gets the current tenant ID.
 * Returns null if not authenticated.
 */
export function getCurrentTenantId(): string | null {
    return authService.getCurrentTenantId();
}

/**
 * Gets the current session information.
 * Returns null if not authenticated.
 */
export function getCurrentSession(): AuthSession | null {
    return authService.getCurrentSession();
}

/**
 * Fetches tenant data for the current authenticated session.
 *
 * @throws {Error} 'NOT_AUTHENTICATED' if no valid session
 */
export async function fetchTenantData(): Promise<TenantData> {
    return authService.getTenantData();
}

// ===== Backward Compatibility =====

/**
 * @deprecated Use the new auth API instead. This will be removed in a future version.
 * For migration: Use `getCurrentSession()` or `isAuthenticated()` instead.
 */
export { getAuthToken, saveAuthToken } from './storage';
