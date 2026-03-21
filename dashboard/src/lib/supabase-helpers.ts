import { supabase } from './supabaseClient';
import type {
    TenantData,
    OperationalRequest,
    OperationalRequestDetail,
    RequestEvent,
    DocumentFile,
    AnalyticsSummary,
    AnalyticsTrendPoint,
    CompleteWhatsAppEmbeddedSignupPayload,
    CompleteWhatsAppEmbeddedSignupResult,
    DisconnectWhatsAppChannelResult,
    SyncWhatsAppChannelResult,
    WhatsAppChannelOpsSummary,
    WhatsAppConversationSummary,
    WhatsAppConversationStatus,
    WhatsAppMessageSummary,
    WhatsAppChannelSummary,
    WhatsAppConnectionStatus,
    UpdateWhatsAppAutomationSettingsResult,
    SendWhatsAppHumanMessageResult,
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
    if (['manual_review', 'pending', 'new', 'in_review', 'change_proposed'].includes(normalized)) return 'pending';

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

// --- Operational Requests ---

export const getOperationalRequests = async (tenantId?: string): Promise<OperationalRequest[]> => {
    const tid = ensureTenantId(tenantId);

    const [{ data: reservationData, error: reservationError }, { data: appointmentData, error: appointmentError }] = await Promise.all([
        supabase
            .from('prenotazioni')
            .select('id, tenant_id, nome_cliente, telefono, data_prenotazione, ora, persone, note_prenotazione, stato, created_at')
            .eq('tenant_id', tid)
            .order('created_at', { ascending: false }),
        supabase
            .from('appointments')
            .select('id, tenant_id, nome, telefono, email, data_appuntamento, orario, note, stato, created_at')
            .eq('tenant_id', tid)
            .order('created_at', { ascending: false }),
    ]);

    if (reservationError) throw reservationError;
    if (appointmentError) throw appointmentError;

    const requests: OperationalRequest[] = [
        ...((reservationData || []).map((row) => ({
            id: row.id,
            tenant_id: row.tenant_id,
            kind: 'restaurant' as const,
            title: row.nome_cliente || 'Cliente Sconosciuto',
            primary_contact: row.telefono || null,
            date_label: row.data_prenotazione || 'N/D',
            time_label: row.ora || 'N/D',
            party_size_label: row.persone ? `${row.persone} persone` : 'N/D',
            reason_label: row.note_prenotazione || null,
            status: row.stato || 'PENDING',
            created_at: row.created_at || new Date().toISOString(),
        })) || []),
        ...((appointmentData || []).map((row) => ({
            id: row.id,
            tenant_id: row.tenant_id,
            kind: 'appointment' as const,
            title: row.nome || 'Richiesta appuntamento',
            primary_contact: row.telefono || null,
            email: row.email || null,
            date_label: row.data_appuntamento || 'N/D',
            time_label: row.orario || 'N/D',
            reason_label: row.note || null,
            status: row.stato || 'manual_review',
            created_at: row.created_at || new Date().toISOString(),
        })) || []),
    ];

    return requests.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const updateOperationalRequestStatus = async (
    id: number | string,
    kind: OperationalRequest['kind'],
    newStatus: string,
    tenantId?: string
) => {
    const tid = ensureTenantId(tenantId);
    if (!id || !ALLOWED_RESERVATION_STATUSES.includes(newStatus as (typeof ALLOWED_RESERVATION_STATUSES)[number])) {
        throw new Error('INVALID_PARAMS');
    }

    if (kind === 'appointment') {
        const mappedStatus = newStatus === 'CONFERMATA'
            ? 'confirmed'
            : newStatus === 'RIFIUTATA' || newStatus === 'ANNULLATA'
                ? 'rejected'
                : 'manual_review';

        const { error } = await supabase
            .from('appointments')
            .update({ stato: mappedStatus })
            .eq('id', id)
            .eq('tenant_id', tid);

        if (error) throw error;
        return;
    }

    const { error } = await supabase
        .from('prenotazioni')
        .update({ stato: newStatus })
        .eq('id', id)
        .eq('tenant_id', tid);

    if (error) throw error;
};

const normalizeDetail = (kind: OperationalRequest['kind'], row: Record<string, unknown>): OperationalRequestDetail => {
    if (kind === 'appointment') {
        return {
            id: row.id as number | string,
            tenant_id: String(row.tenant_id || ''),
            kind,
            title: String(row.nome || 'Richiesta appuntamento'),
            primary_contact: (row.telefono as string | null) || null,
            email: (row.email as string | null) || null,
            date_label: String(row.data_appuntamento || 'N/D'),
            time_label: String(row.orario || 'N/D'),
            reason_label: (row.note as string | null) || null,
            status: String(row.stato || 'manual_review'),
            created_at: String(row.created_at || new Date().toISOString()),
            requested_date: (row.data_appuntamento as string | null) || null,
            requested_time: (row.orario as string | null) || null,
            note: (row.note as string | null) || null,
            confirmed_at: (row.confirmed_at as string | null) || null,
            confirmed_by: (row.confirmed_by as string | null) || null,
            rejected_at: (row.rejected_at as string | null) || null,
            rejected_by: (row.rejected_by as string | null) || null,
            rejection_reason: (row.rejection_reason as string | null) || null,
            change_proposed_at: (row.change_proposed_at as string | null) || null,
            change_proposed_by: (row.change_proposed_by as string | null) || null,
            proposed_date: (row.proposed_date as string | null) || null,
            proposed_time: (row.proposed_time as string | null) || null,
            change_note: (row.change_note as string | null) || null,
            last_customer_email_sent_at: (row.last_customer_email_sent_at as string | null) || null,
            last_internal_update_sent_at: (row.last_internal_update_sent_at as string | null) || null,
        };
    }

    return {
        id: row.id as number | string,
        tenant_id: String(row.tenant_id || ''),
        kind,
        title: String(row.nome_cliente || 'Cliente Sconosciuto'),
        primary_contact: (row.telefono as string | null) || null,
        email: (row.email as string | null) || null,
        date_label: String(row.data_prenotazione || 'N/D'),
        time_label: String(row.ora || 'N/D'),
        party_size_label: row.persone ? `${row.persone} persone` : 'N/D',
        reason_label: (row.note_prenotazione as string | null) || null,
        status: String(row.stato || 'PENDING'),
        created_at: String(row.created_at || new Date().toISOString()),
        requested_date: (row.data_prenotazione as string | null) || null,
        requested_time: (row.ora as string | null) || null,
        note: (row.note_prenotazione as string | null) || null,
        party_size: row.persone ? Number(row.persone) : null,
        confirmed_at: (row.confirmed_at as string | null) || null,
        confirmed_by: (row.confirmed_by as string | null) || null,
        rejected_at: (row.rejected_at as string | null) || null,
        rejected_by: (row.rejected_by as string | null) || null,
        rejection_reason: (row.rejection_reason as string | null) || null,
        change_proposed_at: (row.change_proposed_at as string | null) || null,
        change_proposed_by: (row.change_proposed_by as string | null) || null,
        proposed_date: (row.proposed_date as string | null) || null,
        proposed_time: (row.proposed_time as string | null) || null,
        change_note: (row.change_note as string | null) || null,
        last_customer_email_sent_at: (row.last_customer_email_sent_at as string | null) || null,
        last_internal_update_sent_at: (row.last_internal_update_sent_at as string | null) || null,
    };
};

export const getOperationalRequestDetail = async (
    id: number | string,
    kind: OperationalRequest['kind'],
    tenantId?: string
): Promise<OperationalRequestDetail> => {
    const tid = ensureTenantId(tenantId);

    if (kind === 'appointment') {
        const { data, error } = await supabase
            .from('appointments')
            .select('id, tenant_id, nome, telefono, email, data_appuntamento, orario, note, stato, created_at, confirmed_at, confirmed_by, rejected_at, rejected_by, rejection_reason, change_proposed_at, change_proposed_by, proposed_date, proposed_time, change_note, last_customer_email_sent_at, last_internal_update_sent_at')
            .eq('id', id)
            .eq('tenant_id', tid)
            .single();

        if (error || !data) throw error || new Error('REQUEST_NOT_FOUND');
        return normalizeDetail(kind, data as Record<string, unknown>);
    }

    const { data, error } = await supabase
        .from('prenotazioni')
        .select('id, tenant_id, nome_cliente, telefono, email, data_prenotazione, ora, persone, note_prenotazione, stato, created_at, confirmed_at, confirmed_by, rejected_at, rejected_by, rejection_reason, change_proposed_at, change_proposed_by, proposed_date, proposed_time, change_note, last_customer_email_sent_at, last_internal_update_sent_at')
        .eq('id', id)
        .eq('tenant_id', tid)
        .single();

    if (error || !data) throw error || new Error('REQUEST_NOT_FOUND');
    return normalizeDetail(kind, data as Record<string, unknown>);
};

export const getOperationalRequestEvents = async (
    id: number | string,
    kind: OperationalRequest['kind'],
    tenantId?: string
): Promise<RequestEvent[]> => {
    const tid = ensureTenantId(tenantId);

    const { data, error } = await supabase
        .from('request_events')
        .select('id, tenant_id, request_type, request_id, event_type, actor, payload, created_at')
        .eq('tenant_id', tid)
        .eq('request_type', kind)
        .eq('request_id', String(id))
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as RequestEvent[];
};

type OperationalRequestAction = 'confirm' | 'reject' | 'propose_change' | 'confirm_change';

interface OperationalRequestActionInput {
    action: OperationalRequestAction;
    reason?: string;
    proposedDate?: string;
    proposedTime?: string;
    note?: string;
    actor?: string;
}

const normalizeEmail = (value?: string | null) => String(value || '').trim().toLowerCase();

const resolveInternalRecipient = (tenantRow: Record<string, unknown>) =>
    normalizeEmail(
        (tenantRow.notification_email as string | null) ||
        (tenantRow.billing_email as string | null) ||
        (tenantRow.mail as string | null) ||
        ''
    ) || null;

const buildActivityLabel = (tenantRow: Record<string, unknown>, detail: OperationalRequestDetail, tenantId: string) =>
    String(
        tenantRow.nome_attivita ||
        tenantRow.nome_ristorante ||
        tenantRow.hotel_name ||
        detail.title ||
        tenantRow.tenant_id ||
        tenantId ||
        'Zirèl'
    );

const mapActionToStatusValue = (kind: OperationalRequest['kind'], action: OperationalRequestAction) => {
    if (action === 'confirm' || action === 'confirm_change') {
        return kind === 'appointment' ? 'confirmed' : 'CONFERMATA';
    }

    if (action === 'reject') {
        return kind === 'appointment' ? 'rejected' : 'RIFIUTATA';
    }

    return 'change_proposed';
};

const mapActionToCustomerTemplate = (kind: OperationalRequest['kind'], action: OperationalRequestAction) => {
    if (kind === 'appointment') {
        if (action === 'reject') return 'appointment_rejected';
        if (action === 'propose_change') return 'appointment_change_proposed';
        return 'appointment_confirmed';
    }

    if (action === 'reject') return 'restaurant_rejected';
    if (action === 'propose_change') return 'restaurant_change_proposed';
    return 'restaurant_confirmed';
};

const mapActionToInternalTemplate = (kind: OperationalRequest['kind']) =>
    kind === 'appointment' ? 'appointment_internal_status_update' : 'restaurant_internal_status_update';

const mapKindToOutbox = (kind: OperationalRequest['kind']) => ({
    relatedEntityType: kind === 'appointment' ? 'appointment' : 'restaurant_booking',
    guestChannel: kind === 'appointment' ? 'email_guest_appointment' : 'email_guest_restaurant',
    internalChannel: kind === 'appointment' ? 'email_internal_appointment' : 'email_internal_restaurant',
});

export const applyOperationalRequestAction = async (
    id: number | string,
    kind: OperationalRequest['kind'],
    input: OperationalRequestActionInput,
    tenantId?: string
): Promise<void> => {
    const tid = ensureTenantId(tenantId);
    const actor = String(input.actor || 'dashboard').trim();
    const now = new Date().toISOString();
    const currentDetail = await getOperationalRequestDetail(id, kind, tid);
    const { data: tenantData, error: tenantError } = await supabase
        .from('tenants')
        .select('tenant_id, notification_email, billing_email, mail')
        .eq('tenant_id', tid)
        .single();

    if (tenantError || !tenantData) throw tenantError || new Error('TENANT_NOT_FOUND');

    const tenantRow = tenantData as unknown as Record<string, unknown>;
    const internalRecipient = resolveInternalRecipient(tenantRow);
    const customerRecipient = normalizeEmail(currentDetail.email || '');
    const dashboardUrl = 'https://dashboard.zirel.org?tab=prenotazioni';
    const nextStatus = mapActionToStatusValue(kind, input.action);
    const activity = buildActivityLabel(tenantRow, currentDetail, tid);
    const requestContext =
        kind === 'appointment'
            ? {
                date: currentDetail.requested_date || currentDetail.date_label,
                time: currentDetail.requested_time || currentDetail.time_label,
            }
            : {
                date: currentDetail.requested_date || currentDetail.date_label,
                time: currentDetail.requested_time || currentDetail.time_label,
            };

    let updatePayload: Record<string, unknown> = {};
    let eventType = '';

    if (input.action === 'confirm') {
        updatePayload = {
            stato: nextStatus,
            confirmed_at: now,
            confirmed_by: actor,
            ...(customerRecipient ? { last_customer_email_sent_at: now } : {}),
            ...(internalRecipient ? { last_internal_update_sent_at: now } : {}),
        };
        eventType = 'confirmed';
    } else if (input.action === 'reject') {
        updatePayload = {
            stato: nextStatus,
            rejected_at: now,
            rejected_by: actor,
            rejection_reason: input.reason || null,
            ...(customerRecipient ? { last_customer_email_sent_at: now } : {}),
            ...(internalRecipient ? { last_internal_update_sent_at: now } : {}),
        };
        eventType = 'rejected';
    } else if (input.action === 'propose_change') {
        updatePayload = {
            stato: nextStatus,
            change_proposed_at: now,
            change_proposed_by: actor,
            proposed_date: input.proposedDate || null,
            proposed_time: input.proposedTime || null,
            change_note: input.note || null,
            ...(customerRecipient ? { last_customer_email_sent_at: now } : {}),
            ...(internalRecipient ? { last_internal_update_sent_at: now } : {}),
        };
        eventType = 'change_proposed';
    } else if (input.action === 'confirm_change') {
        updatePayload = {
            stato: nextStatus,
            confirmed_at: now,
            confirmed_by: actor,
            ...(kind === 'appointment'
                ? {
                    data_appuntamento: currentDetail.proposed_date || currentDetail.requested_date || null,
                    orario: currentDetail.proposed_time || currentDetail.requested_time || null,
                }
                : {
                    data_prenotazione: currentDetail.proposed_date || currentDetail.requested_date || null,
                    ora: currentDetail.proposed_time || currentDetail.requested_time || null,
                }),
            ...(customerRecipient ? { last_customer_email_sent_at: now } : {}),
            ...(internalRecipient ? { last_internal_update_sent_at: now } : {}),
        };
        eventType = 'change_confirmed';
    } else {
        throw new Error('INVALID_PARAMS');
    }

    const updateQuery = kind === 'appointment'
        ? supabase.from('appointments').update(updatePayload).eq('id', id).eq('tenant_id', tid)
        : supabase.from('prenotazioni').update(updatePayload).eq('id', id).eq('tenant_id', tid);

    const { error: updateError } = await updateQuery;

    if (updateError) throw updateError;

    const { error: eventError } = await supabase
        .from('request_events')
        .insert({
            tenant_id: tid,
            request_type: kind,
            request_id: String(id),
            event_type: eventType,
            actor,
            payload: {
                reason: input.reason || null,
                proposed_date: input.proposedDate || null,
                proposed_time: input.proposedTime || null,
                note: input.note || null,
            },
        });

    if (eventError) throw eventError;

    const effectiveDate = input.action === 'confirm_change'
        ? (currentDetail.proposed_date || currentDetail.requested_date || requestContext.date)
        : requestContext.date;
    const effectiveTime = input.action === 'confirm_change'
        ? (currentDetail.proposed_time || currentDetail.requested_time || requestContext.time)
        : requestContext.time;

    const payload = kind === 'appointment'
        ? {
            tenant_id: tid,
            nome_attivita: activity,
            dashboard_url: dashboardUrl,
            appointment_id: currentDetail.id,
            nome: currentDetail.title,
            telefono: currentDetail.primary_contact || null,
            email: currentDetail.email || null,
            motivo: currentDetail.reason_label || currentDetail.note || 'N/D',
            note: currentDetail.note || '',
            data_appuntamento: effectiveDate || null,
            data_appuntamento_label: effectiveDate || null,
            orario: effectiveTime || null,
            original_date: currentDetail.requested_date || null,
            original_time: currentDetail.requested_time || null,
            proposed_date: input.proposedDate || currentDetail.proposed_date || null,
            proposed_time: input.proposedTime || currentDetail.proposed_time || null,
            rejection_reason: input.reason || currentDetail.rejection_reason || null,
            change_note: input.note || currentDetail.change_note || null,
            status: nextStatus,
            actor,
        }
        : {
            tenant_id: tid,
            nome_attivita: activity,
            dashboard_url: dashboardUrl,
            reservation_id: currentDetail.id,
            nome_cliente: currentDetail.title,
            telefono: currentDetail.primary_contact || null,
            email: currentDetail.email || null,
            data_prenotazione: effectiveDate || null,
            data_prenotazione_label: effectiveDate || null,
            ora: effectiveTime || null,
            persone: currentDetail.party_size || null,
            note_prenotazione: currentDetail.note || '',
            original_date: currentDetail.requested_date || null,
            original_time: currentDetail.requested_time || null,
            proposed_date: input.proposedDate || currentDetail.proposed_date || null,
            proposed_time: input.proposedTime || currentDetail.proposed_time || null,
            rejection_reason: input.reason || currentDetail.rejection_reason || null,
            change_note: input.note || currentDetail.change_note || null,
            status: nextStatus,
            actor,
        };

    const { relatedEntityType, guestChannel, internalChannel } = mapKindToOutbox(kind);
    const outboxRows: Array<Record<string, unknown>> = [];
    const dedupeBase = `${tid}:${id}:${eventType}:${now}`;

    if (customerRecipient) {
        outboxRows.push({
            tenant_id: tid,
            channel: guestChannel,
            template_key: mapActionToCustomerTemplate(kind, input.action),
            related_entity_type: relatedEntityType,
            related_entity_id: id,
            status: 'pending',
            retry_count: 0,
            max_retries: 5,
            next_retry_at: now,
            trace_id: `dashboard:${dedupeBase}`,
            dedupe_key: `${guestChannel}:${dedupeBase}`,
            recipient_email: customerRecipient,
            payload,
        });
    }

    if (internalRecipient) {
        outboxRows.push({
            tenant_id: tid,
            channel: internalChannel,
            template_key: mapActionToInternalTemplate(kind),
            related_entity_type: relatedEntityType,
            related_entity_id: id,
            status: 'pending',
            retry_count: 0,
            max_retries: 5,
            next_retry_at: now,
            trace_id: `dashboard:${dedupeBase}:internal`,
            dedupe_key: `${internalChannel}:${dedupeBase}`,
            recipient_email: internalRecipient,
            payload,
        });
    }

    if (outboxRows.length > 0) {
        const { error: outboxError } = await supabase
            .from('notification_outbox')
            .insert(outboxRows);

        if (outboxError) throw outboxError;
    }
};

export const getReservations = async (tenantId?: string) =>
    getOperationalRequests(tenantId).then((rows) => rows.filter((row) => row.kind === 'restaurant'));

export const updateReservationStatus = async (id: number | string, newStatus: string, tenantId?: string) =>
    updateOperationalRequestStatus(id, 'restaurant', newStatus, tenantId);

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

export const updateWhatsAppAutomationSettings = async (
    aiEnabled: boolean,
    tenantId?: string
): Promise<UpdateWhatsAppAutomationSettingsResult> => {
    const tid = ensureTenantId(tenantId);
    const authToken = getAuthToken();
    if (!authToken) throw new Error('NOT_AUTHENTICATED');

    const response = await fetch('/api/whatsapp/automation-settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            'X-Zirel-Api-Token': authToken,
            'X-Zirel-Tenant-Id': tid,
        },
        body: JSON.stringify({
            tenant_id: tid,
            tenant_api_token: authToken,
            ai_enabled: aiEnabled,
        }),
    });

    let body: UpdateWhatsAppAutomationSettingsResult | null = null;
    try {
        body = await response.json() as UpdateWhatsAppAutomationSettingsResult;
    } catch {
        body = null;
    }

    if (!response.ok || !body?.ok) {
        throw new Error(body?.error_message || body?.error_code || `WHATSAPP_AUTOMATION_HTTP_${response.status}`);
    }

    return body;
};

