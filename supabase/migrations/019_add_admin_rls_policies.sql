-- Admin RLS Policies for Platform-Wide Access
-- Allows admin to view all transactions, users, and other platform data

-- =============================================
-- SUBSCRIPTION TRANSACTIONS POLICY FOR ADMIN
-- =============================================
-- Drop existing admin policy if exists
DROP POLICY IF EXISTS "Admins can view all subscription transactions" ON subscription_transactions;

-- Create policy allowing admins to view ALL subscription transactions
CREATE POLICY "Admins can view all subscription transactions"
ON subscription_transactions FOR SELECT
TO authenticated
USING (is_admin());

-- =============================================
-- DEMO ACCOUNT SETUP
-- =============================================
-- Create demo account function (run manually or through admin panel)
-- Email: ryussquall@gmail.com
-- Password: omzetindemo

-- This migration is a placeholder
-- Demo account should be created through Supabase Dashboard or Admin Panel

-- Note: The demo account setup is done manually:
-- 1. Go to Supabase Dashboard
-- 2. Go to Authentication > Users
-- 3. Create user with email: ryussquall@gmail.com, password: omzetindemo
-- 4. Mark as admin in auth.users user_metadata: { role: 'admin' }

COMMENT ON FUNCTION is_admin IS 'Checks if current user is platform admin (role: admin in user_metadata)';
