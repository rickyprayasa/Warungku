-- Recreate create_public_sale function with proper permissions for public access
CREATE OR REPLACE FUNCTION public.create_public_sale(sale_data json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
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

  -- Initialize totals
  v_total := 0;
  v_profit := 0;

  -- First pass: Calculate totals
  FOR v_item IN SELECT * FROM json_array_elements(v_items)
  LOOP
    v_product_id := v_item->>'productId';
    v_quantity := (v_item->>'quantity')::integer;
    v_price := (v_item->>'price')::numeric;

    -- Get product cost
    SELECT COALESCE(cost, 0) INTO v_cost FROM products WHERE id = v_product_id::uuid;

    v_total := v_total + (v_price * v_quantity);
    v_profit := v_profit + ((v_price - v_cost) * v_quantity);
  END LOOP;

  -- Create sale record
  INSERT INTO sales (store_id, total, profit, sale_type, notes, created_at, updated_at)
  VALUES (v_store_id::uuid, v_total, v_profit, 'retail', v_notes, NOW(), NOW())
  RETURNING id INTO v_sale_id;

  -- Second pass: Create items and update stock
  FOR v_item IN SELECT * FROM json_array_elements(v_items)
  LOOP
    v_product_id := v_item->>'productId';
    v_product_name := v_item->>'productName';
    v_quantity := (v_item->>'quantity')::integer;
    v_price := (v_item->>'price')::numeric;

    SELECT COALESCE(cost, 0), COALESCE(qty_per_unit, 1)
    INTO v_cost, v_qty_per_unit
    FROM products WHERE id = v_product_id::uuid;

    v_qty_to_deduct := v_quantity * v_qty_per_unit;

    INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price, cost)
    VALUES (v_sale_id, v_product_id::uuid, v_product_name, v_quantity, v_price, v_cost);

    UPDATE products
    SET total_stock = GREATEST(0, COALESCE(total_stock, 0) - v_qty_to_deduct),
        updated_at = NOW()
    WHERE id = v_product_id::uuid;
  END LOOP;

  RETURN json_build_object('success', true, 'saleId', v_sale_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('error', SQLERRM);
END;
$$;

-- Grant permissions to anon (public) and authenticated roles
GRANT EXECUTE ON FUNCTION public.create_public_sale(json) TO anon;
GRANT EXECUTE ON FUNCTION public.create_public_sale(json) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_public_sale(json) TO service_role;
