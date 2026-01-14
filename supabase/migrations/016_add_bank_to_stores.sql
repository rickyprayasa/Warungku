-- Add bank account information to stores table
-- This allows stores to receive manual bank transfer payments

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS account_name TEXT;

-- Add comment
COMMENT ON COLUMN stores.bank_name IS 'Bank name for manual payment (e.g., Bank BCA)';
COMMENT ON COLUMN stores.account_number IS 'Bank account number for manual payment';
COMMENT ON COLUMN stores.account_name IS 'Bank account holder name for manual payment';
