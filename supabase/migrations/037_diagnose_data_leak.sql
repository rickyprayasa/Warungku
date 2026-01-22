-- =============================================
-- DIAGNOSE: Check Data Leak Between User Accounts
-- =============================================
-- This script checks if ricky.yusar@rsquareidea.my.id and ricky.yusar@gmail.com
-- are sharing the same store (causing data leak)

DO $$
DECLARE
  v_user1_id uuid;
  v_user2_id uuid;
  v_user1_email text := 'ricky.yusar@rsquareidea.my.id';
  v_user2_email text := 'ricky.yusar@gmail.com';
  v_record RECORD;
BEGIN
  -- Get user IDs
  SELECT id INTO v_user1_id FROM auth.users WHERE email = v_user1_email LIMIT 1;
  SELECT id INTO v_user2_id FROM auth.users WHERE email = v_user2_email LIMIT 1;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATA LEAK DIAGNOSIS';
  RAISE NOTICE '========================================';

  IF v_user1_id IS NULL THEN
    RAISE NOTICE 'User 1 (%) not found!', v_user1_email;
  ELSE
    RAISE NOTICE 'User 1: % - ID: %', v_user1_email, v_user1_id;
  END IF;

  IF v_user2_id IS NULL THEN
    RAISE NOTICE 'User 2 (%) not found!', v_user2_email;
  ELSE
    RAISE NOTICE 'User 2: % - ID: %', v_user2_email, v_user2_id;
  END IF;

  RAISE NOTICE '========================================';

  -- Check if both users exist
  IF v_user1_id IS NULL OR v_user2_id IS NULL THEN
    RAISE NOTICE 'Cannot proceed - one or both users not found';
    RETURN;
  END IF;

  -- Check store memberships for user 1
  RAISE NOTICE '';
  RAISE NOTICE 'USER 1 (%) MEMBERSHIPS:', v_user1_email;
  FOR v_record IN
    SELECT sm.store_id, s.name, s.slug, sm.role
    FROM store_members sm
    JOIN stores s ON s.id = sm.store_id
    WHERE sm.user_id = v_user1_id
  LOOP
    RAISE NOTICE '  - Store: % (Slug: %), Role: %', v_record.name, v_record.slug, v_record.role;
  END LOOP;

  -- Check store memberships for user 2
  RAISE NOTICE '';
  RAISE NOTICE 'USER 2 (%) MEMBERSHIPS:', v_user2_email;
  FOR v_record IN
    SELECT sm.store_id, s.name, s.slug, sm.role
    FROM store_members sm
    JOIN stores s ON s.id = sm.store_id
    WHERE sm.user_id = v_user2_id
  LOOP
    RAISE NOTICE '  - Store: % (Slug: %), Role: %', v_record.name, v_record.slug, v_record.role;
  END LOOP;

  -- Check for shared stores (DATA LEAK!)
  RAISE NOTICE '';
  IF EXISTS (
    SELECT 1 FROM store_members sm1
    JOIN store_members sm2 ON sm1.store_id = sm2.store_id
    WHERE sm1.user_id = v_user1_id
      AND sm2.user_id = v_user2_id
  ) THEN
    RAISE NOTICE '⚠️  DATA LEAK DETECTED!';
    RAISE NOTICE 'Both users are members of the SAME store(s)!';
    RAISE NOTICE '';
    RAISE NOTICE 'Shared store(s):';
    FOR v_record IN
      SELECT DISTINCT s.id, s.name, s.slug
      FROM store_members sm1
      JOIN store_members sm2 ON sm1.store_id = sm2.store_id
      JOIN stores s ON s.id = sm1.store_id
      WHERE sm1.user_id = v_user1_id
        AND sm2.user_id = v_user2_id
    LOOP
      RAISE NOTICE '  - % (%) - ID: %', v_record.name, v_record.slug, v_record.id;
    END LOOP;
    RAISE NOTICE '';
    RAISE NOTICE 'This means:';
    RAISE NOTICE '  - Both users can access the SAME data';
    RAISE NOTICE '  - Products, sales, etc. are SHARED between accounts';
    RAISE NOTICE '  - This is a SECURITY ISSUE if not intentional!';
  ELSE
    RAISE NOTICE '✅ NO DATA LEAK';
    RAISE NOTICE 'Users have separate stores - data isolation is working';
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- Show detailed query results
SELECT
  u.email as user_email,
  s.name as store_name,
  s.slug as store_slug,
  sm.role as user_role,
  s.plan as store_plan
FROM auth.users u
JOIN store_members sm ON sm.user_id = u.id
JOIN stores s ON s.id = sm.store_id
WHERE u.email IN ('ricky.yusar@rsquareidea.my.id', 'ricky.yusar@gmail.com')
ORDER BY u.email, s.name;
