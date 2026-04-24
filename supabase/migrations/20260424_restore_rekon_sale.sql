-- =============================================
-- Restore correct reconciliation sale: Rp 469.319
-- The cleanup script deleted ALL [REKON] sales,
-- but 1 legitimate sale of Rp 469.319 should exist.
-- =============================================

DO $$
DECLARE
  v_store_id UUID;
  v_sale_id UUID;
  v_product RECORD;
  v_total DECIMAL := 0;
  v_profit DECIMAL := 0;
BEGIN
  -- Get the Warungku store ID
  SELECT id INTO v_store_id
  FROM stores
  WHERE LOWER(name) LIKE '%warungku%'
  LIMIT 1;

  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'Warungku store not found!';
  END IF;

  -- Insert the corrected sale record
  -- Total: Rp 469.319 (as confirmed by the store owner)
  INSERT INTO sales (store_id, total, profit, sale_type, notes, created_at)
  VALUES (
    v_store_id,
    469319,
    469319,  -- profit = total since cost is estimated
    'retail',
    '[REKON] Penjualan cash dari rekonsiliasi stok fisik (data dikoreksi)',
    '2026-04-23 15:32:00+07'::timestamptz  -- Original reconciliation time
  )
  RETURNING id INTO v_sale_id;

  RAISE NOTICE 'Created sale: % with total Rp 469.319', v_sale_id;

  -- Also create a reconciliation record so it shows in history
  INSERT INTO reconciliations (
    store_id, date, expected_cash, actual_cash, cash_difference,
    stock_items, total_stock_value, total_stock_cost,
    unidentified_amount, generated_sale_ids, notes, status, created_at
  ) VALUES (
    v_store_id,
    '2026-04-23',
    0,
    469319,
    469319,
    '[]'::jsonb,
    469319,
    0,
    0,
    ARRAY[v_sale_id],
    'Rekon Stok Fisik - data dikoreksi 24/04/2026',
    'completed',
    '2026-04-23 15:32:00+07'::timestamptz
  );

  RAISE NOTICE '✅ Sale Rp 469.319 dan record rekonsiliasi berhasil dibuat!';
END $$;

-- Verify
SELECT id, total, profit, notes, created_at
FROM sales
WHERE store_id = (SELECT id FROM stores WHERE LOWER(name) LIKE '%warungku%' LIMIT 1)
AND notes LIKE '%[REKON]%'
ORDER BY created_at DESC;
