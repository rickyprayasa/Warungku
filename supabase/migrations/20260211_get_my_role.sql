-- =========================================================================
-- get_my_role: Returns the role of the currently authenticated user
-- for a given store. Ownership is determined via store_members table
-- where role = 'owner'.
-- =========================================================================

-- Drop old version if exists
DROP FUNCTION IF EXISTS get_my_role(UUID);

CREATE OR REPLACE FUNCTION get_my_role(p_store_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  -- Look up role from store_members table
  -- This covers all roles: owner, admin, staff, cashier
  SELECT role INTO v_role
  FROM store_members
  WHERE store_id = p_store_id AND user_id = auth.uid();

  -- Return the role (or NULL if user is not a member)
  RETURN v_role;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_my_role(UUID) TO authenticated;
