-- =============================================
-- TEST: Check if RPC function exists
-- =============================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CHECKING RPC FUNCTION';
  RAISE NOTICE '========================================';

  IF EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'create_public_sale'
      AND pronamespace = 'public'::regnamespace
  ) THEN
    RAISE NOTICE '✅ Function create_public_sale EXISTS';
  ELSE
    RAISE NOTICE '❌ Function create_public_sale NOT FOUND!';
    RAISE NOTICE 'You need to run migration 046!';
  END IF;

  RAISE NOTICE '========================================';
END $$;

-- Try to call the function directly
SELECT public.create_public_sale('{
  "store_id": "2feec27e-301e-4fe7-9a0e-4875817b5760",
  "items": [],
  "notes": "test"
}'::json);
