# Workflow Hardening Runtime

Documento operativo per i workflow hardened di Zirèl.

## Contratto comune tool workflow

Ogni tool workflow deve restituire almeno:

```json
{
  "success": true,
  "code": "STRING_CODE",
  "message": "Messaggio tecnico breve",
  "final_reply": "Messaggio pronto per il chatbot",
  "tenant_id": "tenant_id",
  "trace_id": "trace_id",
  "session_id": "session_id",
  "business_status": "confirmed | rejected | manual_review",
  "availability_status": "confirmed | unavailable | manual_review | validation_failed",
  "retryable": false
}
```

## Pipeline standard

Tutti i workflow business seguono questo schema:

1. `normalize`
2. `validate`
3. `check supported sector`
4. `availability adapter payload`
5. `external adapter`
6. `normalize adapter response`
7. `persist business row`
8. `enqueue notification_outbox`
9. `build final response`

## Availability adapter contract

Input minimo:

```json
{
  "tenant_id": "tenant_id",
  "business_type": "restaurant | hotel | professional | medical | legal",
  "action": "confirm_booking | confirm_appointment",
  "trace_id": "trace_id",
  "session_id": "session_id"
}
```

Output minimo:

```json
{
  "success": true,
  "code": "ADAPTER_CODE",
  "availability_status": "confirmed",
  "booking_status": "confirmed",
  "reference": "provider_reference",
  "retryable": false
}
```

## notification_outbox

Canali iniziali implementati:

- `email_guest_hotel`
- `email_guest_restaurant`
- `email_guest_appointment`
- `email_billing_customer`
- `email_billing_internal`
- `telegram_internal_hotel`
- `telegram_internal_restaurant`
- `telegram_internal_appointment`

Campi logici usati dal dispatcher:

- `tenant_id`
- `channel`
- `template_key`
- `related_entity_type`
- `related_entity_id`
- `status`
- `retry_count`
- `max_retries`
- `next_retry_at`
- `trace_id`
- `payload`

## Billing SaaS

Il dashboard ora supporta questi campi tenant lato UI:

- `stripe_customer_id`
- `stripe_subscription_id`
- `stripe_checkout_url`
- `stripe_customer_portal_url`
- `billing_email`

La sincronizzazione Stripe resta separata dai workflow chat/prenotazione.
