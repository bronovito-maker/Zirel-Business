-- WhatsApp connection status additive schema
-- Migrazione additiva consigliata per supportare connection_status ed Embedded Signup.

alter table public.tenant_whatsapp_accounts
  add column if not exists waba_id text,
  add column if not exists display_phone_number text,
  add column if not exists verified_name text,
  add column if not exists connection_status text,
  add column if not exists last_sync_at timestamptz,
  add column if not exists onboarding_error text;

alter table public.tenant_whatsapp_accounts
  drop constraint if exists chk_tenant_whatsapp_accounts_connection_status;

alter table public.tenant_whatsapp_accounts
  add constraint chk_tenant_whatsapp_accounts_connection_status
  check (
    connection_status is null or
    connection_status in (
      'not_connected',
      'connection_in_progress',
      'connected',
      'requires_attention',
      'error'
    )
  );

create index if not exists idx_tenant_whatsapp_accounts_connection_status
  on public.tenant_whatsapp_accounts (tenant_id, connection_status);

comment on column public.tenant_whatsapp_accounts.connection_status is
'Product-level WhatsApp channel state for dashboard and Embedded Signup.';
