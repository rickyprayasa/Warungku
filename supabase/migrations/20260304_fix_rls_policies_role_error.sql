-- ===========================================
-- FIX: RLS Policies causing "role super_admin does not exist" error
-- ===========================================

-- First, let's update is_admin() to be simpler and avoid any role references
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if user has super_admin role in auth.users
  IF EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
    AND (role = 'super_admin' OR is_super_admin = true)
  ) THEN
    RETURN true;
  END IF;

  -- Fallback: Check platform_admins table (legacy support)
  IF EXISTS (
    SELECT 1 FROM platform_admins
    WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
  ) THEN
    RETURN true;
  END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION is_admin TO authenticated, service_role;

-- Drop and recreate problematic testimonials policies
DROP POLICY IF EXISTS "Admins can view all testimonials" ON testimonials;
DROP POLICY IF EXISTS "Admins can update all testimonials" ON testimonials;
DROP POLICY IF EXISTS "Admins can delete all testimonials" ON testimonials;

-- Recreate with simpler approach
CREATE POLICY "Admins can view all testimonials"
  ON testimonials FOR SELECT
  TO authenticated
  USING (
    -- Either is_admin() returns true OR user owns the testimonial
    is_admin() OR auth.uid() = user_id
  );

CREATE POLICY "Admins can update all testimonials"
  ON testimonials FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete all testimonials"
  ON testimonials FOR DELETE
  TO authenticated
  USING (is_admin());

-- Verify the function works
SELECT
  email,
  role,
  is_super_admin,
  is_admin() as is_admin_result
FROM auth.users
WHERE email = 'admin@rsquareidea.my.id';

-- Expected: is_admin_result = TRUE
