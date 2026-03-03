# Changelog

Tutte le modifiche importanti a questo progetto (Zirèl) saranno documentate in questo file.
Il formato è basato su [Keep a Changelog](https://keepachangelog.com/it-IT/1.0.0/).

## [Unreleased]
### Added
- Workflow `Registra_Appuntamento` consolidato come motore unico per gli appuntamenti non-restaurant, con primo ramo attivo `demo_request`.
- Conferma cliente via Resend nel workflow appuntamenti, eseguita su ramo laterale e con brand del tenant nel contenuto della mail.

### Changed
- Hardening del parser data/ora del workflow appuntamenti: supporto a date testuali e numeriche con validazione contro date impossibili.
- Rifattorizzato il flusso notifiche del workflow appuntamenti: il salvataggio in Supabase resta la fonte di verita, mentre Telegram e Resend non bloccano la risposta finale del tool.

## [1.1.0] - 2026-02-28
### Added
- **Chat Widget "Concierge" Experience**: Introdotto il messaggio di benvenuto personalizzato e le Quick Replies (Prenota, Menu, Eventi, Umano).
- **Tooltiop Animato**: Aggiunto un fumetto di richiamo che appare dopo 5 secondi sulla landing.
- **Sezioni Interattive**: Carousel multi-settore per la sezione "Per chi è Zirèl" e fisarmonica (accordion) per la sezione FAQ.
- **Repository Documentation**: Creata la struttura tecnica documentale (`README.md`, `/docs/integration`, `/docs/ai`).

### Changed
- Refactoring globale per l'allineamento dei colori di brand (Deep Ocean Blue, Sea Cyan, Sunset Orange, Sand White) e font (Outfit/Playfair).
- Riorganizzazione delle pagine: `business.html` diventa l'entry point principale (`index.html`).
- Sostituito ogni riferimento a WhatsApp con Telegram per il supporto clienti.

## [1.0.0] - Lancio Iniziale
### Added
- Creazione della Landing Page per le attività business.
- Configurazione sistema di Pricing a 3 fasce (Chiringuito, Hotel, Spiaggia).
- Implementazione del tema "Glassmorphism" per navbar fluttuanti e leggibilità.
