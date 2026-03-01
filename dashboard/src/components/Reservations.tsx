import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';
import { Calendar, Clock, Users, Phone, Loader2, Check, X, RefreshCw } from 'lucide-react';

interface Reservation {
    id: number;
    created_at: string;
    nome_cliente: string;
    telefono: string;
    data_prenotazione: string;
    ora: string;
    persone: string;
    stato: string;
    tenant_id: string;
}

interface ReservationsProps {
    tenantId: string;
}

const Reservations = ({ tenantId }: ReservationsProps) => {
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchReservations = async (silent = false) => {
        if (!silent) setIsLoading(true);
        else setIsRefreshing(true);

        try {
            const { data, error } = await supabase
                .from('prenotazioni')
                .select('*')
                .eq('tenant_id', tenantId)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching reservations:', error);
                toast.error('Errore nel caricamento delle prenotazioni');
                return;
            }

            setReservations(data || []);
        } catch (error) {
            console.error('Fetch error:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchReservations();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantId]);

    const updateStatus = async (id: number, newStatus: string) => {
        const loadingToast = toast.loading('Aggiornamento in corso...');
        try {
            const { error } = await supabase
                .from('prenotazioni')
                .update({ stato: newStatus })
                .eq('id', id)
                .eq('tenant_id', tenantId);

            if (error) throw error;

            setReservations(prev =>
                prev.map(res => (res.id === id ? { ...res, stato: newStatus } : res))
            );
            toast.success('Stato aggiornato', { id: loadingToast });
        } catch (error) {
            console.error('Error updating status:', error);
            toast.error('Errore durante l\'aggiornamento', { id: loadingToast });
        }
    };

    const getStatusStyle = (stato: string) => {
        switch (stato?.toUpperCase()) {
            case 'CONFERMATA':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'RIFIUTATA':
            case 'ANNULLATA':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'PENDING':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-zirel-orange animate-spin mb-4" />
                <p className="text-gray-500">Caricamento prenotazioni...</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
                <h2 className="text-xl md:text-2xl font-bold tracking-tight">Le Tue Prenotazioni</h2>
                <button
                    onClick={() => fetchReservations(true)}
                    disabled={isRefreshing}
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-zirel-orange transition-colors w-full sm:w-auto"
                >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                    Aggiorna
                </button>
            </div>

            {reservations.length === 0 ? (
                <div className="text-center py-16 apple-card">
                    <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900">Nessuna prenotazione</h3>
                    <p className="mt-1 text-gray-500">L'Intelligenza Artificiale non ha ancora registrato prenotazioni per il tuo locale.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {reservations.map((res) => (
                        <div key={res.id} className="apple-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-lg">
                            <div className="flex-1 space-y-4">
                                <div className="flex items-center justify-between md:justify-start gap-4">
                                    <h3 className="text-xl font-bold text-gray-900">{res.nome_cliente || 'Cliente Sconosciuto'}</h3>
                                    <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full border ${getStatusStyle(res.stato)}`}>
                                        {res.stato || 'SCONOSCIUTO'}
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-gray-400" />
                                        <span>{res.data_prenotazione}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Clock className="w-4 h-4 text-gray-400" />
                                        <span>{res.ora}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-gray-400" />
                                        <span>{res.persone} pers.</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        <a href={`tel:${res.telefono}`} className="text-blue-500 hover:text-blue-700 underline font-medium transition-colors">{res.telefono}</a>
                                    </div>
                                </div>
                                <div className="text-xs text-gray-400 italic mt-2">
                                    Ricevuta il: {new Date(res.created_at).toLocaleString('it-IT')}
                                </div>
                            </div>

                            <div className="flex flex-row md:flex-col gap-3 shrink-0 border-t md:border-t-0 md:border-l border-gray-100 pt-5 md:pt-0 md:pl-6 mt-2 md:mt-0">
                                <button
                                    onClick={() => updateStatus(res.id, 'CONFERMATA')}
                                    disabled={res.stato?.toUpperCase() === 'CONFERMATA'}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Check className="w-5 h-5 md:w-4 md:h-4" />
                                    Conferma
                                </button>
                                <button
                                    onClick={() => updateStatus(res.id, 'RIFIUTATA')}
                                    disabled={res.stato?.toUpperCase() === 'RIFIUTATA'}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 md:py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <X className="w-5 h-5 md:w-4 md:h-4" />
                                    Rifiuta
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Reservations;
