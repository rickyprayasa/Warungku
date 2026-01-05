-- Function to get users with their emails (requires accessing auth.users)
-- Only accessible by admins
CREATE OR REPLACE FUNCTION get_users_with_email()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  role TEXT,
  created_at TIMESTAMPTZ,
  store_id UUID,
  store_name TEXT,
  store_slug TEXT,
  store_plan TEXT,
  store_created_at TIMESTAMPTZ,
  email VARCHAR(255)
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if executing user is an admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  RETURN QUERY
  SELECT 
    sm.id,
    sm.user_id,
    sm.role,
    sm.created_at,
    s.id as store_id,
    s.name as store_name,
    s.slug as store_slug,
    s.plan as store_plan,
    s.created_at as store_created_at,
    au.email::VARCHAR(255)
  FROM store_members sm
  JOIN stores s ON sm.store_id = s.id
  JOIN auth.users au ON sm.user_id = au.id
  ORDER BY sm.created_at DESC;
END;
$$;

-- Grant execute permission to authenticated users (access control is handled inside the function)
GRANT EXECUTE ON FUNCTION get_users_with_email() TO authenticated;
