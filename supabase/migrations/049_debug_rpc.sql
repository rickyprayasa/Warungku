-- =============================================
-- FIX: Debug and Test Public Sales RPC
-- =============================================

-- First, let's see what functions exist
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CHECKING RPC FUNCTIONS';
  RAISE NOTICE '========================================';

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'create_public_sale'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE NOTICE '✅ Function create_public_sale EXISTS';

    -- Show function definition
    RAISE NOTICE 'Function return type: %',
      (SELECT prorettype::regtype FROM pg_proc WHERE proname = 'create_public_sale' LIMIT 1);
  ELSE
    RAISE NOTICE '❌ Function create_public_sale NOT FOUND!';
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- Test the function with minimal data (NO products)
DO $$
DECLARE
  v_result json;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TESTING RPC FUNCTION';
  RAISE NOTICE '========================================';

  -- Test with empty items (should work even if no products)
  v_result := public.create_public_sale('{
    "store_id": "2feec27e-301e-4fe7-9a0e-4875817b5760",
    "items": [],
    "notes": "Test with no items"
  }'::json);

  RAISE NOTICE 'Result: %', v_result;

  IF v_result->>'success' = 'true' THEN
    RAISE NOTICE '✅ FUNCTION WORKS!';
  ELSEIF v_result->>'error' IS NOT NULL THEN
    RAISE NOTICE '❌ FUNCTION RETURNED ERROR: %', v_result->>'error';
  ELSE
    RAISE NOTICE '⚠️  UNEXPECTED RESULT';
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- Show function source for debugging
SELECT
  'Function source (first 500 chars)' as info,
  LEFT(prosrc, 500) as source_code
FROM pg_proc
WHERE proname = 'create_public_sale'
  AND pronamespace = 'public'::regnamespace;
