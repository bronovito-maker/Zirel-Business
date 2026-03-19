# WhatsApp Webhook Proxy for Railway

Micro-servizio Node da deployare come service separato su Railway davanti al webhook n8n WhatsApp.

## Variabili richieste

- `META_APP_SECRET`
- `META_VERIFY_TOKEN`
- `N8N_WHATSAPP_WEBHOOK_URL`
- `INTERNAL_FORWARD_SECRET` opzionale

## Comportamento

- `GET /` gestisce `hub.challenge`
- `POST /` verifica `X-Hub-Signature-256`
- se valido, inoltra il raw body a n8n aggiungendo:
  - `x-zirel-wa-verified: true`
  - `x-zirel-wa-proxy: railway-proxy`
  - `x-zirel-forward-secret` se configurato

## Root Directory Railway

Usa questa cartella come root directory del service:

`infrastructure/railway/whatsapp-webhook-proxy`
