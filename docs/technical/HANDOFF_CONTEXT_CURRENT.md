# Handoff Context (Current)

Data: 2026-03-20

## Stato generale

Il progetto Zirèl non è più in fase prototipo. Al momento è in uno stato di **beta pubblica molto solida / quasi production-ready**, con particolare maturità sul blocco:

- dashboard operativa
- pricing commerciale 2026
- billing Stripe aggiornato
- WhatsApp ufficiale con Embedded Signup
- handoff umano da dashboard
- supporto/compliance minima Meta

Worktree attuale:

- nessuna modifica locale non committata (`git status` pulito)

## Frontend pubblico

Pagine principali:

- Core: `demo/index.html`
- Settori commerciali: `demo/restaurant.html`, `demo/hotel.html`, `demo/professional.html`
- Demo in-character: `demo/demo.html`, `demo/hotel-demo.html`, `demo/professional-demo.html`
- Pricing: `demo/pricing.html`, `demo/pricing-restaurant.html`, `demo/pricing-hotel.html`, `demo/pricing-professional.html`
- Supporto: `demo/login.html`, `demo/register.html`, `demo/contatti.html`, `demo/faq.html`

Tenant map attuale:

- `demo/index.html` -> `zirel_official`
- `demo/pricing.html` -> `zirel_official`
- `demo/contatti.html` -> `zirel_official`
- `demo/faq.html` -> `zirel_official`
- `demo/restaurant.html` -> `zirel_restaurant`
- `demo/hotel.html` -> `zirel_hotel`
- `demo/professional.html` -> `zirel_professional`
- `demo/demo.html` -> `chiringuito_gino_001`
- `demo/hotel-demo.html` -> `hotel_rivamare_demo_001`
- `demo/professional-demo.html` -> `studio_nova_demo_001`

## Dashboard

La dashboard è stata rifattorizzata da layout troppo “landing-like” a shell più da workspace.

Stato attuale:

- sidebar desktop sinistra stabile
- drawer mobile dedicato
- top bar più compatta
- ricerca globale in header
- ricerca interna nella tab `Impostazioni`
- sezione `Aiuto` come pagina dedicata, non overlay
- footer sidebar con:
  - `Aiuto`
  - `Esci`

Polish UI già fatto:

- mobile header fisso
- drawer mobile con header/footer più solidi
- sidebar con tenant box compattato
- card WhatsApp migliorata
- supporto `Home` rimosso dal footer sidebar per ridurre ridondanza

File principali dashboard:

- `dashboard/src/components/Dashboard.tsx`
- `dashboard/src/components/BillingSection.tsx`
- `dashboard/src/components/WhatsAppChannelCard.tsx`
- `dashboard/src/components/WhatsAppHandoffPanel.tsx`
- `dashboard/src/components/DashboardHelpPage.tsx`
- `dashboard/src/components/Login.tsx`

## Aiuto / supporto in dashboard

La documentazione cliente finale è disponibile in una pagina dedicata `Aiuto`.

Contiene:

- primi passi
- impostazioni
- prezzi, prodotti, camere, servizi
- orari e disponibilità
- WhatsApp e automazioni
- widget e personalizzazione
- conversazioni e handoff umano
- abbonamento e sicurezza

Supporto umano esplicitato:

- telefono: `+39 3461027447`
- email: `bronovito@gmail.com`

## Pricing commerciale 2026

Pricing attuale allineato su dashboard, demo pages, documentazione e tenant commerciali:

- Base: `€69 / mese`
- Premium: `€129 / mese`
- Setup Base: `€399`
- Setup Premium: `€699`
- Annuale: `-50%` sul setup iniziale
- Trial: `7 giorni`
- Nota: costi di messaggistica Meta/WhatsApp esclusi

Naming verticale:

- Restaurant:
  - `Servizio`
  - `Azdora`
  - `Maestro`
- Hotel:
  - `Direct`
  - `Azdora`
  - `Gran Turismo`
- Professional:
  - `Studio`
  - `Equipe`
  - `Partner`

Fonti locali principali:

- `docs/technical/PRICING_MODEL.md`
- `dashboard/src/components/BillingSection.tsx`

## Stripe / Billing

Stato attuale:

- prodotti Stripe esistenti aggiornati nelle descrizioni/metadata
- nuovi Price creati su Stripe live per riflettere gli importi 2026
- env Vercel già aggiornate con i nuovi `Price ID`
- redeploy già eseguito

Importante:

- i vecchi Price non vanno toccati retroattivamente
- i nuovi checkout devono usare i nuovi `Price ID`

Trial reale:

- il checkout Stripe ora imposta esplicitamente `subscription_data[trial_period_days]=7`
- il trial non è più solo copy frontend

File e punti chiave:

- `Zirèl - Stripe Billing Manager.json`
- `scripts/rebuild_stripe_billing_workflow.mjs`
- `scripts/patch_stripe_workflow_runtime.mjs`

Nota operativa:

- il workflow Stripe Billing Manager va reimportato/pubblicato in n8n se non è già stato fatto dopo l’ultima patch

