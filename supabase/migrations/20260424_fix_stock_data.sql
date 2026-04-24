-- =============================================
-- Data Correction: Fix corrupted stock quantities
-- Caused by failed reconciliation attempts that
-- partially committed stock changes.
-- =============================================

-- First, let's find the store and verify products
DO $$
DECLARE
  v_store_id UUID;
BEGIN
  -- Get the Warungku store ID
  SELECT id INTO v_store_id
  FROM stores
  WHERE LOWER(name) LIKE '%warungku%'
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Warungku store not found!';
  END IF;

  RAISE NOTICE 'Store ID: %', v_store_id;

  -- Update each product's total_stock to correct values
  -- These values are the correct quantities as provided by the store owner

  UPDATE products SET total_stock = 1
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%sukro oven besar%';
  RAISE NOTICE 'Updated Sukro Oven Besar → 1';

  UPDATE products SET total_stock = 7
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%beng-beng%';
  RAISE NOTICE 'Updated Beng-beng → 7';

  UPDATE products SET total_stock = 80
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%rsquare snack%';
  RAISE NOTICE 'Updated Rsquare Snack → 80';

  UPDATE products SET total_stock = 10
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%go potato%';
  RAISE NOTICE 'Updated Go Potato → 10';

  UPDATE products SET total_stock = 12
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%serena%';
  RAISE NOTICE 'Updated Serena → 12';

  UPDATE products SET total_stock = 13
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%tricks%';
  RAISE NOTICE 'Updated Tricks → 13';

  UPDATE products SET total_stock = 80
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%yupi%';
  RAISE NOTICE 'Updated Yupi → 80';

  UPDATE products SET total_stock = 24
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%chuba%';
  RAISE NOTICE 'Updated Chuba → 24';

  UPDATE products SET total_stock = 4
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%superco%';
  RAISE NOTICE 'Updated Superco → 4';

  UPDATE products SET total_stock = 2
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%lemonia%';
  RAISE NOTICE 'Updated Lemonia → 2';

  UPDATE products SET total_stock = 0
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%sagu keju%';
  RAISE NOTICE 'Updated Sagu Keju → 0';

  UPDATE products SET total_stock = 150
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%kopiko%';
  RAISE NOTICE 'Updated Kopiko → 150';

  UPDATE products SET total_stock = 15
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%energen%';
  RAISE NOTICE 'Updated Energen → 15';

  UPDATE products SET total_stock = 8
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%good day%';
  RAISE NOTICE 'Updated Good Day → 8';

  UPDATE products SET total_stock = 10
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%indocafe%';
  RAISE NOTICE 'Updated Indocafe → 10';

  UPDATE products SET total_stock = 8
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%creamy latte%';
  RAISE NOTICE 'Updated Creamy Latte → 8';

  UPDATE products SET total_stock = 15
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%superstar%';
  RAISE NOTICE 'Updated Superstar → 15';

  UPDATE products SET total_stock = 1
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%roma malkist%';
  RAISE NOTICE 'Updated Roma Malkist → 1';

  UPDATE products SET total_stock = 8
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%better%';
  RAISE NOTICE 'Updated Better → 8';

  UPDATE products SET total_stock = 0
  WHERE store_id = v_store_id AND LOWER(name) LIKE '%kremez%';
  RAISE NOTICE 'Updated Kremez → 0';

  RAISE NOTICE '✅ All stock corrections applied!';
END $$;

-- Verify the updates
SELECT name, total_stock
FROM products
WHERE store_id = (SELECT id FROM stores WHERE LOWER(name) LIKE '%warungku%' LIMIT 1)
ORDER BY name;
