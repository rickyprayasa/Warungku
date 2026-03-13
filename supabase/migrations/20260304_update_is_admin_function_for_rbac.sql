-- ===========================================
-- UPDATE is_admin() FUNCTION FOR RBAC
-- Compatible with both old platform_admins and new auth.users.role
-- ===========================================

-- Update function (using CREATE OR REPLACE to keep dependencies)
-- Checks BOTH:
-- 1. platform_admins table (legacy)
-- 2. auth.users.role column (new RBAC)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has super_admin role in auth.users
  IF EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
    AND (role = 'super_admin' OR is_super_admin = true)
    LIMIT 1
  ) THEN
    RETURN true;
  END IF;

  -- Fallback: Check platform_admins table (legacy support)
  IF EXISTS (
    SELECT 1
    FROM platform_admins
    WHERE email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin TO authenticated, service_role;

-- Verify function works
SELECT
  email,
  role,
  is_super_admin,
  is_admin() as is_admin_result
FROM auth.users
WHERE email = 'admin@rsquareidea.my.id';

-- Expected: is_admin_result should be TRUE
