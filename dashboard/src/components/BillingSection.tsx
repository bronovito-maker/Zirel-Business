import { CreditCard, CheckCircle2, ExternalLink, Loader2, Sparkles, Zap, Clock, AlertCircle } from 'lucide-react';
import type { TenantData } from '../types';

interface BillingSectionProps {
    formData: TenantData;
    isBillingLoading: boolean;
    onCheckout: (priceId: string) => void;
    onPortal: () => void;
}

const BillingSection = ({ formData, isBillingLoading, onCheckout, onPortal }: BillingSectionProps) => {
    const trialEndsAt = formData.trial_ends_at ? new Date(formData.trial_ends_at) : null;
    const isTrialing = formData.subscription_status === 'trialing';
    
    const getTrialDaysRemaining = () => {
        if (!trialEndsAt) return 0;
        const now = new Date();
        const diff = trialEndsAt.getTime() - now.getTime();
        return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    };

    const trialDays = getTrialDaysRemaining();

    const statusColors = {
        trialing: 'bg-blue-50 text-blue-700 border-blue-100',
        active: 'bg-green-50 text-green-700 border-green-100',
        past_due: 'bg-red-50 text-red-700 border-red-100',
        canceled: 'bg-gray-50 text-gray-700 border-gray-100',
        unpaid: 'bg-orange-50 text-orange-700 border-orange-100',
    };

    const statusLabels = {
        trialing: 'In Prova',
        active: 'Attivo',
        past_due: 'Pagamento Scaduto',
        canceled: 'Annullato',
        unpaid: 'In Sospeso',
    };

    const currentStatus = (formData.subscription_status || 'trialing') as keyof typeof statusLabels;

    return (
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-in pb-20">
            {/* Subscription Hero Card */}
            <div className={`apple-card p-8 md:p-12 relative overflow-hidden border-2 transition-all ${isTrialing ? 'border-orange-100' : 'border-transparent'}`}>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <h2 className="text-3xl font-black text-gray-800">Il tuo Abbonamento</h2>
                            <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest border ${statusColors[currentStatus] || statusColors.trialing}`}>
                                {statusLabels[currentStatus] || currentStatus}
                            </span>
                        </div>
                        <p className="text-gray-500 text-lg max-w-xl leading-relaxed">
                            Gestisci la tua licenza Zirèl Core e sblocca nuove funzionalità per il tuo assistente AI.
                        </p>
                    </div>
                </div>
                
                {isTrialing && (
                    <div className="absolute top-0 right-0 p-8 flex flex-col items-end opacity-10 pointer-events-none hidden md:flex">
                        <Clock size={120} className="text-zirel-orange-dark" />
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Plan Details */}
                <div className="apple-card p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="z-icon-chip"><Sparkles className="w-5 h-5" /></div>
                        <h3 className="text-xl font-bold">Dettagli Piano</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                            <span className="text-gray-500 font-medium">Piano Attuale</span>
                            <span className="font-bold text-gray-800">
                                {formData.stripe_price_id === import.meta.env.VITE_STRIPE_PRICE_PREMIUM_ID 
                                    ? 'Zirèl Core (Premium)' 
                                    : formData.stripe_price_id === import.meta.env.VITE_STRIPE_PRICE_BASE_ID 
                                        ? 'Zirèl Core (Base)' 
                                        : formData.subscription_status === 'trialing' 
                                            ? 'Zirèl Core (Trial)' 
                                            : 'Zirèl Core (Nessun piano)'}
                            </span>
                        </div>
                        
                        {isTrialing && trialEndsAt && (
                            <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 flex items-center justify-between">
                                <span className="text-orange-700 font-medium">Scadenza Prova</span>
                                <span className="font-bold text-orange-800 italic">{trialEndsAt.toLocaleDateString()} ({trialDays} giorni rimasti)</span>
                            </div>
                        )}

                        <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                            <span className="text-gray-500 font-medium">Email di Fatturazione</span>
                            <span className="font-medium text-gray-800">{formData.billing_email || formData.mail || 'Non impostata'}</span>
                        </div>
                    </div>
                </div>

                {/* Billing Summary */}
                <div className="apple-card p-8 space-y-6">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="z-icon-chip"><CreditCard className="w-5 h-5" /></div>
                        <h3 className="text-xl font-bold">Fatturazione Stripe</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-4 text-sm text-gray-500 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <CheckCircle2 className="text-green-500 shrink-0" size={18} />
                            Pagamenti gestiti in sicurezza tramite Stripe.
                        </div>
                        
                        <div className="pt-4 space-y-3">
                            {formData.stripe_customer_id ? (
                                <button
                                    onClick={onPortal}
                                    disabled={isBillingLoading}
                                    className="apple-button-secondary w-full flex items-center justify-center gap-3 h-14"
                                >
                                    {isBillingLoading ? <Loader2 size={20} className="animate-spin" /> : <ExternalLink size={20} />}
                                    <span className="font-bold">Gestisci nel Portale Stripe</span>
                                </button>
                            ) : (
                                <div className="text-center p-6 bg-blue-50/50 rounded-2xl border border-blue-100 border-dashed">
                                    <p className="text-sm text-blue-700 font-medium">Il tuo Stripe Customer verrà creato al momento del primo abbonamento.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Pricing Section - Only shown if not active or if trialing */}
            {(isTrialing || currentStatus === 'canceled' || currentStatus === 'past_due' || !formData.stripe_subscription_id) && (
                <div className="space-y-8 pt-8">
                    <div className="text-center space-y-2">
                        <h3 className="text-2xl font-black text-gray-800">Scegli il tuo piano Zirèl Core</h3>
                        <p className="text-gray-500">Sblocca il pieno potenziale dell'intelligenza artificiale per il tuo business.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Base Plan */}
                        <div className="apple-card p-8 flex flex-col hover:border-zirel-orange-dark/30 transition-all border-2 border-transparent">
                            <div className="space-y-4 flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-xl font-black text-gray-800">Base</h4>
                                        <p className="text-gray-500 text-sm">Pronto all'uso</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-black text-zirel-blue">€49<span className="text-sm font-medium text-gray-400">/mese</span></p>
                                    </div>
                                </div>
                                <ul className="space-y-3 pt-6">
                                    {[
                                        'Assistente AI attivo 24/7',
                                        'Integrazione Widget Sito Web',
                                        'Prenotazioni e Appuntamenti',
                                        '1 Lingua inclusa (Italiano)',
                                        'Supporto Email'
                                    ].map((feat, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                                            <div className="bg-orange-50 p-1 rounded-full"><Zap size={10} className="text-zirel-orange-dark" /></div>
                                            {feat}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="pt-8">
                                <button
                                    onClick={() => onCheckout(import.meta.env.VITE_STRIPE_PRICE_BASE_ID)}
                                    disabled={isBillingLoading}
                                    className="apple-button-secondary w-full h-14 font-extrabold"
                                >
                                    {isBillingLoading ? <Loader2 size={20} className="animate-spin" /> : 'Attiva Base'}
                                </button>
                            </div>
                        </div>

                        {/* Premium Plan */}
                        <div className="apple-card p-8 flex flex-col border-2 border-zirel-orange-dark shadow-xl shadow-orange-500/10 relative">
                            <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-zirel-gradient px-4 py-1.5 rounded-full text-[10px] font-black uppercase text-white tracking-widest shadow-lg">
                                Più Scelto
                            </div>
                            <div className="space-y-4 flex-1">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <h4 className="text-xl font-black text-gray-800">Premium</h4>
                                        <p className="text-gray-500 text-sm">Potenza Massima</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-3xl font-black text-zirel-orange-dark">€99<span className="text-sm font-medium text-gray-400">/mese</span></p>
                                    </div>
                                </div>
                                <ul className="space-y-3 pt-6">
                                    {[
                                        'Tutto del piano Base',
                                        'Concierge Multilingua (10+ lingue)',
                                        'Ottimizzazione conversione avanzata',
                                        'Analisi richieste in tempo reale',
                                        'Supporto Prioritario WhatsApp'
                                    ].map((feat, i) => (
                                        <li key={i} className="flex items-center gap-3 text-sm text-gray-600">
                                            <div className="bg-orange-100 p-1 rounded-full"><Sparkles size={10} className="text-zirel-orange-dark" /></div>
                                            {feat}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                            <div className="pt-8">
                                <button
                                    onClick={() => onCheckout(import.meta.env.VITE_STRIPE_PRICE_PREMIUM_ID)}
                                    disabled={isBillingLoading}
                                    className="apple-button w-full h-14 font-extrabold bg-zirel-gradient"
                                >
                                    {isBillingLoading ? <Loader2 size={20} className="animate-spin" /> : 'Attiva Premium'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {/* Help/Notice */}
            <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 flex items-start gap-4">
                <div className="p-2 bg-white text-gray-400 rounded-lg shrink-0 border border-gray-100"><AlertCircle size={18} /></div>
                <div className="space-y-1">
                    <p className="text-sm text-gray-700 font-bold">Hai bisogno di una fattura o di cambiare metodo di pagamento?</p>
                    <p className="text-xs text-gray-500 leading-relaxed">
                        Tutta la gestione amministrativa avviene tramite il portale sicuro di Stripe. Verrai reindirizzato lì per ogni modifica ai tuoi dati di pagamento.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BillingSection;
