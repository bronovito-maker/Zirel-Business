import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { login } from '../lib/auth';
import { supabase } from '../lib/supabaseClient';
import * as storage from '../lib/auth/storage';

vi.mock('../lib/supabaseClient', () => ({
    supabase: {
        from: vi.fn()
    }
}));

vi.mock('../lib/auth/storage', () => ({
    saveAuthToken: vi.fn(),
    saveTenantId: vi.fn(),
}));

describe('auth/index.ts', () => {
    const mockedFrom = supabase.from as unknown as Mock;
    const mockedSaveAuthToken = vi.mocked(storage.saveAuthToken);
    const mockedSaveTenantId = vi.mocked(storage.saveTenantId);

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('login', () => {
        it('should throw INVALID_FORMAT if token is obviously bad', async () => {
            await expect(login({ token: 'bad' })).rejects.toThrow('INVALID_FORMAT');
            // Supabase should not be called at all
            expect(mockedFrom).not.toHaveBeenCalled();
        });

        it('should throw AUTH_FAILED if supabase returns an error', async () => {
            const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } });
            mockedFrom.mockImplementation(() => ({
                select: () => ({
                    eq: () => ({
                        single: mockSingle
                    })
                })
            }));

            await expect(login({ token: '1234567890123' })).rejects.toThrow('AUTH_FAILED');
            expect(mockedFrom).toHaveBeenCalledWith('tenants');
        });

        it('should throw AUTH_FAILED if no data returned', async () => {
            const mockSingle = vi.fn().mockResolvedValue({ data: null, error: null });
            mockedFrom.mockImplementation(() => ({
                select: () => ({
                    eq: () => ({
                        single: mockSingle
                    })
                })
            }));

            await expect(login({ token: '1234567890123' })).rejects.toThrow('AUTH_FAILED');
        });

        it('should store session data on success', async () => {
            const mockData = { tenant_id: 't1', api_token: '1234567890123' };
            const mockSingle = vi.fn().mockResolvedValue({ data: mockData, error: null });
            mockedFrom.mockImplementation(() => ({
                select: () => ({
                    eq: (field: string, value: string) => {
                        expect(field).toBe('api_token');
                        expect(value).toBe('1234567890123');
                        return { single: mockSingle };
                    }
                })
            }));

            await login({ token: '1234567890123' });
            // Check that storage functions were called (mocked)
            expect(mockedSaveAuthToken).toHaveBeenCalledWith('1234567890123', 'session');
            expect(mockedSaveTenantId).toHaveBeenCalledWith('t1', 'session');
        });
    });
});
