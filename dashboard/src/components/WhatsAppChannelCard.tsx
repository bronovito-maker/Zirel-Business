import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, ChevronDown, ChevronUp, Copy, Loader2, MessageSquare, RefreshCw, ShieldCheck, Smartphone, Sparkles, TriangleAlert, Unplug, Webhook } from 'lucide-react';
import toast from 'react-hot-toast';
import { completeWhatsAppEmbeddedSignup, disconnectWhatsAppChannel, getWhatsAppChannelOpsSummary, getWhatsAppChannelSummary, syncWhatsAppChannel } from '../lib/supabase-helpers';
import {
    extractEmbeddedSignupIdentifiers,
    isEmbeddedSignupConfigured,
    launchEmbeddedSignup,
} from '../lib/meta-embedded-signup';
import type { CompleteWhatsAppEmbeddedSignupPayload, WhatsAppChannelOpsSummary, WhatsAppChannelSummary } from '../types';

interface WhatsAppChannelCardProps {
    tenantId?: string;
    onOpenConversations?: () => void;
}

const formatDateTime = (value?: string | null) => {
    if (!value) return 'n/d';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return 'n/d';
    return date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const formatPhoneFallback = (value?: string | null) => {
    const normalized = String(value || '').trim();
    if (!normalized) return 'non disponibile';
    if (normalized.startsWith('+')) return normalized;
    return normalized;
};

const formatModeLabel = (value?: string | null) => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return 'n/d';
    if (normalized === 'platform_managed') return 'Platform managed';
    if (normalized === 'tenant_managed') return 'Tenant managed';
    return normalized.replace(/_/g, ' ');
};

const getWebhookMeta = (summary: WhatsAppChannelSummary | null) => {
    const verifiedAt = summary?.webhook_verified_at || null;
    const lastWebhookAt = summary?.last_webhook_at || null;

    if (!verifiedAt) {
        return {
            label: 'Webhook da verificare',
            tone: 'bg-amber-50 text-amber-700 border-amber-100',
            body: 'Il canale è collegato ma non abbiamo ancora una conferma di verifica webhook registrata.',
        };
    }

    if (!lastWebhookAt) {
        return {
            label: 'Webhook verificato',
            tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
            body: 'La verifica webhook è presente. Stiamo aspettando o non abbiamo ancora registrato eventi recenti.',
        };
    }

    const lastEventDate = new Date(lastWebhookAt);
    if (Number.isNaN(lastEventDate.getTime())) {
        return {
            label: 'Webhook verificato',
            tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
            body: 'La verifica webhook è presente, ma la data dell’ultimo evento non è leggibile.',
        };
    }

    const hoursFromLastEvent = Math.round((Date.now() - lastEventDate.getTime()) / (1000 * 60 * 60));
    if (hoursFromLastEvent > 72) {
        return {
            label: 'Webhook inattivo',
            tone: 'bg-orange-50 text-orange-700 border-orange-100',
            body: 'Il webhook è verificato, ma non vediamo eventi recenti da oltre 72 ore.',
        };
    }

    return {
        label: 'Webhook attivo',
        tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        body: 'Il webhook è verificato e sta ricevendo eventi recenti.',
    };
};

const statusMeta: Record<string, { label: string; tone: string; body: string }> = {
    not_connected: {
        label: 'Non collegato',
        tone: 'bg-slate-100 text-slate-700 border-slate-200',
        body: 'Collega il tuo numero WhatsApp Business a Zirèl per ricevere messaggi, automatizzare le risposte e gestire le conversazioni in un unico posto.',
    },
    connection_in_progress: {
        label: 'Collegamento in corso',
        tone: 'bg-amber-50 text-amber-700 border-amber-100',
        body: 'Il collegamento è stato avviato. Se hai appena completato il flusso Meta, attendi qualche istante e aggiorna lo stato.',
    },
    connected: {
        label: 'Connesso',
        tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        body: 'Il numero WhatsApp è collegato correttamente ed è pronto per ricevere e inviare messaggi.',
    },
    requires_attention: {
        label: 'Richiede attenzione',
        tone: 'bg-orange-50 text-orange-700 border-orange-100',
        body: 'La connessione esiste, ma mancano ancora alcuni dettagli canale da sincronizzare o verificare.',
    },
    error: {
        label: 'Errore',
        tone: 'bg-red-50 text-red-700 border-red-100',
        body: 'Il collegamento non è stato completato correttamente. Riprova oppure verifica i dettagli del canale.',
    },
};

