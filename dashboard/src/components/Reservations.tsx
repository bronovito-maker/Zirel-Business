import { useState, useEffect, useCallback } from 'react';
import type { Reservation } from '../types';
import { getReservations, updateReservationStatus } from '../lib/supabase-helpers';
import toast from 'react-hot-toast';
import { Calendar, Clock, Users, Phone, Loader2, Check, X, RefreshCw } from 'lucide-react';

const Reservations = () => {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchReservations = useCallback(async (silent = false) => {
        if (!silent) setIsLoading(true);
        else setIsRefreshing(true);

        try {
            const data = await getReservations();
            setReservations(data);
        } catch (error) {
            console.error('Error fetching reservations:', error);
            toast.error('Errore nel caricamento delle prenotazioni');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchReservations();
    }, [fetchReservations]);

    const updateStatus = async (id: number, newStatus: string) => {
        const loadingToast = toast.loading('Aggiornamento in corso...');
        try {
            await updateReservationStatus(id, newStatus);

            setReservations(prev =>
                prev.map(res => (res.id === id ? { ...res, stato: newStatus } : res))
            );
            toast.success('Stato aggiornato', { id: loadingToast });
        } catch (error) {
            console.error('Error updating status:', error);
            const message = error instanceof Error ? error.message : '';
            toast.error(
                message === 'INVALID_PARAMS'
                    ? 'Stato non valido. Ricarica la pagina e riprova.'
                    : 'Errore durante l\'aggiornamento',
                { id: loadingToast }
            );
        }
    };

    const getStatusStyle = (stato: string) => {
        switch (stato?.toUpperCase()) {
            case 'CONFERMATA':
                return 'bg-green-50 text-green-700 border-green-100';
            case 'RIFIUTATA':
            case 'ANNULLATA':
                return 'bg-red-50 text-red-700 border-red-100';
            case 'PENDING':
                return 'bg-amber-50 text-amber-700 border-amber-100';
            default:
                return 'bg-gray-50 text-gray-700 border-gray-100';
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-zirel-orange-dark animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Caricamento prenotazioni...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in px-1">
            <div className="flex flex-row items-center justify-between mb-8 gap-4">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight text-gray-900">Le Tue Prenotazioni</h2>
                <button
                    onClick={() => fetchReservations(true)}
                    disabled={isRefreshing}
                    className="flex items-center justify-center gap-2 p-2.5 text-gray-500 bg-white border border-gray-100 rounded-xl hover:bg-orange-50 hover:text-zirel-orange-dark transition-all shadow-sm"
                    title="Aggiorna lista"
                >
                    <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-zirel-orange-dark' : ''}`} />
                </button>
            </div>

            {reservations.length === 0 ? (
                <div className="text-center py-20 apple-card bg-white border border-gray-100 shadow-sm">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Calendar className="w-10 h-10 text-gray-300" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">Nessuna prenotazione</h3>
                    <p className="text-gray-500 max-w-sm mx-auto">La Chat non ha ancora registrato prenotazioni per il tuo locale.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {reservations.map((res) => (
                        <div key={res.id} className="apple-card bg-white p-5 md:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center justify-between md:justify-start gap-4">
                                        <h3 className="text-xl font-bold text-gray-900 group-hover:text-zirel-orange-dark transition-colors">
                                            {res.nome_cliente || 'Cliente Sconosciuto'}
                                        </h3>
                                        <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${getStatusStyle(res.stato)}`}>
                                            {res.stato || 'SCONOSCIUTO'}
                                        </span>
                                    </div>

                                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-3 text-sm text-gray-600">
                                        <div className="flex items-center gap-2.5 bg-gray-50/50 p-2 rounded-xl border border-gray-50">
                                            <Calendar className="w-4 h-4 text-zirel-orange-dark mt-0.5" />
                                            <span className="font-medium">{res.data_prenotazione}</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 bg-gray-50/50 p-2 rounded-xl border border-gray-50">
                                            <Clock className="w-4 h-4 text-zirel-orange-dark mt-0.5" />
                                            <span className="font-medium">{res.ora}</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 bg-gray-50/50 p-2 rounded-xl border border-gray-50">
                                            <Users className="w-4 h-4 text-zirel-orange-dark mt-0.5" />
                                            <span className="font-medium">{res.persone} persone</span>
                                        </div>
                                        <div className="flex items-center gap-2.5 bg-gray-50/50 p-2 rounded-xl border border-gray-50">
                                            <Phone className="w-4 h-4 text-zirel-orange-dark mt-0.5" />
                                            <a href={`tel:${res.telefono}`} className="text-blue-600 hover:text-blue-700 underline font-bold transition-colors">
                                                {res.telefono}
                                            </a>
                                        </div>
                                    </div>
                                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest pt-2 flex items-center gap-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
                                        Ricevuta: {new Date(res.created_at).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>

                                <div className="flex flex-row md:flex-col gap-3 shrink-0 pt-4 md:pt-0 md:pl-6 border-t md:border-t-0 md:border-l border-gray-50">
                                    <button
                                        onClick={() => updateStatus(res.id, 'CONFERMATA')}
                                        disabled={res.stato?.toUpperCase() === 'CONFERMATA'}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 md:py-2.5 bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-100 disabled:text-gray-400 rounded-2xl font-bold transition-all shadow-lg shadow-green-200 disabled:shadow-none active:scale-95"
                                    >
                                        <Check className="w-5 h-5 md:w-4 md:h-4" />
                                        Conferma
                                    </button>
                                    <button
                                        onClick={() => updateStatus(res.id, 'RIFIUTATA')}
                                        disabled={res.stato?.toUpperCase() === 'RIFIUTATA'}
                                        className="flex-1 flex items-center justify-center gap-2 px-6 py-3 md:py-2.5 bg-white text-red-600 border-2 border-red-50 hover:bg-red-50 hover:border-red-100 disabled:bg-gray-50 disabled:text-gray-300 disabled:border-transparent rounded-2xl font-bold transition-all active:scale-95"
                                    >
                                        <X className="w-5 h-5 md:w-4 md:h-4" />
                                        Rifiuta
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Reservations;
