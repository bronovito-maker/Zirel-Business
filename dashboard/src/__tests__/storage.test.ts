import { beforeEach, describe, expect, it } from 'vitest';
import {
    clearAllAuthData,
    clearAuthToken,
    getAuthToken,
    getTenantId,
    saveAuthToken,
    saveTenantId,
} from '../lib/auth/storage';

const createStorageMock = (): Storage => {
    const store = new Map<string, string>();

    return {
        get length() {
            return store.size;
        },
        clear: () => store.clear(),
        getItem: (key: string) => store.get(key) ?? null,
        key: (index: number) => Array.from(store.keys())[index] ?? null,
        removeItem: (key: string) => {
            store.delete(key);
        },
        setItem: (key: string, value: string) => {
            store.set(key, value);
        },
    };
};

describe('auth/storage.ts', () => {
    beforeEach(() => {
        Object.defineProperty(globalThis, 'sessionStorage', {
            configurable: true,
            value: createStorageMock(),
        });
        Object.defineProperty(globalThis, 'localStorage', {
            configurable: true,
            value: createStorageMock(),
        });
    });

    it('should keep session mode out of localStorage by default', () => {
        saveAuthToken('token-123');
        expect(sessionStorage.getItem('_z_sid')).not.toBeNull();
        expect(localStorage.getItem('_z_sid')).toBeNull();
    });

    it('should read legacy persistent tokens and sync them back to sessionStorage', () => {
        localStorage.setItem('_z_sid', btoa('legacy-token'));
        const token = getAuthToken();

        expect(token).toBe('legacy-token');
        expect(sessionStorage.getItem('_z_sid')).toBe(localStorage.getItem('_z_sid'));
    });

    it('should clear current and legacy auth keys on logout', () => {
        saveAuthToken('token-123', 'persistent');
        saveTenantId('tenant-1', 'persistent');
        localStorage.setItem('zirel_api_token', 'old-key');

        clearAuthToken();
        expect(getAuthToken()).toBeNull();
        expect(localStorage.getItem('zirel_api_token')).toBeNull();

        saveAuthToken('token-123', 'persistent');
        saveTenantId('tenant-1', 'persistent');
        clearAllAuthData();
        expect(getAuthToken()).toBeNull();
        expect(getTenantId()).toBeNull();
    });
});
