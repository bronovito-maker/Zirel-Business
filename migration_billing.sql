-- Migration: Add Stripe Billing Fields to Tenants table
-- Descrizione: Aggiunge i campi necessari per una gestione robusta e sicura dell'abbonamento.

ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS stripe_price_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_product_id TEXT,
ADD COLUMN IF NOT EXISTS billing_plan_code TEXT,
ADD COLUMN IF NOT EXISTS billing_last_event_id TEXT;

-- Index for faster lookups by stripe IDs
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_customer_id ON tenants(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_tenants_stripe_subscription_id ON tenants(stripe_subscription_id);
