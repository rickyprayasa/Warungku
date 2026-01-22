-- =============================================
-- DELETE: Remove ricky.yusar@gmail.com Account
-- =============================================
-- This will safely remove the test account and all its data
-- The real account (ricky.yusar@rsquareidea.my.id) will remain intact

DO $$
DECLARE
  v_user_id uuid;
  v_user_email text := 'ricky.yusar@gmail.com';
  v_store_count integer;
  v_sales_count integer;
BEGIN
  -- Get user ID
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'User % not found. Nothing to delete.', v_user_email;
    RETURN;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DELETING USER ACCOUNT';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User: % (%)', v_user_email, v_user_id;

  -- Check what will be deleted
  SELECT COUNT(*) INTO v_store_count
  FROM store_members
  WHERE user_id = v_user_id;

  RAISE NOTICE '';
  RAISE NOTICE 'WARNING: This will DELETE:';
  RAISE NOTICE '  - % store membership(s)', v_store_count;
  RAISE NOTICE '  - All associated data (if any)';
  RAISE NOTICE '';
  RAISE NOTICE 'The REAL account (ricky.yusar@rsquareidea.my.id)';
  RAISE NOTICE 'and its data will NOT be affected.';
  RAISE NOTICE '========================================';

  -- Delete from store_members (this cascades but we do it explicitly for clarity)
  DELETE FROM store_members WHERE user_id = v_user_id;

  -- Delete from auth.users (requires service role key normally, but let's try)
  -- Note: This might fail if you don't have proper permissions
  DELETE FROM auth.users WHERE id = v_user_id;

  RAISE NOTICE '';
  RAISE NOTICE '✅ User % deleted successfully!', v_user_email;
  RAISE NOTICE '========================================';

END $$;

-- Verify deletion
SELECT
  'Remaining users' as info,
  email
FROM auth.users
WHERE email IN ('ricky.yusar@rsquareidea.my.id', 'ricky.yusar@gmail.com')
ORDER BY email;

-- Verify Warungku store still exists
SELECT
  'Warungku store status' as info,
  s.name,
  s.slug,
  s.plan,
  (SELECT COUNT(*) FROM sales WHERE store_id = s.id) as sales_count,
  (SELECT COALESCE(SUM(total), 0) FROM sales WHERE store_id = s.id) as total_sales
FROM stores s
WHERE s.slug = 'warungku';
