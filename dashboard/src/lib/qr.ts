import QRCode from 'qrcode';

export type QrMode = 'single' | 'area' | 'room';

export type QrTarget = {
    id: string;
    label: string;
    url: string;
    room?: string;
    area?: string;
    source: 'qr_hotel' | 'qr_area' | 'qr_room';
};

type PublicChatUrlOptions = {
    room?: string;
    area?: string;
    source?: string;
};

const slugify = (value: string) =>
    String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const unique = <T,>(values: T[]) => Array.from(new Set(values));

export function buildPublicChatUrl(baseOrigin: string, tenantId: string, options: PublicChatUrlOptions = {}) {
    const url = new URL('/chat', baseOrigin);
    url.searchParams.set('tenant', tenantId);

    if (options.room) {
        url.searchParams.set('room', String(options.room).trim());
    }

    if (options.area) {
        url.searchParams.set('area', String(options.area).trim());
    }

    if (options.source) {
        url.searchParams.set('source', String(options.source).trim());
    }

    return url.toString();
}

export function expandRoomInput(input: string) {
    const normalized = String(input || '')
        .replace(/[;]/g, ',')
        .replace(/\s*-\s*/g, '-');

    const tokens = normalized
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean);

    const rooms: string[] = [];

    tokens.forEach((token) => {
        const rangeMatch = token.match(/^([A-Za-z]*)(\d+)-([A-Za-z]*)(\d+)$/);

        if (!rangeMatch) {
            rooms.push(token);
            return;
        }

        const [, startPrefix, startRaw, endPrefix, endRaw] = rangeMatch;
        if ((startPrefix || '') !== (endPrefix || '')) {
            rooms.push(token);
            return;
        }

        const start = Number(startRaw);
        const end = Number(endRaw);
        if (!Number.isFinite(start) || !Number.isFinite(end) || end < start || end - start > 200) {
            rooms.push(token);
            return;
        }

        const width = Math.max(startRaw.length, endRaw.length);
        for (let current = start; current <= end; current += 1) {
            rooms.push(`${startPrefix || ''}${String(current).padStart(width, '0')}`);
        }
    });

    return unique(rooms);
}

export function expandAreaInput(input: string) {
    const map = new Map<string, { label: string; slug: string }>();

    String(input || '')
        .split(/[\n,]+/)
        .map((item) => item.trim())
        .filter(Boolean)
        .forEach((label) => {
            const slug = slugify(label) || 'area';
            if (!map.has(slug)) {
                map.set(slug, { label, slug });
            }
        });

    return Array.from(map.values());
}

export function buildQrTargets(params: {
    mode: QrMode;
    tenantId: string;
    baseOrigin: string;
    roomsInput: string;
    areasInput: string;
}) {
    const { mode, tenantId, baseOrigin, roomsInput, areasInput } = params;

    if (!tenantId) return [];

    if (mode === 'single') {
        return [
            {
                id: 'single',
                label: 'Struttura',
                url: buildPublicChatUrl(baseOrigin, tenantId, { source: 'qr_hotel' }),
                source: 'qr_hotel' as const,
            },
        ];
    }

    if (mode === 'area') {
        return expandAreaInput(areasInput).map((area) => ({
            id: `area:${area.slug}`,
            label: area.label,
            area: area.slug,
            url: buildPublicChatUrl(baseOrigin, tenantId, {
                area: area.slug,
                source: 'qr_area',
            }),
            source: 'qr_area' as const,
        }));
    }

    return expandRoomInput(roomsInput).map((room) => ({
        id: `room:${room}`,
        label: `Camera ${room}`,
        room,
        url: buildPublicChatUrl(baseOrigin, tenantId, {
            room,
            source: 'qr_room',
        }),
        source: 'qr_room' as const,
    }));
}

export async function generateQrSvg(url: string, color = '#0F172A') {
    return QRCode.toString(url, {
        type: 'svg',
        margin: 1,
        width: 512,
        color: {
            dark: color,
            light: '#FFFFFF',
        },
    });
}

export async function generateQrPngDataUrl(url: string, color = '#0F172A') {
    return QRCode.toDataURL(url, {
        margin: 1,
        width: 1024,
        color: {
            dark: color,
            light: '#FFFFFF',
        },
    });
}

export function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
}

export function downloadTextFile(filename: string, content: string, mimeType = 'image/svg+xml;charset=utf-8') {
    downloadBlob(filename, new Blob([content], { type: mimeType }));
}
