-- =============================================
-- DIAGNOSE: Check Where Sales Data Actually Is
-- =============================================

DO $$
DECLARE
  v_warungku_store_id uuid;
  v_user1_id uuid;
  v_user2_id uuid;
  v_total_sales numeric;
BEGIN
  -- Get Warungku store ID
  SELECT id INTO v_warungku_store_id FROM stores WHERE slug = 'warungku' LIMIT 1;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SALES DATA INVENTORY';
  RAISE NOTICE '========================================';

  IF v_warungku_store_id IS NULL THEN
    RAISE NOTICE 'Warungku store (slug: warungku) not found!';
    RETURN;
  END IF;

  RAISE NOTICE 'Warungku Store ID: %', v_warungku_store_id;

  -- Count total sales in Warungku
  SELECT COALESCE(SUM(total), 0) INTO v_total_sales
  FROM sales
  WHERE store_id = v_warungku_store_id;

  RAISE NOTICE 'Total Sales in Warungku: Rp %', v_total_sales;

  -- Get user IDs
  SELECT id INTO v_user1_id FROM auth.users WHERE email = 'ricky.yusar@rsquareidea.my.id' LIMIT 1;
  SELECT id INTO v_user2_id FROM auth.users WHERE email = 'ricky.yusar@gmail.com' LIMIT 1;

  -- Check user memberships
  RAISE NOTICE '';
  RAISE NOTICE 'User Memberships:';

  IF EXISTS (SELECT 1 FROM store_members WHERE user_id = v_user1_id AND store_id = v_warungku_store_id) THEN
    RAISE NOTICE '  ✓ ricky.yusar@rsquareidea.my.id is member of Warungku';
  ELSE
    RAISE NOTICE '  ✗ ricky.yusar@rsquareidea.my.id is NOT member of Warungku';
  END IF;

  IF EXISTS (SELECT 1 FROM store_members WHERE user_id = v_user2_id AND store_id = v_warungku_store_id) THEN
    RAISE NOTICE '  ✓ ricky.yusar@gmail.com is member of Warungku';
  ELSE
    RAISE NOTICE '  ✗ ricky.yusar@gmail.com is NOT member of Warungku';
  END IF;

  -- Count sales by checking if user can access them
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- Detailed sales data for Warungku
SELECT
  'Warungku Sales Summary' as info,
  COUNT(*) as total_transactions,
  SUM(total) as total_sales,
  SUM(profit) as total_profit
FROM sales s
JOIN stores st ON s.store_id = st.id
WHERE st.slug = 'warungku';

-- Recent sales in Warungku
SELECT
  s.created_at,
  s.total,
  s.profit,
  s.notes
FROM sales s
JOIN stores st ON s.store_id = st.id
WHERE st.slug = 'warungku'
ORDER BY s.created_at DESC
LIMIT 10;

-- Store ownership summary
SELECT
  u.email as user_email,
  s.name as store_name,
  s.slug as store_slug,
  sm.role as user_role,
  (SELECT COUNT(*) FROM sales WHERE store_id = s.id) as sales_count,
  (SELECT COALESCE(SUM(total), 0) FROM sales WHERE store_id = s.id) as total_sales_amount
FROM auth.users u
JOIN store_members sm ON sm.user_id = u.id
JOIN stores s ON s.id = sm.store_id
WHERE u.email IN ('ricky.yusar@rsquareidea.my.id', 'ricky.yusar@gmail.com')
ORDER BY u.email, s.name;
