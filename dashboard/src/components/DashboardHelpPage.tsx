import { ArrowLeft, CalendarDays, CircleHelp, CreditCard, FileText, Link as LinkIcon, MessageSquare, Palette, Settings, Shield, Smartphone, Sparkles, Store, Utensils } from 'lucide-react';

const helpSections = [
    {
        id: 'primi-passi',
        icon: Store,
        title: 'Primi passi',
        description: 'Le prime cose da sistemare per far lavorare Zirèl con i dati giusti.',
        bullets: [
            'Apri Impostazioni e inserisci i dati base della tua attività: nome, telefono, email, indirizzo e sito web.',
            'Aggiungi orari, giorni di chiusura, servizi, prezzi e link utili: sono le informazioni che Zirèl userà per rispondere ai tuoi clienti.',
            'Quando hai finito una modifica, clicca “Salva modifiche” in alto.',
        ],
    },
    {
        id: 'prezzi-e-offerta',
        icon: Utensils,
        title: 'Cambiare prezzi, prodotti, piatti o camere',
        description: 'Qui aggiorni tutto quello che riguarda la tua offerta.',
        bullets: [
            'Vai in Impostazioni > Dettagli Offerta (Menu, Servizi, Costi).',
            'Puoi aggiornare categoria, specialità, prezzo medio, costo della prima consulenza e servizi inclusi.',
            'Nel campo “Testo del Menu Ridotto o Tariffario” puoi scrivere in modo semplice prezzi, listini, camere, piatti o servizi che vuoi far comunicare a Zirèl.',
            'Dopo il salvataggio, le nuove informazioni verranno usate nelle risposte ai clienti.',
        ],
    },
    {
        id: 'orari',
        icon: CalendarDays,
        title: 'Modificare orari e disponibilità',
        description: 'Per tenere sempre aggiornati orari, aperture e disponibilità.',
        bullets: [
            'Vai in Impostazioni > Orari e Tempistiche.',
            'Qui puoi cambiare orari di apertura, giorni di chiusura, check-in / check-out o durata media di un appuntamento.',
            'Se fai variazioni stagionali o temporanee, aggiorna subito questi campi: sono tra le informazioni più richieste dai clienti.',
        ],
    },
    {
        id: 'whatsapp',
        icon: Smartphone,
        title: 'Attivare e gestire WhatsApp',
        description: 'Per collegare il numero e decidere quando risponde Zirèl o quando intervieni tu.',
        bullets: [
            'Apri Integrazione > Canale WhatsApp e usa “Collega WhatsApp” per completare il flusso Meta.',
            'Se il canale risulta “Richiede attenzione”, clicca “Aggiorna stato” per completare la sincronizzazione dei dettagli mancanti.',
            'Il toggle Automazione WhatsApp ti permette di attivare o sospendere le risposte automatiche su tutto il canale.',
            'Dal tab Conversazioni puoi entrare in una chat, rispondere tu manualmente e passare quella singola conversazione a gestione umana.',
        ],
    },
    {
        id: 'widget',
        icon: Palette,
        title: 'Cambiare colore e testi del chat widget',
        description: 'Per personalizzare l’aspetto del widget sul tuo sito.',
        bullets: [
            'Vai in Impostazioni e cerca i campi del widget, come titolo, sottotitolo, colore e icona.',
            'Puoi cambiare il colore per adattarlo al tuo brand e aggiornare i testi che il visitatore vede sul sito.',
            'Se hai dubbi sull’installazione o sul codice da inserire nel sito, trovi il supporto anche nella sezione Integrazione.',
            'Se il widget non compare, il problema spesso non è nello snippet ma nelle policy di sicurezza del sito: controlla CSP e header server, autorizzando almeno cdn.zirel.org e gli endpoint *.zirel.org nelle direttive script-src, connect-src, img-src e frame-src.',
            'Se il widget si apre ma i messaggi non partono, controlla la console browser: spesso manca il dominio del webhook chat in connect-src. Nei casi come Railway va consentito anche https://*.up.railway.app.',
            'Dopo aver aggiornato CSP o header di sicurezza devi fare un nuovo deploy del sito: il widget non ricompare finché non vengono pubblicate anche le nuove config server.',
        ],
    },
    {
        id: 'documenti',
        icon: FileText,
        title: 'Documenti e knowledge base',
        description: 'Per dare a Zirèl materiali utili da consultare nelle risposte.',
        bullets: [
            'Apri Documenti e carica materiali, PDF o contenuti di supporto.',
            'Qui puoi inserire brochure, menu, listini, condizioni, dettagli camere, servizi o altre informazioni importanti.',
            'Più i contenuti sono chiari e aggiornati, più Zirèl sarà preciso nelle risposte.',
        ],
    },
    {
        id: 'conversazioni',
        icon: MessageSquare,
        title: 'Uso quotidiano delle conversazioni',
        description: 'La sezione da usare ogni giorno per leggere, rispondere e intervenire.',
        bullets: [
            'Apri Conversazioni per vedere i thread WhatsApp del tenant.',
            'Usa “Passa a operatore” quando vuoi fermare le risposte automatiche su una singola chat.',
            'Usa “Riattiva” quando vuoi far tornare Zirèl a rispondere automaticamente in quella conversazione.',
            'Se invii tu il primo messaggio manuale dalla dashboard, la chat passa automaticamente in gestione umana.',
        ],
    },
    {
        id: 'billing-sicurezza',
        icon: CreditCard,
        title: 'Abbonamento e sicurezza',
        description: 'Due aree utili per tenere tutto sotto controllo.',
        bullets: [
            'Nel tab Abbonamento puoi controllare piano attivo, fatturazione e accesso al portale Stripe.',
            'Nel tab Sicurezza trovi il token di accesso e le operazioni più sensibili.',
            'Se rigeneri il token, ricorda che quello precedente smette subito di funzionare.',
        ],
    },
];

