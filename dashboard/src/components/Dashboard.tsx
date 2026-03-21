import { useState, useEffect, useCallback } from 'react';
import { Save, LogOut, Store, Clock, Utensils, Megaphone, CheckCircle2, Link as LinkIcon, Info, Loader2, Settings, CalendarDays, FileText, Shield, Copy, RefreshCw, Eye, EyeOff, CreditCard, BarChart3, MessageSquare, Menu, X, Search, CircleHelp } from 'lucide-react';
import { saveAuthToken, getCurrentTenantId } from '../lib/auth';
import { getTenantData, updateTenantData, regenerateTenantToken, markApiTokenRevealed } from '../lib/supabase-helpers';
import { syncTenantFieldState } from '../lib/tenant-form';
import type { TenantData } from '../types';
import Reservations from './Reservations';
import DocumentManager from './DocumentManager';
import BillingSection from './BillingSection';
import AnalyticsSection from './AnalyticsSection';
import WhatsAppHandoffPanel from './WhatsAppHandoffPanel';
import WhatsAppChannelCard from './WhatsAppChannelCard';
import toast from 'react-hot-toast';

interface DashboardProps {
    onLogout: () => void;
}

interface WorkspaceSearchItem {
    id: string;
    title: string;
    subtitle: string;
    tab: DashboardTab;
    keywords: string[];
    settingsQuery?: string;
}

interface InputFieldProps {
    label: string;
    value: string | undefined;
    onChange: (val: string) => void;
    placeholder?: string;
}

const InputField = ({ label, value, onChange, placeholder = '' }: InputFieldProps) => (
    <div>
        <label className="block text-sm font-medium text-gray-500 mb-2 px-1">{label}</label>
        <input
            type="text"
            placeholder={placeholder}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="apple-input"
        />
    </div>
);

interface TextareaFieldProps {
    label: string;
    value: string | undefined;
    onChange: (val: string) => void;
    placeholder?: string;
    rows?: number;
}

const TextareaField = ({ label, value, onChange, placeholder = '', rows = 3 }: TextareaFieldProps) => (
    <div>
        <label className="block text-sm font-medium text-gray-500 mb-2 px-1">{label}</label>
        <textarea
            placeholder={placeholder}
            rows={rows}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            className="apple-input resize-none"
        ></textarea>
    </div>
);

const formatBillingDate = (value?: string | null) => {
    if (!value) return 'data non disponibile';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'data non disponibile';
    return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
};

type ProductAccessState = 'open' | 'warning' | 'limited' | 'suspended';
type DashboardTab = 'analytics' | 'impostazioni' | 'prenotazioni' | 'documenti' | 'sicurezza' | 'integrazione' | 'conversazioni' | 'abbonamento';

const BILLING_GRACE_DAYS = 7;

const DASHBOARD_TABS: Array<{ id: DashboardTab; label: string; shortLabel: string; icon: typeof BarChart3; description: string }> = [
    { id: 'analytics', label: 'Analytics', shortLabel: 'Analytics', icon: BarChart3, description: 'Metriche, trend e stato operativo del concierge.' },
    { id: 'prenotazioni', label: 'Richieste', shortLabel: 'Richieste', icon: CalendarDays, description: 'Appuntamenti, tavoli e richieste operative in un’unica vista.' },
    { id: 'conversazioni', label: 'Conversazioni', shortLabel: 'Conversazioni', icon: MessageSquare, description: 'Thread WhatsApp, handoff umano e controlli live.' },
    { id: 'documenti', label: 'Documenti', shortLabel: 'Documenti', icon: FileText, description: 'Knowledge base, materiali e ingestione documentale.' },
    { id: 'abbonamento', label: 'Abbonamento', shortLabel: 'Abbonamento', icon: CreditCard, description: 'Billing, prova, rinnovi e stato del servizio.' },
    { id: 'sicurezza', label: 'Sicurezza', shortLabel: 'Sicurezza', icon: Shield, description: 'Token API, accessi e operazioni sensibili.' },
    { id: 'integrazione', label: 'Integrazione', shortLabel: 'Integrazione', icon: LinkIcon, description: 'WhatsApp, widget e configurazioni di collegamento.' },
    { id: 'impostazioni', label: 'Impostazioni', shortLabel: 'Impostazioni', icon: Settings, description: 'Profilo attività, regole e dati usati dall’assistente.' },
];

