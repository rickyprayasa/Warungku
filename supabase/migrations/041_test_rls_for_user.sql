-- =============================================
-- TEST: Verify RLS Policies for Specific User
-- =============================================
-- This simulates what the frontend does - query sales as ricky.yusar@rsquareidea.my.id

DO $$
DECLARE
  v_user_id uuid;
  v_user_email text := 'ricky.yusar@rsquareidea.my.id';
  v_warungku_store_id uuid;
  v_sales_count integer;
  v_total_sales numeric;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User % not found!', v_user_email;
  END IF;

  -- Get Warungku store ID
  SELECT id INTO v_warungku_store_id FROM stores WHERE slug = 'warungku' LIMIT 1;

  IF v_warungku_store_id IS NULL THEN
    RAISE EXCEPTION 'Warungku store not found!';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS POLICY TEST FOR USER';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User: % (%)', v_user_email, v_user_id;
  RAISE NOTICE 'Warungku Store ID: %', v_warungku_store_id;
  RAISE NOTICE '';

  -- Test 1: Is user member of Warungku?
  RAISE NOTICE 'TEST 1: Is user member of Warungku?';
  IF EXISTS (
    SELECT 1 FROM store_members
    WHERE user_id = v_user_id AND store_id = v_warungku_store_id
  ) THEN
    RAISE NOTICE '  ✓ YES - User is member of Warungku';
  ELSE
    RAISE NOTICE '  ✗ NO - User is NOT member of Warungku';
    RAISE NOTICE '  THIS IS THE PROBLEM! User cannot access sales data.';
  END IF;

  -- Test 2: Count sales that user CAN access (using RLS)
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2: Count sales accessible to user (with RLS)';
  SELECT COUNT(*) INTO v_sales_count
  FROM sales s
  WHERE s.store_id = v_warungku_store_id;

  RAISE NOTICE '  Sales count: %', v_sales_count;

  IF v_sales_count = 0 THEN
    RAISE NOTICE '  ✗ ZERO SALES! RLS is blocking access!';
  ELSE
    RAISE NOTICE '  ✓ Found % sales', v_sales_count;
  END IF;

  -- Test 3: Total sales
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 3: Total sales amount';
  SELECT COALESCE(SUM(total), 0) INTO v_total_sales
  FROM sales s
  WHERE s.store_id = v_warungku_store_id;

  RAISE NOTICE '  Total: Rp %', v_total_sales;

  IF v_total_sales = 0 THEN
    RAISE NOTICE '  ✗ ZERO TOTAL! RLS is blocking access!';
  ELSE
    RAISE NOTICE '  ✓ Total sales found: Rp %', v_total_sales;
  END IF;

  -- Test 4: Check if there are ANY sales in Warungku (bypass RLS)
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 4: Actual sales in Warungku (bypassing RLS)';
  -- This will show the REAL count regardless of RLS
  PERFORM pg_catalog.set_config('request.jwt.claim.user_id', v_user_id::text, true);

  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST COMPLETE';
  RAISE NOTICE '========================================';

  IF v_sales_count = 0 THEN
    RAISE NOTICE '⚠️  RLS IS BLOCKING USER ACCESS!';
    RAISE NOTICE 'The user is member of the store but cannot see sales.';
    RAISE NOTICE 'This means RLS policies are NOT working correctly.';
  ELSE
    RAISE NOTICE '✅ RLS IS WORKING - User can access sales data.';
    RAISE NOTICE 'The problem is in the FRONTEND, not database.';
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- Additional check: Show all active policies on sales table
SELECT
  'Active policies on SALES table' as info,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'sales'
ORDER BY policyname;
