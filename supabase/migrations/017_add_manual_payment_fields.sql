-- Add phone number and ensure all bank account columns exist in stores table
-- This allows stores to receive manual bank transfer payments and wallet payments

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Ensure existing columns exist
DO $$
BEGIN
    -- Add bank_name if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stores' AND column_name = 'bank_name'
    ) THEN
        ALTER TABLE stores ADD COLUMN bank_name TEXT;
    END IF;

    -- Add account_number if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stores' AND column_name = 'account_number'
    ) THEN
        ALTER TABLE stores ADD COLUMN account_number TEXT;
    END IF;

    -- Add account_name if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'stores' AND column_name = 'account_name'
    ) THEN
        ALTER TABLE stores ADD COLUMN account_name TEXT;
    END IF;
END
$$;

-- Add comments
COMMENT ON COLUMN stores.phone_number IS 'Phone number for e-wallet payments (e.g., GoPay, OVO, Dana)';
COMMENT ON COLUMN stores.bank_name IS 'Bank name for manual payment (e.g., Bank BCA)';
COMMENT ON COLUMN stores.account_number IS 'Bank account number for manual payment';
COMMENT ON COLUMN stores.account_name IS 'Bank account holder name for manual payment';