export const sendWhatsAppHumanMessage = async (
    conversationId: string,
    contentText: string,
    tenantId?: string
): Promise<SendWhatsAppHumanMessageResult> => {
    const tid = ensureTenantId(tenantId);
    const authToken = getAuthToken();
    if (!authToken) throw new Error('NOT_AUTHENTICATED');
    if (!conversationId || !contentText.trim()) throw new Error('INVALID_PARAMS');

    const response = await fetch('/api/whatsapp/human-send', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            'X-Zirel-Api-Token': authToken,
            'X-Zirel-Tenant-Id': tid,
        },
        body: JSON.stringify({
            tenant_id: tid,
            tenant_api_token: authToken,
            conversation_id: conversationId,
            content_text: contentText.trim(),
        }),
    });

    let body: SendWhatsAppHumanMessageResult | null = null;
    try {
        body = await response.json() as SendWhatsAppHumanMessageResult;
    } catch {
        body = null;
    }

    if (!response.ok || !body?.ok) {
        throw new Error(body?.error_message || body?.error_code || `WHATSAPP_HUMAN_SEND_HTTP_${response.status}`);
    }

    return body;
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
    const authToken = getAuthToken();
    if (!authToken) throw new Error('NOT_AUTHENTICATED');

    const response = await fetch('/api/whatsapp/channel-summary', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            'X-Zirel-Api-Token': authToken,
            'X-Zirel-Tenant-Id': tid,
        },
        body: JSON.stringify({
            tenant_id: tid,
            tenant_api_token: authToken,
        }),
    });

    let body: { ok?: boolean; summary?: Partial<WhatsAppChannelSummary>; error_message?: string; error_code?: string } | null = null;

    try {
        body = await response.json() as { ok?: boolean; summary?: Partial<WhatsAppChannelSummary>; error_message?: string; error_code?: string };
    } catch {
        body = null;
    }

    if (!response.ok || !body?.ok) {
        throw new Error(body?.error_message || body?.error_code || `WHATSAPP_SUMMARY_HTTP_${response.status}`);
    }

    const summary = body.summary || { tenant_id: tid, connection_status: 'not_connected' };
    return {
        ...(summary as Partial<WhatsAppChannelSummary>),
        tenant_id: summary.tenant_id || tid,
        connection_status: normalizeWhatsAppConnectionStatus(summary),
    } as WhatsAppChannelSummary;
};

