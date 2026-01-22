-- =============================================
-- CHECK: Specific Store Data by ID
-- =============================================
-- Check if store ID 2feec27e-301e-4fe7-9a0e-4875817b5760 has sales data

DO $$
DECLARE
  v_store_id uuid := '2feec27e-301e-4fe7-9a0e-4875817b5760';
  v_warungku_store_id uuid;
  v_store_name text;
  v_store_slug text;
  v_sales_count integer;
  v_total_sales numeric;
BEGIN
  -- Get Warungku store ID
  SELECT id INTO v_warungku_store_id FROM stores WHERE slug = 'warungku' LIMIT 1;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STORE ID COMPARISON';
  RAISE NOTICE '========================================';

  -- Get store info for the specific ID
  SELECT name, slug INTO v_store_name, v_store_slug
  FROM stores
  WHERE id = v_store_id;

  IF v_store_name IS NULL THEN
    RAISE NOTICE 'Store ID % does NOT exist!', v_store_id;
    RAISE NOTICE 'This is the problem - invalid store ID!';
    RETURN;
  END IF;

  RAISE NOTICE 'Frontend Store ID: %', v_store_id;
  RAISE NOTICE 'Store Name: %', v_store_name;
  RAISE NOTICE 'Store Slug: %', v_store_slug;
  RAISE NOTICE '';
  RAISE NOTICE 'Warungku Store ID: %', v_warungku_store_id;

  IF v_store_id = v_warungku_store_id THEN
    RAISE NOTICE '✓ Store IDs MATCH - This is Warungku';
  ELSE
    RAISE NOTICE '✗ Store IDs DO NOT MATCH!';
    RAISE NOTICE 'Frontend is using WRONG store ID!';
    RAISE NOTICE 'This explains why data is 0!';
  END IF;

  RAISE NOTICE '';

  -- Count sales for this specific store
  SELECT COUNT(*), COALESCE(SUM(total), 0)
  INTO v_sales_count, v_total_sales
  FROM sales
  WHERE store_id = v_store_id;

  RAISE NOTICE 'Sales in store % (%):', v_store_name, v_store_slug;
  RAISE NOTICE '  - Count: %', v_sales_count;
  RAISE NOTICE '  - Total: Rp %', v_total_sales;

  -- Also check Warungku for comparison
  IF v_store_id != v_warungku_store_id THEN
    SELECT COUNT(*), COALESCE(SUM(total), 0)
    INTO v_sales_count, v_total_sales
    FROM sales
    WHERE store_id = v_warungku_store_id;

    RAISE NOTICE '';
    RAISE NOTICE 'Sales in Warungku (for comparison):';
    RAISE NOTICE '  - Count: %', v_sales_count;
    RAISE NOTICE '  - Total: Rp %', v_total_sales;
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- Show all stores for the user
SELECT
  u.email as user_email,
  s.id as store_id,
  s.name as store_name,
  s.slug as store_slug,
  sm.role as user_role,
  (SELECT COUNT(*) FROM sales WHERE store_id = s.id) as sales_count,
  (SELECT COALESCE(SUM(total), 0) FROM sales WHERE store_id = s.id) as total_sales
FROM auth.users u
JOIN store_members sm ON sm.user_id = u.id
JOIN stores s ON s.id = sm.store_id
WHERE u.email = 'ricky.yusar@rsquareidea.my.id'
ORDER BY s.name;
