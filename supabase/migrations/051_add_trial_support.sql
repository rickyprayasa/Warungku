-- Add trial period support for Free plan
-- Stores created with Free plan get 14 days of Pro features (except custom domain)
-- After 14 days, they're downgraded back to Free

-- Add trial_ends_at column to stores table
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Add trial_started_at column to track when trial started
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS trial_started_at TIMESTAMPTZ;

-- Add is_trial_active column to easily check if store is in trial period
ALTER TABLE stores
ADD COLUMN IF NOT EXISTS is_trial_active BOOLEAN DEFAULT false;

-- Create index for trial queries
CREATE INDEX IF NOT EXISTS idx_stores_trial_ends_at ON stores(trial_ends_at);
CREATE INDEX IF NOT EXISTS idx_stores_is_trial_active ON stores(is_trial_active);

-- Create function to check and update trial status
CREATE OR REPLACE FUNCTION check_and_update_trial_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Update stores where trial has ended
    UPDATE stores
    SET
        is_trial_active = false,
        plan = 'free',
        trial_ends_at = NULL,
        trial_started_at = NULL
    WHERE
        is_trial_active = true
        AND trial_ends_at IS NOT NULL
        AND trial_ends_at <= NOW();
END;
$$;

-- Function to start trial for a store
CREATE OR REPLACE FUNCTION start_trial_period(store_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    is_updated BOOLEAN;
BEGIN
    -- Start trial for Free plan stores
    UPDATE stores
    SET
        trial_started_at = NOW(),
        trial_ends_at = NOW() + INTERVAL '14 days',
        is_trial_active = true,
        plan = 'pro'
    WHERE id = store_id
    AND plan = 'free'
    AND (is_trial_active IS FALSE OR is_trial_active IS NULL);

    GET DIAGNOSTICS is_updated = ROW_COUNT;
    RETURN is_updated;
END;
$$;

-- Create function to check if store is in trial and can use pro features
CREATE OR REPLACE FUNCTION is_trial_period_active(store_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM stores
        WHERE
            id = store_id
            AND is_trial_active = true
            AND trial_ends_at IS NOT NULL
            AND trial_ends_at > NOW()
    );
END;
$$;

-- Function to check trial expiration and return appropriate plan
CREATE OR REPLACE FUNCTION get_effective_plan(store_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_plan TEXT;
BEGIN
    -- Check if store is in active trial
    IF EXISTS (
        SELECT 1
        FROM stores
        WHERE
            id = store_id
            AND is_trial_active = true
            AND trial_ends_at IS NOT NULL
            AND trial_ends_at > NOW()
    ) THEN
        RETURN 'pro'; -- Return pro plan during trial
    END IF;

    -- Return the actual plan from database
    SELECT plan INTO current_plan
    FROM stores
    WHERE id = store_id;

    RETURN COALESCE(current_plan, 'free');
END;
$$;

-- Add comment to table for documentation
COMMENT ON COLUMN stores.trial_ends_at IS 'Date when the Free plan trial period ends (14 days after signup)';
COMMENT ON COLUMN stores.trial_started_at IS 'Date when the Free plan trial started';
COMMENT ON COLUMN stores.is_trial_active IS 'Whether the store is currently in a trial period';
