import { supabase } from './supabaseClient';
import type {
    TenantData,
    Reservation,
    DocumentFile,
    AnalyticsSummary,
    AnalyticsTrendPoint,
    CompleteWhatsAppEmbeddedSignupPayload,
    CompleteWhatsAppEmbeddedSignupResult,
    WhatsAppConversationSummary,
    WhatsAppConversationStatus,
    WhatsAppMessageSummary,
    WhatsAppChannelSummary,
    WhatsAppConnectionStatus,
} from '../types';
import { getAuthToken, getTenantId } from './auth/storage';
import { sanitizeFilename } from './validators';

/**
 * Service layer to centralize Supabase operations.
 * Improves error handling, validation, and maintainability.
 */

// --- Helper Utilities ---

const ensureTenantId = (tenantId?: string) => {
    const tid = tenantId || getTenantId();
    if (!tid || tid.trim() === '') {
        throw new Error('MISSING_TENANT_ID');
    }
    return tid.trim();
};

const ALLOWED_RESERVATION_STATUSES = ['PENDING', 'CONFERMATA', 'RIFIUTATA', 'ANNULLATA'] as const;

const getIngestionWebhookUrl = () => import.meta.env.VITE_N8N_INGESTION_WEBHOOK || '';

type MinimalStatusRow = {
    id: string | number;
    created_at?: string | null;
    stato?: string | null;
    booking_status?: string | null;
    status?: string | null;
    channel?: string | null;
};

const normalizeOperationalStatus = (value?: string | null) => {
    const normalized = String(value || '').trim().toLowerCase();

    if (['confirmed', 'confermata'].includes(normalized)) return 'confirmed';
    if (['rejected', 'rifiutata', 'annullata', 'unavailable', 'canceled', 'cancelled'].includes(normalized)) return 'rejected';
    if (['manual_review', 'pending', 'new', 'in_review'].includes(normalized)) return 'pending';

    return 'unknown';
};

const buildRecentTrend = (rows: Array<{ created_at?: string | null; status: string }>, days = 14): AnalyticsTrendPoint[] => {
    const points: AnalyticsTrendPoint[] = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let index = days - 1; index >= 0; index -= 1) {
        const date = new Date(now);
        date.setDate(now.getDate() - index);

        const key = date.toISOString().slice(0, 10);
        points.push({
            date: key,
            label: date.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' }),
            total: 0,
            confirmed: 0,
        });
    }

    const pointMap = new Map(points.map((point) => [point.date, point]));

    rows.forEach((row) => {
        if (!row.created_at) return;
        const createdAt = new Date(row.created_at);
        if (Number.isNaN(createdAt.getTime())) return;
        const key = createdAt.toISOString().slice(0, 10);
        const point = pointMap.get(key);
        if (!point) return;
        point.total += 1;
        if (row.status === 'confirmed') point.confirmed += 1;
    });

    return points;
};

const safeSelect = async <T extends MinimalStatusRow>(table: string, columns: string, tenantId: string): Promise<T[]> => {
    const { data, error } = await supabase
        .from(table)
        .select(columns)
        .eq('tenant_id', tenantId);

    if (error) {
        console.warn(`Analytics skipped table ${table}:`, error.message);
        return [];
    }

    return ((data || []) as unknown) as T[];
};

// --- Tenant Operations ---

/**
 * Fetches tenant data for the current authenticated session.
 * Uses token from storage automatically.
 */
export const getTenantData = async (): Promise<TenantData> => {
    const token = getAuthToken();
    if (!token) throw new Error('NOT_AUTHENTICATED');

    const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('api_token', token.trim())
        .single();

    if (error) throw error;
    return data as TenantData;
};

/**
 * Updates tenant data for the current authenticated session.
 * Uses tenant ID from storage automatically.
 */
