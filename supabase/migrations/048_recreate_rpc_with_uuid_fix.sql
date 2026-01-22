-- =============================================
-- FIX: Recreate Public Sales RPC with Proper UUID Casting
-- =============================================

-- Drop existing function
DROP FUNCTION IF EXISTS public.create_public_sale(json);

-- Create function with proper UUID handling
CREATE OR REPLACE FUNCTION public.create_public_sale(sale_data json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$

DECLARE
  v_store_id text;
  v_store_id_uuid uuid;
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
BEGIN
  -- Extract data from JSON
  v_store_id := sale_data->>'store_id';
  v_items := sale_data->'items';
  v_notes := sale_data->>'notes';

  -- Convert to UUID once
  v_store_id_uuid := v_store_id::uuid;

  -- Validate store exists
  IF NOT EXISTS (
    SELECT 1 FROM stores WHERE id = v_store_id_uuid
  ) THEN
    RETURN json_build_object('error', 'Store not found');
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

    -- Validate product belongs to store
    IF NOT EXISTS (
      SELECT 1 FROM products
      WHERE id = v_product_id::uuid AND store_id = v_store_id_uuid
    ) THEN
      RETURN json_build_object('error', 'Product not found or does not belong to this store');
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

  -- Create sale record
  INSERT INTO sales (store_id, total, profit, notes, created_at, updated_at)
  VALUES (v_store_id_uuid, v_total, v_profit, v_notes, NOW(), NOW())
  RETURNING id INTO v_sale_id;

  -- Second pass: Create sale items and update stock
  FOR v_item IN SELECT * FROM json_array_elements(v_items)
  LOOP
    v_product_id := v_item->>'productId';
    v_product_name := v_item->>'productName';
    v_quantity := (v_item->>'quantity')::integer;
    v_price := (v_item->>'price')::numeric;

    -- Get product cost and lock row for update
    SELECT COALESCE(cost, 0)
    INTO v_cost
    FROM products
    WHERE id = v_product_id::uuid
    FOR UPDATE;

    -- Create sale item
    INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price, cost)
    VALUES (v_sale_id, v_product_id::uuid, v_product_name, v_quantity, v_price, v_cost);

    -- Update product stock
    UPDATE products
    SET total_stock = total_stock - v_quantity,
        updated_at = NOW()
    WHERE id = v_product_id::uuid;
  END LOOP;

  -- Return success
  RETURN json_build_object(
    'success', true,
    'saleId', v_sale_id,
    'total', v_total,
    'profit', v_profit
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_public_sale(json) TO anon;
GRANT EXECUTE ON FUNCTION public.create_public_sale(json) TO authenticated;

-- Verify and test
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PUBLIC SALES RPC FUNCTION CREATED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Function: public.create_public_sale(json)';
  RAISE NOTICE 'UUID Casting: FIXED';
  RAISE NOTICE 'Permissions: anon, authenticated';
  RAISE NOTICE '========================================';
END $$;

-- Test with real data
SELECT public.create_public_sale('{
  "store_id": "2feec27e-301e-4fe7-9a0e-4875817b5760",
  "items": [{
    "productId": "test-product-id",
    "productName": "Test Product",
    "quantity": 1,
    "price": 10000
  }],
  "notes": "Test"
}'::json) as test_result;
