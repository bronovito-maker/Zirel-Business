import { useState, useEffect, useCallback } from 'react';
import { Save, LogOut, Store, Clock, Utensils, Megaphone, CheckCircle2, Link as LinkIcon, Info, Loader2, Settings, CalendarDays, FileText, ExternalLink, Shield, Copy, RefreshCw, Eye, EyeOff, CreditCard, BarChart3, MessageSquare } from 'lucide-react';
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

const BILLING_GRACE_DAYS = 7;

const Dashboard = ({ onLogout }: DashboardProps) => {

    const [formData, setFormData] = useState<TenantData | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);
    const [isRegeneratingToken, setIsRegeneratingToken] = useState(false);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
    const [activeTab, setActiveTab] = useState<'analytics' | 'impostazioni' | 'prenotazioni' | 'documenti' | 'sicurezza' | 'integrazione' | 'conversazioni' | 'abbonamento'>('prenotazioni');
    const [isTokenVisible, setIsTokenVisible] = useState(false);
    const [editForm, setEditForm] = useState<Partial<TenantData>>({});
    const [isBillingLoading, setIsBillingLoading] = useState(false);

    const tenantId = formData?.tenant_id || getCurrentTenantId();
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
        const loadingToast = toast.loading('Aggiorno l\'Intelligenza Artificiale...');

        try {
            await updateTenantData(editForm);
            const nextFormData = formData ? { ...formData, ...editForm } : null;
            setFormData(nextFormData);
            setEditForm(nextFormData || {});
            toast.success('Il tuo assistente ha imparato le nuove regole!', {
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
        <div className="min-h-screen bg-gray-50/50">
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-16 animate-fade-in">
                    <div className="flex flex-col md:flex-row items-center gap-0 md:gap-6 text-center md:text-left">
                        <img src="/zirel_logo_esteso.svg" alt="Zirèl Logo" className="h-28 md:h-40 w-auto drop-shadow-sm -mb-4 md:mb-0 relative z-10" />
                        <div className="hidden md:block md:h-12 md:w-px bg-gray-200"></div>
                        <div className="mt-2 md:mt-0 relative z-20">
                            <h1 className="text-xl md:text-2xl font-bold tracking-tight">
                                Benvenuto, <span className="text-zirel-orange-dark">{formData.nome_ristorante || tenantId}</span>
                            </h1>
                            <p className="text-gray-500 text-sm md:text-base">Pannello di controllo</p>
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <a
                            href="https://zirel.org"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-gray-500 hover:text-zirel-orange-dark text-sm font-medium flex items-center gap-2 transition-colors px-4 py-2 rounded-xl hover:bg-orange-50"
                        >
                            <ExternalLink size={16} />
                            Torna alla Home
                        </a>
                        <button onClick={onLogout} className="apple-button-secondary flex items-center justify-center gap-2 group w-full md:w-auto border-gray-200">
                            <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                            Esci
                        </button>
                    </div>
                </header>

                {/* Tab Navigation - Mobile Scrollable */}
                <div className="flex overflow-x-auto no-scrollbar -mx-4 px-4 mb-8 sm:mx-0 sm:px-0 sm:grid sm:grid-cols-8 gap-2 animate-fade-in delay-100 pb-2">
                    {[
                        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                        { id: 'prenotazioni', label: 'Prenotazioni', icon: CalendarDays },
                        { id: 'conversazioni', label: 'Conversazioni', icon: MessageSquare },
                        { id: 'documenti', label: 'Documenti', icon: FileText },
                        { id: 'abbonamento', label: 'Abbonamento', icon: CreditCard },
                        { id: 'sicurezza', label: 'Sicurezza', icon: Shield },
                        { id: 'integrazione', label: 'Integrazione', icon: LinkIcon },
                        { id: 'impostazioni', label: 'Impostazioni', icon: Settings },
                    ].map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as typeof activeTab)}
                            className={`flex-1 min-w-[140px] sm:min-w-0 flex items-center justify-center gap-2 p-4 rounded-2xl font-bold transition-all ${activeTab === tab.id
                                ? 'bg-zirel-gradient text-white shadow-lg shadow-orange-200/50 scale-[1.02]'
                                : 'bg-white text-gray-500 hover:bg-orange-50 border border-gray-100'
                                }`}
                        >
                            <tab.icon size={20} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {dashboardBillingBanner && (
                    <section className={`${dashboardBillingBanner.tone} rounded-[2rem] px-6 py-6 md:px-8 md:py-7 mb-8 animate-fade-in delay-150`}>
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
                    <section className="rounded-[1.75rem] border border-red-100 bg-red-50 px-6 py-5 md:px-7 md:py-6 mb-6 animate-fade-in">
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
                                                    ? 'Prenotazioni, documenti e impostazioni restano consultabili, ma il concierge e le azioni operative riprenderanno solo dopo l’aggiornamento del metodo di pagamento dal portale Stripe.'
                                                    : 'Prenotazioni, documenti e impostazioni restano consultabili, ma le modifiche e le azioni operative vanno riattivate dal tab Abbonamento.'
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
                                <div className="max-w-7xl mx-auto animate-fade-in">
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
                                <div className="max-w-4xl mx-auto animate-fade-in">
                            <section className="apple-card p-8 md:p-12 space-y-8">
                                <div className="flex items-center gap-4 mb-2">
                                    <div className="z-icon-chip-lg"><Shield className="w-6 h-6" /></div>
                                    <div>
                                        <h2 className="text-2xl font-bold">Sicurezza & Accesso API</h2>
                                        <p className="text-gray-500">Gestisci le chiavi di accesso per il tuo Concierge</p>
                                    </div>
                                </div>

                                <div className="space-y-6 bg-gray-50 p-6 md:p-8 rounded-3xl border border-gray-100">
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
                                <div className="max-w-4xl mx-auto animate-fade-in">
                            <section className="apple-card p-8 md:p-12 space-y-12">
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
                                <div className="bg-gradient-to-br from-zirel-blue to-[#0B4A6A] rounded-[2rem] p-8 md:p-10 text-white shadow-xl shadow-zirel-blue/20 relative overflow-hidden group">
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
                                <div className="apple-card overflow-hidden p-6 md:p-10 space-y-8 border-t-4 border-zirel-orange-dark">
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
                                                placeholder="es. Concierge AI h24"
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
                                                <p className="text-xs text-gray-500 break-words">{formData.widget_subtitle || 'Concierge AI h24'}</p>
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
                                            <span className="font-bold">Salva Personalizzazione</span>
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
                                <div className="max-w-7xl mx-auto space-y-12 animate-fade-in pb-32">
                            {/* Premium Header for Impostazioni */}
                            <div className="apple-card p-8 md:p-12">
                                <div className="flex items-center gap-4">
                                    <div className="z-icon-chip-lg"><Settings className="w-8 h-8" /></div>
                                    <div>
                                        <h2 className="text-3xl font-black text-gray-800">Impostazioni Assistente</h2>
                                        <p className="text-gray-500 text-lg">Personalizza l'identità e la conoscenza del tuo Concierge AI</p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 md:gap-9">
                                {/* Section 1: Contatti */}
                                <section className="apple-card p-6 space-y-4">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="z-icon-chip"><Store className="w-5 h-5" /></div>
                                        <h2 className="text-lg font-bold">Contatti & Info Base</h2>
                                    </div>
                                    <InputField label="Telefono" value={formData.telefono} onChange={updateField('telefono')} placeholder="+39 333 1234567" />
                                    <InputField label="Email" value={formData.mail} onChange={updateField('mail')} />
                                    <InputField label="Indirizzo" value={formData.indirizzo} onChange={updateField('indirizzo')} />
                                    <InputField label="Sito Web URL" value={formData.sito_web_url} onChange={updateField('sito_web_url')} />
                                    <InputField label="Google Maps Link" value={formData.google_maps_link} onChange={updateField('google_maps_link')} />
                                </section>

                                {/* Section 2: Orari */}
                                <section className="apple-card p-6 space-y-4">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="z-icon-chip"><Clock className="w-5 h-5" /></div>
                                        <h2 className="text-lg font-bold">Orari & Tempistiche</h2>
                                    </div>
                                    <TextareaField label="Orari di Apertura" value={formData.orari_apertura} onChange={updateField('orari_apertura')} rows={2} />
                                    <InputField label="Giorni di Chiusura" value={formData.giorni_chiusura} onChange={updateField('giorni_chiusura')} />
                                    <InputField label="Orari Check-in / Check-out" value={formData.orari_checkin_checkout} onChange={updateField('orari_checkin_checkout')} />
                                    <InputField label="Durata Media Appuntamento" value={formData.durata_media_appuntamento} onChange={updateField('durata_media_appuntamento')} />
                                </section>

                                {/* Section 3: Social */}
                                <section className="apple-card p-6 space-y-4">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="z-icon-chip"><LinkIcon className="w-5 h-5" /></div>
                                        <h2 className="text-lg font-bold">Social & Link</h2>
                                    </div>
                                    <InputField label="Link Prenotazione Tavoli" value={formData.link_prenotazione_tavoli} onChange={updateField('link_prenotazione_tavoli')} />
                                    <InputField label="Link Booking/Calendario" value={formData.link_booking_esterno} onChange={updateField('link_booking_esterno')} />
                                    <InputField label="Instagram URL" value={formData.instagram_url} onChange={updateField('instagram_url')} />
                                    <InputField label="Facebook URL" value={formData.facebook_url} onChange={updateField('facebook_url')} />
                                    <InputField label="TripAdvisor URL" value={formData.tripadvisor_url} onChange={updateField('tripadvisor_url')} />
                                    <InputField label="Link Recensioni (Google)" value={formData.recensioni_url} onChange={updateField('recensioni_url')} />
                                </section>

                                {/* Section 4: Offerta */}
                                <section className="apple-card p-6 space-y-4 lg:col-span-2 xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                    <div className="col-span-1 md:col-span-2 flex items-center gap-3 mb-2">
                                        <div className="z-icon-chip"><Utensils className="w-5 h-5" /></div>
                                        <h2 className="text-lg font-bold">Dettagli Offerta (Menu, Servizi, Costi)</h2>
                                    </div>
                                    <div className="space-y-4">
                                        <InputField label="Tipo Cucina / Categoria" value={formData.tipo_cucina} onChange={updateField('tipo_cucina')} />
                                        <TextareaField label="Specialità della Casa" value={formData.specialita_casa} onChange={updateField('specialita_casa')} rows={2} />
                                        <InputField label="Prezzo Medio" value={formData.prezzo_medio} onChange={updateField('prezzo_medio')} />
                                        <InputField label="Costo Prima Consulenza" value={formData.prima_consulenza_costo} onChange={updateField('prima_consulenza_costo')} />
                                        <TextareaField label="Servizi Inclusi" value={formData.servizi_inclusi} onChange={updateField('servizi_inclusi')} rows={3} />
                                    </div>
                                    <div className="space-y-4">
                                        <TextareaField label="Testo del Menu Ridotto o Tariffario (Extra info per l'AI)" value={formData.menu_testo} onChange={updateField('menu_testo')} rows={10} />
                                    </div>
                                </section>

                                {/* Section 5: Info Pratiche */}
                                <section className="apple-card p-6 space-y-4 lg:col-span-2">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="z-icon-chip"><Info className="w-5 h-5" /></div>
                                        <h2 className="text-lg font-bold">Info Pratiche & Regole</h2>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <InputField label="WiFi Password" value={formData.wifi_password} onChange={updateField('wifi_password')} />
                                        <TextareaField label="Info Parcheggio" value={formData.parcheggio_info} onChange={updateField('parcheggio_info')} rows={1} />
                                        <InputField label="Animali Ammessi" value={formData.animali_ammessi} onChange={updateField('animali_ammessi')} />
                                        <InputField label="Metodi di Pagamento" value={formData.metodi_pagamento} onChange={updateField('metodi_pagamento')} />
                                        <InputField label="Tassa di Soggiorno" value={formData.tassa_soggiorno} onChange={updateField('tassa_soggiorno')} />
                                        <TextareaField label="Policy Allergie" value={formData.allergie_policy} onChange={updateField('allergie_policy')} rows={2} />
                                    </div>
                                </section>

                                {/* Section 6: Marketing */}
                                <section className="apple-card p-6 space-y-4 xl:col-span-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="z-icon-chip"><Megaphone className="w-5 h-5" /></div>
                                        <h2 className="text-lg font-bold">Marketing & Custom AI</h2>
                                    </div>
                                    <TextareaField label="Promozione Attiva Oggi" value={formData.promozione_attiva} onChange={updateField('promozione_attiva')} rows={3} />
                                    <TextareaField label="Informazioni Aggiuntive Rapide" value={formData.dati_testuali_brevi} onChange={updateField('dati_testuali_brevi')} rows={4} />
                                </section>
                            </div>

                            {/* Floating Save Button */}
                            <footer className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-7xl px-4 animate-fade-in sm:px-6">
                                <button
                                    onClick={handleUpdate}
                                    disabled={isUpdating}
                                    className="apple-button h-16 md:h-18 px-8 md:px-12 bg-zirel-gradient flex items-center justify-center gap-4 shadow-2xl shadow-orange-500/30 w-full md:w-auto mx-auto border-none outline-none group"
                                >
                                    {isUpdating ? (
                                        <Loader2 className="w-6 h-6 animate-spin" />
                                    ) : (
                                        <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                    )}
                                    <span className="text-lg font-bold">Salva e Aggiorna AI</span>
                                </button>
                            </footer>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

const showPortalFallbackLabel = (formData: TenantData | null) => Boolean(formData?.stripe_customer_id);

export default Dashboard;
