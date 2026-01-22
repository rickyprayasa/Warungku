-- =============================================
-- Transfer Data: ricky.yusar@rsquareidea.my.id → ricky.yusar@gmail.com
-- =============================================
-- WARNING: Run this script ONLY if you want to transfer ALL data
-- from the old email account to the new email account.
-- This will affect: stores, products, sales, purchases, suppliers, etc.
-- =============================================

DO $$
DECLARE
  v_old_user_id uuid;
  v_new_user_id uuid;
  v_stores_transferred integer;
  v_products_transferred integer;
  v_sales_transferred integer;
  v_purchases_transferred integer;
BEGIN
  -- 1. Get user IDs
  SELECT id INTO v_old_user_id FROM auth.users WHERE email = 'ricky.yusar@rsquareidea.my.id' LIMIT 1;
  SELECT id INTO v_new_user_id FROM auth.users WHERE email = 'ricky.yusar@gmail.com' LIMIT 1;

  -- Check if both users exist
  IF v_old_user_id IS NULL THEN
    RAISE EXCEPTION 'Old user (ricky.yusar@rsquareidea.my.id) not found!';
  END IF;

  IF v_new_user_id IS NULL THEN
    RAISE EXCEPTION 'New user (ricky.yusar@gmail.com) not found! Please create this account first.';
  END IF;

  RAISE NOTICE 'Old User ID: %', v_old_user_id;
  RAISE NOTICE 'New User ID: %', v_new_user_id;

  -- 2. Transfer stores
  UPDATE stores SET user_id = v_new_user_id WHERE user_id = v_old_user_id;
  GET DIAGNOSTICS v_stores_transferred = ROW_COUNT;
  RAISE NOTICE 'Stores transferred: %', v_stores_transferred;

  -- 3. Verify products (should be automatically transferred via store_id)
  SELECT COUNT(*) INTO v_products_transferred FROM products p
  JOIN stores s ON p.store_id = s.id
  WHERE s.user_id = v_new_user_id;
  RAISE NOTICE 'Products (via stores): %', v_products_transferred;

  -- 4. Verify sales (should be automatically transferred via store_id)
  SELECT COUNT(*) INTO v_sales_transferred FROM sales sl
  JOIN stores s ON sl.store_id = s.id
  WHERE s.user_id = v_new_user_id;
  RAISE NOTICE 'Sales (via stores): %', v_sales_transferred;

  -- 5. Verify purchases (should be automatically transferred via store_id)
  SELECT COUNT(*) INTO v_purchases_transferred FROM purchases pur
  JOIN stores s ON pur.store_id = s.id
  WHERE s.user_id = v_new_user_id;
  RAISE NOTICE 'Purchases (via stores): %', v_purchases_transferred;

  -- 6. Transfer jajakan_requests (direct user_id reference)
  UPDATE jajakan_requests SET user_id = v_new_user_id WHERE user_id = v_old_user_id;

  -- 7. Update opname records (should be automatically transferred via store_id)
  -- No action needed as opname is linked to store_id

  RAISE NOTICE '========================================';
  RAISE NOTICE 'TRANSFER COMPLETE!';
  RAISE NOTICE 'From: ricky.yusar@rsquareidea.my.id (%)';
  RAISE NOTICE 'To: ricky.yusar@gmail.com (%)';
  RAISE NOTICE 'Stores: %', v_stores_transferred;
  RAISE NOTICE 'Products: %', v_products_transferred;
  RAISE NOTICE 'Sales: %', v_sales_transferred;
  RAISE NOTICE 'Purchases: %', v_purchases_transferred;
  RAISE NOTICE '========================================';
END $$;

-- Verification query
SELECT
  email,
  (SELECT COUNT(*) FROM stores WHERE stores.user_id = auth.users.id) as store_count,
  (SELECT COUNT(*) FROM products p JOIN stores s ON p.store_id = s.id WHERE s.user_id = auth.users.id) as product_count,
  (SELECT COUNT(*) FROM sales sl JOIN stores s ON sl.store_id = s.id WHERE s.user_id = auth.users.id) as sales_count
FROM auth.users
WHERE email IN ('ricky.yusar@rsquareidea.my.id', 'ricky.yusar@gmail.com');
