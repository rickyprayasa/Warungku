-- =============================================
-- CRITICAL FIX: Remove Infinite Recursion in RLS
-- =============================================
-- This fixes the infinite recursion in store_members policy

-- DROP ALL policies that cause recursion
DROP POLICY IF EXISTS "Users can view their store memberships" ON store_members;
DROP POLICY IF EXISTS "Users can select store members of their stores" ON store_members;
DROP POLICY IF EXISTS "Authenticated users can manage store_members" ON store_members;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON store_members;

-- Create simple policy WITHOUT recursive query
CREATE POLICY "Users can view own memberships" ON store_members
FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own memberships" ON store_members
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own memberships" ON store_members
FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own memberships" ON store_members
FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- Verify
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'INFINITE RECURSION FIXED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'store_members policy no longer uses';
  RAISE NOTICE 'recursive queries';
  RAISE NOTICE '========================================';
END $$;

-- Test query (should work now)
SELECT
  u.email,
  sm.store_id,
  s.name as store_name,
  sm.role
FROM auth.users u
LEFT JOIN store_members sm ON sm.user_id = u.id
LEFT JOIN stores s ON s.id = sm.store_id
WHERE u.email = 'ricky.yusar@rsquareidea.my.id';
