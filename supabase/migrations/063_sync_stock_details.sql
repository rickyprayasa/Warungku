-- =============================================
-- MIGRATION: Sync Stock Details with Product Total Stock
-- =============================================
-- This migration fixes stock_details to match products.total_stock
-- by adjusting batch quantities using FIFO distribution.

-- Step 1: Create a function to analyze and report discrepancies
CREATE OR REPLACE FUNCTION analyze_stock_discrepancies()
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  store_name TEXT,
  products_total_stock INTEGER,
  stock_details_sum BIGINT,
  difference BIGINT,
  batch_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id AS product_id,
    p.name AS product_name,
    s.name AS store_name,
    p.total_stock AS products_total_stock,
    COALESCE(SUM(sd.quantity), 0) AS stock_details_sum,
    p.total_stock - COALESCE(SUM(sd.quantity), 0) AS difference,
    COUNT(sd.id) AS batch_count
  FROM products p
  LEFT JOIN stock_details sd ON sd.product_id = p.id
  LEFT JOIN stores s ON s.id = p.store_id
  GROUP BY p.id, p.name, s.name, p.total_stock
  HAVING p.total_stock != COALESCE(SUM(sd.quantity), 0)
  ORDER BY ABS(p.total_stock - COALESCE(SUM(sd.quantity), 0)) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Create a function to sync stock details for a single product
CREATE OR REPLACE FUNCTION sync_product_stock_details(target_product_id UUID)
RETURNS TEXT AS $$
DECLARE
  product_record RECORD;
  target_stock INTEGER;
  current_sum INTEGER;
  diff INTEGER;
  batch RECORD;
  remaining INTEGER;
  to_deduct INTEGER;
BEGIN
  -- Get product info
  SELECT p.id, p.name, p.total_stock, p.cost, p.store_id
  INTO product_record
  FROM products p
  WHERE p.id = target_product_id;

  IF NOT FOUND THEN
    RETURN 'Product not found';
  END IF;

  target_stock := product_record.total_stock;

  -- Get current sum of stock_details
  SELECT COALESCE(SUM(quantity), 0)::INTEGER INTO current_sum
  FROM stock_details
  WHERE product_id = target_product_id;

  diff := current_sum - target_stock;

  IF diff = 0 THEN
    RETURN 'Already in sync: ' || product_record.name;
  END IF;

  IF diff > 0 THEN
    -- Need to REDUCE stock_details (more in batches than products.total_stock)
    -- Apply FIFO: reduce from oldest batches first
    remaining := diff;
    
    FOR batch IN 
      SELECT id, quantity 
      FROM stock_details 
      WHERE product_id = target_product_id AND quantity > 0
      ORDER BY created_at ASC  -- Oldest first (FIFO)
    LOOP
      IF remaining <= 0 THEN
        EXIT;
      END IF;
      
      to_deduct := LEAST(batch.quantity, remaining);
      
      UPDATE stock_details
      SET quantity = quantity - to_deduct
      WHERE id = batch.id;
      
      remaining := remaining - to_deduct;
    END LOOP;
    
    RETURN 'Synced (reduced ' || diff || ' units from batches): ' || product_record.name;
  ELSE
    -- Need to ADD to stock_details (less in batches than products.total_stock)
    -- Create a new batch with the missing quantity using product's current cost
    INSERT INTO stock_details (store_id, product_id, quantity, unit_cost)
    VALUES (
      product_record.store_id,
      target_product_id,
      ABS(diff),
      COALESCE(product_record.cost, 0)
    );
    
    RETURN 'Synced (added ' || ABS(diff) || ' units as new batch): ' || product_record.name;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Create a function to sync ALL products at once
CREATE OR REPLACE FUNCTION sync_all_stock_details()
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  result TEXT
) AS $$
DECLARE
  p RECORD;
BEGIN
  FOR p IN 
    SELECT 
      prod.id,
      prod.name,
      prod.total_stock,
      COALESCE(SUM(sd.quantity), 0)::INTEGER AS stock_sum
    FROM products prod
    LEFT JOIN stock_details sd ON sd.product_id = prod.id
    GROUP BY prod.id, prod.name, prod.total_stock
    HAVING prod.total_stock != COALESCE(SUM(sd.quantity), 0)
  LOOP
    product_id := p.id;
    product_name := p.name;
    result := sync_product_stock_details(p.id);
    RETURN NEXT;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 4: Grant execute permissions for admin use
GRANT EXECUTE ON FUNCTION analyze_stock_discrepancies() TO authenticated;
GRANT EXECUTE ON FUNCTION sync_product_stock_details(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sync_all_stock_details() TO authenticated;

-- =============================================
-- HOW TO USE:
-- =============================================
-- 
-- 1. First, ANALYZE to see which products are out of sync:
--    SELECT * FROM analyze_stock_discrepancies();
--
-- 2. To fix ALL products at once:
--    SELECT * FROM sync_all_stock_details();
--
-- 3. To fix a SINGLE product:
--    SELECT sync_product_stock_details('product-uuid-here');
--
-- =============================================
