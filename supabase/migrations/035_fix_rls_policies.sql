-- =============================================
-- FIX: Verify and Fix RLS Policies for Data Isolation
-- =============================================
-- This script ensures that RLS policies are correctly configured
-- to prevent data leakage between user accounts.

-- 1. Verify RLS is enabled on all critical tables
DO $$
BEGIN
  RAISE NOTICE 'Verifying RLS is enabled...';
END $$;

-- Check RLS status on critical tables
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('stores', 'products', 'sales', 'purchases', 'suppliers', 'store_members')
ORDER BY tablename;

-- 2. Re-apply RLS policies to ensure they're correct
-- This will drop and recreate policies with proper auth.uid() filtering

-- STORES table - Critical for preventing data leak
DROP POLICY IF EXISTS "Users can select their stores" ON stores;
CREATE POLICY "Users can select their stores" ON stores
FOR SELECT TO authenticated
USING (
  id IN (
    SELECT sm.store_id
    FROM store_members sm
    WHERE sm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their stores" ON stores;
CREATE POLICY "Users can update their stores" ON stores
FOR UPDATE TO authenticated
USING (
  id IN (
    SELECT sm.store_id
    FROM store_members sm
    WHERE sm.user_id = auth.uid()
  )
)
WITH CHECK (
  id IN (
    SELECT sm.store_id
    FROM store_members sm
    WHERE sm.user_id = auth.uid()
  )
);

-- PRODUCTS table
DROP POLICY IF EXISTS "Users can select their store products" ON products;
CREATE POLICY "Users can select their store products" ON products
FOR SELECT TO authenticated
USING (
  store_id IN (
    SELECT sm.store_id
    FROM store_members sm
    WHERE sm.user_id = auth.uid()
  )
);

-- SALES table
DROP POLICY IF EXISTS "Users can select their store sales" ON sales;
CREATE POLICY "Users can select their store sales" ON sales
FOR SELECT TO authenticated
USING (
  store_id IN (
    SELECT sm.store_id
    FROM store_members sm
    WHERE sm.user_id = auth.uid()
  )
);

-- PURCHASES table
DROP POLICY IF EXISTS "Users can select their store purchases" ON purchases;
CREATE POLICY "Users can select their store purchases" ON purchases
FOR SELECT TO authenticated
USING (
  store_id IN (
    SELECT sm.store_id
    FROM store_members sm
    WHERE sm.user_id = auth.uid()
  )
);

-- SUPPLIERS table
DROP POLICY IF EXISTS "Users can select their store suppliers" ON suppliers;
CREATE POLICY "Users can select their store suppliers" ON suppliers
FOR SELECT TO authenticated
USING (
  store_id IN (
    SELECT sm.store_id
    FROM store_members sm
    WHERE sm.user_id = auth.uid()
  )
);

-- STORE_MEMBERS table - Only see own memberships
DROP POLICY IF EXISTS "Users can select store members of their stores" ON store_members;
CREATE POLICY "Users can select store members of their stores" ON store_members
FOR SELECT TO authenticated
USING (
  store_id IN (
    SELECT sm.store_id
    FROM store_members sm
    WHERE sm.user_id = auth.uid()
  )
);

-- 3. Verification query - Check user isolation
DO $$
DECLARE
  v_user1_id uuid;
  v_user2_id uuid;
  v_user1_stores integer;
  v_user2_stores integer;
BEGIN
  -- Get user IDs
  SELECT id INTO v_user1_id FROM auth.users WHERE email = 'ricky.yusar@rsquareidea.my.id' LIMIT 1;
  SELECT id INTO v_user2_id FROM auth.users WHERE email = 'ricky.yusar@gmail.com' LIMIT 1;

  IF v_user1_id IS NULL OR v_user2_id IS NULL THEN
    RAISE NOTICE 'WARNING: One or both users not found in auth.users';
    RETURN;
  END IF;

  RAISE NOTICE 'User 1 (ricky.yusar@rsquareidea.my.id): %', v_user1_id;
  RAISE NOTICE 'User 2 (ricky.yusar@gmail.com): %', v_user2_id;

  -- Check store memberships
  SELECT COUNT(*) INTO v_user1_stores
  FROM store_members
  WHERE user_id = v_user1_id;

  SELECT COUNT(*) INTO v_user2_stores
  FROM store_members
  WHERE user_id = v_user2_id;

  RAISE NOTICE 'User 1 store memberships: %', v_user1_stores;
  RAISE NOTICE 'User 2 store memberships: %', v_user2_stores;

  -- Check for potential data leak (both users sharing same store)
  IF EXISTS (
    SELECT 1 FROM store_members sm1
    JOIN store_members sm2 ON sm1.store_id = sm2.store_id
    WHERE sm1.user_id = v_user1_id
      AND sm2.user_id = v_user2_id
  ) THEN
    RAISE NOTICE 'WARNING: Both users are members of the same store(s)!';
    RAISE NOTICE 'This is expected if they intentionally share a store.';
    RAISE NOTICE 'If this is NOT intentional, you have a security issue!';
  ELSE
    RAISE NOTICE 'OK: Users have separate stores - data isolation working';
  END IF;
END $$;

-- 4. Display current RLS policies for stores table
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'stores'
ORDER BY policyname;

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS POLICY FIX COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'IMPORTANT: After running this script:';
  RAISE NOTICE '1. Clear browser localStorage and cookies';
  RAISE NOTICE '2. Logout from both accounts';
  RAISE NOTICE '3. Login with ricky.yusar@gmail.com';
  RAISE NOTICE '4. Verify you ONLY see your own data';
  RAISE NOTICE '5. Login with ricky.yusar@rsquareidea.my.id';
  RAISE NOTICE '6. Verify you ONLY see your own data';
  RAISE NOTICE '========================================';
END $$;
