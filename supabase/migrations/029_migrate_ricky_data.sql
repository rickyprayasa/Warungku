-- =============================================
-- Migration: Pindahkan Data ricky.yusar@rsquareidea.my.id
-- Dari DEFAULT_STORE_ID ke Warungku-Ricky Store
-- =============================================
-- Script ini akan memindahkan SEMUA data dari store default
-- ke store Warungku-Ricky yang sebenarnya

-- Store IDs
DO $$
DECLARE
  v_default_store_id UUID := '6c65a321-3576-4a38-a834-19afa1c4d83e';
  v_target_store_id UUID := '2feec27e-301e-4fe7-9a0e-4875817b5760';
  v_products_count INT;
  v_sales_count INT;
  v_purchases_count INT;
BEGIN
  -- 1. UPDATE STORE PLAN to 'enterprise'
  UPDATE stores
  SET plan = 'enterprise',
      updated_at = NOW()
  WHERE id = v_target_store_id;

  RAISE NOTICE '1. Updated Warungku-Ricky store plan to enterprise';

  -- 2. MIGRATE PRODUCTS
  UPDATE products
  SET store_id = v_target_store_id,
      updated_at = NOW()
  WHERE store_id = v_default_store_id;

  GET DIAGNOSTICS v_products_count = ROW_COUNT;
  RAISE NOTICE '2. Migrated % products', v_products_count;

  -- 3. MIGRATE SALES
  UPDATE sales
  SET store_id = v_target_store_id
  WHERE store_id = v_default_store_id;

  GET DIAGNOSTICS v_sales_count = ROW_COUNT;
  RAISE NOTICE '3. Migrated % sales', v_sales_count;

  -- 4. MIGRATE PURCHASES
  UPDATE purchases
  SET store_id = v_target_store_id
  WHERE store_id = v_default_store_id;

  GET DIAGNOSTICS v_purchases_count = ROW_COUNT;
  RAISE NOTICE '4. Migrated % purchases', v_purchases_count;

  -- 5. MIGRATE STOCK_DETAILS
  UPDATE stock_details
  SET store_id = v_target_store_id
  WHERE store_id = v_default_store_id;

  RAISE NOTICE '5. Migrated stock_details';

  -- 6. MIGRATE SUPPLIERS
  UPDATE suppliers
  SET store_id = v_target_store_id
  WHERE store_id = v_default_store_id;

  RAISE NOTICE '6. Migrated suppliers';

  -- 7. MIGRATE SNACK_REQUESTS
  UPDATE snack_requests
  SET store_id = v_target_store_id,
      updated_at = NOW()
  WHERE store_id = v_default_store_id;

  RAISE NOTICE '7. Migrated snack_requests';

  -- 8. MIGRATE RECONCILIATIONS
  UPDATE reconciliations
  SET store_id = v_target_store_id
  WHERE store_id = v_default_store_id;

  RAISE NOTICE '8. Migrated reconciliations';

  -- 9. MIGRATE SETTINGS
  UPDATE settings
  SET store_id = v_target_store_id
  WHERE store_id = v_default_store_id;

  RAISE NOTICE '9. Migrated settings';

  -- 10. FINAL SUMMARY
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'MIGRATION COMPLETED SUCCESSFULLY!';
  RAISE NOTICE 'From: DEFAULT_STORE_ID (%)', v_default_store_id;
  RAISE NOTICE 'To: Warungku-Ricky Store (%)', v_target_store_id;
  RAISE NOTICE 'Products migrated: %', v_products_count;
  RAISE NOTICE 'Sales migrated: %', v_sales_count;
  RAISE NOTICE 'Purchases migrated: %', v_purchases_count;
  RAISE NOTICE 'Store plan updated to: ENTERPRISE';
  RAISE NOTICE '===========================================';

END $$;

-- VERIFICATION QUERIES
-- Run these to verify the migration

-- Check products count in target store
SELECT
  'products' as table_name,
  COUNT(*) as count
FROM products
WHERE store_id = '2feec27e-301e-4fe7-9a0e-4875817b5760'

UNION ALL

SELECT
  'sales' as table_name,
  COUNT(*) as count
FROM sales
WHERE store_id = '2feec27e-301e-4fe7-9a0e-4875817b5760'

UNION ALL

SELECT
  'purchases' as table_name,
  COUNT(*) as count
FROM purchases
WHERE store_id = '2feec27e-301e-4fe7-9a0e-4875817b5760'

UNION ALL

SELECT
  'stock_details' as table_name,
  COUNT(*) as count
FROM stock_details
WHERE store_id = '2feec27e-301e-4fe7-9a0e-4875817b5760'

UNION ALL

SELECT
  'suppliers' as table_name,
  COUNT(*) as count
FROM suppliers
WHERE store_id = '2feec27e-301e-4fe7-9a0e-4875817b5760'

UNION ALL

SELECT
  'snack_requests' as table_name,
  COUNT(*) as count
FROM snack_requests
WHERE store_id = '2feec27e-301e-4fe7-9a0e-4875817b5760'

UNION ALL

SELECT
  'reconciliations' as table_name,
  COUNT(*) as count
FROM reconciliations
WHERE store_id = '2feec27e-301e-4fe7-9a0e-4875817b5760';

-- Check store plan
SELECT
  id,
  name,
  slug,
  plan,
  created_at
FROM stores
WHERE id = '2feec27e-301e-4fe7-9a0e-4875817b5760';

-- Check remaining data in default store (should be 0 for most tables)
SELECT
  'products' as table_name,
  COUNT(*) as remaining_count
FROM products
WHERE store_id = '6c65a321-3576-4a38-a834-19afa1c4d83e'

UNION ALL

SELECT
  'sales' as table_name,
  COUNT(*) as remaining_count
FROM sales
WHERE store_id = '6c65a321-3576-4a38-a834-19afa1c4d83e'

UNION ALL

SELECT
  'purchases' as table_name,
  COUNT(*) as remaining_count
FROM purchases
WHERE store_id = '6c65a321-3576-4a38-a834-19afa1c4d83e';
