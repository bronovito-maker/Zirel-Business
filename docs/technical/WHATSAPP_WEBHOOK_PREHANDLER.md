# WhatsApp Webhook Pre-Handler

Blueprint operativo per mettere Cloudflare Worker davanti al webhook n8n WhatsApp.

## Perche serve

I workflow WhatsApp V3 ora assumono che il webhook POST arrivi gia verificato tramite header:

- `x-zirel-wa-verified: true`

Questo evita di delegare a n8n la verifica HMAC di Meta sul raw body, che non e affidabile.

Flusso:

1. Meta chiama il Worker
2. Il Worker valida `X-Hub-Signature-256`
3. Il Worker inoltra a n8n
4. Il Worker aggiunge `x-zirel-wa-verified: true`
5. n8n persiste l'evento solo se il webhook e trusted

## File

- Worker: [/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/infrastructure/cloudflare/whatsapp-webhook-worker.js](/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/infrastructure/cloudflare/whatsapp-webhook-worker.js)
- Config esempio: [/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/infrastructure/cloudflare/wrangler.whatsapp-example.toml](/Users/bronovito/Documents/Sviluppo-AI/Progetti-Web/Zirèl/infrastructure/cloudflare/wrangler.whatsapp-example.toml)

## Env richiesti

- `META_APP_SECRET`
- `META_VERIFY_TOKEN`
- `N8N_WHATSAPP_WEBHOOK_URL`
- `INTERNAL_FORWARD_SECRET`

`INTERNAL_FORWARD_SECRET` e facoltativo ma consigliato. Se lo usi, puoi in futuro aggiungere un secondo controllo nel workflow n8n o nel reverse proxy Railway.

## Comportamento del Worker

### GET

Gestisce la challenge Meta:

- controlla `hub.mode=subscribe`
- controlla `hub.verify_token`
- risponde con `hub.challenge`

### POST

Gestisce il webhook WhatsApp:

- legge il raw body senza modificarlo
- calcola HMAC SHA-256 usando `META_APP_SECRET`
- confronta con `x-hub-signature-256`
- se valida, inoltra il body identico a n8n

Header aggiunti verso n8n:

- `x-zirel-wa-verified: true`
- `x-zirel-wa-proxy: cloudflare-worker`
- `x-zirel-forward-secret: ...` se configurato

## Deploy rapido

1. Crea una cartella Worker o usa quella nel repo.
2. Copia il file `wrangler.whatsapp-example.toml` come `wrangler.toml`.
3. Imposta i secret:

```bash
wrangler secret put META_APP_SECRET
wrangler secret put META_VERIFY_TOKEN
wrangler secret put INTERNAL_FORWARD_SECRET
```

4. Imposta `N8N_WHATSAPP_WEBHOOK_URL` nel `wrangler.toml`.
5. Deploy:

```bash
wrangler deploy
```

## URL da configurare su Meta

Su Meta devi mettere l'URL del Worker, non quello di n8n.

Esempio:

```text
https://zirel-whatsapp-webhook.YOUR_SUBDOMAIN.workers.dev
```

## URL interno verso n8n

Il Worker deve inoltrare a:

```text
https://YOUR_N8N_HOST/webhook/whatsapp/webhook
```

## Coerenza con i workflow n8n

I workflow WhatsApp V3 nel repo ora lavorano cosi:

- default `WHATSAPP_HMAC_MODE = proxy_required`
- se manca `x-zirel-wa-verified: true`, il webhook POST viene rifiutato
- l'evento persistito in `channel_webhook_events` salva comunque il contesto di verifica

## Nota importante

Questo Worker verifica la firma Meta, ma non limita di per se chi puo chiamare direttamente n8n. Siccome i workflow n8n richiedono `x-zirel-wa-verified: true`, la protezione reale resta efficace solo se:

- l'endpoint n8n non e esposto ad altri layer che iniettano quell'header
- oppure aggiungi anche una validazione del `x-zirel-forward-secret` su un proxy o su un passaggio ulteriore

La versione attuale e gia una buona base operativa per sbloccare il runtime WhatsApp V3.
