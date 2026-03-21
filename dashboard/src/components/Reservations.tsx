import { useState, useEffect, useCallback, useMemo } from 'react';
import type { OperationalRequest, OperationalRequestDetail } from '../types';
import {
    applyOperationalRequestAction,
    getOperationalRequestDetail,
    getOperationalRequests,
} from '../lib/supabase-helpers';
import toast from 'react-hot-toast';
import {
    Calendar,
    Clock,
    Users,
    Phone,
    Loader2,
    RefreshCw,
    BriefcaseBusiness,
    Mail,
    Search,
    ChevronRight,
    ChevronDown,
    ChevronUp,
    MessageSquareQuote,
} from 'lucide-react';

type RequestFilter = 'all' | 'pending' | 'confirmed' | 'rejected';
type RequestStatus = 'pending' | 'confirmed' | 'rejected' | 'unknown';
type ActionMode = 'confirm' | 'reject' | 'propose_change' | 'confirm_change' | null;

const formatDateTime = (value?: string | null) => {
    if (!value) return 'N/D';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return date.toLocaleString('it-IT', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

const Reservations = () => {
    const [requests, setRequests] = useState<OperationalRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [activeFilter, setActiveFilter] = useState<RequestFilter>('pending');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRequest, setSelectedRequest] = useState<OperationalRequest | null>(null);
    const [detail, setDetail] = useState<OperationalRequestDetail | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [actionMode, setActionMode] = useState<ActionMode>(null);
    const [actionReason, setActionReason] = useState('');
    const [proposedDate, setProposedDate] = useState('');
    const [proposedTime, setProposedTime] = useState('');
    const [actionNote, setActionNote] = useState('');
    const [isSubmittingAction, setIsSubmittingAction] = useState(false);

    const normalizeFilterStatus = (status: string): RequestStatus => {
        const normalized = String(status || '').trim().toLowerCase();
        if (['pending', 'manual_review', 'change_proposed'].includes(normalized)) return 'pending';
        if (['confermata', 'confirmed'].includes(normalized)) return 'confirmed';
        if (['rifiutata', 'annullata', 'rejected'].includes(normalized)) return 'rejected';
        return 'unknown';
    };

    const getStatusStyle = (status: string) => {
        switch (String(status || '').trim().toLowerCase()) {
            case 'confermata':
            case 'confirmed':
                return 'bg-green-50 text-green-700 border-green-100';
            case 'rifiutata':
            case 'annullata':
            case 'rejected':
                return 'bg-red-50 text-red-700 border-red-100';
            case 'change_proposed':
                return 'bg-blue-50 text-blue-700 border-blue-100';
            case 'pending':
            case 'manual_review':
                return 'bg-amber-50 text-amber-700 border-amber-100';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    const getStatusLabel = (status: string) => {
        const normalized = String(status || '').trim().toLowerCase();
        if (normalized === 'confirmed') return 'CONFERMATA';
        if (normalized === 'rejected') return 'RIFIUTATA';
        if (normalized === 'manual_review') return 'VERIFICA';
        if (normalized === 'change_proposed') return 'PROPOSTA INVIATA';
        return String(status || 'SCONOSCIUTO').toUpperCase();
    };

    const fetchRequests = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        else setIsRefreshing(true);

        try {
            const data = await getOperationalRequests();
            setRequests(data);
        } catch (error) {
            console.error('Error fetching operational requests:', error);
            toast.error('Errore nel caricamento delle richieste');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    const loadRequestDetail = useCallback(async (request: OperationalRequest) => {
        setIsDetailLoading(true);
        try {
            const detailData = await getOperationalRequestDetail(request.id, request.kind);
            setDetail(detailData);
            setProposedDate(detailData.proposed_date || detailData.requested_date || '');
            setProposedTime(detailData.proposed_time || detailData.requested_time || '');
        } catch (error) {
            console.error('Error loading request detail:', error);
            toast.error('Non siamo riusciti a caricare il dettaglio della richiesta.');
        } finally {
            setIsDetailLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRequests();
    }, [fetchRequests]);

    useEffect(() => {
        if (!selectedRequest) {
            setDetail(null);
            setActionMode(null);
            setActionReason('');
            setActionNote('');
            setProposedDate('');
            setProposedTime('');
            return;
        }

        void loadRequestDetail(selectedRequest);
    }, [selectedRequest, loadRequestDetail]);

    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    const filteredRequests = useMemo(() => {
        const filtered = requests.filter((request) => {
            if (activeFilter !== 'all' && normalizeFilterStatus(request.status) !== activeFilter) {
                return false;
            }

            if (!normalizedSearchQuery) return true;

            return [
                request.title,
                request.primary_contact,
                request.email,
                request.reason_label,
                request.date_label,
            ].some((value) => String(value || '').toLowerCase().includes(normalizedSearchQuery));
        });

        return filtered.sort((left, right) => {
            const leftStatus = normalizeFilterStatus(left.status);
            const rightStatus = normalizeFilterStatus(right.status);
            const statusWeight: Record<RequestStatus, number> = { pending: 0, confirmed: 1, rejected: 2, unknown: 3 };

            const weightDiff = statusWeight[leftStatus] - statusWeight[rightStatus];
            if (weightDiff !== 0) return weightDiff;

            return new Date(right.created_at).getTime() - new Date(left.created_at).getTime();
        });
    }, [requests, activeFilter, normalizedSearchQuery]);

    const filterOptions: Array<{ id: RequestFilter; label: string; count: number }> = [
        { id: 'pending', label: 'Da gestire', count: requests.filter((request) => normalizeFilterStatus(request.status) === 'pending').length },
        { id: 'confirmed', label: 'Confermate', count: requests.filter((request) => normalizeFilterStatus(request.status) === 'confirmed').length },
        { id: 'rejected', label: 'Rifiutate', count: requests.filter((request) => normalizeFilterStatus(request.status) === 'rejected').length },
        { id: 'all', label: 'Tutte', count: requests.length },
    ];

    const handleCardOpen = (request: OperationalRequest) => {
        if (selectedRequest?.id === request.id && selectedRequest.kind === request.kind) {
            setSelectedRequest(null);
            return;
        }
        setSelectedRequest(request);
    };

    const resetActionForm = () => {
        setActionMode(null);
        setActionReason('');
        setActionNote('');
        setProposedDate(detail?.proposed_date || detail?.requested_date || '');
        setProposedTime(detail?.proposed_time || detail?.requested_time || '');
    };

    const submitAction = async (
        mode: Exclude<ActionMode, null>,
        options?: { reason?: string; proposedDate?: string; proposedTime?: string; note?: string }
    ) => {
        if (!detail || !selectedRequest) return;

        const reason = options?.reason ?? actionReason;
        const nextDate = options?.proposedDate ?? proposedDate;
        const nextTime = options?.proposedTime ?? proposedTime;
        const note = options?.note ?? actionNote;

        if (mode === 'reject' && !reason.trim()) {
            toast.error('Per rifiutare la richiesta serve un motivo.');
            return;
        }

        if (mode === 'propose_change' && (!nextDate.trim() || !nextTime.trim())) {
            toast.error('Per proporre una modifica servono nuova data e nuovo orario.');
            return;
        }

        setIsSubmittingAction(true);
        const loadingToast = toast.loading('Aggiornamento richiesta in corso...');

        try {
            await applyOperationalRequestAction(detail.id, detail.kind, {
                action: mode,
                reason: reason.trim() || undefined,
                proposedDate: nextDate.trim() || undefined,
                proposedTime: nextTime.trim() || undefined,
                note: note.trim() || undefined,
                actor: 'dashboard',
            });

            await fetchRequests(true);
            await loadRequestDetail(selectedRequest);
            resetActionForm();
            toast.success('Richiesta aggiornata correttamente.', { id: loadingToast });
        } catch (error) {
            console.error('Error applying request action:', error);
            toast.error('Non siamo riusciti a salvare l’azione richiesta.', { id: loadingToast });
        } finally {
            setIsSubmittingAction(false);
        }
    };

    const handleImmediateAction = async (mode: 'confirm' | 'confirm_change') => {
        const label = mode === 'confirm' ? 'confermare' : 'confermare la modifica';
        if (!window.confirm(`Vuoi ${label} questa richiesta?`)) return;
        await submitAction(mode, { note: '' });
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-zirel-orange-dark animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Caricamento richieste...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in px-1">
            <div className="flex flex-row items-center justify-between mb-8 gap-4">
                <h2 className="z-panel-title">Le Tue Richieste</h2>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => fetchRequests(true)}
                        disabled={isRefreshing}
                        className="flex items-center justify-center gap-2 p-2.5 text-gray-500 bg-white border border-gray-100 rounded-xl hover:bg-orange-50 hover:text-zirel-orange-dark transition-all shadow-sm"
                        title="Aggiorna richieste"
                    >
                        <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-zirel-orange-dark' : ''}`} />
                    </button>
                </div>
            </div>

            <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Cerca per nome, telefono o email"
                    className="apple-input pl-11"
                />
            </div>

            <div className="flex flex-wrap gap-3">
                {filterOptions.map((filter) => (
                    <button
                        key={filter.id}
                        onClick={() => setActiveFilter(filter.id)}
                        className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-bold transition-all ${
                            activeFilter === filter.id
                                ? 'border-zirel-orange-dark bg-orange-50 text-zirel-orange-dark shadow-sm'
                                : 'border-gray-100 bg-white text-gray-600 hover:border-orange-100 hover:bg-orange-50'
                        }`}
                    >
                        <span>{filter.label}</span>
                        <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs text-gray-500">{filter.count}</span>
                    </button>
                ))}
            </div>

            {filteredRequests.length === 0 ? (
                <div className="text-center py-20 apple-card bg-white border border-gray-100 shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calendar className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Nessuna richiesta in questa vista</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">Prova a cambiare filtro o ricerca, oppure attendi nuove richieste operative dal concierge.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {filteredRequests.map((request) => {
                        const normalizedStatus = normalizeFilterStatus(request.status);
                        const isPending = normalizedStatus === 'pending';
                        const isNew = Date.now() - new Date(request.created_at).getTime() <= 1000 * 60 * 60 * 24;
                        const isExpanded = selectedRequest?.id === request.id && selectedRequest.kind === request.kind;
                        const activeDetail = isExpanded ? detail : null;

                        return (
                            <div
                                key={`${request.kind}-${request.id}`}
                                className={`apple-card bg-white p-5 md:p-6 border shadow-sm hover:shadow-md transition-all group cursor-pointer ${
                                    isPending
                                        ? 'border-amber-200 ring-1 ring-amber-100'
                                        : 'border-gray-100'
                                }`}
                            >
                                <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleCardOpen(request)}
                                    onKeyDown={(event) => {
                                        if (event.key === 'Enter' || event.key === ' ') {
                                            event.preventDefault();
                                            handleCardOpen(request);
                                        }
                                    }}
                                    className="flex flex-col md:flex-row md:items-center justify-between gap-6"
                                >
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center justify-between md:justify-start gap-4">
                                            <h3 className="text-xl font-bold text-gray-900 group-hover:text-zirel-orange-dark transition-colors">
                                                {request.title || 'Richiesta senza titolo'}
                                            </h3>
                                            <div className="flex items-center gap-2">
                                                {isNew ? (
                                                    <span className="px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border bg-blue-50 text-blue-700 border-blue-100">
                                                        Nuova
                                                    </span>
                                                ) : null}
                                                <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${getStatusStyle(request.status)}`}>
                                                    {getStatusLabel(request.status)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3 text-sm text-gray-600">
                                            <div className="flex items-center gap-2.5 bg-gray-50/50 p-2 rounded-xl border border-gray-50">
                                                <Calendar className="w-4 h-4 text-zirel-orange-dark mt-0.5" />
                                                <span className="font-medium">{request.date_label}</span>
                                            </div>
                                            <div className="flex items-center gap-2.5 bg-gray-50/50 p-2 rounded-xl border border-gray-50">
                                                <Clock className="w-4 h-4 text-zirel-orange-dark mt-0.5" />
                                                <span className="font-medium">{request.time_label}</span>
                                            </div>
                                            {request.party_size_label ? (
                                                <div className="flex items-center gap-2.5 bg-gray-50/50 p-2 rounded-xl border border-gray-50">
                                                    <Users className="w-4 h-4 text-zirel-orange-dark mt-0.5" />
                                                    <span className="font-medium">{request.party_size_label}</span>
                                                </div>
                                            ) : request.reason_label ? (
                                                <div className="flex items-center gap-2.5 bg-gray-50/50 p-2 rounded-xl border border-gray-50 col-span-2 lg:col-span-2">
                                                    <BriefcaseBusiness className="w-4 h-4 text-zirel-orange-dark mt-0.5" />
                                                    <span className="font-medium line-clamp-2">{request.reason_label}</span>
                                                </div>
                                            ) : null}
                                            <div className="flex items-center gap-2.5 bg-gray-50/50 p-2 rounded-xl border border-gray-50">
                                                <Phone className="w-4 h-4 text-zirel-orange-dark mt-0.5" />
                                                <span className="text-zirel-blue font-bold">{request.primary_contact || 'N/D'}</span>
                                            </div>
                                            {request.email ? (
                                                <div className="flex items-center gap-2.5 bg-gray-50/50 p-2 rounded-xl border border-gray-50 col-span-2 lg:col-span-2">
                                                    <Mail className="w-4 h-4 text-zirel-orange-dark mt-0.5" />
                                                    <span className="text-zirel-blue font-bold break-all">{request.email}</span>
                                                </div>
                                            ) : null}
                                        </div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-2 flex items-center gap-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
                                            Ricevuta: {formatDateTime(request.created_at)}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 text-sm font-bold text-gray-400">
                                        <span>{isExpanded ? 'Chiudi' : 'Dettaglio'}</span>
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </div>
                                </div>

                                {isExpanded ? (
                                    <div className="mt-5 border-t border-gray-100 pt-5">
                                        {isDetailLoading || !activeDetail ? (
                                            <div className="flex items-center gap-3 py-4 text-sm text-gray-500">
                                                <Loader2 className="h-4 w-4 animate-spin text-zirel-orange-dark" />
                                                <span>Caricamento dettaglio...</span>
                                            </div>
                                        ) : (
                                            <div className="space-y-5">
                                                <div className="grid gap-3 md:grid-cols-2 text-sm text-gray-700">
                                                    {activeDetail.party_size ? (
                                                        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-3">
                                                            <span className="font-semibold text-gray-900">Persone:</span> {activeDetail.party_size}
                                                        </div>
                                                    ) : null}
                                                    {activeDetail.proposed_date || activeDetail.proposed_time ? (
                                                        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 md:col-span-2">
                                                            <span className="font-semibold text-gray-900">Proposta attuale:</span> {activeDetail.proposed_date || 'N/D'} {activeDetail.proposed_time ? `alle ${activeDetail.proposed_time}` : ''}
                                                        </div>
                                                    ) : null}
                                                    {activeDetail.rejection_reason ? (
                                                        <div className="rounded-2xl border border-red-100 bg-red-50/60 px-4 py-3 md:col-span-2">
                                                            <span className="font-semibold text-gray-900">Motivo rifiuto:</span> {activeDetail.rejection_reason}
                                                        </div>
                                                    ) : null}
                                                    {activeDetail.note && activeDetail.note !== activeDetail.reason_label ? (
                                                        <div className="rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-3 md:col-span-2">
                                                            <span className="font-semibold text-gray-900">Note complete:</span> {activeDetail.note}
                                                        </div>
                                                    ) : null}
                                                </div>

                                                <div className="rounded-3xl border border-gray-200 bg-gray-50/60 p-4">
                                                    <div className="flex items-center gap-2">
                                                        <MessageSquareQuote className="h-4 w-4 text-zirel-orange-dark" />
                                                        <p className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">Azioni</p>
                                                    </div>

                                                    <div className="mt-4 flex flex-wrap gap-3">
                                                        <button
                                                            onClick={() => void handleImmediateAction('confirm')}
                                                            disabled={isSubmittingAction}
                                                            className="rounded-2xl bg-green-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-green-700 disabled:opacity-60"
                                                        >
                                                            Conferma
                                                        </button>
                                                        <button
                                                            onClick={() => setActionMode('reject')}
                                                            className="rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-50"
                                                        >
                                                            Rifiuta
                                                        </button>
                                                        <button
                                                            onClick={() => setActionMode('propose_change')}
                                                            className="rounded-2xl border border-blue-100 bg-white px-4 py-3 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
                                                        >
                                                            Proponi modifica
                                                        </button>
                                                        {String(activeDetail.status || '').trim().toLowerCase() === 'change_proposed' ? (
                                                            <button
                                                                onClick={() => void handleImmediateAction('confirm_change')}
                                                                disabled={isSubmittingAction}
                                                                className="rounded-2xl border border-emerald-100 bg-white px-4 py-3 text-sm font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-60"
                                                            >
                                                                Conferma modifica
                                                            </button>
                                                        ) : null}
                                                    </div>

                                                    {actionMode === 'reject' || actionMode === 'propose_change' ? (
                                                        <div className="mt-4 space-y-4 rounded-2xl border border-gray-200 bg-white p-4">
                                                            {actionMode === 'reject' ? (
                                                                <div>
                                                                    <label className="mb-2 block text-sm font-medium text-gray-500">Motivo rifiuto</label>
                                                                    <textarea
                                                                        value={actionReason}
                                                                        onChange={(event) => setActionReason(event.target.value)}
                                                                        rows={3}
                                                                        className="apple-input resize-none"
                                                                        placeholder="Spiega perché la richiesta non può essere confermata"
                                                                    />
                                                                </div>
                                                            ) : (
                                                                <>
                                                                    <div className="grid gap-4 md:grid-cols-2">
                                                                        <div>
                                                                            <label className="mb-2 block text-sm font-medium text-gray-500">Nuova data</label>
                                                                            <input
                                                                                type="date"
                                                                                value={proposedDate}
                                                                                onChange={(event) => setProposedDate(event.target.value)}
                                                                                className="apple-input"
                                                                            />
                                                                        </div>
                                                                        <div>
                                                                            <label className="mb-2 block text-sm font-medium text-gray-500">Nuovo orario</label>
                                                                            <input
                                                                                type="time"
                                                                                value={proposedTime}
                                                                                onChange={(event) => setProposedTime(event.target.value)}
                                                                                className="apple-input"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                    <div>
                                                                        <label className="mb-2 block text-sm font-medium text-gray-500">Messaggio per il cliente</label>
                                                                        <textarea
                                                                            value={actionNote}
                                                                            onChange={(event) => setActionNote(event.target.value)}
                                                                            rows={3}
                                                                            className="apple-input resize-none"
                                                                            placeholder="Spiega la proposta alternativa in modo chiaro"
                                                                        />
                                                                    </div>
                                                                </>
                                                            )}

                                                            <div className="flex flex-wrap gap-3">
                                                                <button
                                                                    onClick={() => void submitAction(actionMode)}
                                                                    disabled={isSubmittingAction}
                                                                    className="rounded-2xl bg-zirel-orange-dark px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-500 disabled:opacity-60"
                                                                >
                                                                    {isSubmittingAction ? 'Salvataggio...' : actionMode === 'reject' ? 'Invia rifiuto' : 'Invia proposta'}
                                                                </button>
                                                                <button
                                                                    onClick={resetActionForm}
                                                                    disabled={isSubmittingAction}
                                                                    className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-bold text-gray-600 transition hover:bg-gray-50"
                                                                >
                                                                    Annulla
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default Reservations;
