/**
 * Centralized type definitions for the Zirèl Dashboard.
 */

export interface TenantData {
    tenant_id: string;
    api_token: string;
    api_token_revealed?: boolean;
    api_token_generated_at?: string;
    hotel_name?: string;
    booking_url?: string;
    ai_instructions?: string;
    created_at?: string;
    updated_at?: string;

    // Trial & Subscription
    trial_ends_at?: string;
    subscription_status?: string;

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

export interface Reservation {
    id: number;
    tenant_id: string;
    nome_cliente: string;
    telefono: string;
    data_prenotazione: string;
    ora: string;
    persone: string;
    stato: string;
    created_at: string;
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
