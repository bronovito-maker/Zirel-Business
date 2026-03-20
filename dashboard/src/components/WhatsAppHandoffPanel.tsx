import { useEffect, useState } from 'react';
import { Bot, Loader2, MessageSquare, Phone, RefreshCw, UserRound, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { getWhatsAppConversations, getWhatsAppConversationMessages, updateWhatsAppConversationStatus } from '../lib/supabase-helpers';
import type { WhatsAppConversationSummary, WhatsAppMessageSummary } from '../types';

interface WhatsAppHandoffPanelProps {
    tenantId?: string;
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

const statusMeta: Record<string, { label: string; tone: string; description: string }> = {
    ai_active: {
        label: 'AI attiva',
        tone: 'bg-emerald-50 text-emerald-700 border-emerald-100',
        description: 'Zirèl può rispondere automaticamente ai nuovi messaggi.',
    },
    human_handoff: {
        label: 'Passata a operatore',
        tone: 'bg-amber-50 text-amber-700 border-amber-100',
        description: 'Le risposte AI sono sospese finché non riattivi l’automazione.',
    },
    closed: {
        label: 'Chiusa',
        tone: 'bg-slate-100 text-slate-700 border-slate-200',
        description: 'La conversazione resta storicizzata e l’AI non risponde automaticamente.',
    },
};

const WhatsAppHandoffPanel = ({ tenantId }: WhatsAppHandoffPanelProps) => {
    const [conversations, setConversations] = useState<WhatsAppConversationSummary[]>([]);
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<WhatsAppMessageSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isMessagesLoading, setIsMessagesLoading] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const loadConversations = async () => {
        try {
            setIsLoading(true);
            const rows = await getWhatsAppConversations(tenantId);
            setConversations(rows);
            setSelectedConversationId((current) => {
                if (current && rows.some((conversation) => conversation.id === current)) return current;
                return rows[0]?.id || null;
            });
        } catch (error) {
            console.error('WhatsApp conversation load error:', error);
            toast.error('Non siamo riusciti a caricare le conversazioni WhatsApp.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadConversations();
    }, [tenantId]);

    useEffect(() => {
        const loadMessages = async () => {
            if (!selectedConversationId) {
                setMessages([]);
                return;
            }

            try {
                setIsMessagesLoading(true);
                const rows = await getWhatsAppConversationMessages(selectedConversationId, tenantId);
                setMessages(rows);
            } catch (error) {
                console.error('WhatsApp message load error:', error);
                toast.error('Non siamo riusciti a caricare i messaggi della conversazione.');
            } finally {
                setIsMessagesLoading(false);
            }
        };

        void loadMessages();
    }, [selectedConversationId, tenantId]);

    const handleAction = async (conversationId: string, action: 'human_handoff' | 'resume_ai' | 'close') => {
        const confirmationMessage =
            action === 'human_handoff'
                ? 'Vuoi sospendere le risposte automatiche AI per questa conversazione?'
                : action === 'close'
                    ? 'Vuoi chiudere questa conversazione? Zirèl non risponderà automaticamente finché non la riattivi.'
                    : 'Vuoi riattivare le risposte automatiche AI per questa conversazione?';

        if (!window.confirm(confirmationMessage)) return;

        try {
            setUpdatingId(conversationId);
            const updated = await updateWhatsAppConversationStatus(conversationId, action, tenantId);
            setConversations((current) =>
                current.map((conversation) => (conversation.id === conversationId ? updated : conversation))
            );
            if (selectedConversationId === conversationId) {
                setConversations((current) =>
                    current.map((conversation) => (conversation.id === conversationId ? updated : conversation))
                );
            }
            toast.success(
                action === 'human_handoff'
                    ? 'Conversazione passata a operatore.'
                    : action === 'close'
                        ? 'Conversazione chiusa.'
                        : 'AI riattivata correttamente.'
            );
        } catch (error) {
            console.error('WhatsApp conversation status update error:', error);
            toast.error('Non siamo riusciti ad aggiornare lo stato della conversazione.');
        } finally {
            setUpdatingId(null);
        }
    };

    const selectedConversation = conversations.find((conversation) => conversation.id === selectedConversationId) || null;

    const extractMessageText = (message: WhatsAppMessageSummary) => {
        const provider = message.provider_payload_json || {};
        const providerText =
            (typeof provider.text_content === 'string' && provider.text_content) ||
            (typeof provider.output === 'string' && provider.output) ||
            (typeof provider.recipient_phone === 'string' ? null : null);
        return message.content_text || providerText || 'Messaggio senza testo';
    };

    return (
        <section className="apple-card p-6 md:p-8 space-y-6 border-t-4 border-emerald-500">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <div className="z-icon-chip-lg shrink-0">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-xl md:text-2xl font-black text-gray-800">Controllo conversazioni WhatsApp</h3>
                        <p className="text-gray-500">Gestisci handoff umano e chiusura senza toccare il database.</p>
                    </div>
                </div>
                <button
                    onClick={() => void loadConversations()}
                    className="apple-button-secondary flex items-center justify-center gap-2 w-full md:w-auto"
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    Aggiorna elenco
                </button>
            </div>

            {isLoading ? (
                <div className="rounded-3xl border border-gray-100 bg-gray-50 px-6 py-10 text-center text-gray-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-zirel-orange-dark" />
                    Caricamento conversazioni WhatsApp...
                </div>
            ) : conversations.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center">
                    <p className="text-lg font-bold text-gray-700">Nessuna conversazione WhatsApp trovata</p>
                    <p className="text-gray-500 mt-2">Quando il tenant riceverà i primi messaggi, le conversazioni compariranno qui.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-[380px_minmax(0,1fr)] gap-6">
                    <div className="space-y-4">
                        {conversations.map((conversation) => {
                        const meta = statusMeta[conversation.status] || {
                            label: conversation.status || 'Sconosciuto',
                            tone: 'bg-gray-100 text-gray-700 border-gray-200',
                            description: 'Stato non ancora mappato in dashboard.',
                        };
                        const phone = conversation.customer_phone_normalized || conversation.external_contact_id || 'numero non disponibile';
                        const isBusy = updatingId === conversation.id;
                        const isSelected = selectedConversationId === conversation.id;

                        return (
                            <article
                                key={conversation.id}
                                className={`rounded-[1.75rem] border bg-white p-5 shadow-sm transition-all cursor-pointer ${
                                    isSelected ? 'border-zirel-orange-dark shadow-orange-100' : 'border-gray-100'
                                }`}
                                onClick={() => setSelectedConversationId(conversation.id)}
                            >
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                                    <div className="space-y-3">
                                        <div className="flex flex-wrap items-center gap-3">
                                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${meta.tone}`}>
                                                {meta.label}
                                            </span>
                                            <span className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                                                AI status: {conversation.ai_processing_status || 'n/d'}
                                            </span>
                                        </div>

                                        <div>
                                            <h4 className="text-lg font-bold text-gray-900">
                                                {conversation.customer_name || 'Contatto WhatsApp'}
                                            </h4>
                                            <p className="text-sm text-gray-500 mt-1">{meta.description}</p>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-gray-400" />
                                                <span>{phone}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <UserRound className="w-4 h-4 text-gray-400" />
                                                <span>Ultimo aggiornamento: {formatDateTime(conversation.updated_at || conversation.last_message_at)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row xl:flex-col gap-2 xl:min-w-[190px]" onClick={(event) => event.stopPropagation()}>
                                        {conversation.status === 'ai_active' ? (
                                            <>
                                                <button
                                                    onClick={() => void handleAction(conversation.id, 'human_handoff')}
                                                    disabled={isBusy}
                                                    className="apple-button-secondary flex items-center justify-center gap-2 border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-60"
                                                >
                                                    {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserRound className="w-4 h-4" />}
                                                    Passa a operatore
                                                </button>
                                                <button
                                                    onClick={() => void handleAction(conversation.id, 'close')}
                                                    disabled={isBusy}
                                                    className="apple-button-secondary flex items-center justify-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    Chiudi conversazione
                                                </button>
                                            </>
                                        ) : conversation.status === 'human_handoff' ? (
                                            <>
                                                <button
                                                    onClick={() => void handleAction(conversation.id, 'resume_ai')}
                                                    disabled={isBusy}
                                                    className="apple-button flex items-center justify-center gap-2 text-white"
                                                >
                                                    {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                                                    Riattiva AI
                                                </button>
                                                <button
                                                    onClick={() => void handleAction(conversation.id, 'close')}
                                                    disabled={isBusy}
                                                    className="apple-button-secondary flex items-center justify-center gap-2 border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    Chiudi conversazione
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                onClick={() => void handleAction(conversation.id, 'resume_ai')}
                                                disabled={isBusy}
                                                className="apple-button flex items-center justify-center gap-2 text-white"
                                            >
                                                {isBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bot className="w-4 h-4" />}
                                                Riattiva AI
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </article>
                        );
                        })}
                    </div>

                    <div className="rounded-[1.75rem] border border-gray-100 bg-white shadow-sm min-h-[520px] flex flex-col overflow-hidden">
                        {selectedConversation ? (
                            <>
                                <div className="border-b border-gray-100 px-6 py-5 bg-gray-50/70">
                                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                        <div>
                                            <h4 className="text-xl font-black text-gray-900">
                                                {selectedConversation.customer_name || 'Conversazione WhatsApp'}
                                            </h4>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {selectedConversation.customer_phone_normalized || selectedConversation.external_contact_id || 'numero non disponibile'}
                                            </p>
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] ${(statusMeta[selectedConversation.status] || statusMeta.ai_active).tone}`}>
                                                {(statusMeta[selectedConversation.status] || { label: selectedConversation.status }).label}
                                            </span>
                                            <span className="text-xs font-bold uppercase tracking-[0.14em] text-gray-400">
                                                AI status: {selectedConversation.ai_processing_status || 'n/d'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 px-4 py-4 md:px-6 overflow-y-auto bg-gradient-to-b from-white to-gray-50/40">
                                    {isMessagesLoading ? (
                                        <div className="h-full flex items-center justify-center text-gray-500">
                                            <Loader2 className="w-6 h-6 animate-spin text-zirel-orange-dark mr-3" />
                                            Caricamento messaggi...
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="h-full flex items-center justify-center text-center text-gray-500 px-8">
                                            Nessun messaggio disponibile per questa conversazione.
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {messages.map((message) => {
                                                const isOutbound = message.direction === 'outbound';
                                                const bubbleTone = isOutbound
                                                    ? 'bg-zirel-gradient text-white rounded-br-md'
                                                    : 'bg-white text-gray-900 border border-gray-100 rounded-bl-md';
                                                const metaTone = isOutbound ? 'text-white/80' : 'text-gray-400';
                                                return (
                                                    <div key={message.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                                                        <div className={`max-w-[85%] md:max-w-[72%] px-4 py-3 rounded-3xl shadow-sm ${bubbleTone}`}>
                                                            <div className={`text-[11px] font-bold uppercase tracking-[0.14em] mb-2 ${metaTone}`}>
                                                                {isOutbound ? `${message.sender_role || 'ai'} · ${message.delivery_status || 'inviato'}` : `${message.sender_role || 'customer'} · ${message.processing_status || 'ricevuto'}`}
                                                            </div>
                                                            <p className="whitespace-pre-wrap leading-relaxed text-sm md:text-[15px]">
                                                                {extractMessageText(message)}
                                                            </p>
                                                            <div className={`mt-3 text-[11px] ${metaTone}`}>
                                                                {formatDateTime(message.created_at)}
                                                            </div>
                                                            {message.error_message ? (
                                                                <div className={`mt-2 text-[11px] ${isOutbound ? 'text-white/80' : 'text-red-500'}`}>
                                                                    {message.error_message}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex items-center justify-center text-center text-gray-500 px-8">
                                Seleziona una conversazione per vedere il thread dei messaggi.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
};

export default WhatsAppHandoffPanel;
