-- Function to get public store settings (payment methods, bank details)
-- Security Definer allows bypassing RLS for public access
CREATE OR REPLACE FUNCTION get_public_store_settings(p_store_id UUID)
RETURNS TABLE (
  key TEXT,
  value TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT s.key, s.value
  FROM settings s
  WHERE s.store_id = p_store_id
  AND s.key IN ('payment_methods', 'bank_name', 'account_number', 'account_name', 'phone_number');
END;
$$;

-- Grant execute permission to anon and authenticated roles
GRANT EXECUTE ON FUNCTION get_public_store_settings(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_public_store_settings(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_public_store_settings(UUID) TO service_role;
