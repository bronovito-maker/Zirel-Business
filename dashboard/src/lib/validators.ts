export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const ALLOWED_MIMES = [
    'application/pdf',
    'text/plain',
    'text/csv',
    'application/vnd.ms-excel',
    'text/comma-separated-values'
];
const ALLOWED_EXTENSIONS = ['pdf', 'txt', 'csv'];
const GENERIC_MIME_TYPES = ['', 'application/octet-stream'];

/**
 * Sanitizes filename for storage and AI consumption.
 */
export const sanitizeFilename = (name: string): string => {
    const parts = name.split('.');
    const ext = parts.pop()?.toLowerCase() || '';
    const base = parts.join('.');

    const sanitizedBase = base
        .toLowerCase()
        .normalize('NFD') // Normalizza caratteri unicode
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9]/g, '_') // Replace symbols/spaces with _
        .replace(/_+/g, '_') // Collapse multiple _
        .replace(/^_|_$/g, ''); // Trim leading/trailing _

    const trimmedBase = (sanitizedBase || 'document').slice(0, 80);
    return ext ? `${trimmedBase}.${ext}` : trimmedBase;
};

export const validateDocumentUpload = (file: File): { valid: boolean; error?: string } => {
    // 1. Validation: File Size
    if (file.size > MAX_FILE_SIZE) {
        return { valid: false, error: 'File troppo grande. Il limite è 10MB.' };
    }

    // 2. Validation: MIME Type + Extension fallback
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const hasSupportedExtension = ALLOWED_EXTENSIONS.includes(ext);

    if (GENERIC_MIME_TYPES.includes(file.type)) {
        return hasSupportedExtension
            ? { valid: true }
            : { valid: false, error: 'Tipo file non supportato. Usa PDF, TXT o CSV.' };
    }

    if (!ALLOWED_MIMES.includes(file.type)) {
        return { valid: false, error: 'Tipo file non supportato. Usa PDF, TXT o CSV.' };
    }

    if (ext && !hasSupportedExtension) {
        return { valid: false, error: 'Estensione file non coerente con il formato caricato.' };
    }

    return { valid: true };
};

export const validateTokenFormat = (token: string): boolean => {
    if (!token) return false;
    const trimmed = token.trim();
    // Assuming tokens are at least 10 chars (Sb publishable/custom tokens are usually longer)
    return trimmed.length >= 10;
};
