/**
 * Centralized type definitions for the Zirèl Dashboard.
 */

export interface TenantData {
    tenant_id: string;
    api_token: string;
    api_token_revealed?: boolean;
    api_token_generated_at?: string;
    hotel_name?: string;
    nome_attivita?: string;
    business_type?: string;
    booking_url?: string;
    ai_instructions?: string;
    created_at?: string;
    updated_at?: string;

    // Trial & Subscription
    trial_ends_at?: string;
    subscription_status?: string;
    stripe_customer_id?: string;
    stripe_subscription_id?: string;
    stripe_price_id?: string;
    stripe_product_id?: string;
    stripe_checkout_url?: string;
    stripe_customer_portal_url?: string;
    billing_email?: string;
    billing_plan_code?: string;
    billing_last_event_id?: string;
    billing_cycle?: string;
    current_period_end?: string;
    setup_fee_paid?: boolean;
    notification_email?: string;
    internal_email?: string;

    // Business Info
    nome_ristorante?: string;
    telefono?: string;
    mail?: string;
    indirizzo?: string;
    sito_web_url?: string;
    google_maps_link?: string;

    // Operations
    orari_apertura?: string;
    giorni_chiusura?: string;
    orari_checkin_checkout?: string;
    durata_media_appuntamento?: string;

    // Links
    link_prenotazione_tavoli?: string;
    link_booking_esterno?: string;
    instagram_url?: string;
    facebook_url?: string;
    tripadvisor_url?: string;
    recensioni_url?: string;

    // Cuisine & Services
    tipo_cucina?: string;
    specialita_casa?: string;
    prezzo_medio?: string;
    prima_consulenza_costo?: string;
    servizi_inclusi?: string;
    menu_testo?: string;

    // Facilities
    wifi_password?: string;
    parcheggio_info?: string;
    animali_ammessi?: string;
    metodi_pagamento?: string;
    tassa_soggiorno?: string;
    allergie_policy?: string;

    // Marketing
    promozione_attiva?: string;
    dati_testuali_brevi?: string;

    // Widget Customization
    widget_title?: string;
    widget_subtitle?: string;
    widget_color?: string;
    widget_icon?: string;

    [key: string]: unknown; // Strict index signature
}

export type OperationalRequestKind = 'restaurant' | 'appointment' | 'hotel';

export interface OperationalRequest {
    id: number | string;
    tenant_id: string;
    kind: OperationalRequestKind;
    title: string;
    primary_contact?: string | null;
    email?: string | null;
    date_label: string;
    time_label: string;
    party_size_label?: string | null;
    reason_label?: string | null;
    status: string;
    created_at: string;
}

export interface RequestEvent {
    id: string;
    tenant_id: string;
    request_type: string;
    request_id: string;
    event_type: string;
    actor?: string | null;
    payload?: Record<string, unknown> | null;
    created_at: string;
}

export interface OperationalRequestDetail extends OperationalRequest {
    requested_date?: string | null;
    requested_time?: string | null;
    note?: string | null;
    party_size?: number | null;
    confirmed_at?: string | null;
    confirmed_by?: string | null;
    rejected_at?: string | null;
    rejected_by?: string | null;
    rejection_reason?: string | null;
    change_proposed_at?: string | null;
    change_proposed_by?: string | null;
    proposed_date?: string | null;
    proposed_time?: string | null;
    change_note?: string | null;
    last_customer_email_sent_at?: string | null;
    last_internal_update_sent_at?: string | null;
}

export interface DocumentFile {
    name: string;
    id: string;
    updated_at: string;
    created_at: string;
    last_accessed_at: string;
    metadata: Record<string, unknown>;
}

export interface AuthResult {
    tenant_id: string;
    api_token: string;
    api_token_revealed?: boolean;
}

export interface AnalyticsTrendPoint {
    date: string;
    label: string;
    total: number;
    confirmed: number;
}

export interface AnalyticsSummary {
    generated_at: string;
    total_requests: number;
    confirmed_requests: number;
    pending_requests: number;
    rejected_requests: number;
    conversion_rate: number;
    restaurant_requests: number;
    hotel_requests: number;
    appointment_requests: number;
    notifications_sent: number;
    notifications_pending: number;
    notifications_failed: number;
    recent_trend: AnalyticsTrendPoint[];
    tracks_conversations: boolean;
    tracks_messages: boolean;
    tracks_abandonment: boolean;
}

