-- Fix RLS Policies for subscription_plans table
-- Allow platform admins to manage subscription plans

-- Drop existing policies first
DROP POLICY IF EXISTS "Everyone can read active plans" ON subscription_plans;

-- Create new policies

-- All users (including public) can read active plans
CREATE POLICY "Everyone can read active plans"
ON subscription_plans FOR SELECT
TO public
USING (is_active = true);

-- Platform admins can read all plans (including inactive)
CREATE POLICY "Platform admins can read all plans"
ON subscription_plans FOR SELECT
TO authenticated
USING (
    auth.email() IN (SELECT email FROM platform_admins WHERE role IN ('super_admin', 'admin'))
);

-- Platform admins can insert plans
CREATE POLICY "Platform admins can insert plans"
ON subscription_plans FOR INSERT
TO authenticated
WITH CHECK (
    auth.email() IN (SELECT email FROM platform_admins WHERE role IN ('super_admin', 'admin'))
);

-- Platform admins can update plans
CREATE POLICY "Platform admins can update plans"
ON subscription_plans FOR UPDATE
TO authenticated
USING (
    auth.email() IN (SELECT email FROM platform_admins WHERE role IN ('super_admin', 'admin'))
)
WITH CHECK (
    auth.email() IN (SELECT email FROM platform_admins WHERE role IN ('super_admin', 'admin'))
);

-- Platform admins can delete plans
CREATE POLICY "Platform admins can delete plans"
ON subscription_plans FOR DELETE
TO authenticated
USING (
    auth.email() IN (SELECT email FROM platform_admins WHERE role IN ('super_admin', 'admin'))
);

-- Add missing columns if they don't exist (for compatibility with AdminSubscriptionPlansPage)
DO $$
BEGIN
    -- Add yearly_price column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscription_plans' AND column_name = 'yearly_price'
    ) THEN
        ALTER TABLE subscription_plans ADD COLUMN yearly_price DECIMAL(12, 2);
    END IF;

    -- Add max_products column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscription_plans' AND column_name = 'max_products'
    ) THEN
        ALTER TABLE subscription_plans ADD COLUMN max_products INTEGER DEFAULT 50;
    END IF;

    -- Add max_users column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscription_plans' AND column_name = 'max_users'
    ) THEN
        ALTER TABLE subscription_plans ADD COLUMN max_users INTEGER DEFAULT 1;
    END IF;

    -- Add plan_type column if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'subscription_plans' AND column_name = 'plan_type'
    ) THEN
        ALTER TABLE subscription_plans ADD COLUMN plan_type TEXT;
    END IF;
END $$;

-- Insert default Free, Pro, and Enterprise plans if they don't exist
INSERT INTO subscription_plans (name, description, price, yearly_price, duration_days, features, is_active, max_products, max_users, plan_type)
SELECT
    'Free',
    'Mulai gratis untuk warung kecil',
    0,
    0,
    30,
    '["50 Produk", "1 User", "100 Transaksi/bulan", "Laporan Dasar"]'::jsonb,
    true,
    50,
    1,
    'free'
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Free');

INSERT INTO subscription_plans (name, description, price, yearly_price, duration_days, features, is_active, max_products, max_users, plan_type)
SELECT
    'Pro',
    'Untuk warung berkembang',
    50000,
    500000,
    30,
    '["500 Produk", "3 User", "2000 Transaksi/bulan", "Laporan Lanjutan", "Export Data", "QRIS"]'::jsonb,
    true,
    500,
    3,
    'pro'
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Pro');

INSERT INTO subscription_plans (name, description, price, yearly_price, duration_days, features, is_active, max_products, max_users, plan_type)
SELECT
    'Enterprise',
    'Untuk bisnis skala besar',
    200000,
    2000000,
    30,
    '["Unlimited Produk", "Unlimited User", "Unlimited Transaksi", "Semua Fitur Pro", "Support Prioritas"]'::jsonb,
    true,
    999999,
    999999,
    'enterprise'
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Enterprise');
