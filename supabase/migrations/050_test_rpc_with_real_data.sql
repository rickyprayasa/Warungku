-- =============================================
-- TEST: RPC with Real Product Data (Fixed)
-- =============================================
-- This simulates exactly what the frontend sends

DO $$
DECLARE
  v_result json;
  v_product_id text;
  v_real_store_id uuid := '2feec27e-301e-4fe7-9a0e-4875817b5760';
  v_test_data json;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TESTING WITH REAL PRODUCT DATA';
  RAISE NOTICE '========================================';

  -- Get first real product from Warungku
  SELECT id INTO v_product_id
  FROM products
  WHERE store_id = v_real_store_id
  LIMIT 1;

  IF v_product_id IS NULL THEN
    RAISE NOTICE '⚠️  No products found in Warungku';
    RAISE NOTICE 'Creating test sale with empty items...';

    -- Test with empty items (should work)
    v_test_data := '{
      "store_id": "2feec27e-301e-4fe7-9a0e-4875817b5760",
      "items": [],
      "notes": "Test with no items"
    }'::json;

    v_result := public.create_public_sale(v_test_data);
  ELSE
    RAISE NOTICE 'Found product: %', v_product_id;
    RAISE NOTICE 'Creating test sale with this product...';

    -- Build JSON properly
    v_test_data := json_build_object(
      'store_id', '2feec27e-301e-4fe7-9a0e-4875817b5760'::text,
      'items', json_build_array(
        json_build_object(
          'productId', v_product_id::text,
          'productName', 'Test Product'::text,
          'quantity', 1::int,
          'price', 10000::int
        )
      ),
      'notes', 'Test sale'::text
    );

    v_result := public.create_public_sale(v_test_data);
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Result: %', v_result;

  IF v_result->>'success' = 'true' THEN
    RAISE NOTICE '✅ SUCCESS!';
    RAISE NOTICE 'Sale ID: %', v_result->>'saleId';
    RAISE NOTICE 'Total: %', v_result->>'total';
  ELSEIF v_result->>'error' IS NOT NULL THEN
    RAISE NOTICE '❌ ERROR: %', v_result->>'error';
  ELSE
    RAISE NOTICE '⚠️  UNEXPECTED RESULT';
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- Check if sale was created
SELECT
  'Recent sales in Warungku' as info,
  id,
  total,
  profit,
  notes,
  created_at
FROM sales
WHERE store_id = '2feec27e-301e-4fe7-9a0e-4875817b5760'
ORDER BY created_at DESC
LIMIT 5;
