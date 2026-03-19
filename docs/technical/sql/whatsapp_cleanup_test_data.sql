-- WhatsApp test cleanup script
-- Usa con cautela e preferibilmente dopo aver esportato i dati di test.

-- 1. Ispezione rapida
select
  direction,
  sender_role,
  processing_status,
  delivery_status,
  count(*) as total
from public.conversation_messages
where channel = 'whatsapp'
group by 1, 2, 3, 4
order by 1, 2, 3, 4;

-- 2. Lista messaggi outbound di test ancora non realmente inviati
select
  id,
  conversation_id,
  tenant_id,
  sender_role,
  content_text,
  processing_status,
  delivery_status,
  external_message_id,
  created_at
from public.conversation_messages
where channel = 'whatsapp'
  and direction = 'outbound'
  and external_message_id is null
order by created_at desc;

-- 3. Soft cleanup consigliato:
-- marca come error i vecchi outbound di test ancora pendenti
-- invece di cancellarli brutalmente.
update public.conversation_messages
set
  processing_status = 'error',
  delivery_status = 'failed',
  error_message = coalesce(error_message, 'TEST_CLEANUP: stale outbound test row')
where channel = 'whatsapp'
  and direction = 'outbound'
  and external_message_id is null
  and created_at < now() - interval '15 minutes';

-- 4. Lista webhook events testuali recenti
select
  id,
  channel,
  event_type,
  event_status,
  error_message,
  created_at
from public.channel_webhook_events
where channel = 'whatsapp'
order by created_at desc
limit 100;

-- 5. Cleanup opzionale dei webhook di test piu vecchi di 7 giorni
-- Decommentare solo se volete davvero eliminarli.
--
-- delete from public.channel_webhook_events
-- where channel = 'whatsapp'
--   and created_at < now() - interval '7 days';

-- 6. Cleanup opzionale di conversazioni demo isolate senza piu messaggi
-- Verificare sempre il risultato del select prima del delete.
select
  c.id,
  c.tenant_id,
  c.customer_name,
  c.customer_phone_normalized,
  c.created_at
from public.tenant_conversations c
left join public.conversation_messages m
  on m.conversation_id = c.id
where c.channel = 'whatsapp'
group by c.id, c.tenant_id, c.customer_name, c.customer_phone_normalized, c.created_at
having count(m.id) = 0
order by c.created_at desc;
