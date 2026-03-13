-- ===========================================
-- Create view and RPC functions for RBAC
-- Run this after updating the admin role
-- ===========================================

-- STEP 1: Create view for users (for easy access)
CREATE OR REPLACE VIEW users_view AS
SELECT
    id,
    email,
    role,
    is_super_admin,
    raw_user_meta_data,
    created_at,
    updated_at,
    last_sign_in_at
FROM auth.users
WHERE deleted_at IS NULL;

-- Grant access
GRANT SELECT ON users_view TO authenticated, service_role, anon;

-- STEP 2: Create RPC function to get user role
CREATE OR REPLACE FUNCTION get_user_role_from_auth(p_user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM auth.users
    WHERE id = p_user_id;

    RETURN COALESCE(user_role, 'store_owner');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute
GRANT EXECUTE ON FUNCTION get_user_role_from_auth TO authenticated, service_role;

-- STEP 3: Create RPC function to update user role (admin only)
CREATE OR REPLACE FUNCTION update_user_role_auth(
    p_user_id UUID,
    p_new_role TEXT,
    p_is_super_admin BOOLEAN DEFAULT FALSE
)
RETURNS JSONB AS $$
DECLARE
    current_admin_role TEXT;
    current_user_is_super_admin BOOLEAN;
BEGIN
    -- Check if executor is super admin
    SELECT
        role,
        is_super_admin
    INTO current_admin_role, current_user_is_super_admin
    FROM auth.users
    WHERE id = auth.uid();

    IF current_admin_role != 'super_admin' AND current_user_is_super_admin IS NOT TRUE THEN
        RAISE EXCEPTION 'Only super admins can change roles';
    END IF;

    -- Validate role
    IF p_new_role NOT IN ('super_admin', 'store_owner', 'store_member', 'cashier') THEN
        RAISE EXCEPTION 'Invalid role: %', p_new_role;
    END IF;

    -- Update user role
    UPDATE auth.users
    SET
        role = p_new_role,
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

-- Grant execute
GRANT EXECUTE ON FUNCTION update_user_role_auth TO authenticated, service_role;

-- STEP 4: Update get_all_users_for_admin to include auth.users data
CREATE OR REPLACE FUNCTION get_all_users_for_admin()
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
        AND (role = 'super_admin' OR is_super_admin = true)
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
        au.role as user_role,
        au.is_super_admin,
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

-- Grant execute
GRANT EXECUTE ON FUNCTION get_all_users_for_admin TO authenticated, service_role;

-- STEP 5: Verify everything works
-- Test view
SELECT * FROM users_view LIMIT 5;

-- Test get_user_role
SELECT get_user_role_from_auth(id) as user_role, email, role
FROM auth.users
WHERE email = 'admin@rsquareidea.my.id';

-- Expected: user_role = 'super_admin', role = 'super_admin'
