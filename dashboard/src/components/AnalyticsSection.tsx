import { useCallback, useEffect, useState } from 'react';
import { BarChart3, Loader2, RefreshCw, TrendingUp, CalendarDays, BellRing, CircleAlert, MessageSquareMore } from 'lucide-react';
import toast from 'react-hot-toast';
import { getAnalyticsSummary } from '../lib/supabase-helpers';
import type { AnalyticsSummary } from '../types';

const metricCards = (summary: AnalyticsSummary) => [
    {
        label: 'Richieste totali',
        value: summary.total_requests,
        note: 'Prenotazioni, soggiorni e appuntamenti registrati',
        accent: 'from-zirel-orange-dark to-[#ff9d58]',
        icon: BarChart3,
    },
    {
        label: 'Conversioni confermate',
        value: summary.confirmed_requests,
        note: `${summary.conversion_rate}% sul totale richieste`,
        accent: 'from-emerald-500 to-teal-500',
        icon: TrendingUp,
    },
    {
        label: 'Da seguire',
        value: summary.pending_requests,
        note: 'Richieste in manual review o ancora aperte',
        accent: 'from-amber-500 to-orange-500',
        icon: CircleAlert,
    },
    {
        label: 'Notifiche inviate',
        value: summary.notifications_sent,
        note: `${summary.notifications_pending} ancora in coda`,
        accent: 'from-sky-500 to-cyan-500',
        icon: BellRing,
    },
];

const formatNumber = (value: number) => new Intl.NumberFormat('it-IT').format(value);

const AnalyticsSection = () => {
    const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchAnalytics = useCallback(async (silent = false) => {
        if (silent) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const nextSummary = await getAnalyticsSummary();
            setSummary(nextSummary);
        } catch (error) {
            console.error('Error fetching analytics summary:', error);
            toast.error('Non sono riuscito a caricare le analytics base');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    if (isLoading || !summary) {
        return (
            <div className="flex flex-col items-center justify-center p-12">
                <Loader2 className="w-8 h-8 text-zirel-orange-dark animate-spin mb-4" />
                <p className="text-gray-500 font-medium">Caricamento analytics base...</p>
            </div>
        );
    }

    const peak = Math.max(...summary.recent_trend.map((point) => point.total), 1);

    return (
        <div className="space-y-6 animate-fade-in px-1">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h2 className="z-panel-title">Analytics Base</h2>
                    <p className="text-gray-500 mt-1">Una lettura pulita di richieste, conversioni e follow-up reali già registrati dal prodotto.</p>
                </div>
                <button
                    onClick={() => fetchAnalytics(true)}
                    disabled={isRefreshing}
                    className="flex items-center justify-center gap-2 p-2.5 text-gray-500 bg-white border border-gray-100 rounded-xl hover:bg-orange-50 hover:text-zirel-orange-dark transition-all shadow-sm"
                    title="Aggiorna analytics"
                >
                    <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-zirel-orange-dark' : ''}`} />
                </button>
            </div>

            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {metricCards(summary).map((card) => (
                    <article key={card.label} className="apple-card p-6 border border-gray-100 shadow-sm overflow-hidden relative">
                        <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${card.accent}`} />
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">{card.label}</p>
                                <p className="mt-4 text-4xl font-black tracking-tight text-gray-900">{formatNumber(card.value)}</p>
                                <p className="mt-3 text-sm text-gray-500 leading-relaxed">{card.note}</p>
                            </div>
                            <div className="z-icon-chip-lg shrink-0">
                                <card.icon className="w-6 h-6" />
                            </div>
                        </div>
                    </article>
                ))}
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
                <section className="apple-card p-6 md:p-8 border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="z-icon-chip">
                            <CalendarDays className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900">Andamento ultime 2 settimane</h3>
                            <p className="text-sm text-gray-500">Barre alte = richieste generate, barre piene = richieste confermate.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-7 md:grid-cols-14 gap-3 items-end h-64">
                        {summary.recent_trend.map((point) => {
                            const totalHeight = Math.max((point.total / peak) * 100, point.total > 0 ? 12 : 4);
                            const confirmedHeight = point.total > 0 ? Math.max((point.confirmed / peak) * 100, point.confirmed > 0 ? 10 : 0) : 0;

                            return (
                                <div key={point.date} className="flex flex-col items-center gap-2">
                                    <div className="w-full max-w-[28px] h-44 rounded-full bg-gray-100 relative overflow-hidden">
                                        <div
                                            className="absolute bottom-0 inset-x-0 rounded-full bg-gradient-to-t from-orange-200 to-orange-300"
                                            style={{ height: `${totalHeight}%` }}
                                        />
                                        <div
                                            className="absolute bottom-0 inset-x-0 rounded-full bg-gradient-to-t from-zirel-orange-dark to-[#ff9b52]"
                                            style={{ height: `${confirmedHeight}%` }}
                                        />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-[10px] font-black tracking-[0.16em] text-gray-400 uppercase">{point.label}</p>
                                        <p className="text-xs text-gray-500 mt-1">{point.total}</p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                <div className="space-y-6">
                    <section className="apple-card p-6 md:p-8 border border-dashed border-orange-200 bg-orange-50/60 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="z-icon-chip bg-white border border-orange-100">
                                <MessageSquareMore className="w-5 h-5 text-zirel-orange-dark" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-gray-900">Prossimo step analytics</h3>
                                <p className="text-sm text-gray-500">Per conversazioni, messaggi e abbandoni serve attivare un event log dedicato.</p>
                            </div>
                        </div>
                        <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
                            <p>Questa prima versione misura solo ciò che oggi è già affidabile in produzione: richieste create dai workflow, stati operativi e notifiche effettivamente elaborate.</p>
                            <p>Nel blocco successivo possiamo aggiungere il tracking vero di conversazioni avviate, messaggi scambiati e chat abbandonate senza inventare metriche deboli.</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default AnalyticsSection;