export const updateTenantData = async (updateData: Partial<TenantData>) => {
    const tid = ensureTenantId();
    if (!updateData || Object.keys(updateData).length === 0) {
        throw new Error('NO_CHANGES');
    }

    // Filter out restricted fields that shouldn't be updated via this helper
    const forbiddenFields = [
        'id', 'row_number', 'api_token', 'api_token_revealed',
        'api_token_generated_at', 'created_at', 'updated_at', 'tenant_id'
    ];

    const cleanData = Object.fromEntries(
        Object.entries(updateData).filter(([key]) => !forbiddenFields.includes(key))
    );

    if (Object.keys(cleanData).length === 0) {
        throw new Error('NO_CHANGES');
    }

    const { error } = await supabase
        .from('tenants')
        .update(cleanData)
        .eq('tenant_id', tid);

    if (error) throw error;
};

// --- Reservation Operations ---

export const getReservations = async (tenantId?: string): Promise<Reservation[]> => {
    const tid = ensureTenantId(tenantId);

    const { data, error } = await supabase
        .from('prenotazioni')
        .select('*')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Reservation[];
};

export const updateReservationStatus = async (id: number, newStatus: string, tenantId?: string) => {
    const tid = ensureTenantId(tenantId);
    if (!id || !ALLOWED_RESERVATION_STATUSES.includes(newStatus as (typeof ALLOWED_RESERVATION_STATUSES)[number])) {
        throw new Error('INVALID_PARAMS');
    }

    const { error } = await supabase
        .from('prenotazioni')
        .update({ stato: newStatus })
        .eq('id', id)
        .eq('tenant_id', tid);

    if (error) throw error;
};

// --- Storage & Vector Operations ---

export const listDocuments = async (tenantId?: string): Promise<DocumentFile[]> => {
    const tid = ensureTenantId(tenantId);

    const { data, error } = await supabase.storage
        .from('tenant-documents')
        .list(tid);

    if (error) throw error;
    return (data || []) as unknown as DocumentFile[];
};

export const uploadDocument = async (file: File, tenantId?: string) => {
    const tid = ensureTenantId(tenantId);
    if (!file) throw new Error('INVALID_PARAMS');
    if (sanitizeFilename(file.name) !== file.name) throw new Error('INVALID_PARAMS');

    const filePath = `${tid}/${file.name}`;
    const { data, error } = await supabase.storage
        .from('tenant-documents')
        .upload(filePath, file, { upsert: true });

    if (error) throw error;
    return data;
};

export const deleteDocument = async (filename: string, tenantId?: string) => {
    const tid = ensureTenantId(tenantId);
    if (!filename) throw new Error('INVALID_PARAMS');

    const { error } = await supabase.storage
        .from('tenant-documents')
        .remove([`${tid}/${filename}`]);

    if (error) throw error;
};

/**
 * Deletes associated vectors from the zirel_vectors table.
 * Matches by filename metadata.
 */
export const deleteVectorsByFilename = async (filename: string, tenantId?: string) => {
    const tid = ensureTenantId(tenantId);
    if (!filename) throw new Error('INVALID_PARAMS');

    const { error } = await supabase
        .from('zirel_vectors')
        .delete()
        .eq('tenant_id', tid)
        .filter('metadata->>filename', 'eq', filename);

    if (error) throw error;
};

/**
 * Generates a signed URL for a document.
 */
export const getSignedUrl = async (filename: string, expiresIn = 3600, tenantId?: string) => {
    const tid = ensureTenantId(tenantId);
    const { data, error } = await supabase.storage
        .from('tenant-documents')
        .createSignedUrl(`${tid}/${filename}`, expiresIn);

    if (error) throw error;
    return data.signedUrl;
};

export const triggerIngestion = async (filename: string, fileUrl: string, tenantId?: string) => {
    const tid = ensureTenantId(tenantId);
    if (!filename || !fileUrl) throw new Error('INVALID_PARAMS');
    const webhookUrl = getIngestionWebhookUrl();
    if (!webhookUrl) return { success: false, message: 'WEBHOOK_NOT_CONFIGURED' };

    const traceId = crypto.randomUUID();

    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Zirel-Source': 'dashboard-v2',
            'X-Zirel-Timestamp': new Date().toISOString(),
            'X-Zirel-Trace-Id': traceId
        },
        body: JSON.stringify({
            // Legacy fields for backward compatibility
            file_url: fileUrl,
            tenant_id: tid,
            filename: filename,
            // New security metadata
            security: {
                version: '2.1',
                source: 'dashboard-client',
                environment: import.meta.env.MODE,
                trace_id: traceId
            }
        })
    });

    if (!response.ok) {
        throw new Error(`WEBHOOK_ERROR_${response.status}`);
    }

    return { success: true };
};

