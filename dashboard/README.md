# Zirèl Dashboard

Dashboard clienti React/TypeScript connesso a Supabase.

## Dev

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Env richieste

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Env WhatsApp / Meta

Per attivare il launcher `Embedded Signup` nella dashboard servono anche:

- `VITE_META_APP_ID`
- `VITE_META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID`

Opzionali:

- `VITE_META_API_VERSION`
- `VITE_META_EMBEDDED_SIGNUP_FLOW_VERSION`

Per il callback server-side servono inoltre:

- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_URL` oppure `VITE_SUPABASE_URL`

## Test rapido Collega WhatsApp

1. apri la dashboard tenant
2. vai su `Integrazione`
3. apri `Canale WhatsApp`
4. clicca `Collega WhatsApp`
5. clicca `Avvia Meta`
6. completa il flusso Meta
7. se Meta restituisce gli identificativi nel browser, il form si precompila
8. clicca `Completa collegamento`
9. verifica che la card passi a `Connesso`

Fallback:

se Meta non popola automaticamente tutti i campi nel browser, puoi completare manualmente il form con:

- `meta_phone_number_id`
- `waba_id`
- opzionalmente `display_phone_number`
- opzionalmente `verified_name`

## Note

- Routing SPA gestito da `vercel.json`.
- Le operazioni applicative passano da helper Supabase nel codice `src/lib`.
- Il callback `Embedded Signup` vive in `api/whatsapp/embedded-signup/callback.js`.
