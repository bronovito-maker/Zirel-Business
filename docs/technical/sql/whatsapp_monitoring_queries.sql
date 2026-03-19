-- WhatsApp monitoring queries
-- Query operative minimali per controllare lo stato della pipeline WhatsApp V3.

-- 1. Ultimi webhook events WhatsApp con esito
select
  id,
  event_type,
  event_status,
  error_message,
  created_at
from public.channel_webhook_events
where channel = 'whatsapp'
order by created_at desc
limit 50;

-- 2. Webhook events falliti o orphan nelle ultime 24 ore
select
  event_status,
  count(*) as total
from public.channel_webhook_events
where channel = 'whatsapp'
  and created_at >= now() - interval '24 hours'
  and event_status in ('failed', 'orphan')
group by 1
order by 1;

-- 3. Inbound WhatsApp ancora in pending_ai o processing da troppo tempo
select
  id,
  conversation_id,
  tenant_id,
  processing_status,
  content_text,
  created_at
from public.conversation_messages
where channel = 'whatsapp'
  and direction = 'inbound'
  and processing_status in ('pending_ai', 'processing')
  and created_at < now() - interval '5 minutes'
order by created_at asc;

-- 4. Outbound WhatsApp in errore
select
  id,
  conversation_id,
  tenant_id,
  processing_status,
  delivery_status,
  error_message,
  created_at,
  failed_at
from public.conversation_messages
where channel = 'whatsapp'
  and direction = 'outbound'
  and processing_status = 'error'
order by created_at desc;

-- 5. Outbound pronti o bloccati senza external_message_id
select
  id,
  conversation_id,
  tenant_id,
  processing_status,
  delivery_status,
  content_text,
  created_at
from public.conversation_messages
where channel = 'whatsapp'
  and direction = 'outbound'
  and external_message_id is null
order by created_at asc;

-- 6. Ultimi outbound inviati con stato e tempi
select
  id,
  conversation_id,
  tenant_id,
  external_message_id,
  delivery_status,
  sent_at,
  delivered_at,
  read_at,
  failed_at,
  created_at
from public.conversation_messages
where channel = 'whatsapp'
  and direction = 'outbound'
order by created_at desc
limit 50;

-- 7. Conversazioni con AI in errore o bloccate
select
  id,
  tenant_id,
  status,
  ai_processing_status,
  customer_name,
  customer_phone_normalized,
  updated_at,
  last_message_at,
  last_inbound_message_id,
  last_outbound_message_id
from public.tenant_conversations
where channel = 'whatsapp'
  and ai_processing_status in ('error', 'processing')
order by updated_at desc nulls last;

-- 8. Contatore rapido delle conversation WhatsApp per stato
select
  status,
  ai_processing_status,
  count(*) as total
from public.tenant_conversations
where channel = 'whatsapp'
group by 1, 2
order by 1, 2;

-- 9. Latenza grezza inbound -> outbound per le ultime risposte AI
-- Confronta il messaggio inbound sorgente con l'outbound AI che lo cita in provider_payload_json.
select
  outbound.id as outbound_id,
  outbound.conversation_id,
  outbound.tenant_id,
  inbound.id as inbound_id,
  inbound.created_at as inbound_created_at,
  outbound.created_at as outbound_created_at,
  round(extract(epoch from (outbound.created_at - inbound.created_at))) as latency_seconds,
  outbound.delivery_status,
  outbound.external_message_id
from public.conversation_messages outbound
join public.conversation_messages inbound
  on inbound.id::text = outbound.provider_payload_json->>'source_inbound_message_id'
where outbound.channel = 'whatsapp'
  and outbound.direction = 'outbound'
  and outbound.sender_role = 'ai'
order by outbound.created_at desc
limit 50;

-- 10. Tenant account mapping WhatsApp mancanti o sospetti
select
  id,
  tenant_id,
  meta_phone_number_id,
  credential_mode,
  credential_provider,
  access_token_ref,
  created_at
from public.tenant_whatsapp_accounts
order by created_at desc nulls last;
