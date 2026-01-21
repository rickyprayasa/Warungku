-- =============================================
-- Public Sales RPC Function
-- =============================================
-- This function allows public (unauthenticated) users to create sales
-- with proper validation to prevent cross-store data injection

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.create_public_sale(json);

-- Create function to insert sale from public checkout
CREATE OR REPLACE FUNCTION public.create_public_sale(sale_data json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store_id uuid;
  v_items json;
  v_notes text;
  v_total numeric;
  v_profit numeric;
  v_sale_id uuid;
  v_item_record json;
  v_product_id uuid;
  v_product_name text;
  v_quantity integer;
  v_price numeric;
  v_cost numeric;
  v_product_cost numeric;
BEGIN
  -- Parse input data
  v_store_id := sale_data->>'store_id';
  v_items := sale_data->'items';
  v_notes := sale_data->>'notes';
  v_total := (sale_data->>'total')::numeric;
  v_profit := COALESCE((sale_data->>'profit')::numeric, 0);

  -- Validate store exists
  IF NOT EXISTS (
    SELECT 1 FROM stores WHERE id = v_store_id
  ) THEN
    RETURN json_build_object('error', 'Store not found');
  END IF;

  -- Validate items and calculate totals
  v_total := 0;
  v_profit := 0;

  FOR v_item_record IN SELECT * FROM json_array_elements(v_items)
  LOOP
    v_product_id := v_item_record->>'productId';
    v_product_name := v_item_record->>'productName';
    v_quantity := (v_item_record->>'quantity')::integer;
    v_price := (v_item_record->>'price')::numeric;

    -- Validate product exists and belongs to this store
    IF NOT EXISTS (
      SELECT 1 FROM products
      WHERE id = v_product_id AND store_id = v_store_id
    ) THEN
      RETURN json_build_object('error', 'Product not found or does not belong to this store');
    END IF;

    -- Get product cost for profit calculation
    SELECT COALESCE(cost, 0) INTO v_product_cost
    FROM products
    WHERE id = v_product_id;

    v_cost := v_product_cost;

    -- Calculate totals
    v_total := v_total + (v_price * v_quantity);
    v_profit := v_profit + ((v_price - v_cost) * v_quantity);
  END LOOP;

  -- Insert sale
  INSERT INTO sales (store_id, total, profit, notes)
  VALUES (v_store_id, v_total, v_profit, v_notes)
  RETURNING id INTO v_sale_id;

  -- Insert sale items
  FOR v_item_record IN SELECT * FROM json_array_elements(v_items)
  LOOP
    v_product_id := v_item_record->>'productId';
    v_product_name := v_item_record->>'productName';
    v_quantity := (v_item_record->>'quantity')::integer;
    v_price := (v_item_record->>'price')::numeric;

    -- Get product cost
    SELECT COALESCE(cost, 0) INTO v_product_cost
    FROM products
    WHERE id = v_product_id;

    v_cost := v_product_cost;

    INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price, cost)
    VALUES (v_sale_id, v_product_id, v_product_name, v_quantity, v_price, v_cost);

    -- Update stock using FIFO (same logic as addSale in store-supabase.ts)
    -- This should trigger stock_detail updates and FIFO logic
    UPDATE products
    SET stock = stock - v_quantity
    WHERE id = v_product_id;
  END LOOP;

  -- Return success with sale ID
  RETURN json_build_object(
    'success', true,
    'saleId', v_sale_id,
    'total', v_total,
    'profit', v_profit
  );

EXCEPTION
  WHEN OTHERS THEN
    -- Return error message
    RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Grant execute permission to public (anon)
GRANT EXECUTE ON FUNCTION public.create_public_sale(json) TO anon;

-- Grant execute permission to authenticated
GRANT EXECUTE ON FUNCTION public.create_public_sale(json) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.create_public_sale IS 'Allows public users to create sales with validation. Ensures products belong to the correct store to prevent cross-store data injection.';
