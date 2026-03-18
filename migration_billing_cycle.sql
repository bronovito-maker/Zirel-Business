-- Add billing lifecycle fields
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS billing_cycle TEXT,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS setup_fee_paid BOOLEAN DEFAULT false;
