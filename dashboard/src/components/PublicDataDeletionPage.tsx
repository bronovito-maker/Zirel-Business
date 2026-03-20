import { ArrowLeft, FileLock2, Mail, ShieldCheck, Trash2 } from 'lucide-react';

const steps = [
    'Scrivi a privacy@zirel.org indicando il tenant o l’attività collegata a Zirèl.',
    'Specifica che desideri la cancellazione dei dati collegati all’integrazione WhatsApp o all’account Zirèl.',
    'Riceverai una conferma della presa in carico e un aggiornamento sul completamento della richiesta.',
];

const PublicDataDeletionPage = () => {
    return (
        <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,140,66,0.12),_transparent_38%),linear-gradient(180deg,#f7fafc_0%,#ffffff_65%)] px-4 py-8 text-gray-900 sm:px-6 lg:px-8">
            <div className="mx-auto flex max-w-5xl flex-col gap-6">
                <a
                    href="https://zirel.org"
                    className="inline-flex w-fit items-center gap-2 rounded-full border border-gray-200 bg-white/90 px-4 py-2 text-sm font-medium text-zirel-blue shadow-sm transition hover:border-zirel-orange/40 hover:text-zirel-orange-dark"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Torna a Zirèl
                </a>

                <section className="apple-card overflow-hidden">
                    <div className="grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.4fr_0.8fr] lg:px-10 lg:py-10">
                        <div className="space-y-5">
                            <div className="inline-flex items-center gap-2 rounded-full bg-zirel-orange/10 px-4 py-2 text-sm font-semibold text-zirel-orange-dark">
                                <ShieldCheck className="h-4 w-4" />
                                Meta Compliance
                            </div>
                            <div className="space-y-3">
                                <h1 className="text-3xl font-black tracking-tight text-zirel-blue sm:text-4xl">
                                    Richiesta di cancellazione dati
                                </h1>
                                <p className="max-w-2xl text-base leading-8 text-gray-600 sm:text-lg">
                                    Questa pagina spiega come richiedere la cancellazione dei dati collegati a Zirèl e
                                    all’integrazione WhatsApp Business. È l’URL pubblico da usare anche nelle
                                    impostazioni Meta per la gestione della privacy.
                                </p>
                            </div>
                        </div>

                        <aside className="rounded-[2rem] border border-gray-200/80 bg-white/95 p-5 shadow-sm">
                            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-gray-500">
                                <FileLock2 className="h-4 w-4" />
                                Contatti privacy
                            </div>
                            <div className="space-y-4 text-sm text-gray-600">
                                <div className="rounded-2xl bg-gray-50 p-4">
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                                        Email dedicata
                                    </p>
                                    <a className="font-semibold text-zirel-blue underline" href="mailto:privacy@zirel.org">
                                        privacy@zirel.org
                                    </a>
                                </div>
                                <div className="rounded-2xl bg-gray-50 p-4">
                                    <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-gray-400">
                                        Supporto generale
                                    </p>
                                    <a className="font-semibold text-zirel-blue underline" href="mailto:info@zirel.org">
                                        info@zirel.org
                                    </a>
                                </div>
                                <p className="leading-7">
                                    Se la richiesta riguarda esclusivamente il collegamento WhatsApp, indica anche il
                                    numero o il business portfolio coinvolto per accelerare la verifica.
                                </p>
                            </div>
                        </aside>
                    </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                    <article className="apple-card px-6 py-8 sm:px-8">
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-zirel-blue/6 px-4 py-2 text-sm font-semibold text-zirel-blue">
                            <Trash2 className="h-4 w-4" />
                            Come richiedere la cancellazione
                        </div>
                        <ol className="space-y-4">
                            {steps.map((step, index) => (
                                <li
                                    key={step}
                                    className="flex items-start gap-4 rounded-[1.75rem] border border-gray-100 bg-gray-50/70 px-4 py-4"
                                >
                                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zirel-gradient text-sm font-bold text-white">
                                        {index + 1}
                                    </div>
                                    <p className="text-sm leading-7 text-gray-700 sm:text-base">{step}</p>
                                </li>
                            ))}
                        </ol>
                    </article>

                    <article className="apple-card px-6 py-8 sm:px-8">
                        <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700">
                            <Mail className="h-4 w-4" />
                            Cosa succede dopo
                        </div>
                        <div className="space-y-4 text-sm leading-7 text-gray-700 sm:text-base">
                            <p>
                                Zirèl verifica l’identità del richiedente e l’ambito della richiesta, poi procede alla
                                rimozione dei dati o al disaccoppiamento del canale WhatsApp quando applicabile.
                            </p>
                            <p>
                                Se sono coinvolti provider esterni o servizi Meta, potremmo confermare la ricezione
                                della richiesta e completare la lavorazione in una seconda fase, mantenendoti
                                aggiornato via email.
                            </p>
                            <div className="rounded-[1.75rem] border border-zirel-orange/20 bg-zirel-orange/8 p-4">
                                <p className="font-semibold text-zirel-orange-dark">Informazioni utili da includere</p>
                                <ul className="mt-2 list-disc space-y-1 pl-5">
                                    <li>nome attività o tenant Zirèl</li>
                                    <li>numero WhatsApp collegato, se presente</li>
                                    <li>email usata per il contatto</li>
                                    <li>eventuale motivo o contesto della richiesta</li>
                                </ul>
                            </div>
                        </div>
                    </article>
                </section>
            </div>
        </main>
    );
};

export default PublicDataDeletionPage;