export const getWhatsAppConversations = async (tenantId?: string): Promise<WhatsAppConversationSummary[]> => {
    const tid = ensureTenantId(tenantId);

    const { data, error } = await supabase
        .from('tenant_conversations')
        .select('id, tenant_id, channel, status, ai_processing_status, customer_name, customer_phone_normalized, external_contact_id, last_message_at, updated_at, last_inbound_message_id, last_outbound_message_id')
        .eq('tenant_id', tid)
        .eq('channel', 'whatsapp')
        .order('last_message_at', { ascending: false, nullsFirst: false })
        .limit(25);

    if (error) throw error;
    return (data || []) as WhatsAppConversationSummary[];
};

export const updateWhatsAppConversationStatus = async (
    conversationId: string,
    action: 'human_handoff' | 'resume_ai' | 'close',
    tenantId?: string
) => {
    const tid = ensureTenantId(tenantId);
    if (!conversationId) throw new Error('INVALID_PARAMS');

    const nextStatus: WhatsAppConversationStatus =
        action === 'human_handoff'
            ? 'human_handoff'
            : action === 'resume_ai'
                ? 'ai_active'
                : 'closed';

    const { data, error } = await supabase
        .from('tenant_conversations')
        .update({ status: nextStatus })
        .eq('id', conversationId)
        .eq('tenant_id', tid)
        .eq('channel', 'whatsapp')
        .select('id, tenant_id, channel, status, ai_processing_status, customer_name, customer_phone_normalized, external_contact_id, last_message_at, updated_at, last_inbound_message_id, last_outbound_message_id')
        .single();

    if (error) throw error;
    return data as WhatsAppConversationSummary;
};

export const getWhatsAppConversationMessages = async (
    conversationId: string,
    tenantId?: string
): Promise<WhatsAppMessageSummary[]> => {
    const tid = ensureTenantId(tenantId);
    if (!conversationId) throw new Error('INVALID_PARAMS');

    const { data, error } = await supabase
        .from('conversation_messages')
        .select('id, conversation_id, tenant_id, channel, direction, sender_role, message_type, content_text, external_message_id, delivery_status, processing_status, error_message, provider_payload_json, created_at, sent_at, delivered_at, read_at, failed_at')
        .eq('tenant_id', tid)
        .eq('conversation_id', conversationId)
        .eq('channel', 'whatsapp')
        .order('created_at', { ascending: true })
        .limit(100);

    if (error) throw error;
    return (data || []) as WhatsAppMessageSummary[];
};

const normalizeWhatsAppConnectionStatus = (
    row: Partial<WhatsAppChannelSummary> | null
): WhatsAppConnectionStatus => {
    const explicit = String(row?.connection_status || '').trim().toLowerCase();
    if (['not_connected', 'connection_in_progress', 'connected', 'requires_attention', 'error'].includes(explicit)) {
        return explicit as WhatsAppConnectionStatus;
    }

    if (row?.meta_phone_number_id) return 'connected';
    return 'not_connected';
};

export const getWhatsAppChannelSummary = async (tenantId?: string): Promise<WhatsAppChannelSummary> => {
    const tid = ensureTenantId(tenantId);

    const { data, error } = await supabase
        .from('tenant_whatsapp_accounts')
        .select('id, tenant_id, meta_phone_number_id, credential_mode, credential_provider, access_token_ref')
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false, nullsFirst: false })
        .limit(1)
        .maybeSingle();

    if (error) throw error;

    if (!data) {
        return {
            tenant_id: tid,
            connection_status: 'not_connected',
        };
    }

    return {
        ...(data as Partial<WhatsAppChannelSummary>),
        connection_status: normalizeWhatsAppConnectionStatus(data as Partial<WhatsAppChannelSummary>),
    };
};

