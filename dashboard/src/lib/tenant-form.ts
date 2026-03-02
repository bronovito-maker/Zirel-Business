import type { TenantData } from '../types';

interface TenantFormState {
    formData: TenantData | null;
    editForm: Partial<TenantData>;
}

export const syncTenantFieldState = (
    formData: TenantData | null,
    editForm: Partial<TenantData>,
    key: keyof TenantData,
    value: string
): TenantFormState => ({
    formData: formData ? { ...formData, [key]: value } : null,
    editForm: { ...editForm, [key]: value },
});
