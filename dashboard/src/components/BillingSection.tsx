import {
    AlertCircle,
    CalendarClock,
    CheckCircle2,
    CreditCard,
    ExternalLink,
    Loader2,
    ShieldCheck,
    WalletCards,
} from 'lucide-react';
import type { TenantData } from '../types';

interface BillingSectionProps {
    formData: TenantData;
    isBillingLoading: boolean;
    onCheckout: (priceId: string, setupPriceId?: string) => void;
    onPortal: () => void;
}

type BillingUiStatus = 'trialing' | 'expired_trial' | 'active' | 'past_due' | 'canceled' | 'unpaid';

const monthlyPlans = [
    {
        key: 'base',
        label: 'Zirel Core Base',
        price: 'EUR49',
        cadence: '/mese',
        setup: 'EUR349 una tantum',
        annualSetup: 'Con annuale: -50% sul setup iniziale',
        description: 'Per attivazioni rapide e gestione quotidiana essenziale.',
        features: [
            'Assistente AI attivo 24/7',
            'Gestione richieste, menu, FAQ e orari',
            'Prenotazioni e appuntamenti dal sito',
            'Una lingua inclusa',
            'Supporto via email',
        ],
        priceEnv: 'VITE_STRIPE_PRICE_BASE_ID',
        priceYearlyEnv: 'VITE_STRIPE_PRICE_BASE_YEARLY_ID',
        setupEnv: 'VITE_STRIPE_SETUP_BASE_ID',
        setupYearlyEnv: 'VITE_STRIPE_SETUP_BASE_YEARLY_ID',
        accent: 'text-zirel-blue',
        buttonClass: 'apple-button-secondary',
        setupAccent: 'text-zirel-blue',
    },
    {
        key: 'premium',
        label: 'Zirel Core Premium',
        price: 'EUR99',
        cadence: '/mese',
        setup: 'EUR599 configurazione iniziale',
        annualSetup: 'Con annuale: -50% sull’attivazione iniziale',
        description: 'Per attivita che vogliono piu conversione, piu lingue e piu supporto.',
        features: [
            'Tutto del piano Base',
            'Concierge multilingua',
            'Ottimizzazione avanzata della conversione',
            'Analisi richieste in tempo reale',
            'Supporto prioritario',
        ],
        priceEnv: 'VITE_STRIPE_PRICE_PREMIUM_ID',
        priceYearlyEnv: 'VITE_STRIPE_PRICE_PREMIUM_YEARLY_ID',
        setupEnv: 'VITE_STRIPE_SETUP_PREMIUM_ID',
        setupYearlyEnv: 'VITE_STRIPE_SETUP_PREMIUM_YEARLY_ID',
        accent: 'text-zirel-orange-dark',
        buttonClass: 'apple-button bg-zirel-gradient',
        setupAccent: 'text-zirel-orange-dark',
    },
];

const statusMeta: Record<BillingUiStatus, { label: string; tone: string; title: string; description: string; cta: string }> = {
    trialing: {
        label: 'Periodo di prova attivo',
        tone: 'bg-blue-50 text-blue-700 border-blue-100',
        title: 'Il tuo account e operativo',
        description: 'Puoi completare l’attivazione del piano in qualsiasi momento, senza interrompere il servizio.',
        cta: 'Scegli il piano piu adatto',
    },
    expired_trial: {
        label: 'Periodo di prova terminato',
        tone: 'bg-amber-50 text-amber-700 border-amber-100',
        title: 'Per continuare a usare Zirel serve un piano attivo',
        description: 'Il periodo di prova e terminato. Attiva un piano per mantenere operativo il concierge e riattivare il servizio senza interruzioni.',
        cta: 'Attiva ora il tuo piano',
    },
    active: {
        label: 'Abbonamento attivo',
        tone: 'bg-green-50 text-green-700 border-green-100',
        title: 'Il tuo abbonamento e in regola',
        description: 'Puoi gestire metodo di pagamento, rinnovi e dati di fatturazione dal portale sicuro di Stripe.',
        cta: 'Gestisci il tuo abbonamento',
    },
    past_due: {
        label: 'Pagamento da aggiornare',
        tone: 'bg-red-50 text-red-700 border-red-100',
        title: 'Serve aggiornare il metodo di pagamento',
        description: 'Abbiamo rilevato un problema sul rinnovo. Aggiorna il pagamento per evitare la sospensione del servizio.',
        cta: 'Aggiorna il pagamento',
    },
    canceled: {
        label: 'Abbonamento annullato',
        tone: 'bg-gray-50 text-gray-700 border-gray-100',
        title: 'Il servizio e stato annullato',
        description: 'I tuoi dati restano disponibili, ma il servizio non e attivo. Puoi riattivarlo quando vuoi.',
        cta: 'Riattiva il servizio',
    },
    unpaid: {
        label: 'Fatturazione in sospeso',
        tone: 'bg-orange-50 text-orange-700 border-orange-100',
        title: 'La fatturazione richiede attenzione',
        description: 'Controlla il tuo metodo di pagamento o contatta il supporto per completare la riattivazione.',
        cta: 'Controlla la fatturazione',
    },
};

