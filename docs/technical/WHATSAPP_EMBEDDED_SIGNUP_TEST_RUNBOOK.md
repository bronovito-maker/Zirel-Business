# WhatsApp Embedded Signup Test Runbook

Checklist pratica per testare il collegamento WhatsApp dalla dashboard Zirèl.

## Prerequisiti

- app Meta configurata
- `config_id` Embedded Signup disponibile
- env frontend impostate:
  - `VITE_META_APP_ID`
  - `VITE_META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID`
- env backend impostate:
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_URL`
- migration `connection_status` applicata su `tenant_whatsapp_accounts`

## Flusso da provare

1. apri la dashboard con un tenant autenticato
2. vai su `Integrazione`
3. apri il modal `Collega WhatsApp`
4. clicca `Avvia Meta`
5. completa il flow Meta
6. controlla se il form si popola con:
   - `meta_phone_number_id`
   - `waba_id`
   - eventualmente `display_phone_number`
   - eventualmente `verified_name`
7. clicca `Completa collegamento`
8. aggiorna la card canale

## Risultato atteso

- la card mostra `Connesso`
- in `tenant_whatsapp_accounts` trovi:
  - `meta_phone_number_id`
  - `waba_id`
  - `display_phone_number`
  - `verified_name`
  - `connection_status = connected`
  - `last_sync_at`

## Se Meta non restituisce tutto nel browser

Non e un blocco.

Usa il fallback manuale nel form e inserisci almeno:

- `meta_phone_number_id`
- `waba_id`

Poi clicca `Completa collegamento`.

## Query rapida di verifica

```sql
select
  tenant_id,
  meta_phone_number_id,
  waba_id,
  display_phone_number,
  verified_name,
  connection_status,
  last_sync_at,
  onboarding_error
from public.tenant_whatsapp_accounts
order by last_sync_at desc nulls last;
```

## Esiti possibili

### Successo

- card `Connesso`
- nessun errore nel toast

### Conflitto numero

- errore `WHATSAPP_SIGNUP_PHONE_CONFLICT`
- il numero e gia collegato a un altro tenant

### Tenant gia collegato

- errore `WHATSAPP_SIGNUP_ALREADY_CONNECTED`
- puoi riprovare con `replace_existing`

### Errore env

- `Avvia Meta` non parte
- controlla:
  - `VITE_META_APP_ID`
  - `VITE_META_WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID`

## Nota operativa

Questa implementazione e gia utilizzabile come ponte prodotto.

Il pezzo ancora da verificare sul campo e il comportamento preciso del ritorno Meta nel browser:

- se gli identificativi arrivano completi, il flusso e quasi self-serve
- se arrivano parziali, resta comunque disponibile il fallback manuale senza bloccare il rollout
