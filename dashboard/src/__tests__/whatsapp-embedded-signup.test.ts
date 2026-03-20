import { describe, expect, it } from 'vitest';
import {
    extractBearerToken,
    normalizeConnectionStatus,
    normalizeEmbeddedSignupPayload,
} from '../lib/whatsapp-embedded-signup';

describe('whatsapp embedded signup helpers', () => {
    it('extracts a bearer token from the authorization header', () => {
        expect(extractBearerToken('Bearer abc123')).toBe('abc123');
        expect(extractBearerToken('abc123')).toBe('abc123');
        expect(extractBearerToken('')).toBeNull();
    });

    it('normalizes unknown connection status to connected', () => {
        expect(normalizeConnectionStatus('CONNECTED')).toBe('connected');
        expect(normalizeConnectionStatus('pending')).toBe('connected');
        expect(normalizeConnectionStatus(undefined)).toBe('connected');
    });

    it('accepts the canonical payload', () => {
        const result = normalizeEmbeddedSignupPayload({
            signup_session_id: 'signup-1',
            meta_phone_number_id: '1023529240851906',
            waba_id: '952596820596407',
            display_phone_number: '+1 555-159-8512',
            verified_name: 'Test Number',
            connection_state: 'connected',
        });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            throw new Error('Expected payload to be accepted');
        }

        expect(result.data.meta_phone_number_id).toBe('1023529240851906');
        expect(result.data.waba_id).toBe('952596820596407');
        expect(result.data.connection_status).toBe('connected');
        expect(result.data.credential_mode).toBe('platform_managed');
        expect(result.data.credential_provider).toBe('n8n_credentials');
    });

    it('accepts alternate alias fields used by frontend SDK wrappers', () => {
        const result = normalizeEmbeddedSignupPayload({
            phoneNumberId: '1023529240851906',
            whatsappBusinessAccountId: '952596820596407',
            displayPhoneNumber: '+1 555-159-8512',
            verifiedName: 'Test Number',
            replaceExisting: true,
        });

        expect(result.ok).toBe(true);
        if (!result.ok) {
            throw new Error('Expected alias payload to be accepted');
        }

        expect(result.data.replace_existing).toBe(true);
    });

    it('rejects payloads without meta phone number id', () => {
        const result = normalizeEmbeddedSignupPayload({
            waba_id: '952596820596407',
        });

        expect(result).toEqual({
            ok: false,
            error_code: 'WHATSAPP_SIGNUP_INVALID_PAYLOAD',
            error_message: 'Missing meta_phone_number_id',
        });
    });

    it('rejects payloads without waba id', () => {
        const result = normalizeEmbeddedSignupPayload({
            meta_phone_number_id: '1023529240851906',
        });

        expect(result).toEqual({
            ok: false,
            error_code: 'WHATSAPP_SIGNUP_INVALID_PAYLOAD',
            error_message: 'Missing waba_id',
        });
    });
});