export type WhatsAppConversationStatus = 'ai_active' | 'human_handoff' | 'closed';

export interface WhatsAppConversationSummary {
    id: string;
    tenant_id: string;
    channel: string;
    status: WhatsAppConversationStatus | string;
    ai_processing_status?: string | null;
    customer_name?: string | null;
    customer_phone_normalized?: string | null;
    external_contact_id?: string | null;
    last_message_at?: string | null;
    updated_at?: string | null;
    last_inbound_message_id?: string | null;
    last_outbound_message_id?: string | null;
}

export interface WhatsAppMessageSummary {
    id: string;
    conversation_id: string;
    tenant_id: string;
    channel: string;
    direction: 'inbound' | 'outbound' | string;
    sender_role: 'customer' | 'ai' | 'human' | 'system' | string;
    message_type?: string | null;
    content_text?: string | null;
    external_message_id?: string | null;
    delivery_status?: string | null;
    processing_status?: string | null;
    error_message?: string | null;
    provider_payload_json?: Record<string, unknown> | null;
    created_at?: string | null;
    sent_at?: string | null;
    delivered_at?: string | null;
    read_at?: string | null;
    failed_at?: string | null;
}

export type WhatsAppConnectionStatus =
    | 'not_connected'
    | 'connection_in_progress'
    | 'connected'
    | 'requires_attention'
    | 'error';

export interface WhatsAppChannelSummary {
    id?: string;
    tenant_id?: string;
    meta_phone_number_id?: string | null;
    credential_mode?: string | null;
    credential_provider?: string | null;
    access_token_ref?: string | null;
    waba_id?: string | null;
    display_phone_number?: string | null;
    verified_name?: string | null;
    connection_status: WhatsAppConnectionStatus;
    ai_enabled?: boolean;
    human_handoff_enabled?: boolean;
    last_sync_at?: string | null;
    last_webhook_at?: string | null;
    webhook_verified_at?: string | null;
    onboarding_error?: string | null;
}

export interface CompleteWhatsAppEmbeddedSignupPayload {
    meta_phone_number_id: string;
    waba_id: string;
    display_phone_number?: string | null;
    verified_name?: string | null;
    connection_status?: WhatsAppConnectionStatus | string;
    business_id?: string | null;
    signup_session_id?: string | null;
    replace_existing?: boolean;
}

export interface CompleteWhatsAppEmbeddedSignupResult {
    ok: boolean;
    tenant_id?: string;
    connection_status?: WhatsAppConnectionStatus | string;
    meta_phone_number_id?: string;
    waba_id?: string;
    display_phone_number?: string | null;
    verified_name?: string | null;
    next_step?: string;
    error_code?: string;
    error_message?: string;
}

export interface DisconnectWhatsAppChannelResult {
    ok: boolean;
    tenant_id?: string;
    connection_status?: WhatsAppConnectionStatus | string;
    next_step?: string;
    error_code?: string;
    error_message?: string;
}

export interface SyncWhatsAppChannelResult {
    ok: boolean;
    synced?: boolean;
    reason?: string;
    account?: Partial<WhatsAppChannelSummary> | null;
    error_code?: string;
    error_message?: string;
}

export interface UpdateWhatsAppAutomationSettingsResult {
    ok: boolean;
    tenant_id?: string;
    ai_enabled?: boolean;
    human_handoff_enabled?: boolean;
    error_code?: string;
    error_message?: string;
}

export interface SendWhatsAppHumanMessageResult {
    ok: boolean;
    tenant_id?: string;
    conversation_id?: string;
    conversation_status?: WhatsAppConversationStatus | string;
    message?: WhatsAppMessageSummary | null;
    error_code?: string;
    error_message?: string;
}

export interface WhatsAppFailedOutboundItem {
    id: string;
    conversation_id?: string | null;
    processing_status?: string | null;
    delivery_status?: string | null;
    error_message?: string | null;
    created_at?: string | null;
    failed_at?: string | null;
}

export interface WhatsAppWebhookEventItem {
    id: string;
    event_type?: string | null;
    event_status?: string | null;
    error_message?: string | null;
    created_at?: string | null;
}

export interface WhatsAppChannelOpsSummary {
    tenant_id?: string;
    failed_outbound: WhatsAppFailedOutboundItem[];
    recent_webhook_events: WhatsAppWebhookEventItem[];
}
