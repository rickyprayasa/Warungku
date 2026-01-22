-- =============================================
-- FIX: Public Sales RPC - Simplified Version
-- =============================================

-- Drop existing function if exists
DROP FUNCTION IF EXISTS public.create_public_sale(json);

-- Create function WITHOUT type declarations
CREATE OR REPLACE FUNCTION public.create_public_sale(sale_data json)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

DECLARE
  _store_id text;
  _items json;
  _notes text;
  _total numeric;
  _profit numeric;
  _sale_id text;
  _item json;
  _product_id text;
  _product_name text;
  _quantity integer;
  _price numeric;
  _cost numeric;
  _product_cost numeric;
BEGIN
  _store_id := sale_data->>'store_id';
  _items := sale_data->'items';
  _notes := sale_data->>'notes';

  IF NOT EXISTS (
    SELECT 1 FROM stores WHERE id = _store_id
  ) THEN
    RETURN json_build_object('error', 'Store not found');
  END IF;

  _total := 0;
  _profit := 0;

  FOR _item IN SELECT * FROM json_array_elements(_items)
  LOOP
    _product_id := _item->>'productId';
    _quantity := (_item->>'quantity')::integer;
    _price := (_item->>'price')::numeric;

    IF NOT EXISTS (
      SELECT 1 FROM products
      WHERE id = _product_id AND store_id = _store_id
    ) THEN
      RETURN json_build_object('error', 'Product not found or does not belong to this store');
    END IF;

    SELECT
      COALESCE(cost, 0),
      COALESCE(total_stock, 0)
    INTO _product_cost, _cost
    FROM products
    WHERE id = _product_id;

    _total := _total + (_price * _quantity);
    _profit := _profit + ((_price - _product_cost) * _quantity);
  END LOOP;

  INSERT INTO sales (store_id, total, profit, notes, created_at, updated_at)
  VALUES (_store_id, _total, _profit, _notes, NOW(), NOW())
  RETURNING id INTO _sale_id;

  FOR _item IN SELECT * FROM json_array_elements(_items)
  LOOP
    _product_id := _item->>'productId';
    _product_name := _item->>'productName';
    _quantity := (_item->>'quantity')::integer;
    _price := (_item->>'price')::numeric;

    SELECT
      COALESCE(cost, 0),
      COALESCE(total_stock, 0)
    INTO _product_cost, _cost
    FROM products
    WHERE id = _product_id
    FOR UPDATE;

    INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price, cost)
    VALUES (_sale_id, _product_id, _product_name, _quantity, _price, _product_cost);

    UPDATE products
    SET total_stock = total_stock - _quantity,
        updated_at = NOW()
    WHERE id = _product_id;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'saleId', _sale_id,
    'total', _total,
    'profit', _profit
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'error', SQLERRM
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_public_sale(json) TO anon;
GRANT EXECUTE ON FUNCTION public.create_public_sale(json) TO authenticated;
