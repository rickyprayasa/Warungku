-- Add role column to users table for RBAC
-- Migration: 20260304_add_user_role_column
-- Description: Implements Role-Based Access Control

-- Step 1: Add role column with default value
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'store_owner';

-- Step 2: Add check constraint for valid roles
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_role_check
  CHECK (role IN ('super_admin', 'store_owner', 'store_member', 'cashier'));

-- Step 3: Create index on role for performance
CREATE INDEX IF NOT EXISTS idx_users_role
  ON public.users(role)
  WHERE role IS NOT NULL;

-- Step 4: Update existing users based on their email
-- Set super_admin for known admin email
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'admin@rsquareidea.my.id';

-- Step 5: Add comment to document the role column
COMMENT ON COLUMN public.users.role IS 'User role for access control: super_admin, store_owner, store_member, cashier';

-- Step 6: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT SELECT, UPDATE ON TABLE public.users TO authenticated;

-- Step 7: Create function to check if user has specific role
CREATE OR REPLACE FUNCTION user_has_role(user_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = user_id;

  RETURN user_role = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create function to get user role
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM public.users
  WHERE id = user_id;

  RETURN COALESCE(user_role, 'store_member');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 9: Enable RLS on users table (if not already enabled)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 10: Create RLS policies for role column access
-- Users can read their own role
DROP POLICY IF EXISTS "Users can view own role" ON public.users;
CREATE POLICY "Users can view own role"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own role only if they are super_admin
DROP POLICY IF EXISTS "Super admin can update any role" ON public.users;
CREATE POLICY "Super admin can update any role"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- Step 11: Verification - Count users by role
SELECT
  role,
  COUNT(*) as user_count,
  array_agg(email ORDER BY email) as emails
FROM public.users
GROUP BY role
ORDER BY role;