const quickLinks = [
    { label: 'Impostazioni', icon: Settings, text: 'Aggiorna dati attività, prezzi, orari e link utili.' },
    { label: 'Integrazione', icon: LinkIcon, text: 'Collega WhatsApp e gestisci il widget del sito.' },
    { label: 'Conversazioni', icon: MessageSquare, text: 'Leggi le chat e passa facilmente alla risposta umana.' },
    { label: 'Sicurezza', icon: Shield, text: 'Controlla token e accessi più delicati.' },
];

const DashboardHelpPage = () => {
    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,140,66,0.09),_transparent_32%),linear-gradient(180deg,#f6f9fc_0%,#fbfcfe_55%,#ffffff_100%)] text-gray-900">
            <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
                <header className="apple-card border-t-4 border-zirel-orange-dark px-5 py-5 md:px-7 md:py-6">
                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                        <div className="flex items-start gap-4">
                            <div className="z-icon-chip-lg shrink-0">
                                <CircleHelp className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">Centro assistenza</p>
                                <h1 className="mt-1 text-3xl font-black tracking-tight text-zirel-blue md:text-4xl">
                                    Guida completa alla dashboard Zirèl
                                </h1>
                                <p className="mt-3 max-w-3xl text-base leading-relaxed text-gray-600">
                                    Qui trovi una guida semplice e pratica per usare la dashboard in autonomia:
                                    aggiornare dati, cambiare prezzi, gestire WhatsApp, modificare il widget, caricare documenti e controllare sicurezza e abbonamento.
                                </p>
                                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-gray-500">
                                    Se preferisci farti aiutare direttamente, puoi contattarci telefonicamente al <span className="font-semibold text-zirel-orange-dark">+39 3461027447</span> oppure via email a <span className="font-semibold text-zirel-orange-dark">bronovito@gmail.com</span>.
                                </p>
                            </div>
                        </div>
                        <a
                            href="/"
                            className="apple-button-secondary inline-flex items-center justify-center gap-2 self-start px-5 py-3"
                        >
                            <ArrowLeft className="h-4 w-4" />
                            Torna alla dashboard
                        </a>
                    </div>
                </header>

                <section className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
                    <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
                        <div className="apple-card px-5 py-5">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">Indice rapido</p>
                            <nav className="mt-4 space-y-2">
                                {helpSections.map((section) => (
                                    <a
                                        key={section.id}
                                        href={`#${section.id}`}
                                        className="flex items-center gap-3 rounded-2xl border border-transparent px-3 py-3 text-sm font-semibold text-gray-600 transition hover:border-orange-100 hover:bg-orange-50/70 hover:text-zirel-orange-dark"
                                    >
                                        <section.icon className="h-4 w-4 shrink-0 text-gray-400" />
                                        <span>{section.title}</span>
                                    </a>
                                ))}
                            </nav>
                        </div>

                        <div className="apple-card px-5 py-5">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">Scorciatoie utili</p>
                            <div className="mt-4 space-y-3">
                                {quickLinks.map((item) => (
                                    <div key={item.label} className="rounded-[1.25rem] border border-gray-100 bg-gray-50 px-4 py-4">
                                        <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                                            <item.icon className="h-4 w-4 text-zirel-orange-dark" />
                                            {item.label}
                                        </div>
                                        <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="apple-card border-t-4 border-zirel-orange-dark px-5 py-5">
                            <p className="text-[11px] font-black uppercase tracking-[0.22em] text-gray-400">Supporto diretto</p>
                            <p className="mt-3 text-sm leading-relaxed text-gray-700">
                                Se vuoi una mano nella configurazione o nell’uso quotidiano della dashboard, siamo disponibili anche direttamente.
                            </p>
                            <div className="mt-4 space-y-3">
                                <div className="rounded-[1.25rem] border border-gray-100 bg-gray-50 px-4 py-4">
                                    <div className="text-sm font-bold text-gray-800">Telefono</div>
                                    <a href="tel:+393461027447" className="mt-1 inline-block text-sm font-semibold text-zirel-orange-dark">
                                        +39 3461027447
                                    </a>
                                </div>
                                <div className="rounded-[1.25rem] border border-gray-100 bg-gray-50 px-4 py-4">
                                    <div className="text-sm font-bold text-gray-800">Email</div>
                                    <a href="mailto:bronovito@gmail.com" className="mt-1 inline-block break-all text-sm font-semibold text-zirel-orange-dark">
                                        bronovito@gmail.com
                                    </a>
                                </div>
                            </div>
                        </div>
                    </aside>

                    <div className="space-y-5">
                        {helpSections.map((section) => (
                            <article key={section.id} id={section.id} className="apple-card px-5 py-5 md:px-6 md:py-6">
                                <div className="flex items-start gap-4">
                                    <div className="z-icon-chip-lg shrink-0">
                                        <section.icon className="h-6 w-6" />
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="text-2xl font-black tracking-tight text-zirel-blue">{section.title}</h2>
                                        <p className="mt-2 text-sm leading-relaxed text-gray-500 md:text-base">{section.description}</p>
                                    </div>
                                </div>

                                <div className="mt-5 space-y-3">
                                    {section.bullets.map((bullet) => (
                                        <div key={bullet} className="rounded-[1.25rem] border border-gray-100 bg-gray-50 px-4 py-4">
                                            <div className="flex items-start gap-3">
                                                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-zirel-orange-dark" />
                                                <p className="text-sm leading-relaxed text-gray-700 md:text-[15px]">{bullet}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </article>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
};

export default DashboardHelpPage;
