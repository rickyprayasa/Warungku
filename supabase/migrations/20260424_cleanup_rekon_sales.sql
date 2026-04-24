-- =============================================
-- Cleanup: Delete bogus [REKON] sales and fix stock_details
-- Run this AFTER 20260424_fix_stock_data.sql
-- =============================================

DO $$
DECLARE
  v_store_id UUID;
  v_deleted_count INTEGER;
  v_product RECORD;
  v_current_total INTEGER;
BEGIN
  -- Get the Warungku store ID
  SELECT id INTO v_store_id
  FROM stores
  WHERE LOWER(name) LIKE '%warungku%'
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Warungku store not found!';
  END IF;

  -- Delete all [REKON] sales that were incorrectly generated
  DELETE FROM sales
  WHERE store_id = v_store_id
  AND notes LIKE '%[REKON]%';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RAISE NOTICE 'Deleted % [REKON] sales', v_deleted_count;

  -- Now sync stock_details to match total_stock for each product
  -- For each product, adjust the latest batch quantity to match total_stock
  FOR v_product IN
    SELECT id, name, total_stock
    FROM products
    WHERE store_id = v_store_id
  LOOP
    -- Get current sum of stock_details for this product
    SELECT COALESCE(SUM(quantity), 0) INTO v_current_total
    FROM stock_details
    WHERE product_id = v_product.id;

    IF v_current_total != v_product.total_stock THEN
      -- If stock_details total differs from total_stock, adjust the newest batch
      IF v_current_total > v_product.total_stock THEN
        -- Need to reduce: update the newest batch quantity
        UPDATE stock_details
        SET quantity = quantity - (v_current_total - v_product.total_stock)
        WHERE id = (
          SELECT id FROM stock_details
          WHERE product_id = v_product.id
          ORDER BY created_at DESC
          LIMIT 1
        );
        RAISE NOTICE 'Adjusted stock_details for %: % → %', v_product.name, v_current_total, v_product.total_stock;
      ELSE
        -- Need to increase: update the newest batch or create one
        IF EXISTS (SELECT 1 FROM stock_details WHERE product_id = v_product.id) THEN
          UPDATE stock_details
          SET quantity = quantity + (v_product.total_stock - v_current_total)
          WHERE id = (
            SELECT id FROM stock_details
            WHERE product_id = v_product.id
            ORDER BY created_at DESC
            LIMIT 1
          );
          RAISE NOTICE 'Adjusted stock_details for %: % → %', v_product.name, v_current_total, v_product.total_stock;
        END IF;
      END IF;
    END IF;

    -- Clean up batches with quantity <= 0
    DELETE FROM stock_details
    WHERE product_id = v_product.id AND quantity <= 0;
  END LOOP;

  RAISE NOTICE '✅ Cleanup complete!';
END $$;

-- Verify: Show products with their stock_details totals
SELECT 
  p.name,
  p.total_stock,
  COALESCE(SUM(sd.quantity), 0) as stock_details_total,
  p.total_stock - COALESCE(SUM(sd.quantity), 0) as mismatch
FROM products p
LEFT JOIN stock_details sd ON sd.product_id = p.id
WHERE p.store_id = (SELECT id FROM stores WHERE LOWER(name) LIKE '%warungku%' LIMIT 1)
GROUP BY p.id, p.name, p.total_stock
ORDER BY p.name;
