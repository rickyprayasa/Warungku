-- =============================================
-- FIX: Ensure public access to stores table
-- =============================================
-- This migration ensures that anonymous users can access stores by slug
-- for the public storefront feature

-- Drop any existing policies that might conflict
DROP POLICY IF EXISTS "Enable public read access" ON stores;
DROP POLICY IF EXISTS "Public can view stores" ON stores;
DROP POLICY IF EXISTS "Public can access stores by slug" ON stores;

-- Create a comprehensive public read policy
CREATE POLICY "Public can read stores"
ON stores
FOR SELECT
TO anon, authenticated
USING (true);

-- Verify the policy was created
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PUBLIC STORE ACCESS POLICY CREATED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Anonymous users can now access stores by slug';
  RAISE NOTICE '========================================';
END $$;

-- Display active policies
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd
FROM pg_policies 
WHERE tablename = 'stores';
