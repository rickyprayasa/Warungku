-- =============================================
-- RECREATE: Public Sales RPC Function
-- =============================================
-- Fixes the issue where public transactions are not being saved
-- because migration 051 dropped the create_public_sale function.
-- 
-- This version includes proper qty_per_unit handling for stock deduction.

DROP FUNCTION IF EXISTS public.create_public_sale(json);

CREATE OR REPLACE FUNCTION public.create_public_sale(sale_data json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$

DECLARE
  v_store_id text;
  v_items json;
  v_notes text;
  v_total numeric;
  v_profit numeric;
  v_sale_id uuid;
  v_item json;
  v_product_id text;
  v_product_name text;
  v_quantity integer;
  v_price numeric;
  v_cost numeric;
  v_qty_per_unit integer;
  v_qty_to_deduct integer;
BEGIN
  -- Extract data from JSON
  v_store_id := sale_data->>'store_id';
  v_items := sale_data->'items';
  v_notes := COALESCE(sale_data->>'notes', 'Pembayaran via QRIS (Self-checkout)');

  -- Debug logging
  RAISE LOG '[create_public_sale] Starting for store_id: %', v_store_id;

  -- Validate store exists
  IF NOT EXISTS (
    SELECT 1 FROM stores WHERE id = v_store_id::uuid
  ) THEN
    RAISE LOG '[create_public_sale] Store not found: %', v_store_id;
    RETURN json_build_object('error', 'Store not found');
  END IF;

  -- Check if items array is empty
  IF json_array_length(v_items) = 0 THEN
    RAISE LOG '[create_public_sale] Empty items array';
    RETURN json_build_object('error', 'No items in cart');
  END IF;

  -- Initialize totals
  v_total := 0;
  v_profit := 0;

  -- First pass: Validate products and calculate totals
  FOR v_item IN SELECT * FROM json_array_elements(v_items)
  LOOP
    v_product_id := v_item->>'productId';
    v_quantity := (v_item->>'quantity')::integer;
    v_price := (v_item->>'price')::numeric;

    RAISE LOG '[create_public_sale] Processing item: productId=%, qty=%, price=%', v_product_id, v_quantity, v_price;

    -- Validate product belongs to store
    IF NOT EXISTS (
      SELECT 1 FROM products
      WHERE id = v_product_id::uuid AND store_id = v_store_id::uuid
    ) THEN
      RAISE LOG '[create_public_sale] Product not found: %', v_product_id;
      RETURN json_build_object('error', 'Product not found or does not belong to this store: ' || v_product_id);
    END IF;

    -- Get product cost
    SELECT COALESCE(cost, 0)
    INTO v_cost
    FROM products
    WHERE id = v_product_id::uuid;

    -- Calculate totals
    v_total := v_total + (v_price * v_quantity);
    v_profit := v_profit + ((v_price - v_cost) * v_quantity);
  END LOOP;

  RAISE LOG '[create_public_sale] Calculated totals: total=%, profit=%', v_total, v_profit;

  -- Create sale record
  INSERT INTO sales (store_id, total, profit, sale_type, notes, created_at, updated_at)
  VALUES (v_store_id::uuid, v_total, v_profit, 'retail', v_notes, NOW(), NOW())
  RETURNING id INTO v_sale_id;

  RAISE LOG '[create_public_sale] Created sale record: %', v_sale_id;

  -- Second pass: Create sale items and update stock
  FOR v_item IN SELECT * FROM json_array_elements(v_items)
  LOOP
    v_product_id := v_item->>'productId';
    v_product_name := v_item->>'productName';
    v_quantity := (v_item->>'quantity')::integer;
    v_price := (v_item->>'price')::numeric;

    -- Get product cost and qty_per_unit, lock row for update
    SELECT COALESCE(cost, 0), COALESCE(qty_per_unit, 1)
    INTO v_cost, v_qty_per_unit
    FROM products
    WHERE id = v_product_id::uuid
    FOR UPDATE;

    -- Calculate actual quantity to deduct from stock
    -- This matches the behavior in addSale: qtyToDeduct = item.quantity * (product.qtyPerUnit || 1)
    v_qty_to_deduct := v_quantity * v_qty_per_unit;

    RAISE LOG '[create_public_sale] Creating sale_item: product=%, qty=%, qty_per_unit=%, qty_to_deduct=%', 
              v_product_id, v_quantity, v_qty_per_unit, v_qty_to_deduct;

    -- Create sale item
    INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price, cost)
    VALUES (v_sale_id, v_product_id::uuid, v_product_name, v_quantity, v_price, v_cost);

    -- Update product stock (deduct by qty_to_deduct)
    UPDATE products
    SET total_stock = GREATEST(0, COALESCE(total_stock, 0) - v_qty_to_deduct),
        updated_at = NOW()
    WHERE id = v_product_id::uuid;
  END LOOP;

  RAISE LOG '[create_public_sale] SUCCESS: Sale % created with total=%', v_sale_id, v_total;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'saleId', v_sale_id,
    'total', v_total,
    'profit', v_profit
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG '[create_public_sale] ERROR: %', SQLERRM;
    RETURN json_build_object(
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permissions to both anon (public users) and authenticated
GRANT EXECUTE ON FUNCTION public.create_public_sale(json) TO anon;
GRANT EXECUTE ON FUNCTION public.create_public_sale(json) TO authenticated;

-- Verify function was created
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PUBLIC SALES RPC FUNCTION RECREATED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Function: public.create_public_sale(json)';
  RAISE NOTICE 'Permissions: anon, authenticated';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  - Proper qty_per_unit handling';
  RAISE NOTICE '  - Detailed error messages';
  RAISE NOTICE '  - Stock deduction with GREATEST(0, ...)';
  RAISE NOTICE '========================================';
END $$;
