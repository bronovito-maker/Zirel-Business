# API Security & Token Management

## Stato attuale implementato

### Dashboard
- L'autenticazione del dashboard usa ancora un modello **token-based client-side**: il token viene validato su Supabase tramite query alla tabella `tenants`.
- La sessione locale usa `sessionStorage` come default; `localStorage` resta solo come fallback di compatibilita per token salvati in precedenza.
- L'offuscamento Base64 e solo cosmetico e non rappresenta una misura di sicurezza.
- Le operazioni su `tenants`, `prenotazioni`, `tenant-documents` e `zirel_vectors` passano attraverso `src/lib/supabase-helpers.ts`.
- La UI continua a supportare:
  - visualizzazione controllata del token
  - rigenerazione token
  - upload documenti
  - trigger del webhook di ingestione

### Widget pubblico
- `demo/public/chat.js` invia richieste a un webhook pubblico con:
  - `chatInput`
  - `sessionId`
  - `metadata.tenant_id`
- Le richieste del widget includono header di tracciabilita:
  - `X-Zirel-Source`
  - `X-Zirel-Timestamp`
  - `X-Zirel-Trace-Id`
- Il widget legge la configurazione runtime (`widget_title`, `widget_subtitle`, `widget_color`, `widget_icon`) direttamente da Supabase usando una anon key pubblica.

### Webhook ingestione documenti
- Il dashboard mantiene il payload legacy:
  - `file_url`
  - `tenant_id`
  - `filename`
- In aggiunta invia metadata `security` per traceability e futura evoluzione del protocollo.

## Limiti attuali

- La sicurezza effettiva del dashboard dipende ancora dalle policy **RLS** di Supabase.
- Il browser resta un attore privilegiato: chi controlla il client puo ancora tentare chiamate manuali se le policy server-side sono permissive.
- Il token non e ancora protetto da cookie `HttpOnly`; un eventuale XSS puo ancora compromettere la sessione attiva.
- I webhook (`chat` e `ingestion`) non usano ancora un secret condiviso o una firma HMAC.
- La anon key del widget e pubblica per definizione: la protezione dei dati letti lato widget dipende dalle policy RLS, non dal segreto della chiave.
- La rigenerazione token continua a dipendere da una RPC accessibile dal client autenticato.
- Il build della demo puo mostrare warning non bloccanti per script non-module legacy; non e un errore di runtime ma va considerato debito tecnico controllato.

## Fase futura consigliata

### Hardening server-side
- Introdurre un backend proxy o Edge Function per:
  - validare il token lato server
  - emettere sessioni corte o cookie `HttpOnly`
  - centralizzare rate limiting, audit log e validazioni

### Hardening Supabase
- Verificare e irrigidire RLS su:
  - `tenants`
  - `prenotazioni`
  - `zirel_vectors`
  - `storage.objects`
- Impedire ogni accesso cross-tenant anche in caso di client manipolato.

### Hardening webhook
- Aggiungere autenticazione compatibile lato n8n:
  - `Authorization: Bearer <shared-secret>` oppure
  - firma HMAC del payload
- Mantenere backward compatibility per una finestra di rollout controllato.

### Sessioni
- Migrare gradualmente da token client-side a cookie `HttpOnly`.
- Trattare il token API come credenziale di bootstrap, non come sessione permanente.
