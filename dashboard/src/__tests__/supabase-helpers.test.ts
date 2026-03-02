import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { getTenantData, updateTenantData, updateReservationStatus, triggerIngestion } from '../lib/supabase-helpers';
import { supabase } from '../lib/supabaseClient';

vi.mock('../lib/supabaseClient', () => ({
    supabase: {
        from: vi.fn(),
    }
}));

vi.mock('../lib/auth/storage', () => ({
    getAuthToken: vi.fn(() => 'token-123'),
    getTenantId: vi.fn(() => 'uuid-1'),
}));

describe('supabase-helpers.ts', () => {
    const mockedFrom = supabase.from as unknown as Mock;

    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    describe('getTenantData', () => {
        it('should call supabase with the correct API token', async () => {
            const mockSingle = vi.fn().mockResolvedValue({ data: { id: 'uuid-1', nome_struttura: 'Hotel' }, error: null });
            mockedFrom.mockImplementation((table: string) => {
                expect(table).toBe('tenants');
                return {
                    select: () => ({
                        eq: (field: string, val: string) => {
                            expect(field).toBe('api_token');
                            expect(val).toBe('token-123');
                            return { single: mockSingle };
                        }
                    })
                };
            });

            const result = await getTenantData();
            expect(result).toBeDefined();
            expect(result.nome_struttura).toBe('Hotel');
        });

        it('should throw an error if supabase returns an error', async () => {
            const mockSingle = vi.fn().mockResolvedValue({ data: null, error: { message: 'Network error' } });
            mockedFrom.mockImplementation(() => ({
                select: () => ({
                    eq: () => ({ single: mockSingle })
                })
            }));

            await expect(getTenantData()).rejects.toThrow('Network error');
        });
    });

    describe('updateTenantData', () => {
        it('should call supabase update with filtered data', async () => {
            const mockEq = vi.fn().mockResolvedValue({ error: null });
            const mockUpdate = vi.fn().mockImplementation((payload: Record<string, string>) => {
                // Verify that update is called and forbidden fields are stripped if we had any
                expect(payload).toHaveProperty('phone', '12345');
                return { eq: mockEq };
            });

            mockedFrom.mockImplementation((table: string) => {
                expect(table).toBe('tenants');
                return { update: mockUpdate };
            });

            const updates = { phone: '12345' };
            // Simulate the call
            await updateTenantData(updates);

            expect(mockUpdate).toHaveBeenCalled();
            expect(mockEq).toHaveBeenCalledWith('tenant_id', 'uuid-1');
        });

        it('should throw NO_CHANGES for empty updates', async () => {
            await expect(updateTenantData({})).rejects.toThrow('NO_CHANGES');
        });
    });

    describe('updateReservationStatus', () => {
        it('should reject an unsupported status', async () => {
            await expect(updateReservationStatus(1, 'BOGUS')).rejects.toThrow('INVALID_PARAMS');
        });
    });

    describe('triggerIngestion', () => {
        it('should return a non-blocking result when webhook is not configured', async () => {
            vi.stubEnv('VITE_N8N_INGESTION_WEBHOOK', '');
            const result = await triggerIngestion('menu.pdf', 'https://cdn.example.com/menu.pdf');
            expect(result).toEqual({ success: false, message: 'WEBHOOK_NOT_CONFIGURED' });
        });

        it('should throw when the webhook responds with an error status', async () => {
            vi.stubEnv('VITE_N8N_INGESTION_WEBHOOK', 'https://example.com/webhook');
            vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 503 }));

            await expect(triggerIngestion('menu.pdf', 'https://cdn.example.com/menu.pdf')).rejects.toThrow('WEBHOOK_ERROR_503');
        });
    });
});
