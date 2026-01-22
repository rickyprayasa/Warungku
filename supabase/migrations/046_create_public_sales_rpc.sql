-- =============================================
-- CREATE: Public Sales RPC Function
-- =============================================
-- Allows public (unauthenticated) users to create sales transactions
-- This is needed for the self-checkout/public storefront feature

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
BEGIN
  -- Extract data from JSON
  v_store_id := sale_data->>'store_id';
  v_items := sale_data->'items';
  v_notes := sale_data->>'notes';

  -- Validate store exists
  IF NOT EXISTS (
    SELECT 1 FROM stores WHERE id = v_store_id::uuid
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

    -- Validate product belongs to store (cast to uuid)
    IF NOT EXISTS (
      SELECT 1 FROM products
      WHERE id = v_product_id::uuid AND store_id = v_store_id::uuid
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

  -- Create sale record (cast store_id to uuid)
  INSERT INTO sales (store_id, total, profit, notes, created_at, updated_at)
  VALUES (v_store_id::uuid, v_total, v_profit, v_notes, NOW(), NOW())
  RETURNING id INTO v_sale_id;

  -- Second pass: Create sale items and update stock
  FOR v_item IN SELECT * FROM json_array_elements(v_items)
  LOOP
    v_product_id := v_item->>'productId';
    v_product_name := v_item->>'productName';
    v_quantity := (v_item->>'quantity')::integer;
    v_price := (v_item->>'price')::numeric;

    -- Get product cost and lock row for update (cast to uuid)
    SELECT COALESCE(cost, 0)
    INTO v_cost
    FROM products
    WHERE id = v_product_id::uuid
    FOR UPDATE;

    -- Create sale item (cast product_id to uuid)
    INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price, cost)
    VALUES (v_sale_id, v_product_id::uuid, v_product_name, v_quantity, v_price, v_cost);

    -- Update product stock (cast to uuid)
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
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.create_public_sale(json) TO anon;
GRANT EXECUTE ON FUNCTION public.create_public_sale(json) TO authenticated;

-- Verify function created
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PUBLIC SALES RPC FUNCTION CREATED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Function: public.create_public_sale(json)';
  RAISE NOTICE 'Permissions: anon, authenticated';
  RAISE NOTICE 'Usage: Call via supabase.rpc()';
  RAISE NOTICE '========================================';
END $$;