export const syncWhatsAppChannel = async (tenantId?: string): Promise<SyncWhatsAppChannelResult> => {
    const tid = ensureTenantId(tenantId);
    const authToken = getAuthToken();
    if (!authToken) throw new Error('NOT_AUTHENTICATED');

    const response = await fetch('/api/whatsapp/sync', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            'X-Zirel-Api-Token': authToken,
            'X-Zirel-Tenant-Id': tid,
        },
        body: JSON.stringify({
            tenant_id: tid,
            tenant_api_token: authToken,
        }),
    });

    let body: SyncWhatsAppChannelResult | null = null;
    try {
        body = await response.json() as SyncWhatsAppChannelResult;
    } catch {
        body = null;
    }

    if (!response.ok || !body?.ok) {
        throw new Error(body?.error_message || body?.error_code || `WHATSAPP_SYNC_HTTP_${response.status}`);
    }

    return body;
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

export const disconnectWhatsAppChannel = async (): Promise<DisconnectWhatsAppChannelResult> => {
    const authToken = getAuthToken();
    const tenantId = getTenantId();
    if (!authToken || !tenantId) throw new Error('NOT_AUTHENTICATED');

    const response = await fetch('/api/whatsapp/disconnect', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            'X-Zirel-Api-Token': authToken,
            'X-Zirel-Tenant-Id': tenantId,
        },
        body: JSON.stringify({
            tenant_id: tenantId,
            tenant_api_token: authToken,
        }),
    });

    let data: DisconnectWhatsAppChannelResult | null = null;

    try {
        data = await response.json() as DisconnectWhatsAppChannelResult;
    } catch {
        data = null;
    }

    if (!response.ok || !data?.ok) {
        throw new Error(data?.error_message || data?.error_code || `WHATSAPP_DISCONNECT_HTTP_${response.status}`);
    }

    return data;
};

