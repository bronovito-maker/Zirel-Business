# Patch AI Core: tool `Registra_Prenotazione_Hotel`

Questa patch introduce il nuovo tool hotel per gestire richieste dal widget chat (`hotel-demo.html`) e dai futuri tenant hotel con integrazione booking manager.

## File pronti

- AI Core aggiornato: `docs/technical/n8n/zirel_ai_core_hotel_booking_ready.json`
- Nuovo workflow tool: `docs/technical/n8n/registra_prenotazione_hotel.workflow.json`

## 1. Import workflow hotel

1. Importa `registra_prenotazione_hotel.workflow.json` in n8n.
2. Copia il nuovo `workflowId`.
3. Nel workflow AI Core, nodo `Registra_Prenotazione_Hotel`, sostituisci:

`REPLACE_WITH_HOTEL_BOOKING_WORKFLOW_ID`

con l'id reale.

## 2. Cosa fa il nuovo tool

Il tool `Registra_Prenotazione_Hotel`:

- valida i dati minimi (nome, telefono, email, check-in, check-out, ospiti)
- applica guardrail date (check-out > check-in)
- prepara payload unificato per adapter booking manager
- predispone provider popolari (`mews`, `cloudbeds`, `siteminder`, `cinque_stelle`)
- esegue un endpoint adapter che gestisce:
  - controllo disponibilita
  - tipologia camera e servizi inclusi
  - creazione richiesta pagamento
  - creazione prenotazione
  - notifiche operative
- salva l'esito in tabella `hotel_bookings`
- invia alert Telegram e update email cliente (best-effort)
- restituisce un output strutturato al tool caller

## 3. Prompt AI Core aggiornato

Il nodo `Build Prompt` viene aggiornato per il settore `hotel` con regole operative:

- riepilogo + conferma esplicita prima tool
- no conferme fittizie prima del successo tool
- gestione `payment_url` quando richiesto pagamento
- fallback chiaro se tool fallisce/non disponibile

E nel blocco `[UTILIZZO TOOLS]` viene aggiunta la policy `Registra_Prenotazione_Hotel`.

## 4. Variabili ambiente consigliate (n8n)

Nel workflow hotel il nodo `Build Booking Manager Payload` usa:

- `HOTEL_MIDDLEWARE_MEWS_URL`
- `HOTEL_MIDDLEWARE_CLOUDBEDS_URL`
- `HOTEL_MIDDLEWARE_SITEMINDER_URL`
- `HOTEL_MIDDLEWARE_5STELLE_URL`
- `HOTEL_MIDDLEWARE_FALLBACK_URL`

`HOTEL_MIDDLEWARE_FALLBACK_URL` e obbligatoria per non lasciare il flusso senza endpoint.

## 5. Contratto adapter booking manager (proposto)

Input minimo:

```json
{
  "tenant_id": "hotel_rivamare_demo_001",
  "provider": "mews",
  "actions": {
    "check_availability": true,
    "quote_room_types": true,
    "include_services": true,
    "create_payment_intent": true,
    "create_booking": true,
    "trigger_notifications": true
  }
}
```

Output minimo:

```json
{
  "success": true,
  "booking_status": "confirmed",
  "booking_reference": "HTL-2026-000123",
  "payment_required": true,
  "payment_url": "https://pay.example.com/abc",
  "room_type": "Deluxe Sea View",
  "total_amount": 420.0,
  "currency": "EUR"
}
```

## 6. Note implementative

- Se il tenant non ha provider attivo, il workflow usa modalita manuale (`manual_with_external_link` o `manual_no_link`).
- Le notifiche non bloccano il successo booking (nodi con `onError: continueRegularOutput`).
- Lo stato finale visibile al chatbot arriva da `Build Final Response`, quindi il bot puo rispondere in modo affidabile senza inventare.
