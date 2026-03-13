-- ===========================================
-- COMPREHENSIVE FIX for RLS Policy Role Errors
-- ===========================================
-- This migration fixes the "role super_admin does not exist" error
-- by creating a proper security definer function that can access auth.users

-- Step 1: Create a function with SECURITY DEFINER that can bypass RLS
-- and access auth.users directly
CREATE OR REPLACE FUNCTION check_user_is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    user_is_super_admin BOOLEAN;
    user_role TEXT;
BEGIN
    -- Query auth.users with proper error handling
    -- SECURITY DEFINER allows this function to bypass RLS on auth.users
    SELECT
        is_super_admin,
        role
    INTO user_is_super_admin, user_role
    FROM auth.users
    WHERE id = user_id
    LIMIT 1;

    -- Return true if either condition is met
    RETURN COALESCE(user_is_super_admin, FALSE) OR user_role = 'super_admin';
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION check_user_is_admin TO authenticated, service_role;

-- Step 2: Update is_admin() to use the new function
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    -- Use the new helper function
    IF check_user_is_admin(auth.uid()) THEN
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

-- Step 3: Fix store_members policies - the policies might be the source of the error
-- Drop existing policies that might be causing issues
DROP POLICY IF EXISTS "Users can view members of their stores" ON store_members;
DROP POLICY IF EXISTS "Users can insert themselves as members" ON store_members;
DROP POLICY IF EXISTS "Store owners can manage members" ON store_members;
DROP POLICY IF EXISTS "Store owners can remove members" ON store_members;
DROP POLICY IF EXISTS "Admins can view all store members" ON store_members;

-- Recreate policies with proper admin access
CREATE POLICY "Admins can view all store members"
  ON store_members FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can view members of their stores"
  ON store_members FOR SELECT
  TO authenticated
  USING (
    -- Either admin, or member of the store
    is_admin() OR store_id IN (
        SELECT store_id FROM store_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert themselves as members"
  ON store_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage any store member"
  ON store_members FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Store owners can manage members"
  ON store_members FOR UPDATE
  TO authenticated
  USING (
    store_id IN (
        SELECT store_id FROM store_members
        WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Users can remove themselves"
  ON store_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can remove any member"
  ON store_members FOR DELETE
  TO authenticated
  USING (is_admin());

-- Step 4: Fix testimonials policies
DROP POLICY IF EXISTS "Users can view their own testimonials" ON testimonials;
DROP POLICY IF EXISTS "Users can create testimonials" ON testimonials;
DROP POLICY IF EXISTS "Admins can view all testimonials" ON testimonials;
DROP POLICY IF EXISTS "Admins can update all testimonials" ON testimonials;
DROP POLICY IF EXISTS "Admins can delete all testimonials" ON testimonials;

CREATE POLICY "Users can view their own testimonials"
  ON testimonials FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all testimonials"
  ON testimonials FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Users can create testimonials"
  ON testimonials FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all testimonials"
  ON testimonials FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can delete all testimonials"
  ON testimonials FOR DELETE
  TO authenticated
  USING (is_admin());

-- Step 5: Update is_store_member function to handle admin access
CREATE OR REPLACE FUNCTION is_store_member(check_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Admins are considered members of all stores
    IF is_admin() THEN
        RETURN true;
    END IF;

    -- Check if user is a member
    RETURN EXISTS (
        SELECT 1 FROM store_members
        WHERE user_id = auth.uid() AND store_id = check_store_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Update is_store_owner function to handle admin access
CREATE OR REPLACE FUNCTION is_store_owner(check_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Admins are considered owners of all stores
    IF is_admin() THEN
        RETURN true;
    END IF;

    -- Check if user is owner
    RETURN EXISTS (
        SELECT 1 FROM store_members
        WHERE user_id = auth.uid() AND store_id = check_store_id AND role = 'owner'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Verify the functions work
DO $$
DECLARE
    admin_user_id UUID;
    is_admin_result BOOLEAN;
BEGIN
    -- Get admin user ID
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'admin@rsquareidea.my.id'
    LIMIT 1;

    IF admin_user_id IS NOT NULL THEN
        -- Test check_user_is_admin function
        SELECT check_user_is_admin(admin_user_id) INTO is_admin_result;
        RAISE NOTICE 'check_user_is_admin result for admin@rsquareidea.my.id: %', is_admin_result;

        -- Should be TRUE
        IF NOT is_admin_result THEN
            RAISE EXCEPTION 'ERROR: check_user_is_admin returned FALSE for admin user!';
        END IF;
    ELSE
        RAISE NOTICE 'WARNING: admin@rsquareidea.my.id not found in auth.users';
    END IF;
END $$;

-- Expected output:
-- NOTICE:  check_user_is_admin result for admin@rsquareidea.my.id: true