export const completeWhatsAppEmbeddedSignup = async (
    payload: CompleteWhatsAppEmbeddedSignupPayload
): Promise<CompleteWhatsAppEmbeddedSignupResult> => {
    const authToken = getAuthToken();
    const tenantId = getTenantId();
    if (!authToken) throw new Error('NOT_AUTHENTICATED');

    const response = await fetch('/api/whatsapp/embedded-signup/callback', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            'X-Zirel-Api-Token': authToken,
            ...(tenantId ? { 'X-Zirel-Tenant-Id': tenantId } : {}),
        },
        body: JSON.stringify({
            ...payload,
            tenant_api_token: authToken,
            tenant_id: tenantId || undefined,
        }),
    });

    let data: CompleteWhatsAppEmbeddedSignupResult | null = null;

    try {
        data = await response.json() as CompleteWhatsAppEmbeddedSignupResult;
    } catch {
        data = null;
    }

    if (!response.ok || !data?.ok) {
        throw new Error(data?.error_message || data?.error_code || `EMBEDDED_SIGNUP_HTTP_${response.status}`);
    }

    return data;
};

export const regenerateTenantToken = async (tenantId?: string): Promise<string> => {
    const tid = ensureTenantId(tenantId);
    const { data, error } = await supabase.rpc('regenerate_tenant_token', { p_tenant_id: tid });

    if (error || !data) throw error || new Error('INVALID_PARAMS');
    return data as string;
};

export const markApiTokenRevealed = async (tenantId?: string): Promise<void> => {
    const tid = ensureTenantId(tenantId);

    const { error } = await supabase
        .from('tenants')
        .update({ api_token_revealed: true })
        .eq('tenant_id', tid);

    if (error) throw error;
};

export const getAnalyticsSummary = async (tenantId?: string): Promise<AnalyticsSummary> => {
    const tid = ensureTenantId(tenantId);

    const [restaurantRows, hotelRows, appointmentRows, notificationRows] = await Promise.all([
        safeSelect<{ id: number; created_at?: string | null; stato?: string | null }>('prenotazioni', 'id, created_at, stato', tid),
        safeSelect<{ id: number; created_at?: string | null; booking_status?: string | null }>('hotel_bookings', 'id, created_at, booking_status', tid),
        safeSelect<{ id: number; created_at?: string | null; stato?: string | null }>('appointments', 'id, created_at, stato', tid),
        safeSelect<{ id: string; created_at?: string | null; status?: string | null; channel?: string | null }>('notification_outbox', 'id, created_at, status, channel', tid),
    ]);

    const requestRows = [
        ...restaurantRows.map((row) => ({
            created_at: row.created_at,
            status: normalizeOperationalStatus(row.stato),
            channel: 'restaurant',
        })),
        ...hotelRows.map((row) => ({
            created_at: row.created_at,
            status: normalizeOperationalStatus(row.booking_status),
            channel: 'hotel',
        })),
        ...appointmentRows.map((row) => ({
            created_at: row.created_at,
            status: normalizeOperationalStatus(row.stato),
            channel: 'appointment',
        })),
    ];

    const totalRequests = requestRows.length;
    const confirmedRequests = requestRows.filter((row) => row.status === 'confirmed').length;
    const pendingRequests = requestRows.filter((row) => row.status === 'pending').length;
    const rejectedRequests = requestRows.filter((row) => row.status === 'rejected').length;

    const notificationsSent = notificationRows.filter((row) => String(row.status || '').trim().toLowerCase() === 'sent').length;
    const notificationsPending = notificationRows.filter((row) => String(row.status || '').trim().toLowerCase() === 'pending').length;
    const notificationsFailed = notificationRows.filter((row) => String(row.status || '').trim().toLowerCase() === 'failed').length;

    return {
        generated_at: new Date().toISOString(),
        total_requests: totalRequests,
        confirmed_requests: confirmedRequests,
        pending_requests: pendingRequests,
        rejected_requests: rejectedRequests,
        conversion_rate: totalRequests > 0 ? Math.round((confirmedRequests / totalRequests) * 100) : 0,
        restaurant_requests: restaurantRows.length,
        hotel_requests: hotelRows.length,
        appointment_requests: appointmentRows.length,
        notifications_sent: notificationsSent,
        notifications_pending: notificationsPending,
        notifications_failed: notificationsFailed,
        recent_trend: buildRecentTrend(requestRows),
        tracks_conversations: false,
        tracks_messages: false,
        tracks_abandonment: false,
    };
};