const Dashboard = ({ onLogout }: DashboardProps) => {

    const [formData, setFormData] = useState<TenantData | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
    const [activeTab, setActiveTab] = useState<DashboardTab>('prenotazioni');
    const [isTokenVisible, setIsTokenVisible] = useState(false);
    const [editForm, setEditForm] = useState<Partial<TenantData>>({});
    const [isBillingLoading, setIsBillingLoading] = useState(false);
    const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
    const [settingsSearch, setSettingsSearch] = useState('');
    const [workspaceSearch, setWorkspaceSearch] = useState('');
    const [isWorkspaceSearchFocused, setIsWorkspaceSearchFocused] = useState(false);

    const tenantId = formData?.tenant_id || getCurrentTenantId();
    const workspaceName = formData?.nome_ristorante || formData?.hotel_name || formData?.nome_attivita || tenantId;
    const trialEndsAt = formData?.trial_ends_at ? new Date(formData.trial_ends_at) : null;
    const currentPeriodEnd = formData?.current_period_end ? new Date(formData.current_period_end) : null;
    const trialDaysRemaining = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
    const normalizedSubscriptionStatus = String(formData?.subscription_status || 'trialing').trim().toLowerCase();
    const hasActiveSubscription = Boolean(formData?.stripe_subscription_id);
    const isExpiredTrial = normalizedSubscriptionStatus === 'trialing' && !!trialEndsAt && trialEndsAt.getTime() <= Date.now() && !hasActiveSubscription;
    const graceEndsAt = currentPeriodEnd
        ? new Date(currentPeriodEnd.getTime() + BILLING_GRACE_DAYS * 24 * 60 * 60 * 1000)
        : null;
    const graceDaysRemaining = graceEndsAt
        ? Math.ceil((graceEndsAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;
    const isPastDueGraceExpired = normalizedSubscriptionStatus === 'past_due' && !!graceEndsAt && graceEndsAt.getTime() < Date.now();
    const productAccessState: ProductAccessState = isExpiredTrial
        ? 'limited'
        : normalizedSubscriptionStatus === 'canceled'
            ? 'suspended'
            : normalizedSubscriptionStatus === 'past_due'
                ? isPastDueGraceExpired ? 'suspended' : 'warning'
                : 'open';
    const operationalTabs = new Set(['prenotazioni', 'documenti', 'integrazione', 'conversazioni', 'impostazioni']);
    const shouldLockActiveTab = operationalTabs.has(activeTab) && (productAccessState === 'limited' || productAccessState === 'suspended');
    const activeTabMeta = DASHBOARD_TABS.find((tab) => tab.id === activeTab) || DASHBOARD_TABS[0];
    const normalizedSettingsSearch = settingsSearch.trim().toLowerCase();
    const matchesSettingsSearch = (...values: Array<string | undefined | null>) => {
        if (!normalizedSettingsSearch) return true;
        return values.some((value) => String(value ?? '').toLowerCase().includes(normalizedSettingsSearch));
    };
    const showSettingsField = (sectionTitle: string, label: string, value?: string | null) =>
        matchesSettingsSearch(sectionTitle, label, value);
    const showContactSection = [
        showSettingsField('Contatti & Info Base', 'Telefono', formData?.telefono),
        showSettingsField('Contatti & Info Base', 'Email', formData?.mail),
        showSettingsField('Contatti & Info Base', 'Indirizzo', formData?.indirizzo),
        showSettingsField('Contatti & Info Base', 'Sito Web URL', formData?.sito_web_url),
        showSettingsField('Contatti & Info Base', 'Google Maps Link', formData?.google_maps_link),
    ].some(Boolean);
    const showScheduleSection = [
        showSettingsField('Orari & Tempistiche', 'Orari di Apertura', formData?.orari_apertura),
        showSettingsField('Orari & Tempistiche', 'Giorni di Chiusura', formData?.giorni_chiusura),
        showSettingsField('Orari & Tempistiche', 'Orari Check-in / Check-out', formData?.orari_checkin_checkout),
        showSettingsField('Orari & Tempistiche', 'Durata Media Appuntamento', formData?.durata_media_appuntamento),
    ].some(Boolean);
    const showSocialSection = [
        showSettingsField('Social & Link', 'Link Prenotazione Tavoli', formData?.link_prenotazione_tavoli),
        showSettingsField('Social & Link', 'Link Booking/Calendario', formData?.link_booking_esterno),
        showSettingsField('Social & Link', 'Instagram URL', formData?.instagram_url),
        showSettingsField('Social & Link', 'Facebook URL', formData?.facebook_url),
        showSettingsField('Social & Link', 'TripAdvisor URL', formData?.tripadvisor_url),
        showSettingsField('Social & Link', 'Link Recensioni (Google)', formData?.recensioni_url),
    ].some(Boolean);
    const showOfferSection = [
        showSettingsField('Dettagli Offerta (Menu, Servizi, Costi)', 'Tipo Cucina / Categoria', formData?.tipo_cucina),
        showSettingsField('Dettagli Offerta (Menu, Servizi, Costi)', 'Specialità della Casa', formData?.specialita_casa),
        showSettingsField('Dettagli Offerta (Menu, Servizi, Costi)', 'Prezzo Medio', formData?.prezzo_medio),
        showSettingsField('Dettagli Offerta (Menu, Servizi, Costi)', 'Costo Prima Consulenza', formData?.prima_consulenza_costo),
        showSettingsField('Dettagli Offerta (Menu, Servizi, Costi)', 'Servizi Inclusi', formData?.servizi_inclusi),
        showSettingsField('Dettagli Offerta (Menu, Servizi, Costi)', "Testo del Menu Ridotto o Tariffario (Extra info per l'assistente)", formData?.menu_testo),
    ].some(Boolean);
    const showPracticalSection = [
        showSettingsField('Info Pratiche & Regole', 'WiFi Password', formData?.wifi_password),
        showSettingsField('Info Pratiche & Regole', 'Info Parcheggio', formData?.parcheggio_info),
        showSettingsField('Info Pratiche & Regole', 'Animali Ammessi', formData?.animali_ammessi),
        showSettingsField('Info Pratiche & Regole', 'Metodi di Pagamento', formData?.metodi_pagamento),
        showSettingsField('Info Pratiche & Regole', 'Tassa di Soggiorno', formData?.tassa_soggiorno),
        showSettingsField('Info Pratiche & Regole', 'Policy Allergie', formData?.allergie_policy),
    ].some(Boolean);
    const showMarketingSection = [
        showSettingsField('Marketing & Messaggi', 'Promozione Attiva Oggi', formData?.promozione_attiva),
        showSettingsField('Marketing & Messaggi', 'Informazioni Aggiuntive Rapide', formData?.dati_testuali_brevi),
    ].some(Boolean);
    const hasVisibleSettingsResults = [
        showContactSection,
        showScheduleSection,
        showSocialSection,
        showOfferSection,
        showPracticalSection,
        showMarketingSection,
    ].some(Boolean);
    const workspaceSearchItems: WorkspaceSearchItem[] = [
        ...DASHBOARD_TABS.map((tab) => ({
            id: `tab-${tab.id}`,
            title: tab.label,
            subtitle: tab.description,
            tab: tab.id,
            keywords: [tab.label, tab.shortLabel, tab.description],
        })),
        {
            id: 'settings-contacts',
            title: 'Contatti e info base',
            subtitle: 'Telefono, email, indirizzo e sito',
            tab: 'impostazioni',
            settingsQuery: 'contatti',
            keywords: ['contatti', 'telefono', 'email', 'indirizzo', 'sito', 'google maps'],
        },
        {
            id: 'settings-hours',
            title: 'Orari e tempistiche',
            subtitle: 'Apertura, chiusura, check-in e durata',
            tab: 'impostazioni',
            settingsQuery: 'orari',
            keywords: ['orari', 'check-in', 'checkout', 'giorni chiusura', 'durata'],
        },
        {
            id: 'settings-social',
            title: 'Social e link',
            subtitle: 'Instagram, Facebook, richieste e recensioni',
            tab: 'impostazioni',
            settingsQuery: 'instagram',
            keywords: ['social', 'instagram', 'facebook', 'tripadvisor', 'recensioni', 'booking', 'prenotazione'],
        },
        {
            id: 'settings-offer',
            title: 'Dettagli offerta',
            subtitle: 'Prezzi, servizi, menu e categoria',
            tab: 'impostazioni',
            settingsQuery: 'prezzo',
            keywords: ['offerta', 'prezzo', 'servizi', 'menu', 'categoria', 'specialita'],
        },
        {
            id: 'settings-practical',
            title: 'Info pratiche e regole',
            subtitle: 'WiFi, parcheggio, metodi di pagamento e policy',
            tab: 'impostazioni',
            settingsQuery: 'wifi',
            keywords: ['wifi', 'parcheggio', 'animali', 'pagamento', 'allergie', 'tassa soggiorno'],
        },
        {
            id: 'settings-marketing',
            title: 'Marketing e messaggi',
            subtitle: 'Promozioni e testo rapido',
            tab: 'impostazioni',
            settingsQuery: 'promozione',
            keywords: ['marketing', 'messaggi', 'promozione', 'testo rapido'],
        },
        {
            id: 'integration-whatsapp',
            title: 'Canale WhatsApp',
            subtitle: 'Collegamento, stato e diagnostica canale',
            tab: 'integrazione',
            keywords: ['whatsapp', 'waba', 'numero collegato', 'canale', 'webhook'],
        },
        {
            id: 'integration-widget',
            title: 'Widget sito',
            subtitle: 'Titolo, sottotitolo, colore e snippet',
            tab: 'integrazione',
            keywords: ['widget', 'snippet', 'colore', 'sito', 'installazione'],
        },
        {
            id: 'security-token',
            title: 'Token API e sicurezza',
            subtitle: 'Visibilità, rigenerazione e accessi',
            tab: 'sicurezza',
            keywords: ['token', 'api', 'sicurezza', 'rigenera', 'accessi'],
        },
        {
            id: 'billing-overview',
            title: 'Abbonamento e fatturazione',
            subtitle: 'Piano, rinnovi e portale Stripe',
            tab: 'abbonamento',
            keywords: ['abbonamento', 'stripe', 'fatturazione', 'rinnovo', 'prova'],
        },
    ];
    const normalizedWorkspaceSearch = workspaceSearch.trim().toLowerCase();
    const workspaceSearchResults = normalizedWorkspaceSearch
        ? workspaceSearchItems.filter((item) =>
            [item.title, item.subtitle, ...item.keywords].some((value) =>
                value.toLowerCase().includes(normalizedWorkspaceSearch)
            )
        ).slice(0, 6)
        : [];

    const dashboardBillingBanner = isExpiredTrial
        ? {
            tone: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-orange-200/50',
            title: 'Periodo di prova terminato',
            description: 'Per continuare a usare Zirèl senza interruzioni devi attivare un piano dal tab Abbonamento.',
            cta: 'Vai ad Abbonamento',
        }
        : normalizedSubscriptionStatus === 'past_due'
            ? {
                tone: 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-200/50',
                title: isPastDueGraceExpired ? 'Grace period terminato' : 'Pagamento da aggiornare',
                description: isPastDueGraceExpired
                    ? 'Il grace period di 7 giorni e terminato. Aggiorna il metodo di pagamento per riattivare il servizio.'
                    : `Abbiamo rilevato un problema sul rinnovo. Aggiorna il pagamento entro il ${formatBillingDate(graceEndsAt?.toISOString())} per evitare la sospensione del servizio.`,
                cta: isPastDueGraceExpired ? 'Riattiva pagamento' : 'Gestisci pagamento',
            }
            : normalizedSubscriptionStatus === 'canceled'
                ? {
                    tone: 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-lg shadow-slate-200/50',
                    title: 'Abbonamento annullato',
                    description: 'Il servizio non è attivo. Puoi riattivarlo in qualsiasi momento dal tab Abbonamento.',
                    cta: 'Riattiva servizio',
                }
                : normalizedSubscriptionStatus === 'active'
                    ? null
                    : {
                        tone: 'bg-gradient-to-r from-zirel-orange-dark to-[#ff9b52] text-white shadow-lg shadow-orange-200/50',
                        title: 'Periodo di prova attivo',
                        description: trialDaysRemaining && trialDaysRemaining > 0
                            ? `Ti rimangono ${trialDaysRemaining} giorni per completare l’attivazione del piano senza interrompere il servizio.`
                            : `La prova termina il ${formatBillingDate(formData?.trial_ends_at)}. Attiva il piano quando vuoi per evitare interruzioni.`,
                        cta: 'Scopri i piani',
                    };

    const fetchData = useCallback(async () => {
        try {
            setIsLoadingInitial(true);
            const data = await getTenantData();
            if (data) {
                setFormData(data);
                setEditForm(data);
            } else {
                onLogout();
            }
        } catch {
            toast.error('Sessione non valida.');
            onLogout();
        } finally {
            setIsLoadingInitial(false);
        }
    }, [onLogout]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    useEffect(() => {
        setIsMobileNavOpen(false);
    }, [activeTab]);

    const handleWorkspaceSearchSelect = (item: WorkspaceSearchItem) => {
        setActiveTab(item.tab);
        if (item.tab === 'impostazioni') {
            setSettingsSearch(item.settingsQuery || workspaceSearch);
        } else {
            setSettingsSearch('');
        }
        setWorkspaceSearch('');
        setIsWorkspaceSearchFocused(false);
    };

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const tab = params.get('tab');
        const status = params.get('status');

        if (tab === 'abbonamento') {
            setActiveTab('abbonamento');
        }

        if (status === 'success') {
            toast.success('Abbonamento attivato correttamente. Stripe sta completando la sincronizzazione.', {
                duration: 5000,
            });
        } else if (status === 'cancel') {
            toast('Checkout annullato. Nessun addebito e` stato effettuato.', {
                duration: 4000,
                icon: <Info className="text-zirel-orange-dark" />,
            });
        }

        if (tab || status) {
            const nextUrl = new URL(window.location.href);
            nextUrl.searchParams.delete('tab');
            nextUrl.searchParams.delete('status');
            window.history.replaceState({}, '', nextUrl.toString());
        }
    }, []);

    const handleUpdate = async () => {
        if (!tenantId) return;
        setIsUpdating(true);
        const loadingToast = toast.loading('Salvo le impostazioni...');

        try {
            await updateTenantData(editForm);
            const nextFormData = formData ? { ...formData, ...editForm } : null;
            setFormData(nextFormData);
            setEditForm(nextFormData || {});
            toast.success('Le impostazioni sono state aggiornate correttamente.', {
                id: loadingToast,
                duration: 5000,
                icon: <CheckCircle2 className="text-green-500" />,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : '';
            if (message === 'NO_CHANGES') {
                toast('Nessuna modifica da salvare.', {
                    id: loadingToast,
                    duration: 4000,
                });
            } else {
                toast.error('Errore durante l\'aggiornamento.', {
                    id: loadingToast,
                    duration: 5000,
                });
            }
        } finally {
            setIsUpdating(false);
        }
    };

    const handleRegenerateToken = async () => {
        if (!tenantId) return;
        if (!confirm('Sei sicuro? Il vecchio token smetterà di funzionare immediatamente.')) return;

        setIsRegeneratingToken(true);
        const loadingToast = toast.loading('Generazione nuovo token...');

        try {
            const newToken = await regenerateTenantToken(tenantId);

            setIsTokenVisible(false);
            setFormData(prev => prev ? { ...prev, api_token: newToken, api_token_revealed: false } : null);
            setEditForm(prev => ({ ...prev, tenant_id: tenantId, api_token: newToken, api_token_revealed: false }));
            saveAuthToken(newToken);

            toast.success('Token aggiornato. Ora è nascosto: usa "Rivela Token" per visualizzarlo.', { id: loadingToast });
        } catch {
            toast.error('Errore durante la generazione del token.', { id: loadingToast });
        } finally {
            setIsRegeneratingToken(false);
        }
    };

    const handleConfirmTokenRevealed = async () => {
        if (!tenantId) return;
        if (formData?.api_token_revealed) {
            toast('Il token è già stato rivelato in precedenza.');
            return;
        }
        try {
            await markApiTokenRevealed(tenantId);

            setIsTokenVisible(true);
            setFormData(prev => prev ? { ...prev, api_token_revealed: true } : null);
            setEditForm(prev => ({ ...prev, api_token_revealed: true }));
            toast.success('Token sbloccato. Copialo ora, verrà oscurato al prossimo accesso.');
        } catch (_err) {
            console.error('Update revealed error:', _err);
            toast.error('Errore nel salvataggio dello stato del token.');
        }
    };

    const updateField = (key: keyof TenantData) => (val: string) => {
        const nextState = syncTenantFieldState(formData, editForm, key, val);
        setFormData(nextState.formData);
        setEditForm(nextState.editForm);
    };

    const handleStripeCheckout = async (priceId: string, setupPriceId?: string) => {
        if (!tenantId || !formData?.mail) return;
        setIsBillingLoading(true);
        const loadingToast = toast.loading('Preparazione checkout sicuro...');

        try {
            const response = await fetch(import.meta.env.VITE_N8N_STRIPE_MANAGER_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Zirel-Billing-Key': import.meta.env.VITE_ZIREL_BILLING_KEY || '',
                },
                body: JSON.stringify({
                    tenant_id: formData.tenant_id,
                    api_token: formData.api_token,
                    price_id: priceId,
                    setup_price_id: setupPriceId,
                    email: formData.mail || formData.billing_email,
                    hotel_name: formData.hotel_name || formData.nome_ristorante
                })
            });

            if (!response.ok) {
                let backendMessage = 'BACKEND_ERROR';
                try {
                    const body = await response.json();
                    backendMessage = body?.error || body?.message || body?.provider_error || backendMessage;
                } catch {
                    try {
                        backendMessage = await response.text();
                    } catch {
                        // ignore response parsing fallback errors
                    }
                }
                throw new Error(backendMessage);
            }
            const { url } = await response.json();
            if (url) {
                window.location.href = url;
            } else {
                throw new Error('NO_URL');
            }
        } catch (err) {
            console.error('Checkout error:', err);
            const message = err instanceof Error ? err.message : '';
            toast.error(
                message && message !== 'BACKEND_ERROR'
                    ? `Checkout non riuscito: ${message}`
                    : 'Errore durante la creazione del checkout.',
                { id: loadingToast }
            );
        } finally {
            setIsBillingLoading(false);
        }
    };

    const handleStripePortal = async () => {
        if (!formData?.stripe_customer_id) return;
        setIsBillingLoading(true);
        const loadingToast = toast.loading('Accesso al portale Stripe...');

        try {
            const response = await fetch(import.meta.env.VITE_N8N_STRIPE_PORTAL_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Zirel-Billing-Key': import.meta.env.VITE_ZIREL_BILLING_KEY || '',
                },
                body: JSON.stringify({
                    tenant_id: formData.tenant_id,
                    api_token: formData.api_token
                })
            });

            if (!response.ok) {
                let backendMessage = 'BACKEND_ERROR';
                try {
                    const body = await response.json();
                    backendMessage = body?.error || body?.message || body?.provider_error || backendMessage;
                } catch {
                    try {
                        backendMessage = await response.text();
                    } catch {
                        // ignore response parsing fallback errors
                    }
                }
                throw new Error(backendMessage);
            }
            const { url } = await response.json();
            if (url) {
                window.location.href = url;
            } else {
                throw new Error('NO_URL');
            }
        } catch (err) {
            console.error('Portal error:', err);
            const message = err instanceof Error ? err.message : '';
            toast.error(
                message && message !== 'BACKEND_ERROR'
                    ? `Portale Stripe non disponibile: ${message}`
                    : 'Errore durante l\'apertura del portale.',
                { id: loadingToast }
            );
        } finally {
            setIsBillingLoading(false);
        }
    };


    if (isLoadingInitial || !formData) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-zirel-orange-dark animate-spin mb-4" />
                <p className="text-gray-500 font-medium animate-pulse">Autenticazione e recupero dati in corso...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,140,66,0.09),_transparent_32%),linear-gradient(180deg,#f6f9fc_0%,#fbfcfe_55%,#ffffff_100%)] text-gray-900">
            <div className="lg:grid lg:min-h-screen lg:grid-cols-[280px_minmax(0,1fr)]">
                <aside className="hidden h-screen border-r border-gray-200/80 bg-white/88 backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:flex-col">
                    <div className="flex h-full min-h-0 flex-col px-5 py-4">
                        <div className="shrink-0 space-y-2 pb-3">
                            <div className="-mt-4 -mb-1 overflow-hidden">
                                <img src="/zirel_logo_esteso.svg" alt="Zirèl Logo" className="h-24 w-auto drop-shadow-sm" />
                            </div>
                            <div className="rounded-[1.6rem] border border-gray-200/80 bg-gradient-to-br from-white to-orange-50/30 px-4 py-3.5 shadow-sm">
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">Tenant attivo</p>
                                <p className="mt-1.5 text-lg font-black tracking-tight text-zirel-blue">{workspaceName}</p>
                                <p className="mt-0.5 text-sm text-gray-500">Pannello di controllo Zirèl</p>
                            </div>
                        </div>

                        <div className="min-h-0 flex-1 overflow-y-auto py-2 pr-1">
                            <nav className="space-y-2">
                                {DASHBOARD_TABS.map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`group flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ${activeTab === tab.id
                                            ? 'bg-zirel-gradient text-white shadow-lg shadow-orange-200/50'
                                            : 'border border-transparent bg-white/70 text-gray-600 hover:border-orange-100 hover:bg-orange-50/70 hover:text-zirel-orange-dark'
                                            }`}
                                    >
                                        <tab.icon className={`h-5 w-5 shrink-0 ${activeTab === tab.id ? 'text-white' : 'text-gray-400 group-hover:text-zirel-orange-dark'}`} />
                                        <div className="min-w-0">
                                            <div className="font-bold">{tab.label}</div>
                                            <div className={`truncate text-xs ${activeTab === tab.id ? 'text-white/80' : 'text-gray-400'}`}>{tab.description}</div>
                                        </div>
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div className="shrink-0 border-t border-gray-200/80 pt-4">
                            <div className="grid grid-cols-2 gap-3">
                            <a
                                href="/help"
                                className="apple-button-secondary flex w-full items-center justify-center gap-2 border-gray-200 bg-white/90 px-4 py-3"
                            >
                                <CircleHelp className="h-4 w-4" />
                                Aiuto
                            </a>
                            <button onClick={onLogout} className="apple-button-secondary flex w-full items-center justify-center gap-2 border-gray-200 bg-white/90 px-4 py-3 group">
                                <LogOut className="h-4 w-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                                Esci
                            </button>
                            </div>
                        </div>
                    </div>
                </aside>

                <div className="min-w-0">
                    <header className="fixed left-0 right-0 top-0 z-40 border-b border-gray-200/70 bg-white/92 backdrop-blur-xl lg:sticky lg:left-auto lg:right-auto lg:top-0">
                        <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-5 px-4 py-3 sm:px-6 lg:px-8">
                            <div className="flex min-w-0 items-center gap-3">
                                <button
                                    onClick={() => setIsMobileNavOpen(true)}
                                    className="flex h-11 w-11 items-center justify-center rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white text-zirel-orange-dark shadow-sm transition hover:border-orange-200 hover:shadow-md lg:hidden"
                                    aria-label="Apri menu"
                                >
                                    <Menu className="h-5 w-5" />
                                </button>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">Workspace</p>
                                    <div className="flex items-center gap-2">
                                        <h1 className="truncate text-xl font-black tracking-tight text-zirel-blue">{activeTabMeta.label}</h1>
                                        <span className="hidden rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-xs font-bold text-zirel-orange-dark sm:inline-flex">
                                            {workspaceName}
                                        </span>
                                    </div>
                                    <p className="hidden text-sm text-gray-500 md:block">{activeTabMeta.description}</p>
                                </div>
                            </div>

                            <div className="hidden min-w-0 items-center gap-4 lg:flex">
                                <div className="relative w-[380px] xl:w-[460px] 2xl:w-[520px]">
                                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        value={workspaceSearch}
                                        onChange={(e) => setWorkspaceSearch(e.target.value)}
                                        onFocus={() => setIsWorkspaceSearchFocused(true)}
                                        onBlur={() => setTimeout(() => setIsWorkspaceSearchFocused(false), 120)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && workspaceSearchResults[0]) {
                                                e.preventDefault();
                                                handleWorkspaceSearchSelect(workspaceSearchResults[0]);
                                            }
                                        }}
                                        placeholder="Cerca in dashboard, impostazioni, WhatsApp..."
                                        className="apple-input h-12 rounded-[1.45rem] pl-11 pr-4 text-sm"
                                    />
                                    {isWorkspaceSearchFocused && normalizedWorkspaceSearch ? (
                                        <div className="absolute left-0 right-0 top-[calc(100%+0.6rem)] z-50 overflow-hidden rounded-[1.4rem] border border-gray-200 bg-white/98 p-2 shadow-2xl shadow-slate-200/70 backdrop-blur-xl">
                                            {workspaceSearchResults.length > 0 ? (
                                                <div className="space-y-1">
                                                    {workspaceSearchResults.map((item) => (
                                                        <button
                                                            key={item.id}
                                                            type="button"
                                                            onMouseDown={(e) => e.preventDefault()}
                                                            onClick={() => handleWorkspaceSearchSelect(item)}
                                                            className="flex w-full items-start justify-between gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-orange-50/70"
                                                        >
                                                            <div className="min-w-0">
                                                                <div className="font-bold text-gray-800">{item.title}</div>
                                                                <div className="truncate text-sm text-gray-500">{item.subtitle}</div>
                                                            </div>
                                                            <span className="shrink-0 rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-zirel-orange-dark">
                                                                {DASHBOARD_TABS.find((tab) => tab.id === item.tab)?.shortLabel}
                                                            </span>
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="px-3 py-4 text-sm text-gray-500">
                                                    Nessun risultato. Prova con “whatsapp”, “stripe”, “wifi” o “richieste”.
                                                </div>
                                            )}
                                        </div>
                                    ) : null}
                                </div>
                                {activeTab === 'impostazioni' ? (
                                    <button
                                        onClick={handleUpdate}
                                        disabled={isUpdating}
                                        className="apple-button flex h-12 min-w-[190px] items-center justify-center gap-2 rounded-[1.45rem] px-6 py-3 text-sm text-white disabled:opacity-60"
                                    >
                                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                        Salva modifiche
                                    </button>
                                ) : null}
                            </div>
                        </div>
                    </header>

                    {isMobileNavOpen ? (
                        <div className="fixed inset-0 z-50 bg-slate-950/45 lg:hidden" onClick={() => setIsMobileNavOpen(false)}>
                            <div
                                className="flex h-full w-[88vw] max-w-sm flex-col border-r border-gray-200/80 bg-white px-4 py-4 shadow-2xl"
                                onClick={(event) => event.stopPropagation()}
                            >
                                <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
                                    <img src="/zirel_logo_esteso.svg" alt="Zirèl Logo" className="h-16 w-auto -ml-1" />
                                    <button
                                        onClick={() => setIsMobileNavOpen(false)}
                                        className="flex h-10 w-10 items-center justify-center rounded-2xl border border-orange-100 bg-gradient-to-br from-orange-50 to-white text-zirel-orange-dark shadow-sm transition hover:border-orange-200"
                                        aria-label="Chiudi menu"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="mb-4 shrink-0 rounded-[1.5rem] border border-gray-200/80 bg-gradient-to-br from-white to-orange-50/30 px-4 py-4 shadow-sm">
                                    <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">Tenant attivo</p>
                                    <p className="mt-2 text-lg font-black tracking-tight text-zirel-blue">{workspaceName}</p>
                                    <p className="mt-1 text-sm text-gray-500">Pannello di controllo</p>
                                </div>

                                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                                    <nav className="space-y-2">
                                        {DASHBOARD_TABS.map((tab) => (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all ${activeTab === tab.id
                                                    ? 'bg-zirel-gradient text-white shadow-lg shadow-orange-200/50'
                                                    : 'border border-transparent bg-white text-gray-600 hover:border-orange-100 hover:bg-orange-50/70'
                                                    }`}
                                            >
                                                <tab.icon className={`h-5 w-5 shrink-0 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
                                                <div className="min-w-0">
                                                    <div className="font-bold">{tab.shortLabel}</div>
                                                    <div className={`truncate text-xs ${activeTab === tab.id ? 'text-white/80' : 'text-gray-400'}`}>{tab.description}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </nav>
                                </div>

                                <div className="mt-4 shrink-0 border-t border-gray-200/80 pt-4">
                                    <div className="grid grid-cols-2 gap-3">
                                        <a
                                            href="/help"
                                            className="apple-button-secondary flex w-full items-center justify-center gap-2 border-gray-200 bg-white px-4 py-3"
                                        >
                                            <CircleHelp className="h-4 w-4" />
                                            Aiuto
                                        </a>
                                        <button onClick={onLogout} className="apple-button-secondary flex w-full items-center justify-center gap-2 border-gray-200 bg-white px-4 py-3">
                                            <LogOut className="h-4 w-4 text-gray-400" />
                                            Esci
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <main className="mx-auto max-w-[1680px] px-4 pb-5 pt-24 sm:px-6 lg:px-8 lg:py-6 lg:pt-6">

                {dashboardBillingBanner && (
                    <section className={`${dashboardBillingBanner.tone} mb-5 rounded-[1.75rem] px-5 py-5 md:px-7 md:py-6 animate-fade-in delay-150`}>
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
                            <div className="space-y-2">
                                <p className="text-sm font-black uppercase tracking-[0.22em] text-white/80">Billing alert</p>
                                <h2 className="text-2xl md:text-3xl font-black tracking-tight">{dashboardBillingBanner.title}</h2>
                                <p className="max-w-3xl text-white/85 leading-relaxed">{dashboardBillingBanner.description}</p>
                            </div>
                            <button
                                onClick={() => setActiveTab('abbonamento')}
                                className="shrink-0 bg-white text-gray-900 hover:bg-white/90 px-6 py-4 rounded-full font-bold shadow-sm transition-all active:scale-[0.98]"
                            >
                    {dashboardBillingBanner.cta}
                </button>
            </div>
        </section>
    )}

                {productAccessState === 'warning' && activeTab !== 'abbonamento' && (
                    <section className="mb-5 rounded-[1.5rem] border border-red-100 bg-red-50 px-5 py-5 md:px-6 md:py-6 animate-fade-in">
                        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                            <div className="space-y-2">
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-red-500">Pagamento da aggiornare</p>
                                <h3 className="text-xl md:text-2xl font-black text-red-900">Il servizio resta disponibile, ma e necessario aggiornare il metodo di pagamento.</h3>
                                <p className="text-red-800/80 max-w-3xl leading-relaxed">
                                    Per evitare la sospensione delle funzioni operative, apri il tab Abbonamento e accedi al portale Stripe.
                                    {typeof graceDaysRemaining === 'number' && graceDaysRemaining >= 0 ? ` Ti restano circa ${graceDaysRemaining} giorni di grace period.` : ''}
                                </p>
                            </div>
                            <button
                                onClick={() => setActiveTab('abbonamento')}
                                className="shrink-0 apple-button bg-red-600 hover:bg-red-700 text-white px-6 py-4 rounded-full font-bold shadow-sm transition-all active:scale-[0.98]"
                            >
                                Vai al portale di fatturazione
                            </button>
                        </div>
                    </section>
                )}


                {/* Tab Content */}
                <div className="min-h-[600px]">
                    <div className="relative">
                        {shouldLockActiveTab && (
                            <div className="absolute inset-0 z-20 flex items-start justify-center px-4 pt-6 md:px-8 md:pt-8">
                                <div className={`w-full max-w-3xl rounded-[2rem] border px-6 py-6 md:px-8 md:py-7 shadow-xl ${productAccessState === 'suspended'
                                        ? 'border-slate-200 bg-white'
                                        : 'border-amber-100 bg-white'
                                    }`}>
                                    <div className="space-y-3">
                                        <p className={`text-[11px] font-black uppercase tracking-[0.22em] ${productAccessState === 'suspended' ? 'text-slate-500' : 'text-amber-500'}`}>
                                            {productAccessState === 'suspended' ? 'Servizio sospeso' : 'Periodo di prova terminato'}
                                        </p>
                                        <h3 className="text-2xl md:text-3xl font-black text-gray-900">
                                            {productAccessState === 'suspended'
                                                ? normalizedSubscriptionStatus === 'past_due'
                                                    ? 'Il grace period e terminato: le azioni operative sono sospese finche il pagamento non viene aggiornato.'
                                                    : 'I dati restano visibili, ma le azioni operative sono state sospese.'
                                                : 'Puoi consultare i dati, ma per tornare operativo devi attivare un piano.'}
                                        </h3>
                                        <p className="text-gray-600 leading-relaxed">
                                            {productAccessState === 'suspended'
                                                ? normalizedSubscriptionStatus === 'past_due'
                                                    ? 'Richieste, documenti e impostazioni restano consultabili, ma il concierge e le azioni operative riprenderanno solo dopo l’aggiornamento del metodo di pagamento dal portale Stripe.'
                                                    : 'Richieste, documenti e impostazioni restano consultabili, ma le modifiche e le azioni operative vanno riattivate dal tab Abbonamento.'
                                                : 'Il periodo di prova e terminato. Manteniamo visibili le informazioni principali, ma blocchiamo l’operativita finche non viene attivato un piano.'}
                                        </p>
                                    </div>
                                    <div className="mt-6 flex flex-col sm:flex-row gap-3">
                                        <button
                                            onClick={() => setActiveTab('abbonamento')}
                                            className="apple-button bg-zirel-gradient text-white px-6 py-4 rounded-full font-bold"
                                        >
                                            Vai ad Abbonamento
                                        </button>
                                        {showPortalFallbackLabel(formData) ? (
                                            <button
                                                onClick={handleStripePortal}
                                                disabled={isBillingLoading || !formData?.stripe_customer_id}
                                                className="apple-button-secondary border-gray-200 text-gray-800 bg-white px-6 py-4 rounded-full font-bold disabled:opacity-60 disabled:cursor-not-allowed"
                                            >
                                                Gestisci su Stripe
                                            </button>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className={shouldLockActiveTab ? 'pointer-events-none select-none opacity-60 blur-[1.5px]' : ''}>
                            {activeTab === 'analytics' ? (
                                <AnalyticsSection />
                            ) : activeTab === 'prenotazioni' ? (
                                <Reservations />
                            ) : activeTab === 'conversazioni' ? (
                                <div className="animate-fade-in">
                                    <WhatsAppHandoffPanel tenantId={tenantId || undefined} />
                                </div>
                            ) : activeTab === 'documenti' ? (
                                <DocumentManager />
                            ) : activeTab === 'abbonamento' ? (
                                <BillingSection
                                    formData={formData}
                                    isBillingLoading={isBillingLoading}
                                    onCheckout={handleStripeCheckout}
                                    onPortal={handleStripePortal}
                                />
                            ) : activeTab === 'sicurezza' ? (
                                <div className="max-w-5xl animate-fade-in">
                            <section className="apple-card p-6 md:p-8 space-y-6">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="z-icon-chip-lg"><Shield className="w-6 h-6" /></div>
                                    <div>
                                        <h2 className="text-2xl font-bold">Sicurezza & Accesso API</h2>
                                        <p className="text-gray-500">Gestisci le chiavi di accesso per il tuo Concierge</p>
                                    </div>
                                </div>

                                <div className="space-y-6 bg-gray-50 p-5 md:p-6 rounded-[1.75rem] border border-gray-100">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 px-1">Il tuo API Token</label>
                                        <div className="flex flex-col md:flex-row gap-4">
                                            <div className="relative flex-1 group">
                                                <input
                                                    type={isTokenVisible ? "text" : "password"}
                                                    value={formData.api_token || ''}
                                                    readOnly
                                                    className="apple-input font-mono text-sm md:text-base pr-12 bg-white"
                                                />
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300">
                                                    {isTokenVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                {isTokenVisible ? (
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(formData.api_token);
                                                            toast.success('Token copiato negli appunti!');
                                                        }}
                                                        className="apple-button-secondary flex items-center justify-center gap-2 h-12 px-6 bg-white"
                                                    >
                                                        <Copy size={18} />
                                                        Copia
                                                    </button>
                                                ) : !formData.api_token_revealed ? (
                                                    <button
                                                        onClick={handleConfirmTokenRevealed}
                                                        className="apple-button text-white flex items-center justify-center gap-2 h-12 px-6"
                                                    >
                                                        <Eye size={18} />
                                                        Rivela Token
                                                    </button>
                                                ) : (
                                                    <button
                                                        disabled
                                                        className="apple-button-secondary flex items-center justify-center gap-2 h-12 px-6 opacity-60 cursor-not-allowed"
                                                    >
                                                        <EyeOff size={18} />
                                                        Già rivelato
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        {formData.api_token_revealed && !isTokenVisible && (
                                            <p className="mt-4 text-sm text-gray-500 italic">
                                                Il token è stato già visualizzato ed è ora oscurato per la tua sicurezza.
                                            </p>
                                        )}
                                    </div>

                                    <div className="pt-8 border-t border-gray-200 mt-8">
                                        <h3 className="text-lg font-bold mb-4">Rigenerazione Chiave</h3>
                                        <p className="text-gray-500 mb-6 text-sm md:text-base">
                                            Se temi che la tua chiave sia stata compromessa, o se l'hai smarrita, puoi generarne una nuova.
                                            <span className="text-red-500 font-medium font-bold block mt-2 px-3 py-2 bg-red-50 rounded-xl border border-red-100">
                                                Attenzione: la chiave precedente smetterà immediatamente di funzionare.
                                            </span>
                                        </p>
                                        <button
                                            onClick={handleRegenerateToken}
                                            disabled={isRegeneratingToken}
                                            className="apple-button-secondary border-red-100 text-red-600 hover:bg-red-50 hover:border-red-200 flex items-center gap-2 group w-full md:w-auto justify-center"
                                        >
                                            <RefreshCw className={`w-4 h-4 ${isRegeneratingToken ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
                                            Rigenera API Token
                                        </button>
                                    </div>
                                </div>
                            </section>
                                </div>
                            ) : activeTab === 'integrazione' ? (
                                <div className="max-w-6xl animate-fade-in">
                            <section className="apple-card p-6 md:p-8 space-y-8">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-orange-50 text-zirel-orange-dark rounded-2xl"><LinkIcon className="w-6 h-6" /></div>
                                    <div>
                                        <h2 className="text-2xl font-bold">Attivazione Assistente</h2>
                                        <p className="text-gray-500">Scegli come installare Zirèl sul tuo sito</p>
                                    </div>
                                </div>

                                <WhatsAppChannelCard
                                    tenantId={tenantId || undefined}
                                    onOpenConversations={() => setActiveTab('conversazioni')}
                                />

                                {/* Opzione 1: Installazione Assistita */}
                                <div className="bg-gradient-to-br from-zirel-blue to-[#0B4A6A] rounded-[1.75rem] p-6 md:p-8 text-white shadow-xl shadow-zirel-blue/20 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:bg-white/20 transition-colors duration-700"></div>
                                    <div className="relative z-10 space-y-6">
                                        <div className="space-y-2">
                                            <span className="inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest">Consigliato</span>
                                            <h3 className="text-3xl font-black">Serve aiuto? Ci pensiamo noi.</h3>
                                            <p className="text-white/80 text-lg opacity-90 max-w-2xl leading-relaxed">
                                                Non sai come fare? Contatta il tuo webmaster o chiedi a noi.
                                                Per garantirti un'attivazione perfetta, il team di Zirèl può occuparsi dell'installazione per te.
                                            </p>
                                        </div>
                                        <div className="flex flex-col md:flex-row items-center gap-6 pt-4">
                                            <a
                                                href="https://wa.me/393461027447"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="bg-white text-zirel-blue px-8 py-4 rounded-full font-bold text-lg hover:shadow-2xl hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-2"
                                            >
                                                Richiedi installazione assistita →
                                            </a>
                                            <div className="text-white/80 text-sm opacity-80 space-y-1 text-center md:text-left">
                                                <p className="font-bold">Contatto di Urgenza:</p>
                                                <p>Niki: (+39) 346 1027447</p>
                                                <p>Email: bronovito@gmail.com</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Widget Customization Section */}
                                <div className="apple-card overflow-hidden p-5 md:p-6 space-y-6 border-t-4 border-zirel-orange-dark">
                                    <div className="flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-center">
                                        <div className="z-icon-chip-lg shrink-0">
                                            <Settings className="w-6 h-6" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-xl sm:text-2xl font-black text-gray-800 leading-tight break-words">Personalizzazione Widget</h3>
                                            <p className="text-gray-500 break-words">Rendi il widget chat unico per il tuo brand</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                        <div className="space-y-6">
                                            <InputField
                                                label="Titolo Widget"
                                                value={formData.widget_title || ''}
                                                onChange={updateField('widget_title')}
                                                placeholder="es. Zirèl Assistant"
                                            />
                                            <InputField
                                                label="Sottotitolo Widget"
                                                value={formData.widget_subtitle || ''}
                                                onChange={updateField('widget_subtitle')}
                                                placeholder="es. Concierge h24"
                                            />
                                        </div>
                                        <div className="space-y-6">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 ml-1">Colore Brand (Hex)</label>
                                                <div className="flex flex-col gap-3 xs:flex-row">
                                                    <input
                                                        type="color"
                                                        value={formData.widget_color || '#FF8C42'}
                                                        onChange={(e) => updateField('widget_color')(e.target.value)}
                                                        className="w-14 h-14 rounded-xl cursor-pointer border-none p-0 overflow-hidden shadow-sm shrink-0"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={formData.widget_color || '#FF8C42'}
                                                        onChange={(e) => updateField('widget_color')(e.target.value)}
                                                        className="flex-grow apple-input"
                                                        placeholder="#FF8C42"
                                                    />
                                                </div>
                                            </div>
                                            <InputField
                                                label="Icona Widget (Emoji)"
                                                value={formData.widget_icon || ''}
                                                onChange={updateField('widget_icon')}
                                                placeholder="es. 💬 o 🤖"
                                            />
                                        </div>
                                    </div>

                                    {/* Simple Preview */}
                                    <div className="bg-gray-50 rounded-[2rem] p-6 border border-gray-100 mb-6">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4 text-center">Anteprima Rapida</p>
                                        <div className="flex flex-col gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 max-w-sm mx-auto text-center xs:flex-row xs:items-center xs:text-left">
                                            <div
                                                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl text-white shadow-lg mx-auto shrink-0 xs:mx-0"
                                                style={{ backgroundColor: formData.widget_color || '#FF8C42' }}
                                            >
                                                {formData.widget_icon || '💬'}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-bold text-gray-800 break-words">{formData.widget_title || 'Zirèl Assistant'}</h4>
                                                <p className="text-xs text-gray-500 break-words">{formData.widget_subtitle || 'Concierge h24'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dedicated Save Button for Widget */}
                                    <div className="flex justify-end pt-4 border-t border-gray-50">
                                        <button
                                            onClick={handleUpdate}
                                            disabled={isUpdating}
                                            className="apple-button px-8 py-4 bg-zirel-gradient text-white flex items-center gap-3 shadow-lg shadow-orange-500/20"
                                        >
                                            {isUpdating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                            <span className="font-bold">Salva widget</span>
                                        </button>
                                    </div>
                                </div>

                                {/* Opzione 2: Fai da te */}
                                <div className="space-y-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-full h-px bg-gray-100"></div>
                                        <span className="text-xs font-bold text-gray-400 uppercase tracking-widest px-4 whitespace-nowrap">Oppure in autonomia</span>
                                        <div className="w-full h-px bg-gray-100"></div>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                            <div>
                                                <h4 className="font-bold text-gray-800">Copia lo Snippet</h4>
                                                <p className="text-sm text-gray-500">Inserisci questo codice nel tuo sito</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const snippet = `<!-- Zirèl Chat Widget -->\n<script \n  src="https://cdn.zirel.org/widget.js" \n  data-tenant-id="${tenantId}"\n  async>\n</script>`;
                                                    navigator.clipboard.writeText(snippet);
                                                    toast.success('Snippet copiato!');
                                                }}
                                                className="apple-button-secondary text-sm flex items-center gap-2 w-full md:w-auto justify-center"
                                            >
                                                <Copy size={16} />
                                                Copia Codice
                                            </button>
                                        </div>

                                        <div className="bg-slate-900 rounded-3xl p-6 md:p-8 relative overflow-hidden">
                                            <pre className="text-cyan-300 font-mono text-xs md:text-sm leading-relaxed overflow-x-auto whitespace-pre">
                                                {`<!-- Zirèl Chat Widget -->
<script 
  src="https://cdn.zirel.org/widget.js" 
  data-tenant-id="${tenantId}"
  async>
</script>`}
                                            </pre>
                                        </div>

                                        <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 flex items-start gap-4">
                                            <div className="p-2 bg-white text-gray-400 rounded-lg shrink-0 border border-gray-100"><Info size={16} /></div>
                                            <p className="text-sm text-gray-600 leading-relaxed italic">
                                                <strong>Istruzioni:</strong> Inserisci questo codice subito prima del tag <code className="bg-white border border-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">&lt;/body&gt;</code>.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                            </section>
                                </div>
                            ) : (
                                <div className="space-y-8 animate-fade-in pb-28">
                            {/* Premium Header for Impostazioni */}
                            <div className="apple-card p-6 md:p-7">
                                <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="z-icon-chip-lg"><Settings className="w-8 h-8" /></div>
                                        <div>
                                        <h2 className="text-2xl md:text-3xl font-black text-gray-800">Impostazioni Assistente</h2>
                                        <p className="text-gray-500">Personalizza identità, conoscenza e regole del tuo concierge</p>
                                        </div>
                                    </div>
                                    <div className="w-full xl:max-w-md">
                                        <label className="mb-2 block text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">Cerca impostazione</label>
                                        <div className="relative">
                                            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                                            <input
                                                type="text"
                                                value={settingsSearch}
                                                onChange={(e) => setSettingsSearch(e.target.value)}
                                                placeholder="Es. wifi, instagram, parcheggio, prezzo..."
                                                className="apple-input pl-11 pr-12"
                                            />
                                            {settingsSearch ? (
                                                <button
                                                    type="button"
                                                    onClick={() => setSettingsSearch('')}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs font-bold text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
                                                >
                                                    Reset
                                                </button>
                                            ) : null}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 md:gap-6">
                                {/* Section 1: Contatti */}
                                {showContactSection ? (
                                <section className="apple-card p-5 space-y-4 xl:col-span-4">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="z-icon-chip"><Store className="w-5 h-5" /></div>
                                        <h2 className="text-lg font-bold">Contatti & Info Base</h2>
                                    </div>
                                    {showSettingsField('Contatti & Info Base', 'Telefono', formData.telefono) ? <InputField label="Telefono" value={formData.telefono} onChange={updateField('telefono')} placeholder="+39 333 1234567" /> : null}
                                    {showSettingsField('Contatti & Info Base', 'Email', formData.mail) ? <InputField label="Email" value={formData.mail} onChange={updateField('mail')} /> : null}
                                    {showSettingsField('Contatti & Info Base', 'Indirizzo', formData.indirizzo) ? <InputField label="Indirizzo" value={formData.indirizzo} onChange={updateField('indirizzo')} /> : null}
                                    {showSettingsField('Contatti & Info Base', 'Sito Web URL', formData.sito_web_url) ? <InputField label="Sito Web URL" value={formData.sito_web_url} onChange={updateField('sito_web_url')} /> : null}
                                    {showSettingsField('Contatti & Info Base', 'Google Maps Link', formData.google_maps_link) ? <InputField label="Google Maps Link" value={formData.google_maps_link} onChange={updateField('google_maps_link')} /> : null}
                                </section>
                                ) : null}

                                {/* Section 2: Orari */}
                                {showScheduleSection ? (
                                <section className="apple-card p-5 space-y-4 xl:col-span-4">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="z-icon-chip"><Clock className="w-5 h-5" /></div>
                                        <h2 className="text-lg font-bold">Orari & Tempistiche</h2>
                                    </div>
                                    {showSettingsField('Orari & Tempistiche', 'Orari di Apertura', formData.orari_apertura) ? <TextareaField label="Orari di Apertura" value={formData.orari_apertura} onChange={updateField('orari_apertura')} rows={2} /> : null}
                                    {showSettingsField('Orari & Tempistiche', 'Giorni di Chiusura', formData.giorni_chiusura) ? <InputField label="Giorni di Chiusura" value={formData.giorni_chiusura} onChange={updateField('giorni_chiusura')} /> : null}
                                    {showSettingsField('Orari & Tempistiche', 'Orari Check-in / Check-out', formData.orari_checkin_checkout) ? <InputField label="Orari Check-in / Check-out" value={formData.orari_checkin_checkout} onChange={updateField('orari_checkin_checkout')} /> : null}
                                    {showSettingsField('Orari & Tempistiche', 'Durata Media Appuntamento', formData.durata_media_appuntamento) ? <InputField label="Durata Media Appuntamento" value={formData.durata_media_appuntamento} onChange={updateField('durata_media_appuntamento')} /> : null}
                                </section>
                                ) : null}

                                {/* Section 3: Social */}
                                {showSocialSection ? (
                                <section className="apple-card p-5 space-y-4 xl:col-span-4">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="z-icon-chip"><LinkIcon className="w-5 h-5" /></div>
                                        <h2 className="text-lg font-bold">Social & Link</h2>
                                    </div>
                                    {showSettingsField('Social & Link', 'Link Prenotazione Tavoli', formData.link_prenotazione_tavoli) ? <InputField label="Link Prenotazione Tavoli" value={formData.link_prenotazione_tavoli} onChange={updateField('link_prenotazione_tavoli')} /> : null}
                                    {showSettingsField('Social & Link', 'Link Booking/Calendario', formData.link_booking_esterno) ? <InputField label="Link Booking/Calendario" value={formData.link_booking_esterno} onChange={updateField('link_booking_esterno')} /> : null}
                                    {showSettingsField('Social & Link', 'Instagram URL', formData.instagram_url) ? <InputField label="Instagram URL" value={formData.instagram_url} onChange={updateField('instagram_url')} /> : null}
                                    {showSettingsField('Social & Link', 'Facebook URL', formData.facebook_url) ? <InputField label="Facebook URL" value={formData.facebook_url} onChange={updateField('facebook_url')} /> : null}
                                    {showSettingsField('Social & Link', 'TripAdvisor URL', formData.tripadvisor_url) ? <InputField label="TripAdvisor URL" value={formData.tripadvisor_url} onChange={updateField('tripadvisor_url')} /> : null}
                                    {showSettingsField('Social & Link', 'Link Recensioni (Google)', formData.recensioni_url) ? <InputField label="Link Recensioni (Google)" value={formData.recensioni_url} onChange={updateField('recensioni_url')} /> : null}
                                </section>
                                ) : null}

                                {/* Section 4: Offerta */}
                                {showOfferSection ? (
                                <section className="apple-card p-5 space-y-4 xl:col-span-12 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                    <div className="col-span-1 md:col-span-2 flex items-center gap-3 mb-2">
                                        <div className="z-icon-chip"><Utensils className="w-5 h-5" /></div>
                                        <h2 className="text-lg font-bold">Dettagli Offerta (Menu, Servizi, Costi)</h2>
                                    </div>
                                    <div className="space-y-4">
                                        {showSettingsField('Dettagli Offerta (Menu, Servizi, Costi)', 'Tipo Cucina / Categoria', formData.tipo_cucina) ? <InputField label="Tipo Cucina / Categoria" value={formData.tipo_cucina} onChange={updateField('tipo_cucina')} /> : null}
                                        {showSettingsField('Dettagli Offerta (Menu, Servizi, Costi)', 'Specialità della Casa', formData.specialita_casa) ? <TextareaField label="Specialità della Casa" value={formData.specialita_casa} onChange={updateField('specialita_casa')} rows={2} /> : null}
                                        {showSettingsField('Dettagli Offerta (Menu, Servizi, Costi)', 'Prezzo Medio', formData.prezzo_medio) ? <InputField label="Prezzo Medio" value={formData.prezzo_medio} onChange={updateField('prezzo_medio')} /> : null}
                                        {showSettingsField('Dettagli Offerta (Menu, Servizi, Costi)', 'Costo Prima Consulenza', formData.prima_consulenza_costo) ? <InputField label="Costo Prima Consulenza" value={formData.prima_consulenza_costo} onChange={updateField('prima_consulenza_costo')} /> : null}
                                        {showSettingsField('Dettagli Offerta (Menu, Servizi, Costi)', 'Servizi Inclusi', formData.servizi_inclusi) ? <TextareaField label="Servizi Inclusi" value={formData.servizi_inclusi} onChange={updateField('servizi_inclusi')} rows={3} /> : null}
                                    </div>
                                    <div className="space-y-4">
                                        {showSettingsField('Dettagli Offerta (Menu, Servizi, Costi)', "Testo del Menu Ridotto o Tariffario (Extra info per l'assistente)", formData.menu_testo) ? <TextareaField label="Testo del Menu Ridotto o Tariffario (Extra info per l'assistente)" value={formData.menu_testo} onChange={updateField('menu_testo')} rows={10} /> : null}
                                    </div>
                                </section>
                                ) : null}

                                {/* Section 5: Info Pratiche */}
                                {showPracticalSection ? (
                                <section className="apple-card p-5 space-y-4 xl:col-span-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="z-icon-chip"><Info className="w-5 h-5" /></div>
                                        <h2 className="text-lg font-bold">Info Pratiche & Regole</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {showSettingsField('Info Pratiche & Regole', 'WiFi Password', formData.wifi_password) ? <InputField label="WiFi Password" value={formData.wifi_password} onChange={updateField('wifi_password')} /> : null}
                                        {showSettingsField('Info Pratiche & Regole', 'Info Parcheggio', formData.parcheggio_info) ? <TextareaField label="Info Parcheggio" value={formData.parcheggio_info} onChange={updateField('parcheggio_info')} rows={1} /> : null}
                                        {showSettingsField('Info Pratiche & Regole', 'Animali Ammessi', formData.animali_ammessi) ? <InputField label="Animali Ammessi" value={formData.animali_ammessi} onChange={updateField('animali_ammessi')} /> : null}
                                        {showSettingsField('Info Pratiche & Regole', 'Metodi di Pagamento', formData.metodi_pagamento) ? <InputField label="Metodi di Pagamento" value={formData.metodi_pagamento} onChange={updateField('metodi_pagamento')} /> : null}
                                        {showSettingsField('Info Pratiche & Regole', 'Tassa di Soggiorno', formData.tassa_soggiorno) ? <InputField label="Tassa di Soggiorno" value={formData.tassa_soggiorno} onChange={updateField('tassa_soggiorno')} /> : null}
                                        {showSettingsField('Info Pratiche & Regole', 'Policy Allergie', formData.allergie_policy) ? <TextareaField label="Policy Allergie" value={formData.allergie_policy} onChange={updateField('allergie_policy')} rows={2} /> : null}
                                    </div>
                                </section>
                                ) : null}

                                {/* Section 6: Marketing */}
                                {showMarketingSection ? (
                                <section className="apple-card p-5 space-y-4 xl:col-span-4">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="z-icon-chip"><Megaphone className="w-5 h-5" /></div>
                                        <h2 className="text-lg font-bold">Marketing & Messaggi</h2>
                                    </div>
                                    {showSettingsField('Marketing & Messaggi', 'Promozione Attiva Oggi', formData.promozione_attiva) ? <TextareaField label="Promozione Attiva Oggi" value={formData.promozione_attiva} onChange={updateField('promozione_attiva')} rows={3} /> : null}
                                    {showSettingsField('Marketing & Messaggi', 'Informazioni Aggiuntive Rapide', formData.dati_testuali_brevi) ? <TextareaField label="Informazioni Aggiuntive Rapide" value={formData.dati_testuali_brevi} onChange={updateField('dati_testuali_brevi')} rows={4} /> : null}
                                </section>
                                ) : null}
                            </div>

                            {!hasVisibleSettingsResults ? (
                                <div className="apple-card p-8 text-center">
                                    <p className="text-lg font-bold text-gray-700">Nessuna impostazione trovata</p>
                                    <p className="mt-2 text-sm text-gray-500">Prova con un termine diverso, ad esempio “wifi”, “instagram”, “prezzo” o “parcheggio”.</p>
                                </div>
                            ) : null}

                        </div>
                            )}
                        </div>
                    </div>
                </div>
                    </main>
                </div>
            </div>
        </div>
    );
};

const showPortalFallbackLabel = (formData: TenantData | null) => Boolean(formData?.stripe_customer_id);

export default Dashboard;
