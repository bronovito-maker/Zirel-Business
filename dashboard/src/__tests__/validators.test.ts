import { describe, it, expect } from 'vitest';
import { sanitizeFilename, validateDocumentUpload, validateTokenFormat, MAX_FILE_SIZE } from '../lib/validators';

describe('validators', () => {
    describe('sanitizeFilename', () => {
        it('should lowercase and replace spaces', () => {
            expect(sanitizeFilename('Il Mio Documento.pdf')).toBe('il_mio_documento.pdf');
        });

        it('should remove accents', () => {
            expect(sanitizeFilename('Città.pdf')).toBe('citta.pdf');
        });

        it('should ignore multiple underscores', () => {
            expect(sanitizeFilename('foo__bar  baz.txt')).toBe('foo_bar_baz.txt');
        });

        it('should provide default name if base is empty', () => {
            expect(sanitizeFilename('.pdf')).toBe('document.pdf');
        });

        it('should limit the basename length to 80 characters', () => {
            const longName = `${'a'.repeat(120)}.pdf`;
            expect(sanitizeFilename(longName)).toBe(`${'a'.repeat(80)}.pdf`);
        });
    });

    describe('validateDocumentUpload', () => {
        it('should accept exactly 10MB PDF', () => {
            const file = new File([''], 'test.pdf', { type: 'application/pdf' });
            Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE });
            const result = validateDocumentUpload(file);
            expect(result.valid).toBe(true);
        });

        it('should reject file > 10MB', () => {
            const file = new File([''], 'test.pdf', { type: 'application/pdf' });
            Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 });
            const result = validateDocumentUpload(file);
            expect(result.valid).toBe(false);
            expect(result.error).toMatch(/troppo grande/i);
        });

        it('should reject unsupported MIME type', () => {
            const file = new File([''], 'image.png', { type: 'image/png' });
            const result = validateDocumentUpload(file);
            expect(result.valid).toBe(false);
            expect(result.error).toMatch(/non supportato/i);
        });

        it('should fallback to extension if MIME is generic but extension is supported', () => {
            const file = new File([''], 'file.pdf', { type: 'application/octet-stream' });
            const result = validateDocumentUpload(file);
            expect(result.valid).toBe(true);
        });

        it('should fallback to extension if MIME is empty but extension is supported', () => {
            const file = new File([''], 'file.csv', { type: '' });
            const result = validateDocumentUpload(file);
            expect(result.valid).toBe(true);
        });

        it('should reject if MIME is allowed but extension is incoherent', () => {
            const file = new File([''], 'file.exe', { type: 'application/pdf' });
            const result = validateDocumentUpload(file);
            expect(result.valid).toBe(false);
            expect(result.error).toMatch(/coerente/i);
        });
    });

    describe('validateTokenFormat', () => {
        it('should reject empty token', () => {
            expect(validateTokenFormat('')).toBe(false);
            expect(validateTokenFormat('   ')).toBe(false);
        });

        it('should reject short tokens', () => {
            expect(validateTokenFormat('123456789')).toBe(false); // 9 chars
        });

        it('should accept string with at least 10 chars', () => {
            expect(validateTokenFormat('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9')).toBe(true); // long token
            expect(validateTokenFormat('  1234567890  ')).toBe(true); // trimmed
        });
    });
});
