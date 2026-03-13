-- ===========================================
-- FIX: auth.users.role column conflict with Supabase built-in
-- ===========================================
-- PROBLEM: Supabase's auth.users.role is a built-in column for PostgreSQL
-- database role names (e.g. 'authenticated', 'anon', 'service_role').
-- Writing 'super_admin' to it causes PostgreSQL error 22023:
--   "role super_admin does not exist"
--
-- SOLUTION: Store custom app roles in raw_app_meta_data JSON column,
-- and restore the built-in role column to 'authenticated'.

-- Step 1: Fix the admin user's auth.users.role back to 'authenticated'
-- and store the custom role in raw_app_meta_data instead
UPDATE auth.users
SET
  role = 'authenticated',
  is_super_admin = true,
  raw_app_meta_data = raw_app_meta_data || jsonb_build_object(
    'app_role', 'super_admin',
    'is_super_admin', true
  )
WHERE email = 'admin@rsquareidea.my.id';

-- Step 2: Fix any other users that may have had role set incorrectly
UPDATE auth.users
SET role = 'authenticated'
WHERE role NOT IN ('authenticated', 'anon', 'service_role', 'supabase_admin')
  AND role IS NOT NULL;

-- Step 3: Recreate is_admin() to check raw_app_meta_data instead of role column
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- Check is_super_admin column (boolean)
  IF EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
    AND is_super_admin = true
  ) THEN
    RETURN true;
  END IF;

  -- Check raw_app_meta_data for app_role
  IF EXISTS (
    SELECT 1
    FROM auth.users
    WHERE id = auth.uid()
    AND (
      raw_app_meta_data->>'app_role' = 'super_admin'
      OR raw_app_meta_data->>'is_super_admin' = 'true'
    )
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

GRANT EXECUTE ON FUNCTION is_admin TO authenticated, service_role;

-- Step 4: Recreate check_user_is_admin() to use raw_app_meta_data
CREATE OR REPLACE FUNCTION check_user_is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  user_is_super_admin BOOLEAN;
  user_app_role TEXT;
BEGIN
  SELECT
    is_super_admin,
    raw_app_meta_data->>'app_role'
  INTO user_is_super_admin, user_app_role
  FROM auth.users
  WHERE id = user_id
  LIMIT 1;

  RETURN COALESCE(user_is_super_admin, FALSE) OR user_app_role = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth;

GRANT EXECUTE ON FUNCTION check_user_is_admin TO authenticated, service_role;

-- Step 5: Recreate get_user_role_data() to use raw_app_meta_data
DROP FUNCTION IF EXISTS get_user_role_data(UUID);
CREATE FUNCTION get_user_role_data(p_user_id UUID)
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  role TEXT,
  is_super_admin BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id,
    au.email,
    COALESCE(au.raw_app_meta_data->>'app_role', 'store_owner') AS role,
    COALESCE(au.is_super_admin, false) AS is_super_admin
  FROM auth.users au
  WHERE au.id = p_user_id
  AND au.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_role_data TO authenticated, service_role;

-- Step 6: Update users_view to use raw_app_meta_data
-- Must DROP first because column type changes from VARCHAR(255) to TEXT
DROP VIEW IF EXISTS users_view;

CREATE VIEW users_view AS
SELECT
  id,
  email,
  COALESCE(raw_app_meta_data->>'app_role', 'store_owner')::VARCHAR(255) AS role,
  COALESCE(is_super_admin, false) AS is_super_admin,
  raw_user_meta_data,
  created_at,
  updated_at,
  last_sign_in_at
FROM auth.users
WHERE deleted_at IS NULL;

GRANT SELECT ON users_view TO authenticated, service_role, anon;

-- Step 7: Update get_user_role_from_auth() to use raw_app_meta_data
DROP FUNCTION IF EXISTS get_user_role_from_auth(UUID);
CREATE FUNCTION get_user_role_from_auth(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT raw_app_meta_data->>'app_role' INTO user_role
  FROM auth.users
  WHERE id = p_user_id;

  RETURN COALESCE(user_role, 'store_owner');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_role_from_auth TO authenticated, service_role;

-- Step 8: Update get_all_users_for_admin() to use raw_app_meta_data
DROP FUNCTION IF EXISTS get_all_users_for_admin();
CREATE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  user_id UUID,
  user_role TEXT,
  is_super_admin BOOLEAN,
  store_id UUID,
  store_name TEXT,
  store_slug TEXT,
  store_plan TEXT,
  plan_expires_at TIMESTAMPTZ,
  store_created_at TIMESTAMPTZ,
  member_role TEXT,
  member_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if executing user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND (
      is_super_admin = true
      OR raw_app_meta_data->>'app_role' = 'super_admin'
    )
    LIMIT 1
  ) THEN
    RAISE EXCEPTION 'Only admins can execute this function';
  END IF;

  RETURN QUERY
  SELECT
    au.id,
    au.email,
    au.created_at,
    au.last_sign_in_at,
    au.id as user_id,
    COALESCE(au.raw_app_meta_data->>'app_role', 'store_owner') as user_role,
    COALESCE(au.is_super_admin, false) as is_super_admin,
    s.id as store_id,
    s.name as store_name,
    s.slug as store_slug,
    s.plan as store_plan,
    s.plan_expires_at,
    s.created_at as store_created_at,
    sm.role as member_role,
    sm.created_at as member_created_at
  FROM auth.users au
  LEFT JOIN store_members sm ON sm.user_id = au.id
  LEFT JOIN stores s ON s.id = sm.store_id
  WHERE au.deleted_at IS NULL
  ORDER BY au.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_users_for_admin TO authenticated, service_role;

-- Step 9: Update update_user_role_auth() to use raw_app_meta_data
DROP FUNCTION IF EXISTS update_user_role_auth(UUID, TEXT, BOOLEAN);
CREATE FUNCTION update_user_role_auth(
  p_user_id UUID,
  p_new_role TEXT,
  p_is_super_admin BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
  current_user_is_super_admin BOOLEAN;
  current_user_app_role TEXT;
BEGIN
  -- Check if executor is super admin
  SELECT
    is_super_admin,
    raw_app_meta_data->>'app_role'
  INTO current_user_is_super_admin, current_user_app_role
  FROM auth.users
  WHERE id = auth.uid();

  IF current_user_app_role != 'super_admin' AND current_user_is_super_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Only super admins can change roles';
  END IF;

  -- Validate role
  IF p_new_role NOT IN ('super_admin', 'store_owner', 'store_member', 'cashier') THEN
    RAISE EXCEPTION 'Invalid role: %', p_new_role;
  END IF;

  -- Update user role in raw_app_meta_data (NOT in the built-in role column)
  UPDATE auth.users
  SET
    raw_app_meta_data = raw_app_meta_data || jsonb_build_object(
      'app_role', p_new_role,
      'is_super_admin', p_is_super_admin
    ),
    is_super_admin = p_is_super_admin,
    updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Role updated',
    'user_id', p_user_id,
    'new_role', p_new_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_user_role_auth TO authenticated, service_role;

-- Step 10: Verify
DO $$
DECLARE
  admin_user_id UUID;
  admin_app_role TEXT;
  admin_is_super BOOLEAN;
  admin_db_role TEXT;
BEGIN
  SELECT id, raw_app_meta_data->>'app_role', is_super_admin, role
  INTO admin_user_id, admin_app_role, admin_is_super, admin_db_role
  FROM auth.users
  WHERE email = 'admin@rsquareidea.my.id';

  IF admin_user_id IS NOT NULL THEN
    RAISE NOTICE 'Admin user found: id=%, app_role=%, is_super_admin=%, db_role=%',
      admin_user_id, admin_app_role, admin_is_super, admin_db_role;

    IF admin_db_role != 'authenticated' THEN
      RAISE NOTICE 'WARNING: db role is still %, should be authenticated', admin_db_role;
    END IF;

    IF admin_app_role = 'super_admin' AND admin_is_super = true THEN
      RAISE NOTICE 'SUCCESS: Admin user properly configured';
    ELSE
      RAISE NOTICE 'WARNING: Admin not properly configured - app_role=%, is_super=%', admin_app_role, admin_is_super;
    END IF;
  ELSE
    RAISE NOTICE 'WARNING: admin@rsquareidea.my.id not found';
  END IF;
END $$;
