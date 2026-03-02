import { useState, useEffect } from 'react';
import { Save, LogOut, Store, Clock, Utensils, Megaphone, CheckCircle2, Link as LinkIcon, Info, Loader2, Settings, CalendarDays, FileText, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import Reservations from './Reservations';
import DocumentManager from './DocumentManager';
import toast from 'react-hot-toast';

interface DashboardProps {
    tenantId: string;
    onLogout: () => void;
}

const InputField = ({ label, value, onChange, placeholder = '' }: any) => (
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

const TextareaField = ({ label, value, onChange, placeholder = '', rows = 3 }: any) => (
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

const Dashboard = ({ tenantId, onLogout }: DashboardProps) => {
    // Tutti i campi modificabili dal CSV Tenants
    const [formData, setFormData] = useState<Record<string, string>>({
        telefono: '',
        mail: '',
        indirizzo: '',
        sito_web_url: '',
        google_maps_link: '',
        orari_apertura: '',
        giorni_chiusura: '',
        orari_checkin_checkout: '',
        durata_media_appuntamento: '',
        tipo_cucina: '',
        specialita_casa: '',
        prezzo_medio: '',
        prima_consulenza_costo: '',
        servizi_inclusi: '',
        wifi_password: '',
        parcheggio_info: '',
        animali_ammessi: '',
        metodi_pagamento: '',
        tassa_soggiorno: '',
        allergie_policy: '',
        emergenze_istruzioni: '',
        politica_cancellazione: '',
        link_prenotazione_tavoli: '',
        link_booking_esterno: '',
        instagram_url: '',
        facebook_url: '',
        tripadvisor_url: '',
        recensioni_url: '',
        promozione_attiva: '',
        dati_testuali_brevi: '',
        menu_testo: '',
    });
    const [isUpdating, setIsUpdating] = useState(false);
    const [isLoadingInitial, setIsLoadingInitial] = useState(true);
    const [activeTab, setActiveTab] = useState<'impostazioni' | 'prenotazioni' | 'documenti'>('prenotazioni');

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const { data, error } = await supabase
                    .from('tenants')
                    .select('*')
                    .eq('tenant_id', tenantId)
                    .single();

                if (error) {
                    console.error('Supabase error:', error);
                    toast.error('Codice Invalido o non trovato nel database Zirèl');
                    onLogout();
                    return;
                }

                if (data && data.tenant_id) {
                    setFormData(prev => ({ ...prev, ...data }));
                } else {
                    toast.error('Codice Invalido o non trovato nel database Zirèl');
                    onLogout();
                }
            } catch (error) {
                console.error('Fetch error:', error);
                toast.error('Errore di server. Riprova più tardi.');
                onLogout();
            } finally {
                setIsLoadingInitial(false);
            }
        };

        fetchInitialData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantId]);

    const handleUpdate = async () => {
        setIsUpdating(true);
        const loadingToast = toast.loading('Aggiorno l\'Intelligenza Artificiale...');

        try {
            // Remove dynamically generated/immutable columns if they exist before update
            const { row_number, id, ...updateData } = formData as any;

            const { error } = await supabase
                .from('tenants')
                .update(updateData)
                .eq('tenant_id', tenantId);

            if (error) {
                throw error;
            }

            toast.success('Il tuo assistente ha imparato le nuove regole!', {
                id: loadingToast,
                duration: 5000,
                icon: <CheckCircle2 className="text-green-500" />,
            });
        } catch (error) {
            console.error('Update error:', error);
            // Ignore error for now if it's related to missing RLS or just show generic error
            toast.error('Errore durante l\'aggiornamento. Verifica i permessi (RLS) su Supabase.', {
                id: loadingToast,
                duration: 5000,
            });
        } finally {
            setIsUpdating(false);
        }
    };

    const updateField = (key: string) => (val: string) => setFormData(prev => ({ ...prev, [key]: val }));

    if (isLoadingInitial) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-zirel-orange animate-spin mb-4" />
                <p className="text-gray-500 font-medium animate-pulse">Autenticazione e recupero dati in corso...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 md:py-12">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 md:mb-16 animate-fade-in">
                <div className="flex flex-col md:flex-row items-center gap-0 md:gap-6 text-center md:text-left">
                    <img src="/zirel_logo_esteso.svg" alt="Zirèl Logo" className="h-28 md:h-40 w-auto drop-shadow-sm -mb-4 md:mb-0 relative z-10" />
                    <div className="hidden md:block md:h-12 md:w-px bg-gray-200"></div>
                    <div className="mt-2 md:mt-0 relative z-20">
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight">Benvenuto {tenantId}!</h1>
                        <p className="text-gray-500 text-sm md:text-base">Pannello di controllo</p>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center gap-4">
                    <a
                        href="http://localhost:5173"
                        className="text-gray-500 hover:text-indigo-600 text-sm font-medium flex items-center gap-2 transition-colors px-3 py-1.5 rounded-lg hover:bg-indigo-50"
                    >
                        <ExternalLink size={16} />
                        Torna alla Home
                    </a>
                    <button onClick={onLogout} className="apple-button-secondary flex items-center justify-center gap-2 group w-full md:w-auto">
                        <LogOut className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" />
                        Esci
                    </button>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="flex flex-wrap gap-2 md:space-x-2 border-b border-gray-200 mb-8 animate-fade-in delay-100 pb-2 md:pb-0">
                <button
                    onClick={() => setActiveTab('prenotazioni')}
                    className={`flex - 1 md: flex - none flex justify - center items - center gap - 2 px - 4 md: px - 6 py - 3 text - sm font - medium transition - colors border - b - 2 rounded - t - lg md: rounded - none md: border - b - 2 ${activeTab === 'prenotazioni'
                        ? 'border-zirel-orange text-zirel-orange bg-orange-50 md:bg-transparent'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                        } `}
                >
                    <CalendarDays className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="md:inline">Prenotazioni</span>
                </button>
                <button
                    onClick={() => setActiveTab('impostazioni')}
                    className={`flex - 1 md: flex - none flex justify - center items - center gap - 2 px - 4 md: px - 6 py - 3 text - sm font - medium transition - colors border - b - 2 rounded - t - lg md: rounded - none md: border - b - 2 ${activeTab === 'impostazioni'
                        ? 'border-zirel-orange text-zirel-orange bg-orange-50 md:bg-transparent'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                        } `}
                >
                    <Settings className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="md:inline">Impostazioni</span>
                </button>
                <button
                    onClick={() => setActiveTab('documenti')}
                    className={`flex - 1 md: flex - none flex justify - center items - center gap - 2 px - 4 md: px - 6 py - 3 text - sm font - medium transition - colors border - b - 2 rounded - t - lg md: rounded - none md: border - b - 2 ${activeTab === 'documenti'
                        ? 'border-zirel-orange text-zirel-orange bg-orange-50 md:bg-transparent'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                        } `}
                >
                    <FileText className="w-4 h-4 md:w-5 md:h-5" />
                    <span className="md:inline">Documenti</span>
                </button>
            </div>

            {activeTab === 'prenotazioni' ? (
                <Reservations tenantId={tenantId} />
            ) : activeTab === 'documenti' ? (
                <DocumentManager tenantId={tenantId} />
            ) : (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8 mb-12 animate-fade-in delay-200">

                        {/* 1. Contatti & Info Base */}
                        <section className="apple-card p-6 space-y-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Store className="w-5 h-5" /></div>
                                <h2 className="text-lg font-bold">Contatti & Info Base</h2>
                            </div>
                            <InputField label="Telefono" value={formData.telefono} onChange={updateField('telefono')} placeholder="+39 333 1234567" />
                            <InputField label="Email" value={formData.mail} onChange={updateField('mail')} />
                            <InputField label="Indirizzo" value={formData.indirizzo} onChange={updateField('indirizzo')} />
                            <InputField label="Sito Web URL" value={formData.sito_web_url} onChange={updateField('sito_web_url')} />
                            <InputField label="Google Maps Link" value={formData.google_maps_link} onChange={updateField('google_maps_link')} />
                        </section>

                        {/* 2. Orari & Chiusure */}
                        <section className="apple-card p-6 space-y-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Clock className="w-5 h-5" /></div>
                                <h2 className="text-lg font-bold">Orari & Tempistiche</h2>
                            </div>
                            <TextareaField label="Orari di Apertura" value={formData.orari_apertura} onChange={updateField('orari_apertura')} rows={2} />
                            <InputField label="Giorni di Chiusura" value={formData.giorni_chiusura} onChange={updateField('giorni_chiusura')} />
                            <InputField label="Orari Check-in / Check-out" value={formData.orari_checkin_checkout} onChange={updateField('orari_checkin_checkout')} />
                            <InputField label="Durata Media Appuntamento" value={formData.durata_media_appuntamento} onChange={updateField('durata_media_appuntamento')} />
                        </section>

                        {/* 3. Social & Link Esterni */}
                        <section className="apple-card p-6 space-y-4">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-pink-50 text-pink-600 rounded-xl"><LinkIcon className="w-5 h-5" /></div>
                                <h2 className="text-lg font-bold">Social & Link</h2>
                            </div>
                            <InputField label="Link Prenotazione Tavoli" value={formData.link_prenotazione_tavoli} onChange={updateField('link_prenotazione_tavoli')} />
                            <InputField label="Link Booking/Calendario" value={formData.link_booking_esterno} onChange={updateField('link_booking_esterno')} />
                            <InputField label="Instagram URL" value={formData.instagram_url} onChange={updateField('instagram_url')} />
                            <InputField label="Facebook URL" value={formData.facebook_url} onChange={updateField('facebook_url')} />
                            <InputField label="TripAdvisor URL" value={formData.tripadvisor_url} onChange={updateField('tripadvisor_url')} />
                            <InputField label="Link Recensioni (Google)" value={formData.recensioni_url} onChange={updateField('recensioni_url')} />
                        </section>

                        {/* 4. Menu, Servizi e Dettagli */}
                        <section className="apple-card p-6 space-y-4 lg:col-span-2 xl:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                            <div className="col-span-1 md:col-span-2 flex items-center gap-3 mb-2">
                                <div className="p-2 bg-green-50 text-green-600 rounded-xl"><Utensils className="w-5 h-5" /></div>
                                <h2 className="text-lg font-bold">Dettagli Offerta (Menu, Servizi, Costi)</h2>
                            </div>

                            <div className="space-y-4">
                                <InputField label="Tipo Cucina / Categoria" value={formData.tipo_cucina} onChange={updateField('tipo_cucina')} />
                                <TextareaField label="Specialità della Casa" value={formData.specialita_casa} onChange={updateField('specialita_casa')} rows={2} />
                                <InputField label="Prezzo Medio" value={formData.prezzo_medio} onChange={updateField('prezzo_medio')} />
                                <InputField label="Costo Prima Consulenza" value={formData.prima_consulenza_costo} onChange={updateField('prima_consulenza_costo')} />
                                <TextareaField label="Servizi Inclusi" value={formData.servizi_inclusi} onChange={updateField('servizi_inclusi')} rows={3} />
                            </div>

                            <div className="space-y-4 flex flex-col h-full">
                                <TextareaField label="Testo del Menu Ridotto o Tariffario (Extra info per l'AI)" value={formData.menu_testo} onChange={updateField('menu_testo')} rows={10} />
                            </div>
                        </section>

                        {/* 5. Info Pratiche e Policy */}
                        <section className="apple-card p-6 space-y-4 lg:col-span-2">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Info className="w-5 h-5" /></div>
                                <h2 className="text-lg font-bold">Info Pratiche & Regole</h2>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <InputField label="WiFi Password" value={formData.wifi_password} onChange={updateField('wifi_password')} />
                                <TextareaField label="Info Parcheggio" value={formData.parcheggio_info} onChange={updateField('parcheggio_info')} rows={1} />
                                <InputField label="Animali Ammessi" value={formData.animali_ammessi} onChange={updateField('animali_ammessi')} placeholder="es. Si, no cani di grossa taglia" />
                                <InputField label="Metodi di Pagamento" value={formData.metodi_pagamento} onChange={updateField('metodi_pagamento')} />
                                <InputField label="Tassa di Soggiorno" value={formData.tassa_soggiorno} onChange={updateField('tassa_soggiorno')} />
                                <TextareaField label="Policy Allergie" value={formData.allergie_policy} onChange={updateField('allergie_policy')} rows={1} />
                                <TextareaField label="Istruzioni Emergenze" value={formData.emergenze_istruzioni} onChange={updateField('emergenze_istruzioni')} rows={1} />
                                <TextareaField label="Politica di Cancellazione" value={formData.politica_cancellazione} onChange={updateField('politica_cancellazione')} rows={1} />
                            </div>
                        </section>

                        {/* 6. AI e Marketing */}
                        <section className="apple-card p-6 space-y-4 xl:col-span-1">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 bg-orange-50 text-orange-600 rounded-xl"><Megaphone className="w-5 h-5" /></div>
                                <h2 className="text-lg font-bold">Marketing & Custom AI</h2>
                            </div>
                            <TextareaField label="Promozione Attiva Oggi" value={formData.promozione_attiva} onChange={updateField('promozione_attiva')} rows={3} placeholder="Menzionata dall'AI in conversazione" />
                            <TextareaField label="Informazioni Aggiuntive Rapide" value={formData.dati_testuali_brevi} onChange={updateField('dati_testuali_brevi')} rows={4} placeholder="Altre note per guidare il comportamento dell'AI" />
                        </section>
                    </div>

                    {/* Action Area */}
                    <footer className="flex justify-center pb-20 animate-fade-in delay-500 sticky bottom-6 z-10 w-full px-4">
                        <button
                            onClick={handleUpdate}
                            disabled={isUpdating}
                            className="apple-button h-16 md:h-20 text-lg md:text-xl px-8 md:px-12 bg-zirel-orange flex items-center justify-center gap-4 min-w-[300px] shadow-2xl shadow-orange-500/30 w-full md:w-auto mx-auto border border-orange-400"
                        >
                            {isUpdating ? (
                                <div className="animate-spin rounded-full h-6 w-6 border-2 border-white/20 border-t-white"></div>
                            ) : (
                                <Save className="w-6 h-6" />
                            )}
                            Salva e Aggiorna AI
                        </button>
                    </footer>
                </>
            )}
        </div>
    );
};

export default Dashboard;
