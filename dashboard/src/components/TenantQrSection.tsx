import { useEffect, useMemo, useState } from 'react';
import { Copy, Download, ExternalLink, Printer, QrCode, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import type { TenantData } from '../types';
import {
    buildPublicChatUrl,
    buildQrTargets,
    downloadBlob,
    downloadTextFile,
    generateQrPngDataUrl,
    generateQrSvg,
    type QrMode,
} from '../lib/qr';

type TenantQrSectionProps = {
    tenantId?: string;
    formData: TenantData;
};

function detectDefaultQrTitle(formData: TenantData) {
    const businessName = formData.widget_title || formData.nome_attivita || formData.hotel_name || formData.nome_ristorante || 'Zirèl';
    if (String(formData.business_type || '').toLowerCase() === 'hotel') {
        return `Scansiona e scrivi alla reception di ${businessName}`;
    }
    return `Scansiona e scrivi a ${businessName}`;
}

function buildPrintDocument(params: {
    title: string;
    subtitle: string;
    cta: string;
    color: string;
    icon: string;
    cards: Array<{ label: string; url: string; svg: string }>;
}) {
    const { title, subtitle, cta, color, icon, cards } = params;

    return `<!doctype html>
<html lang="it">
  <head>
    <meta charset="utf-8" />
    <title>QR Reception Zirèl</title>
    <style>
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Outfit, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fffaf1; color: #0f172a; }
      .sheet { display: grid; gap: 18px; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); padding: 24px; }
      .card { border: 1px solid #f2e5c8; border-radius: 28px; background: white; overflow: hidden; box-shadow: 0 12px 30px rgba(15, 23, 42, 0.08); break-inside: avoid; }
      .header { padding: 18px 20px; color: white; background: linear-gradient(135deg, ${color} 0%, ${color}CC 100%); }
      .kicker { font-size: 11px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase; opacity: 0.78; }
      .title { margin: 8px 0 4px; font-size: 22px; font-weight: 900; line-height: 1.1; }
      .subtitle { margin: 0; font-size: 14px; line-height: 1.45; opacity: 0.88; }
      .body { padding: 22px; display: grid; gap: 16px; justify-items: center; text-align: center; }
      .badge { display: inline-flex; align-items: center; gap: 8px; border: 1px solid #d9ebff; background: #f8fdff; color: #003049; border-radius: 999px; padding: 8px 14px; font-size: 13px; font-weight: 700; }
      .qr { width: 210px; height: 210px; padding: 12px; border-radius: 28px; border: 1px solid #f2e5c8; background: #fff; display: grid; place-items: center; }
      .meta { font-size: 12px; color: #64748b; line-height: 1.5; word-break: break-word; }
      .cta { font-size: 15px; font-weight: 700; color: #0f172a; }
      @page { size: A4; margin: 12mm; }
      @media print { body { background: white; } .sheet { padding: 0; } .card { box-shadow: none; } }
    </style>
  </head>
  <body>
    <div class="sheet">
      ${cards
          .map(
              (card) => `
        <section class="card">
          <div class="header">
            <div class="kicker">Zirèl QR Concierge</div>
            <div class="title">${title}</div>
            <p class="subtitle">${subtitle}</p>
          </div>
          <div class="body">
            <div class="badge">${icon} ${card.label}</div>
            <div class="qr">${card.svg}</div>
            <div class="cta">${cta}</div>
            <div class="meta">${card.url}</div>
          </div>
        </section>
      `,
          )
          .join('')}
    </div>
    <script>window.onload = () => setTimeout(() => window.print(), 200);</script>
  </body>
</html>`;
}

const TenantQrSection = ({ tenantId, formData }: TenantQrSectionProps) => {
    const [mode, setMode] = useState<QrMode>('single');
    const [roomsInput, setRoomsInput] = useState('101-110');
    const [areasInput, setAreasInput] = useState('Reception\nHall');
    const [previewSvg, setPreviewSvg] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    const widgetColor = formData.widget_color || '#FF8C42';
    const icon = formData.widget_icon || '💬';
    const title = detectDefaultQrTitle(formData);
    const subtitle = 'Un concierge digitale sempre disponibile per richieste, informazioni, taxi, eventi e supporto rapido.';
    const cta = 'Apri la chat della reception';

    const publicBaseOrigin = useMemo(() => window.location.origin, []);
    const baseChatUrl = useMemo(
        () => (tenantId ? buildPublicChatUrl(publicBaseOrigin, tenantId, { source: 'qr_hotel' }) : ''),
        [publicBaseOrigin, tenantId],
    );

    const targets = useMemo(
        () =>
            tenantId
                ? buildQrTargets({
                      mode,
                      tenantId,
                      baseOrigin: publicBaseOrigin,
                      roomsInput,
                      areasInput,
                  })
                : [],
        [tenantId, mode, publicBaseOrigin, roomsInput, areasInput],
    );

    const previewTarget = targets[0] || null;

    useEffect(() => {
        let cancelled = false;

        async function refreshPreview() {
            if (!previewTarget) {
                setPreviewSvg('');
                return;
            }

            setIsGenerating(true);
            try {
                const svg = await generateQrSvg(previewTarget.url);
                if (!cancelled) setPreviewSvg(svg);
            } catch (error) {
                console.error('[Zirèl QR] Preview generation failed:', error);
                if (!cancelled) setPreviewSvg('');
            } finally {
                if (!cancelled) setIsGenerating(false);
            }
        }

        refreshPreview();
        return () => {
            cancelled = true;
        };
    }, [previewTarget]);

    const handleCopyBaseLink = async () => {
        if (!baseChatUrl) return;
        await navigator.clipboard.writeText(baseChatUrl);
        toast.success('Link pubblico copiato.');
    };

    const handleDownloadSvg = async () => {
        if (!previewTarget) return;
        const svg = await generateQrSvg(previewTarget.url);
        downloadTextFile(`zirel-qr-${previewTarget.id}.svg`, svg);
    };

    const handleDownloadPng = async () => {
        if (!previewTarget) return;
        const dataUrl = await generateQrPngDataUrl(previewTarget.url);
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        downloadBlob(`zirel-qr-${previewTarget.id}.png`, blob);
    };

    const handlePrint = async () => {
        if (!targets.length) {
            toast.error('Aggiungi almeno una stanza o un’area da stampare.');
            return;
        }

        const popup = window.open('', '_blank', 'noopener,noreferrer,width=1200,height=900');
        if (!popup) {
            toast.error('Non riesco ad aprire la finestra di stampa.');
            return;
        }

        setIsGenerating(true);
        try {
            const cards = await Promise.all(
                targets.map(async (target) => ({
                    label: target.label,
                    url: target.url,
                    svg: await generateQrSvg(target.url),
                })),
            );

            popup.document.open();
            popup.document.write(
                buildPrintDocument({
                    title,
                    subtitle,
                    cta,
                    color: widgetColor,
                    icon,
                    cards,
                }),
            );
            popup.document.close();
        } catch (error) {
            console.error('[Zirèl QR] Print generation failed:', error);
            popup.close();
            toast.error('Non sono riuscito a preparare il layout di stampa.');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="apple-card overflow-hidden p-5 md:p-6 space-y-6 border-t-4 border-sky-400">
            <div className="flex flex-col gap-4 border-b border-gray-100 pb-6 sm:flex-row sm:items-center">
                <div className="z-icon-chip-lg shrink-0">
                    <QrCode className="w-6 h-6" />
                </div>
                <div className="min-w-0 flex-1">
                    <h3 className="text-xl sm:text-2xl font-black text-gray-800 leading-tight break-words">QR Reception</h3>
                    <p className="text-gray-500 break-words">Genera QR stampabili per struttura, aree comuni o singole camere.</p>
                </div>
                <button
                    type="button"
                    onClick={handleCopyBaseLink}
                    disabled={!baseChatUrl}
                    className="apple-button-secondary text-sm flex items-center gap-2 w-full sm:w-auto justify-center"
                >
                    <Copy className="w-4 h-4" />
                    Copia link chat
                </button>
            </div>

            <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-5">
                    <div>
                        <label className="block text-xs font-bold uppercase tracking-widest text-gray-400 mb-3 ml-1">Modalità QR</label>
                        <div className="grid gap-3 sm:grid-cols-3">
                            {[
                                { id: 'single', title: 'Unico struttura', desc: 'Un solo QR per tutto l’hotel.' },
                                { id: 'area', title: 'Per area', desc: 'Reception, hall, spa, bar.' },
                                { id: 'room', title: 'Per camera', desc: 'Traccia la stanza precisa.' },
                            ].map((option) => (
                                <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => setMode(option.id as QrMode)}
                                    className={`rounded-[1.5rem] border px-4 py-4 text-left transition ${
                                        mode === option.id
                                            ? 'border-sky-300 bg-sky-50 shadow-sm'
                                            : 'border-gray-200 bg-white hover:border-sky-200 hover:bg-sky-50/40'
                                    }`}
                                >
                                    <div className="text-sm font-black text-slate-800">{option.title}</div>
                                    <div className="mt-1 text-xs leading-relaxed text-slate-500">{option.desc}</div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {mode === 'area' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2 px-1">Aree</label>
                            <textarea
                                value={areasInput}
                                onChange={(event) => setAreasInput(event.target.value)}
                                rows={4}
                                className="apple-input resize-none"
                                placeholder={'Reception\nHall\nSpa\nBar'}
                            />
                            <p className="mt-2 px-1 text-xs text-gray-500">Una riga per area. Il sistema crea un QR distinto per ogni zona.</p>
                        </div>
                    ) : null}

                    {mode === 'room' ? (
                        <div>
                            <label className="block text-sm font-medium text-gray-500 mb-2 px-1">Camere</label>
                            <textarea
                                value={roomsInput}
                                onChange={(event) => setRoomsInput(event.target.value)}
                                rows={4}
                                className="apple-input resize-none"
                                placeholder={'101-110\n201\n202'}
                            />
                            <p className="mt-2 px-1 text-xs text-gray-500">Supporta intervalli e liste. Esempio: <code className="rounded bg-white px-1 py-0.5">101-110, 201, 202</code>.</p>
                        </div>
                    ) : null}

                    <div className="rounded-[1.75rem] border border-gray-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Output</p>
                                <p className="mt-1 text-sm font-semibold text-slate-700">
                                    {targets.length} QR pronti
                                    {mode === 'single' ? ' per la struttura' : mode === 'area' ? ' per le aree selezionate' : ' per le camere selezionate'}
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={handleDownloadSvg}
                                    disabled={!previewTarget || isGenerating}
                                    className="apple-button-secondary text-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Download className="w-4 h-4" />
                                    SVG
                                </button>
                                <button
                                    type="button"
                                    onClick={handleDownloadPng}
                                    disabled={!previewTarget || isGenerating}
                                    className="apple-button-secondary text-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Download className="w-4 h-4" />
                                    PNG
                                </button>
                                <button
                                    type="button"
                                    onClick={handlePrint}
                                    disabled={!targets.length || isGenerating}
                                    className="apple-button-secondary text-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                                    Stampa
                                </button>
                            </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2">
                            {targets.slice(0, 8).map((target) => (
                                <span key={target.id} className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
                                    {target.label}
                                </span>
                            ))}
                            {targets.length > 8 ? (
                                <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500">
                                    +{targets.length - 8} altri
                                </span>
                            ) : null}
                        </div>
                    </div>
                </div>

                <div className="min-w-0 rounded-[2rem] border border-[#F2E5C8] bg-[#FFFAF1] p-5">
                    <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400 text-center">Anteprima QR</p>
                    <div className="mt-4 overflow-hidden rounded-[1.75rem] border border-[#F2E5C8] bg-white shadow-sm">
                        <div style={{ background: `linear-gradient(135deg, ${widgetColor} 0%, ${widgetColor}CC 100%)` }} className="px-5 py-4 text-white">
                            <div className="text-xs font-bold uppercase tracking-[0.2em] text-white/75">Zirèl QR Concierge</div>
                            <div className="mt-2 text-xl font-black leading-tight">{title}</div>
                            <p className="mt-2 text-sm leading-relaxed text-white/85">{subtitle}</p>
                        </div>
                        <div className="space-y-4 px-4 py-5 text-center sm:px-5">
                            <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-slate-700">
                                {icon} {previewTarget?.label || 'Struttura'}
                            </div>
                            <div className="mx-auto grid aspect-square w-full max-w-[230px] place-items-center overflow-hidden rounded-[1.75rem] border border-[#F2E5C8] bg-white p-4">
                                {isGenerating ? (
                                    <RefreshCw className="h-10 w-10 animate-spin text-[#FF8C42]" />
                                ) : previewSvg ? (
                                    <div
                                        className="h-full w-full [&>svg]:h-full [&>svg]:w-full [&>svg]:max-h-full [&>svg]:max-w-full"
                                        dangerouslySetInnerHTML={{ __html: previewSvg }}
                                    />
                                ) : (
                                    <div className="text-sm text-slate-400">Nessun QR da mostrare</div>
                                )}
                            </div>
                            <div className="text-sm font-semibold text-slate-800">{cta}</div>
                            <div className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-500 break-all">
                                {previewTarget?.url || baseChatUrl || 'Configura il tenant per ottenere il link pubblico.'}
                            </div>
                            {previewTarget ? (
                                <div className="flex justify-center">
                                    <a
                                        href={previewTarget.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="apple-button-secondary text-sm flex items-center gap-2"
                                    >
                                        <ExternalLink className="w-4 h-4" />
                                        Apri chat pubblica
                                    </a>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TenantQrSection;