const WhatsAppChannelCard = ({ tenantId, onOpenConversations }: WhatsAppChannelCardProps) => {
    const [summary, setSummary] = useState<WhatsAppChannelSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLaunchingMeta, setIsLaunchingMeta] = useState(false);
    const [isDisconnecting, setIsDisconnecting] = useState(false);
    const [isOpsLoading, setIsOpsLoading] = useState(false);
    const [isOpsOpen, setIsOpsOpen] = useState(false);
    const [opsSummary, setOpsSummary] = useState<WhatsAppChannelOpsSummary | null>(null);
    const [signupForm, setSignupForm] = useState<CompleteWhatsAppEmbeddedSignupPayload>({
        meta_phone_number_id: '',
        waba_id: '',
        display_phone_number: '',
        verified_name: '',
        connection_status: 'connected',
        business_id: '',
        signup_session_id: '',
        replace_existing: false,
    });

    const loadSummary = async () => {
        try {
            setIsLoading(true);
            const nextSummary = await getWhatsAppChannelSummary(tenantId);
            setSummary(nextSummary);
        } catch (error) {
            console.error('WhatsApp channel summary load error:', error);
            toast.error('Non siamo riusciti a caricare lo stato del canale WhatsApp.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleRefreshStatus = async () => {
        try {
            setIsLoading(true);
            const syncResult = await syncWhatsAppChannel(tenantId);
            if (syncResult.synced) {
                toast.success('Dettagli WhatsApp sincronizzati da Meta.');
            }
        } catch (error) {
            console.warn('WhatsApp channel sync warning:', error);
        } finally {
            await loadSummary();
        }
    };

    const loadOpsSummary = async () => {
        try {
            setIsOpsLoading(true);
            const nextSummary = await getWhatsAppChannelOpsSummary(tenantId);
            setOpsSummary(nextSummary);
        } catch (error) {
            console.error('WhatsApp channel ops load error:', error);
            toast.error('Non siamo riusciti a caricare gli ultimi errori del canale.');
        } finally {
            setIsOpsLoading(false);
        }
    };

    useEffect(() => {
        void loadSummary();
    }, [tenantId]);

    const meta = statusMeta[summary?.connection_status || 'not_connected'] || statusMeta.not_connected;
    const isConnected = summary?.connection_status === 'connected';
    const needsAttention = summary?.connection_status === 'requires_attention';
    const embeddedSignupReady = isEmbeddedSignupConfigured();
    const connectedNumber = summary?.display_phone_number || summary?.meta_phone_number_id || null;
    const webhookMeta = getWebhookMeta(summary);

    const updateSignupField = <K extends keyof CompleteWhatsAppEmbeddedSignupPayload>(
        key: K,
        value: CompleteWhatsAppEmbeddedSignupPayload[K]
    ) => {
        setSignupForm((current) => ({
            ...current,
            [key]: value,
        }));
    };

    const seedFromCurrentSummary = () => {
        setSignupForm((current) => ({
            ...current,
            meta_phone_number_id: summary?.meta_phone_number_id || current.meta_phone_number_id || '',
            waba_id: summary?.waba_id || current.waba_id || '',
            display_phone_number: summary?.display_phone_number || current.display_phone_number || '',
            verified_name: summary?.verified_name || current.verified_name || '',
            connection_status: 'connected',
        }));
    };

    const handleSubmitSignup = async () => {
        if (!signupForm.meta_phone_number_id.trim() || !signupForm.waba_id.trim()) {
            toast.error('Inserisci almeno phone number ID e WABA ID.');
            return;
        }

        try {
            setIsSubmitting(true);
            const result = await completeWhatsAppEmbeddedSignup({
                meta_phone_number_id: signupForm.meta_phone_number_id.trim(),
                waba_id: signupForm.waba_id.trim(),
                display_phone_number: signupForm.display_phone_number?.trim() || null,
                verified_name: signupForm.verified_name?.trim() || null,
                connection_status: signupForm.connection_status || 'connected',
                business_id: signupForm.business_id?.trim() || null,
                signup_session_id: signupForm.signup_session_id?.trim() || null,
                replace_existing: signupForm.replace_existing === true,
            });

            toast.success(result.display_phone_number
                ? `WhatsApp collegato: ${result.display_phone_number}`
                : 'WhatsApp collegato correttamente.');
            setIsModalOpen(false);
            await loadSummary();
        } catch (error) {
            console.error('WhatsApp embedded signup completion error:', error);
            toast.error(error instanceof Error ? error.message : 'Non siamo riusciti a completare il collegamento WhatsApp.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleLaunchMetaSignup = async () => {
        if (!embeddedSignupReady) {
            toast.error('Mancano VITE_META_APP_ID o VITE_META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID.');
            return;
        }

        try {
            setIsLaunchingMeta(true);
            const result = await launchEmbeddedSignup();
            const extracted = extractEmbeddedSignupIdentifiers(result.event);

            setSignupForm((current) => ({
                ...current,
                meta_phone_number_id: extracted.meta_phone_number_id || current.meta_phone_number_id || '',
                waba_id: extracted.waba_id || current.waba_id || '',
                business_id: extracted.business_id || current.business_id || '',
                display_phone_number: extracted.display_phone_number || current.display_phone_number || '',
                verified_name: extracted.verified_name || current.verified_name || '',
                signup_session_id: result.code || current.signup_session_id || '',
            }));

            if (extracted.meta_phone_number_id && extracted.waba_id) {
                toast.success('Dati Meta ricevuti. Ora puoi completare il collegamento.');
            } else if (result.code) {
                toast.success('Flusso Meta completato. Se alcuni campi non si sono popolati, incolla il payload finale e completa il collegamento.');
            } else {
                toast('Meta ha chiuso il flusso, ma non abbiamo ancora letto tutti gli identificativi nel browser.', {
                    icon: <TriangleAlert className="w-4 h-4 text-orange-600" />,
                    duration: 5000,
                });
            }
        } catch (error) {
            console.error('Meta embedded signup launch error:', error);
            toast.error(error instanceof Error ? error.message : 'Non siamo riusciti ad avviare il flusso Meta.');
        } finally {
            setIsLaunchingMeta(false);
        }
    };

    const handleDisconnect = async () => {
        const confirmed = window.confirm(
            'Vuoi davvero scollegare questo canale WhatsApp? Il tenant non riceverà più nuovi messaggi finché non lo ricolleghi.'
        );

        if (!confirmed) return;

        try {
            setIsDisconnecting(true);
            await disconnectWhatsAppChannel();
            toast.success('Canale WhatsApp scollegato.');
            await loadSummary();
        } catch (error) {
            console.error('WhatsApp disconnect error:', error);
            toast.error(error instanceof Error ? error.message : 'Non siamo riusciti a scollegare il canale WhatsApp.');
        } finally {
            setIsDisconnecting(false);
        }
    };

    return (
        <>
            <section className="apple-card p-6 md:p-8 space-y-6 border-t-4 border-emerald-500">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3 md:gap-4">
                        <div className="z-icon-chip-lg shrink-0">
                            <MessageSquare className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl md:text-2xl font-black text-gray-800">Canale WhatsApp</h3>
                            <p className="text-sm md:text-base text-gray-500">Stato del collegamento e prossimi passi del canale.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => void handleRefreshStatus()}
                        disabled={isLoading}
                        className="apple-button-secondary flex items-center justify-center gap-2 w-full md:w-auto"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Aggiorna stato
                    </button>
                </div>

                {isLoading && !summary ? (
                    <div className="rounded-3xl border border-gray-100 bg-gray-50 px-6 py-10 text-center text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-zirel-orange-dark" />
                        Caricamento stato canale WhatsApp...
                    </div>
                ) : (
                    <div className="rounded-[1.75rem] border border-gray-100 bg-white p-5 md:p-6 shadow-sm space-y-5">
                        <div className="flex flex-wrap items-center gap-3">
                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${meta.tone}`}>
                                {meta.label}
                            </span>
                            {(isConnected || needsAttention) ? (
                                <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold ${webhookMeta.tone}`}>
                                    <Webhook className="h-3.5 w-3.5" />
                                    {webhookMeta.label}
                                </span>
                            ) : null}
                            {summary?.credential_mode ? (
                                <span className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                                    Mode: {formatModeLabel(summary.credential_mode)}
                                </span>
                            ) : null}
                            {summary?.verified_name ? (
                                <span className="inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                                    {summary.verified_name}
                                </span>
                            ) : null}
                            {needsAttention ? (
                                <span className="inline-flex items-center rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">
                                    Sync incompleto
                                </span>
                            ) : null}
                        </div>

                        <div className="space-y-2">
                            <p className="text-gray-700 leading-relaxed">{meta.body}</p>
                            {summary?.onboarding_error ? (
                                <p className="text-sm text-red-600">{summary.onboarding_error}</p>
                            ) : null}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 text-sm">
                            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 min-h-[108px]">
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-2">Numero collegato</div>
                                <div className="font-semibold text-gray-800 flex items-center gap-2">
                                    <Smartphone className="w-4 h-4 text-gray-400" />
                                    <span className="break-all">{formatPhoneFallback(connectedNumber)}</span>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 min-h-[108px]">
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-2">Ultimo aggiornamento</div>
                                <div className="font-semibold text-gray-800">{formatDateTime(summary?.last_sync_at)}</div>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 min-h-[108px]">
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-2">Verified name</div>
                                <div className="font-semibold text-gray-800 break-words">{summary?.verified_name || 'n/d'}</div>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 min-h-[108px]">
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-2">WABA ID</div>
                                <div className="font-semibold text-gray-800 break-all">{summary?.waba_id || 'n/d'}</div>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 min-h-[108px]">
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-2">Ultimo webhook</div>
                                <div className="font-semibold text-gray-800">{formatDateTime(summary?.last_webhook_at)}</div>
                            </div>
                            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4 min-h-[108px]">
                                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400 mb-2">Webhook verificato</div>
                                <div className="font-semibold text-gray-800">{formatDateTime(summary?.webhook_verified_at)}</div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            <div className="rounded-2xl border border-dashed border-gray-200 bg-slate-50 px-4 py-4 space-y-2">
                                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                                    <Activity className="h-4 w-4" />
                                    Stato operativo
                                </div>
                                <p className="text-sm text-gray-600">
                                    {isConnected
                                        ? 'Il canale è pronto per onboarding, messaggi inbound/outbound e gestione conversazioni.'
                                        : needsAttention
                                            ? 'Il canale è collegato ma conviene rifinire il profilo Meta o rilanciare la sincronizzazione per avere tutti i dettagli completi.'
                                            : 'Il canale non è ancora completamente operativo. Puoi completare o ripetere il collegamento.'}
                                </p>
                            </div>
                            <div className="rounded-2xl border border-dashed border-gray-200 bg-slate-50 px-4 py-4 space-y-2">
                                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">
                                    <ShieldCheck className="h-4 w-4" />
                                    Diagnostica canale
                                </div>
                                <p className="text-sm text-gray-600">{webhookMeta.body}</p>
                                {summary?.onboarding_error ? (
                                    <p className="text-xs font-semibold text-red-600 break-words">
                                        Ultimo errore: {summary.onboarding_error}
                                    </p>
                                ) : null}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-gray-100 bg-white">
                            <button
                                onClick={() => {
                                    const next = !isOpsOpen;
                                    setIsOpsOpen(next);
                                    if (next && !opsSummary && !isOpsLoading) {
                                        void loadOpsSummary();
                                    }
                                }}
                                className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                            >
                                <div>
                                    <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Vista admin</div>
                                    <p className="mt-1 text-sm text-gray-600">Ultimi errori outbound e ultimi eventi webhook del canale.</p>
                                </div>
                                <span className="inline-flex items-center gap-2 text-sm font-semibold text-zirel-blue">
                                    {isOpsOpen ? 'Nascondi' : 'Mostra'}
                                    {isOpsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                </span>
                            </button>

                            {isOpsOpen ? (
                                <div className="border-t border-gray-100 px-4 py-4 space-y-4">
                                    {isOpsLoading ? (
                                        <div className="rounded-2xl bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                                            <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-zirel-orange-dark" />
                                            Caricamento diagnostica canale...
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
                                                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Ultimi errori outbound</div>
                                                {opsSummary?.failed_outbound?.length ? (
                                                    <div className="space-y-3">
                                                        {opsSummary.failed_outbound.map((item) => (
                                                            <div key={item.id} className="rounded-2xl border border-red-100 bg-white px-3 py-3">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-red-600">
                                                                        {item.delivery_status || item.processing_status || 'error'}
                                                                    </span>
                                                                    <span className="text-xs text-gray-400">{formatDateTime(item.failed_at || item.created_at)}</span>
                                                                </div>
                                                                <p className="mt-2 text-sm text-gray-700 break-words">{item.error_message || 'Errore non disponibile'}</p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500">Nessun errore outbound recente.</p>
                                                )}
                                            </div>

                                            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-4 py-4">
                                                <div className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gray-400">Ultimi eventi webhook</div>
                                                {opsSummary?.recent_webhook_events?.length ? (
                                                    <div className="space-y-3">
                                                        {opsSummary.recent_webhook_events.map((item) => (
                                                            <div key={item.id} className="rounded-2xl border border-gray-100 bg-white px-3 py-3">
                                                                <div className="flex items-center justify-between gap-3">
                                                                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-gray-600">
                                                                        {item.event_status || 'evento'}
                                                                    </span>
                                                                    <span className="text-xs text-gray-400">{formatDateTime(item.created_at)}</span>
                                                                </div>
                                                                <p className="mt-2 text-sm text-gray-700 break-words">
                                                                    {item.event_type || 'Webhook event'}
                                                                    {item.error_message ? ` · ${item.error_message}` : ''}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-sm text-gray-500">Nessun evento webhook recente.</p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : null}
                        </div>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <button
                                onClick={() => {
                                    seedFromCurrentSummary();
                                    setIsModalOpen(true);
                                }}
                                className="apple-button flex items-center justify-center gap-2 text-white w-full sm:w-auto"
                            >
                                {isConnected ? <Sparkles className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                                {isConnected || needsAttention ? 'Ricollega' : 'Collega WhatsApp'}
                            </button>
                            {isConnected ? (
                                <button
                                    onClick={onOpenConversations}
                                    className="apple-button-secondary flex items-center justify-center gap-2 w-full sm:w-auto"
                                >
                                    <MessageSquare className="w-4 h-4" />
                                    Apri conversazioni
                                </button>
                            ) : null}
                            {(isConnected || needsAttention) ? (
                                <button
                                    onClick={() => void handleDisconnect()}
                                    disabled={isDisconnecting}
                                    className="apple-button-secondary flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-60"
                                >
                                    {isDisconnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unplug className="w-4 h-4" />}
                                    Scollega
                                </button>
                            ) : null}
                        </div>
                    </div>
                )}
            </section>

            {isModalOpen ? (
                <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center bg-slate-950/45 px-3 py-4 md:px-4 overflow-y-auto">
                    <div className="w-full max-w-2xl rounded-[2rem] bg-white shadow-2xl border border-gray-100 p-5 md:p-8 space-y-5 my-auto">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h4 className="text-xl md:text-2xl font-black text-gray-900">Collega WhatsApp</h4>
                                <p className="text-sm md:text-base text-gray-500 mt-2">
                                    Questa schermata e già il ponte operativo tra il completion payload di Meta e il backend Zirèl. Nel prossimo step qui agganceremo anche l'avvio diretto dell'SDK `Embedded Signup`.
                                </p>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="rounded-full border border-gray-200 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50"
                                aria-label="Chiudi"
                            >
                                <Unplug className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-5 py-5 space-y-3">
                            <div className="text-sm font-bold text-gray-800">Cosa fa già questo flusso</div>
                            <ul className="text-sm text-gray-600 space-y-2">
                                <li>1. Riceve i dati finali del collegamento WhatsApp.</li>
                                <li>2. Li invia al callback server-side protetto.</li>
                                <li>3. Salva numero, WABA e stato connessione in Zirèl.</li>
                                <li>4. Aggiorna subito la card del canale.</li>
                            </ul>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <label className="block">
                                <span className="block text-sm font-semibold text-gray-700 mb-2">Meta phone number ID</span>
                                <input
                                    value={signupForm.meta_phone_number_id}
                                    onChange={(event) => updateSignupField('meta_phone_number_id', event.target.value)}
                                    placeholder="1023529240851906"
                                    className="apple-input"
                                />
                            </label>
                            <label className="block">
                                <span className="block text-sm font-semibold text-gray-700 mb-2">WABA ID</span>
                                <input
                                    value={signupForm.waba_id}
                                    onChange={(event) => updateSignupField('waba_id', event.target.value)}
                                    placeholder="952596820596407"
                                    className="apple-input"
                                />
                            </label>
                            <label className="block">
                                <span className="block text-sm font-semibold text-gray-700 mb-2">Display phone number</span>
                                <input
                                    value={signupForm.display_phone_number || ''}
                                    onChange={(event) => updateSignupField('display_phone_number', event.target.value)}
                                    placeholder="+1 555-159-8512"
                                    className="apple-input"
                                />
                            </label>
                            <label className="block">
                                <span className="block text-sm font-semibold text-gray-700 mb-2">Verified name</span>
                                <input
                                    value={signupForm.verified_name || ''}
                                    onChange={(event) => updateSignupField('verified_name', event.target.value)}
                                    placeholder="Test Number"
                                    className="apple-input"
                                />
                            </label>
                            <label className="block">
                                <span className="block text-sm font-semibold text-gray-700 mb-2">Business ID (opzionale)</span>
                                <input
                                    value={signupForm.business_id || ''}
                                    onChange={(event) => updateSignupField('business_id', event.target.value)}
                                    placeholder="Business asset id"
                                    className="apple-input"
                                />
                            </label>
                            <label className="block">
                                <span className="block text-sm font-semibold text-gray-700 mb-2">Signup session ID (opzionale)</span>
                                <input
                                    value={signupForm.signup_session_id || ''}
                                    onChange={(event) => updateSignupField('signup_session_id', event.target.value)}
                                    placeholder="trace o session id"
                                    className="apple-input"
                                />
                            </label>
                        </div>

                        <div className="rounded-3xl border border-orange-100 bg-orange-50 px-5 py-4 flex items-start gap-3">
                            <TriangleAlert className="w-5 h-5 text-orange-600 mt-0.5 shrink-0" />
                            <div className="text-sm text-orange-800 space-y-2">
                                <p>
                                    Il launcher Meta è già collegato. Se Meta non restituisce subito tutti gli identificativi nel browser, puoi ancora completare il collegamento usando questo form come fallback sicuro.
                                </p>
                                <p className="flex items-center gap-2">
                                    <Copy className="w-4 h-4 shrink-0" />
                                    Dati minimi richiesti: `meta_phone_number_id` e `waba_id`.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4">
                            <label className="inline-flex items-start gap-3 text-sm text-gray-600">
                                <input
                                    type="checkbox"
                                    checked={signupForm.replace_existing === true}
                                    onChange={(event) => updateSignupField('replace_existing', event.target.checked)}
                                    className="rounded border-gray-300 mt-1"
                                />
                                Sostituisci il numero esistente del tenant se già collegato
                            </label>

                            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
                                <button
                                    onClick={() => void handleLaunchMetaSignup()}
                                    disabled={isLaunchingMeta}
                                    className="apple-button-secondary flex items-center justify-center gap-2 disabled:opacity-60 w-full sm:w-auto"
                                >
                                    {isLaunchingMeta ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                    Avvia Meta
                                </button>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="apple-button-secondary w-full sm:w-auto"
                                >
                                    Chiudi
                                </button>
                                <button
                                    onClick={() => void handleSubmitSignup()}
                                    disabled={isSubmitting}
                                    className="apple-button flex items-center justify-center gap-2 text-white disabled:opacity-60 w-full sm:w-auto"
                                >
                                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                    Completa collegamento
                                </button>
                            </div>
                        </div>

                        {!embeddedSignupReady ? (
                            <p className="text-xs text-gray-400">
                                Per usare `Avvia Meta` devi configurare `VITE_META_APP_ID` e `VITE_META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID`.
                            </p>
                        ) : null}
                    </div>
                </div>
            ) : null}
        </>
    );
};

export default WhatsAppChannelCard;
