import { useState, useEffect, useRef } from 'react';
import { FileText, UploadCloud, Trash2, Loader2, ExternalLink, RefreshCw, Info } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import toast from 'react-hot-toast';

interface DocumentManagerProps {
    tenantId: string;
}

interface DocumentFile {
    name: string;
    id: string;
    metadata: any;
    created_at: string;
    updated_at: string;
}

const INGESTION_WEBHOOK_URL = import.meta.env.VITE_N8N_INGESTION_WEBHOOK || '';

const DocumentManager = ({ tenantId }: DocumentManagerProps) => {
    const [documents, setDocuments] = useState<DocumentFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchDocuments = async () => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .storage
                .from('tenant-documents')
                .list(tenantId + '/');

            if (error) throw error;

            // Filter out the implicit empty folder placeholder if any
            const files = data.filter(f => f.name !== '.emptyFolderPlaceholder');
            setDocuments(files);
        } catch (error) {
            console.error('Error fetching documents:', error);
            toast.error('Errore nel caricamento dei documenti.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tenantId]);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limita a PDF e txt, se vuoi (puoi espandere in futuro)
        if (!file.name.toLowerCase().endsWith('.pdf') && !file.name.toLowerCase().endsWith('.txt') && !file.name.toLowerCase().endsWith('.csv')) {
            toast.error('Per favore carica solo file PDF, TXT o CSV.');
            return;
        }

        setIsUploading(true);
        const loadingToast = toast.loading('Caricamento del file in corso...');

        try {
            const filePath = `${tenantId}/${file.name}`;

            const { error: uploadError } = await supabase
                .storage
                .from('tenant-documents')
                .upload(filePath, file, { upsert: true });

            if (uploadError) throw uploadError;

            // Generate signed URL to pass to n8n
            const { data: signedUrlData, error: signError } = await supabase
                .storage
                .from('tenant-documents')
                .createSignedUrl(filePath, 3600); // 1 hour valid token

            if (signError) throw signError;

            toast.success('File caricato su Supabase!', { id: loadingToast });

            // Trigger n8n webhook
            if (INGESTION_WEBHOOK_URL) {
                toast.loading("Elaborazione Intelligenza Artificiale in corso (invio a n8n)...", { id: loadingToast });

                try {
                    const response = await fetch(INGESTION_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            file_url: signedUrlData.signedUrl,
                            tenant_id: tenantId,
                            filename: file.name
                        })
                    });

                    if (!response.ok) {
                        toast.error("File caricato, ma n8n non ha risposto correttamente.", { id: loadingToast, duration: 5000 });
                    } else {
                        toast.success("Documento elaborato e studiato con successo dall'AI!", { id: loadingToast, duration: 4000 });
                    }
                } catch (webhookError) {
                    console.error('Webhook error:', webhookError);
                    toast.error('File salvato, ma impossibile contattare n8n in questo momento.', { id: loadingToast, duration: 5000 });
                }
            } else {
                toast.dismiss(loadingToast);
                toast.success('File caricato. (Webhook n8n non configurato in ambiente)', { duration: 4000 });
            }

            // Ricarica la lista per mostrare il nuovo doc
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
            const { error } = await supabase
                .storage
                .from('tenant-documents')
                .remove([`${tenantId}/${fileName}`]);

            if (error) throw error;
            toast.success('Documento eliminato con successo', { id: loadingToast });
            fetchDocuments();
        } catch (error) {
            console.error('Delete error:', error);
            toast.error("Errore durante l'eliminazione", { id: loadingToast });
        }
    };

    const handleViewDocument = async (fileName: string) => {
        const { data, error } = await supabase.storage.from('tenant-documents').createSignedUrl(`${tenantId}/${fileName}`, 3600);
        if (error || !data) {
            toast.error("Errore nell'apertura del documento");
            return;
        }
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="space-y-6 animate-fade-in delay-200">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">Documenti & Knowledge Base</h2>
                    <p className="text-gray-500 mt-1">Carica menu, policy o guide in PDF. Zirèl li studierà per rispondere ai tuoi clienti.</p>
                </div>

                <div>
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
                        className="apple-button bg-zirel-orange flex items-center justify-center gap-2 py-3 px-6 w-full md:w-auto"
                    >
                        {isUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                        {isUploading ? 'Caricamento...' : 'Carica Documento'}
                    </button>
                </div>
            </header>

            <div className="apple-card overflow-hidden">
                <div className="p-4 md:p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-gray-400" />
                        Archivio Attuale
                    </h3>
                    <button onClick={fetchDocuments} className="p-2 text-gray-400 hover:text-zirel-orange transition-colors rounded-full hover:bg-orange-50" title="Aggiorna lista">
                        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-zirel-orange' : ''}`} />
                    </button>
                </div>

                <div className="divide-y divide-gray-100">
                    {isLoading && documents.length === 0 ? (
                        <div className="p-12 flex flex-col items-center justify-center text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-4 text-zirel-orange" />
                            <p>Caricamento archivio...</p>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">
                            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                            <p className="font-medium">Nessun documento presente.</p>
                            <p className="text-sm mt-1">Carica il primo menu o listino prezzi per far studiare l'Assistente.</p>
                        </div>
                    ) : (
                        documents.map((doc) => (
                            <div key={doc.id} className="p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl hidden sm:block">
                                        <FileText className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900 line-clamp-1 break-all">{doc.name}</h4>
                                        <p className="text-sm text-gray-500 mt-1">
                                            Aggiunto il: {new Date(doc.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-end md:self-auto">
                                    <button
                                        onClick={() => handleViewDocument(doc.name)}
                                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        <span className="hidden sm:inline">Vedi Originale</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            if (window.confirm(`Sei sicuro di voler eliminare ${doc.name}? L'AI non avrà più accesso a queste informazioni.`)) {
                                                handleDelete(doc.name);
                                            }
                                        }}
                                        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 text-sm font-medium ml-2"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="hidden sm:inline">Elimina</span>
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {!INGESTION_WEBHOOK_URL && (
                <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-800 text-sm flex gap-3">
                    <Info className="w-5 h-5 flex-shrink-0 text-yellow-600" />
                    <p>
                        <strong>Attenzione:</strong> La variabile d'ambiente <code>VITE_N8N_INGESTION_WEBHOOK</code> non è definita.
                        I file verranno salvati su Supabase, ma n8n non verrà avvisato automaticamente.
                        Assicurati di configurare l'URL in Vercel.
                    </p>
                </div>
            )}
        </div>
    );
};

export default DocumentManager;