const formatDate = (value?: string | null) => {
    if (!value) return 'Non disponibile';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'Non disponibile';
    return date.toLocaleDateString('it-IT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
};

const BillingSection = ({ formData, isBillingLoading, onCheckout, onPortal }: BillingSectionProps) => {
    const trialEndsAt = formData.trial_ends_at ? new Date(formData.trial_ends_at) : null;
    const now = new Date();
    const rawStatus = String(formData.subscription_status || 'trialing').trim().toLowerCase();
    const trialDaysRemaining = trialEndsAt ? Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
    const hasActiveStripePlan = Boolean(formData.stripe_subscription_id);
    const isExpiredTrial = rawStatus === 'trialing' && !!trialEndsAt && trialEndsAt.getTime() <= now.getTime() && !hasActiveStripePlan;

    const currentStatus: BillingUiStatus =
        rawStatus === 'active' ? 'active'
            : rawStatus === 'past_due' ? 'past_due'
                : rawStatus === 'canceled' ? 'canceled'
                    : rawStatus === 'unpaid' ? 'unpaid'
                        : isExpiredTrial ? 'expired_trial'
                            : 'trialing';

    const currentPlanLabel =
        (formData.stripe_price_id === import.meta.env.VITE_STRIPE_PRICE_PREMIUM_ID || formData.stripe_price_id === import.meta.env.VITE_STRIPE_PRICE_PREMIUM_YEARLY_ID)
            ? 'Zirel Core Premium'
            : (formData.stripe_price_id === import.meta.env.VITE_STRIPE_PRICE_BASE_ID || formData.stripe_price_id === import.meta.env.VITE_STRIPE_PRICE_BASE_YEARLY_ID)
                ? 'Zirel Core Base'
                : currentStatus === 'expired_trial'
                    ? 'Nessun piano attivo'
                    : 'Periodo di prova';

    const hero = statusMeta[currentStatus];
    const billingEmail = formData.billing_email || formData.mail || 'Non impostata';
    const businessName = formData.hotel_name || formData.nome_ristorante || formData.tenant_id || 'Zirel';

    const showCheckoutCards = currentStatus !== 'active';
    const showPortal = Boolean(formData.stripe_customer_id);

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-fade-in pb-20">
            <section className="apple-card p-7 md:p-10 border border-gray-100 overflow-hidden relative">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,140,66,0.14),_transparent_42%),radial-gradient(circle_at_bottom_left,_rgba(11,74,106,0.08),_transparent_32%)] pointer-events-none" />
                <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-gray-900">Abbonamento e fatturazione</h2>
                            <span className={`px-4 py-1.5 rounded-full text-[11px] font-black uppercase tracking-[0.22em] border ${hero.tone}`}>
                                {hero.label}
                            </span>
                        </div>
                        <div className="space-y-2 max-w-3xl">
                            <p className="text-xl font-bold text-gray-900">{hero.title}</p>
                            <p className="text-gray-600 leading-relaxed">{hero.description}</p>
                        </div>
                    </div>
                    <div className="min-w-[260px] lg:max-w-[320px] apple-card bg-white/80 border border-white/70 shadow-none p-5 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="z-icon-chip"><WalletCards className="w-5 h-5" /></div>
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.22em] text-gray-400">Stato attuale</p>
                                <p className="text-lg font-black text-gray-900">{currentPlanLabel}</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 gap-3 text-sm">
                            <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
                                <p className="text-gray-400 uppercase tracking-[0.18em] text-[10px] font-bold">Cliente</p>
                                <p className="mt-1 font-semibold text-gray-800">{businessName}</p>
                            </div>
                            <div className="rounded-2xl bg-gray-50 border border-gray-100 px-4 py-3">
                                <p className="text-gray-400 uppercase tracking-[0.18em] text-[10px] font-bold">Email fatturazione</p>
                                <p className="mt-1 font-semibold text-gray-800 break-all">{billingEmail}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-8">
                <div className="apple-card p-7 md:p-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="z-icon-chip"><CalendarClock className="w-5 h-5" /></div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900">Stato servizio</h3>
                            <p className="text-sm text-gray-500">Informazioni operative su prova, rinnovo e accesso al concierge.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="rounded-3xl border border-gray-100 bg-gray-50 px-5 py-4">
                            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-gray-400">Piano rilevato</p>
                            <p className="mt-2 text-lg font-black text-gray-900">{currentPlanLabel}</p>
                        </div>
                        <div className="rounded-3xl border border-gray-100 bg-gray-50 px-5 py-4">
                            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-gray-400">
                                {currentStatus === 'trialing' || currentStatus === 'expired_trial' ? 'Fine prova' : 'Ultimo stato'}
                            </p>
                            <p className="mt-2 text-lg font-black text-gray-900">
                                {trialEndsAt ? formatDate(formData.trial_ends_at) : hero.label}
                            </p>
                            {currentStatus === 'trialing' && typeof trialDaysRemaining === 'number' && trialDaysRemaining > 0 && (
                                <p className="mt-1 text-sm font-medium text-gray-500">{trialDaysRemaining} giorni rimanenti</p>
                            )}
                            {currentStatus === 'expired_trial' && (
                                <p className="mt-1 text-sm font-medium text-amber-700">La prova e terminata: per proseguire serve un piano attivo.</p>
                            )}
                        </div>
                    </div>

                    <div className={`rounded-[2rem] border px-6 py-5 ${hero.tone}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <p className="text-sm font-bold uppercase tracking-[0.22em] opacity-80">Prossimo passo</p>
                                <p className="mt-2 text-lg font-black">{hero.cta}</p>
                            </div>
                            {showPortal ? (
                                <button
                                    onClick={onPortal}
                                    disabled={isBillingLoading}
                                    className="apple-button-secondary bg-white text-gray-900 border-white/80 hover:border-white flex items-center justify-center gap-2 h-12 px-6"
                                >
                                    {isBillingLoading ? <Loader2 size={18} className="animate-spin" /> : <ExternalLink size={18} />}
                                    Gestisci su Stripe
                                </button>
                            ) : (
                                <div className="text-sm font-semibold opacity-80">
                                    Il portale di gestione si attivera dopo il primo pagamento andato a buon fine.
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="apple-card p-7 md:p-8 space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="z-icon-chip"><ShieldCheck className="w-5 h-5" /></div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900">Informazioni di fatturazione</h3>
                            <p className="text-sm text-gray-500">Punto di controllo rapido su pagamento, setup e sicurezza.</p>
                        </div>
                    </div>

                    <div className="space-y-4 text-sm">
                        <div className="rounded-3xl border border-gray-100 bg-gray-50 px-5 py-4">
                            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-gray-400">Gestione pagamenti</p>
                            <p className="mt-2 text-gray-700 leading-relaxed">I pagamenti sono gestiti in modo sicuro tramite Stripe. Il contributo iniziale di attivazione verra applicato al primo checkout, mentre i rinnovi successivi saranno ricorrenti.</p>
                        </div>
                        <div className="rounded-3xl border border-gray-100 bg-gray-50 px-5 py-4">
                            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-gray-400">Email amministrativa</p>
                            <p className="mt-2 font-semibold text-gray-900 break-all">{billingEmail}</p>
                        </div>
                        <div className="rounded-3xl border border-gray-100 bg-gray-50 px-5 py-4">
                            <p className="text-[10px] uppercase tracking-[0.22em] font-bold text-gray-400">Portale di fatturazione</p>
                            <p className="mt-2 text-gray-700 leading-relaxed">Dal portale Stripe potrai aggiornare la carta, consultare i pagamenti e gestire l’abbonamento in autonomia.</p>
                        </div>
                    </div>
                </div>
            </section>

            {showCheckoutCards && (
                <section className="space-y-6">
                    <div className="space-y-2">
                        <h3 className="text-2xl md:text-3xl font-black text-gray-900">Scegli il tuo piano</h3>
                        <p className="text-gray-500 max-w-3xl">
                            Il primo pagamento include il canone del piano scelto e il contributo iniziale di attivazione. La versione annuale verra collegata al checkout Stripe nel prossimo step, mantenendo il 50% di sconto sul setup.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                        {monthlyPlans.map((plan) => {
                            const priceId = import.meta.env[plan.priceEnv] as string | undefined;
                            const setupId = import.meta.env[plan.setupEnv] as string | undefined;
                            const priceYearlyId = import.meta.env[plan.priceYearlyEnv] as string | undefined;
                            const setupYearlyId = import.meta.env[plan.setupYearlyEnv] as string | undefined;
                            
                            const isCurrentPlanMonthly = formData.stripe_price_id === priceId;
                            const isCurrentPlanYearly = formData.stripe_price_id === priceYearlyId;
                            const isCurrentPlan = isCurrentPlanMonthly || isCurrentPlanYearly;

                            return (
                                <article
                                    key={plan.key}
                                    className={`apple-card p-7 md:p-8 border-2 transition-all ${plan.key === 'premium'
                                        ? 'border-zirel-orange-dark shadow-xl shadow-orange-500/10'
                                        : 'border-gray-100 hover:border-zirel-orange-dark/30'
                                        }`}
                                >
                                    <div className="space-y-6">
                                        <div className="flex items-start justify-between gap-4">
                                            <div className="space-y-2">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <h4 className="text-2xl font-black text-gray-900">{plan.label}</h4>
                                                    {plan.key === 'premium' && (
                                                        <span className="px-3 py-1 rounded-full bg-zirel-gradient text-white text-[10px] font-black uppercase tracking-[0.22em] shadow-lg">
                                                            Piu richiesto
                                                        </span>
                                                    )}
                                                    {isCurrentPlan && (
                                                        <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 text-[10px] font-black uppercase tracking-[0.22em]">
                                                            Piano attuale
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-gray-500 leading-relaxed">{plan.description}</p>
                                            </div>
                                            <div className="text-right shrink-0">
                                                <p className={`text-4xl font-black ${plan.accent}`}>{plan.price}</p>
                                                <p className="text-sm font-semibold text-gray-400">{plan.cadence}</p>
                                            </div>
                                        </div>

                                        <div className="rounded-[1.75rem] border border-gray-100 bg-gray-50 px-5 py-4 space-y-2">
                                            <p className={`text-base font-black ${plan.setupAccent}`}>{plan.setup}</p>
                                            <p className="text-sm text-gray-500">{plan.annualSetup}</p>
                                        </div>

                                        <ul className="space-y-3">
                                            {plan.features.map((feature) => (
                                                <li key={feature} className="flex items-start gap-3 text-sm text-gray-700">
                                                    <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                                    <span>{feature}</span>
                                                </li>
                                            ))}
                                        </ul>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                                            <button
                                                onClick={() => priceId && onCheckout(priceId, setupId)}
                                                disabled={isBillingLoading || !priceId || isCurrentPlanMonthly}
                                                className={`${plan.buttonClass} w-full h-13 font-bold flex items-center justify-center gap-2 ${(!priceId || isCurrentPlanMonthly) ? 'opacity-60 cursor-not-allowed' : ''}`}
                                            >
                                                {isBillingLoading ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                                                Attiva mensile
                                            </button>
                                            <button
                                                onClick={() => priceYearlyId && onCheckout(priceYearlyId, setupYearlyId)}
                                                disabled={isBillingLoading || !priceYearlyId || isCurrentPlanYearly}
                                                className="apple-button-secondary border border-gray-200 text-gray-800 bg-white w-full h-13 font-bold flex items-center justify-center gap-2 transition-all hover:bg-gray-50 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                title="Risparmia il 50% sul setup e paghi una volta all'anno"
                                            >
                                                {isBillingLoading ? <Loader2 size={18} className="animate-spin" /> : <CreditCard size={18} />}
                                                Attiva annuale
                                            </button>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                </section>
            )}

            <section className="rounded-[2rem] border border-gray-100 bg-gray-50 px-6 py-5 flex items-start gap-4">
                <div className="p-2 bg-white text-gray-400 rounded-xl shrink-0 border border-gray-100">
                    <AlertCircle size={18} />
                </div>
                <div className="space-y-1">
                    <p className="text-sm text-gray-800 font-bold">Promemoria e gestione rinnovi</p>
                    <p className="text-sm text-gray-500 leading-relaxed">
                        Nel prossimo step collegheremo i reminder automatici per fine prova, rinnovo mensile, pagamento fallito e rinnovo annuale, insieme alla disattivazione controllata del servizio in caso di mancato pagamento.
                    </p>
                </div>
            </section>
        </div>
    );
};

export default BillingSection;