## WhatsApp

Stato attuale molto avanzato.

Blocco completato:

- inbound WhatsApp
- outbound WhatsApp
- AI Orchestrator
- sender Meta
- Embedded Signup
- callback backend
- card canale in dashboard
- sync Meta lato server per dettagli canale
- timestamp webhook (`last_webhook_at`, `webhook_verified_at`)
- monitoring base
- compliance minima Meta

Comportamenti chiave:

- `connection_status`
- `ai_enabled`
- `human_handoff_enabled`
- sync automatica stato canale
- `Richiede attenzione` quando mancano dati utili o segnali operativi

File chiave:

- `dashboard/api/whatsapp/embedded-signup/callback.js`
- `dashboard/api/whatsapp/channel-summary.js`
- `dashboard/api/whatsapp/sync.js`
- `dashboard/api/whatsapp/disconnect.js`
- `dashboard/api/whatsapp/automation-settings.js`
- `dashboard/api/whatsapp/human-send.js`
- `dashboard/api/_lib/whatsapp-channel-sync.js`
- `dashboard/src/components/WhatsAppChannelCard.tsx`
- `dashboard/src/components/WhatsAppHandoffPanel.tsx`

Workflow n8n chiave:

- `n8n_workflows/whatsapp_v3_ai_orchestrator.json`
- `n8n_workflows/whatsapp_v3_processor.json`
- `n8n_workflows/whatsapp_v3_outbound_sender.json`

## Handoff umano

Handoff ora esiste a due livelli:

### 1. Globale

Controllo visibile in dashboard per attivare/disattivare l’automazione AI WhatsApp a livello tenant.

Campo rilevante:

- `tenant_whatsapp_accounts.ai_enabled`

### 2. Per conversazione

Dalla vista `Conversazioni`:

- `Passa a operatore`
- `Riattiva AI`
- `Chiudi`

In più:

- se l’operatore invia un messaggio da Zirèl, la conversazione passa automaticamente a `human_handoff`

Limite noto:

- l’auto-handoff affidabile oggi vale quando l’umano scrive **da dashboard Zirèl**
- non è garantita intercettazione di outbound umani scritti da client esterni non controllati da Zirèl

## Tenant commerciali

Tenant allineati al nuovo positioning 2026:

- `zirel_official`
- `zirel_hotel`
- `zirel_restaurant`
- `zirel_professional`

Aggiornamenti fatti:

- pricing nuovo
- trial 7 giorni
- WhatsApp e handoff menzionati
- copy più maturo
- verticalizzazione corretta

Nota:

- verificare sempre che non restino claim troppo forti come “nessuna carta di credito richiesta” se non garantiti nel flow reale

## Tenant demo

Tenant demo realistici:

- `chiringuito_gino_001`
- `hotel_rivamare_demo_001`
- `studio_nova_demo_001`

Stato:

- mantenuti in-character
- non trasformati in tenant commerciali
- ritoccati solo dove utile per non risultare fuori fase rispetto al prodotto 2026

## Login dashboard

Login rifinito in ottica `Secure Access`.

Migliorie già fatte:

- tone of voice più prodotto
- supporto migliore ai password manager/browser save
- `Ricordami su questo dispositivo`
- sessione persistente più compatibile

File chiave:

- `dashboard/src/components/Login.tsx`
- `dashboard/src/lib/auth/auth-service.ts`

## Help page

La guida integrata è in:

- `dashboard/src/components/DashboardHelpPage.tsx`

Serve come guida cliente finale e va tenuta semplice, chiara, pulita.

## Compliance Meta minima

Già presenti:

- data deletion instructions page
- deauthorize callback

URL attesi:

- data deletion: `https://dashboard.zirel.org/meta/data-deletion`
- deauthorize: `https://dashboard.zirel.org/api/meta/deauthorize`

## Cose da controllare prima del go-live pieno

1. QA visuale finale dashboard desktop/mobile
2. test checkout reale Base/Premium con i nuovi Price
3. verifica trial 7 giorni su subscription nuove
4. verifica widget live sulle pagine commerciali
5. controllo finale copy tenant live/widget
6. conferma reimport workflow Stripe Billing Manager in n8n
7. smoke test WhatsApp:
   - connect flow
   - sync stato
   - inbound
   - outbound
   - handoff umano

## Rischi residui / punti aperti

- alcuni claim commerciali lato tenant live possono essere da ripulire se troppo aggressivi
- manca ancora una QA browser completa con Playwright o equivalente sul sito live
- il warning Vite sul bundle >500kB non blocca, ma andrà gestito in un pass successivo
- l’intercettazione automatica di messaggi umani inviati da strumenti esterni a Zirèl non è ancora un comportamento garantito

## Stato consigliato del progetto

Valutazione attuale:

- **beta pubblica forte**
- **quasi production-ready**

Non ancora:

- completamente blindato enterprise-grade

Ma già adatto a:

- primi clienti veri
- rollout controllato
- onboarding gestito o semi-self-serve