export const getWhatsAppChannelOpsSummary = async (tenantId?: string): Promise<WhatsAppChannelOpsSummary> => {
    const tid = ensureTenantId(tenantId);
    const authToken = getAuthToken();
    if (!authToken) throw new Error('NOT_AUTHENTICATED');

    const response = await fetch('/api/whatsapp/channel-ops', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${authToken}`,
            'X-Zirel-Api-Token': authToken,
            'X-Zirel-Tenant-Id': tid,
        },
        body: JSON.stringify({
            tenant_id: tid,
            tenant_api_token: authToken,
        }),
    });

    let body: { ok?: boolean; failed_outbound?: WhatsAppChannelOpsSummary['failed_outbound']; recent_webhook_events?: WhatsAppChannelOpsSummary['recent_webhook_events']; error_message?: string; error_code?: string } | null = null;

    try {
        body = await response.json() as { ok?: boolean; failed_outbound?: WhatsAppChannelOpsSummary['failed_outbound']; recent_webhook_events?: WhatsAppChannelOpsSummary['recent_webhook_events']; error_message?: string; error_code?: string };
    } catch {
        body = null;
    }

    if (!response.ok || !body?.ok) {
        throw new Error(body?.error_message || body?.error_code || `WHATSAPP_OPS_HTTP_${response.status}`);
    }

    return {
        tenant_id: tid,
        failed_outbound: body.failed_outbound || [],
        recent_webhook_events: body.recent_webhook_events || [],
    };
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
