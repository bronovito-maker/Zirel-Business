import { useState, useEffect, useRef, useCallback } from 'react';
import type { DocumentFile } from '../types';
import { FileText, UploadCloud, Trash2, Loader2, ExternalLink, RefreshCw, Info, FileCode, Calendar } from 'lucide-react';
import {
    listDocuments, uploadDocument, deleteDocument,
    getSignedUrl,
    deleteVectorsByFilename,
    triggerIngestion
} from '../lib/supabase-helpers';
import toast from 'react-hot-toast';
import { sanitizeFilename, validateDocumentUpload } from '../lib/validators';

const INGESTION_WEBHOOK_URL = import.meta.env.VITE_N8N_INGESTION_WEBHOOK || '';

const DocumentManager = () => {
    const [documents, setDocuments] = useState<DocumentFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchDocuments = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await listDocuments();
            const files = data.filter(f => f.name !== '.emptyFolderPlaceholder');
            setDocuments(files);
        } catch (error) {
            console.error('Error fetching documents:', error);
            toast.error('Errore nel caricamento dei documenti.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const originalFile = e.target.files?.[0];
        if (!originalFile) return;

        // 1 & 2. Validation: MIME Type & File Size
        const { valid, error } = validateDocumentUpload(originalFile);
        if (!valid) {
            toast.error(error || 'Errore di validazione del file.');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        // 3. Sanitization
        const sanitizedName = sanitizeFilename(originalFile.name);

        // 4. Conflict Detection
        const exists = documents.find(d => d.name === sanitizedName);
        if (exists) {
            const confirmOverwrite = window.confirm(
                `Un file chiamato "${sanitizedName}" esiste già. Vuoi sovrascriverlo?`
            );
            if (!confirmOverwrite) {
                if (fileInputRef.current) fileInputRef.current.value = '';
                return;
            }
        }

        // Create a new file object with the sanitized name
        const file = new File([originalFile], sanitizedName, { type: originalFile.type });

        setIsUploading(true);
        const loadingToast = toast.loading('Caricamento e analisi del file...');

        try {
            await uploadDocument(file);
            const signedUrl = await getSignedUrl(file.name);

            toast.success('File caricato con successo!', { id: loadingToast });

            toast.loading("L'AI sta studiando il documento...", { id: loadingToast });
            try {
                const ingestionResult = await triggerIngestion(file.name, signedUrl);
                if (!ingestionResult.success) {
                    toast('File salvato. Ingestione AI non configurata.', {
                        id: loadingToast,
                        duration: 4000,
                    });
                } else {
                    toast.success("Documento studiato con successo dall'AI!", { id: loadingToast, duration: 4000 });
                }
            } catch (ingestionError) {
                console.error('Ingestion error:', ingestionError);
                toast.error('Salvato, ma impossibile contattare il modulo AI.', { id: loadingToast, duration: 5000 });
            }

            fetchDocuments();
        } catch (error) {
            console.error('Upload error:', error);
            toast.error('Errore durante il caricamento del file.', { id: loadingToast });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDelete = async (fileName: string) => {
        const loadingToast = toast.loading('Eliminazione in corso...');
        try {
            // 1. Delete from Storage
            await deleteDocument(fileName);

            let hasVectorWarning = false;
            // 2. Delete from zirel_vectors (Knowledge Base)
            try {
                await deleteVectorsByFilename(fileName);
            } catch (dbError) {
                console.warn('Could not delete vectors:', dbError);
                hasVectorWarning = true;
            }

            if (hasVectorWarning) {
                toast('Documento eliminato. Alcuni riferimenti legacy potrebbero richiedere pulizia manuale.', {
                    id: loadingToast,
                    duration: 5000,
                });
            } else {
                toast.success('Documento eliminato dalla base di conoscenza', { id: loadingToast });
            }
            fetchDocuments();
        } catch {
            toast.error("Errore durante l'eliminazione", { id: loadingToast });
        }
    };

    const handleViewDocument = async (fileName: string) => {
        try {
            const signedUrl = await getSignedUrl(fileName);
            window.open(signedUrl, '_blank', 'noopener,noreferrer');
        } catch {
            toast.error("Errore nell'apertura del documento");
        }
    };

    return (
        <div className="space-y-8 animate-fade-in px-1">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <h2 className="text-2xl md:text-3xl font-black tracking-tight text-gray-900 italic uppercase">Knowledge Base</h2>
                    <p className="text-gray-500 font-medium">Carica menu, listini e PDF per istruire il tuo Concierge Digitale.</p>
                </div>

                <div className="w-full md:w-auto">
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.txt,.csv"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        className="apple-button bg-zirel-gradient flex items-center justify-center gap-3 py-4 px-8 w-full shadow-xl shadow-orange-500/20 active:scale-95 transition-all outline-none border-none border-transparent"
                    >
                        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-6 h-6" />}
                        {isUploading ? 'Caricamento...' : 'Aggiungi Documento'}
                    </button>
                </div>
            </header>

            <div className="apple-card bg-white border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-5 md:p-6 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center border border-gray-100 italic text-zirel-orange-dark font-bold">
                            KB
                        </div>
                        <h3 className="font-bold text-gray-800 tracking-tight">Archivio Documenti</h3>
                    </div>
                    <button
                        onClick={fetchDocuments}
                        className="p-2.5 text-gray-400 hover:text-zirel-orange-dark transition-all rounded-xl hover:bg-white border border-transparent hover:border-orange-100 shadow-sm"
                        title="Aggiorna lista"
                    >
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-zirel-orange-dark' : ''}`} />
                    </button>
                </div>

                <div className="divide-y divide-gray-100">
                    {isLoading && documents.length === 0 ? (
                        <div className="p-20 flex flex-col items-center justify-center text-gray-400">
                            <Loader2 className="w-10 h-10 animate-spin mb-4 text-zirel-orange-dark" />
                            <p className="font-bold uppercase tracking-widest text-xs">Sincronizzazione archivio...</p>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="p-20 text-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <FileCode className="w-10 h-10 text-gray-300" />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-2">Nessun documento</h3>
                            <p className="text-gray-500 max-w-xs mx-auto text-sm">Carica il primo menu o listino prezzi per far studiare l'Assistente.</p>
                        </div>
                    ) : (
                        documents.map((doc) => (
                            <div key={doc.id} className="p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6 hover:bg-orange-50/10 transition-colors group">
                                <div className="flex items-start gap-4 flex-1">
                                    <div className="p-3 bg-white text-blue-500 rounded-2xl border border-blue-50 group-hover:bg-blue-50 transition-colors shadow-sm hidden xs:block shrink-0">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <h4 className="font-bold text-gray-900 group-hover:text-zirel-orange-dark transition-colors truncate pr-4">{doc.name}</h4>
                                        <div className="flex items-center gap-2 mt-1.5 font-bold text-[10px] text-gray-400 uppercase tracking-widest">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(doc.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 self-end sm:self-auto w-full sm:w-auto">
                                    <button
                                        onClick={() => handleViewDocument(doc.name)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all active:scale-95"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Apri
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Sei sicuro di voler eliminare ${doc.name}?`)) {
                                                handleDelete(doc.name);
                                            }
                                        }}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 sm:py-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all active:scale-95"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        Elimina
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {!INGESTION_WEBHOOK_URL && (
                <div className="p-5 bg-amber-50 rounded-3xl border border-amber-100 flex gap-4 animate-pulse">
                    <div className="p-2 bg-white rounded-full shrink-0"><Info className="w-5 h-5 text-amber-500" /></div>
                    <div className="text-sm">
                        <p className="font-bold text-amber-900 mb-1">Modalità Semplificata</p>
                        <p className="text-amber-800 opacity-90 leading-relaxed">
                            L'IA non è al momento collegata per l'auto-apprendimento dei nuovi file.
                            I documenti verranno comunque salvati.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DocumentManager;
