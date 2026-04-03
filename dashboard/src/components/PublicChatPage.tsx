import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, MapPin, MessageSquare, Send, Sparkles } from 'lucide-react';

type WidgetConfig = {
    tenant_id: string;
    service_status?: string;
    service_public_message?: string;
    disabled?: boolean;
    widget_title: string;
    widget_subtitle: string;
    widget_color: string;
    widget_icon: string;
    welcome_message: string;
    quick_replies: Array<{ label: string; prompt: string }>;
};

type ChatMessage = {
    id: string;
    role: 'assistant' | 'user' | 'error';
    text: string;
};

const DEFAULT_WEBHOOK_URL = 'https://primary-production-b2af.up.railway.app/webhook/d9e10e54-2d61-4643-98ed-7bbe6221699e/chat';
const DEFAULT_CONFIG: WidgetConfig = {
    tenant_id: '',
    widget_title: 'Zirèl Assistant',
    widget_subtitle: 'Reception sempre disponibile',
    widget_color: '#FF8C42',
    widget_icon: '💬',
    welcome_message: 'Ciao! Ti aiuto con reception, eventi, taxi, farmacia e richieste utili durante il soggiorno.',
    quick_replies: [
        { label: '🛎️ Ho bisogno della reception', prompt: 'Ho bisogno della reception' },
        { label: '📍 Cosa c’è in zona?', prompt: 'Cosa posso fare in zona?' },
        { label: '🚕 Mi serve un taxi', prompt: 'Mi serve un taxi' },
    ],
};

function buildContextLabel(room: string, area: string) {
    if (room) return `Camera ${room}`;
    if (area) return area.charAt(0).toUpperCase() + area.slice(1);
    return 'Hotel';
}

function getRuntimeSessionId(tenantId: string, room: string, area: string) {
    const key = ['zirel-public-chat', tenantId, room || 'no-room', area || 'no-area'].join(':');
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;

    const next = `${tenantId}__${Math.random().toString(36).slice(2, 10)}`;
    window.sessionStorage.setItem(key, next);
    return next;
}

function readReply(responseData: unknown) {
    if (Array.isArray(responseData) && responseData[0]) {
        return readReply(responseData[0]);
    }

    if (typeof responseData === 'string' && responseData.trim()) {
        return responseData.trim();
    }

    if (!responseData || typeof responseData !== 'object') {
        return null;
    }

    const payload = responseData as Record<string, unknown>;
    const candidates = [
        payload.output,
        payload.final_reply,
        payload.reply,
        payload.message,
        (payload.data as Record<string, unknown> | undefined)?.final_reply,
        (payload.data as Record<string, unknown> | undefined)?.reply,
        (payload.result as Record<string, unknown> | undefined)?.final_reply,
        (payload.result as Record<string, unknown> | undefined)?.reply,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim()) {
            return candidate.trim();
        }
    }

    return null;
}

