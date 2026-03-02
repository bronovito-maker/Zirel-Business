import { describe, expect, it } from 'vitest';
import { syncTenantFieldState } from '../lib/tenant-form';
import type { TenantData } from '../types';

describe('tenant-form.ts', () => {
    it('should keep formData and editForm aligned when a field changes', () => {
        const formData: TenantData = {
            tenant_id: 'tenant-1',
            api_token: 'token-1',
            telefono: '+39 111 1111111',
        };

        const result = syncTenantFieldState(formData, formData, 'telefono', '+39 222 2222222');

        expect(result.formData?.telefono).toBe('+39 222 2222222');
        expect(result.editForm.telefono).toBe('+39 222 2222222');
        expect(result.formData?.tenant_id).toBe('tenant-1');
    });
});