function formatRichText(text: string) {
    const escaped = String(text || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

    return escaped
        .replace(/((https?:\/\/|www\.)[^\s<]+)/gi, (match) => {
            const href = match.startsWith('www.') ? `https://${match}` : match;
            return `<a href="${href}" target="_blank" rel="noopener noreferrer" class="underline break-all">${match}</a>`;
        })
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br>');
}

const PublicChatPage = () => {
    const params = useMemo(() => new URLSearchParams(window.location.search), []);
    const tenantId = (params.get('tenant') || '').trim();
    const room = (params.get('room') || '').trim();
    const area = (params.get('area') || '').trim();
    const source = (params.get('source') || 'qr').trim();
    const webhookUrl = (params.get('webhook') || DEFAULT_WEBHOOK_URL).trim();

    const [config, setConfig] = useState<WidgetConfig>(DEFAULT_CONFIG);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [draft, setDraft] = useState('');
    const [isBootLoading, setIsBootLoading] = useState(true);
    const [isSending, setIsSending] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [isServiceDisabled, setIsServiceDisabled] = useState(false);
    const listRef = useRef<HTMLDivElement | null>(null);

    const contextLabel = buildContextLabel(room, area);
    const sessionId = useMemo(() => (tenantId ? getRuntimeSessionId(tenantId, room, area) : ''), [tenantId, room, area]);

    useEffect(() => {
        if (!tenantId) {
            setLoadError('Tenant mancante nell’URL della chat pubblica.');
            setIsBootLoading(false);
            return;
        }

        let cancelled = false;

        async function bootstrap() {
            try {
                const response = await fetch(`/api/public/widget-config?tenant_id=${encodeURIComponent(tenantId)}`);
                if (!response.ok) throw new Error(`CONFIG_HTTP_${response.status}`);

                const data = await response.json();
                const nextConfig = { ...DEFAULT_CONFIG, ...(data?.config || {}), tenant_id: tenantId } as WidgetConfig;
                const disabled = Boolean(data?.disabled || nextConfig.disabled);
                const publicMessage =
                    String(data?.service_public_message || nextConfig.service_public_message || '').trim() ||
                    'Il servizio chat di questa struttura è temporaneamente non disponibile. Per assistenza contatta direttamente la struttura.';

                if (cancelled) return;
                setConfig(nextConfig);
                setIsServiceDisabled(disabled);
                setMessages([
                    {
                        id: 'welcome',
                        role: 'assistant',
                        text: disabled
                            ? publicMessage
                            : nextConfig.welcome_message || DEFAULT_CONFIG.welcome_message,
                    },
                ]);
            } catch (error) {
                console.error('[Zirel Public Chat] Config load failed:', error);
                if (cancelled) return;
                setConfig({ ...DEFAULT_CONFIG, tenant_id: tenantId });
                setIsServiceDisabled(false);
                setMessages([{ id: 'welcome', role: 'assistant', text: DEFAULT_CONFIG.welcome_message }]);
                setLoadError('Sto usando la configurazione base perché non sono riuscito a caricare la personalizzazione del tenant.');
            } finally {
                if (!cancelled) setIsBootLoading(false);
            }
        }

        bootstrap();
        return () => {
            cancelled = true;
        };
    }, [tenantId]);

    useEffect(() => {
        if (!listRef.current) return;
        listRef.current.scrollTop = listRef.current.scrollHeight;
    }, [messages, isSending]);

    const submitMessage = async (text: string) => {
        const cleaned = String(text || '').trim();
        if (!cleaned || !tenantId || isSending) return;
        if (isServiceDisabled) {
            setMessages((current) => [
                ...current,
                {
                    id: `${Date.now()}_disabled`,
                    role: 'error',
                    text:
                        config.service_public_message ||
                        'Il servizio chat di questa struttura è temporaneamente non disponibile. Per assistenza contatta direttamente la struttura.',
                },
            ]);
            return;
        }

        const traceId = window.crypto?.randomUUID?.() || `trace_${Date.now()}`;
        setIsSending(true);
        setDraft('');
        setMessages((current) => [...current, { id: `${Date.now()}_user`, role: 'user', text: cleaned }]);

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Zirel-Source': 'public-chat-page',
                    'X-Zirel-Trace-Id': traceId,
                    'X-Zirel-Timestamp': new Date().toISOString(),
                },
                body: JSON.stringify({
                    chatInput: cleaned,
                    sessionId,
                    room,
                    area,
                    source,
                    entryUrl: window.location.href,
                    metadata: {
                        tenant_id: tenantId,
                        client: 'public-chat-page',
                        protocol_version: '1.2',
                        trace_id: traceId,
                        source,
                        room,
                        area,
                        entry_url: window.location.href,
                    },
                }),
            });

            if (!response.ok) {
                throw new Error(`CHAT_HTTP_${response.status}`);
            }

            let payload: unknown;
            const clone = response.clone();
            try {
                payload = await response.json();
            } catch {
                payload = await clone.text();
            }

            const reply = readReply(payload) || 'Ho ricevuto la richiesta, ma non sono riuscito a formattare bene la risposta.';

            setMessages((current) => [...current, { id: `${Date.now()}_assistant`, role: 'assistant', text: reply }]);
        } catch (error) {
            console.error('[Zirel Public Chat] Send failed:', error);
            setMessages((current) => [
                ...current,
                {
                    id: `${Date.now()}_error`,
                    role: 'error',
                    text: 'Non sono riuscito a contattare il server. Riprova tra poco.',
                },
            ]);
        } finally {
            setIsSending(false);
        }
    };

    if (isBootLoading) {
        return (
            <div className="min-h-screen bg-[#FBFBFD] grid place-items-center px-6">
                <div className="text-center text-slate-600">
                    <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-[#FF8C42]" />
                    <p>Sto preparando la chat del concierge…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#FBFBFD] px-4 py-6 sm:px-6">
            <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-[#F2E5C8] bg-white shadow-[0_30px_90px_rgba(15,23,42,0.10)]">
                <div
                    className="px-5 py-5 text-white sm:px-6"
                    style={{ background: `linear-gradient(135deg, ${config.widget_color || '#FF8C42'} 0%, ${config.widget_color || '#FF8C42'}CC 100%)` }}
                >
                    <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20 text-3xl">
                            {config.widget_icon || '💬'}
                        </div>
                        <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold uppercase tracking-[0.22em] text-white/75">Zirèl Public Chat</p>
                            <h1 className="mt-1 text-2xl font-black leading-tight">{config.widget_title || 'Zirèl Assistant'}</h1>
                            <p className="mt-1 text-white/85">{config.widget_subtitle || 'Reception sempre disponibile'}</p>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1 text-sm font-semibold">
                            <MapPin className="h-4 w-4" />
                            {contextLabel}
                        </span>
                        <span className="inline-flex items-center gap-2 rounded-full bg-white/18 px-3 py-1 text-sm font-semibold">
                            <Sparkles className="h-4 w-4" />
                            {source}
                        </span>
                    </div>
                </div>

                {loadError ? (
                    <div className="border-b border-amber-100 bg-amber-50 px-5 py-3 text-sm text-amber-900 sm:px-6">
                        {loadError}
                    </div>
                ) : null}

                <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto bg-[#FFFAF1] px-4 py-5 sm:px-6">
                    {messages.map((message) => (
                        <div
                            key={message.id}
                            className={[
                                'max-w-[92%] rounded-[1.5rem] px-4 py-3 text-sm leading-relaxed shadow-sm',
                                message.role === 'user'
                                    ? 'ml-auto rounded-tr-sm border border-[#FFD7BE] bg-[#FFF0E4] text-[#003049]'
                                    : message.role === 'error'
                                        ? 'rounded-tl-sm border border-red-200 bg-white text-red-500'
                                        : 'rounded-tl-sm border border-[#F2E5C8] bg-white text-[#003049]',
                            ].join(' ')}
                        >
                            <div dangerouslySetInnerHTML={{ __html: formatRichText(message.text) }} />
                        </div>
                    ))}

                    {isSending ? (
                        <div className="max-w-[60%] rounded-[1.5rem] rounded-tl-sm border border-[#F2E5C8] bg-white px-4 py-3 text-sm italic text-slate-400 shadow-sm">
                            Sto recuperando la risposta…
                        </div>
                    ) : null}
                </div>

                <div className="border-t border-[#F2E5C8] bg-white px-4 py-4 sm:px-6">
                    <div className="mb-3 flex flex-wrap gap-2">
                        {(config.quick_replies || []).slice(0, 4).map((item) => (
                            <button
                                key={item.label}
                                type="button"
                                onClick={() => submitMessage(item.prompt)}
                                disabled={isSending || isServiceDisabled}
                                className="rounded-full border border-sky-200 bg-[#F8FDFF] px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {item.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <input
                            type="text"
                            value={draft}
                            onChange={(event) => setDraft(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') {
                                    event.preventDefault();
                                    submitMessage(draft);
                                }
                            }}
                            placeholder="Scrivi qui la tua richiesta…"
                            disabled={isSending || isServiceDisabled}
                            className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none ring-0 transition focus:border-[#FF8C42] focus:bg-white"
                        />
                        <button
                            type="button"
                            onClick={() => submitMessage(draft)}
                            disabled={isSending || isServiceDisabled || !draft.trim()}
                            className="inline-flex h-12 w-12 items-center justify-center rounded-full text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-50"
                            style={{ backgroundColor: config.widget_color || '#FF8C42' }}
                            aria-label="Invia messaggio"
                        >
                            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                        </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span className="inline-flex items-center gap-1">
                            <MessageSquare className="h-3.5 w-3.5" />
                            Chat diretta con il concierge digitale
                        </span>
                        <span>{tenantId}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicChatPage;
