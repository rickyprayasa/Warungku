-- ===========================================
-- HELPER FUNCTIONS for Role-Based Access Control
-- Run this after the role column migration succeeds
-- ===========================================

-- Function: Check if user has specific role
CREATE OR REPLACE FUNCTION user_has_role(user_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.users
    WHERE id = user_id;

    RETURN COALESCE(user_role, 'store_member') = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Get user role (with default)
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.users
    WHERE id = user_id;

    RETURN COALESCE(user_role, 'store_member');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Check if user is super admin
CREATE OR REPLACE FUNCTION is_super_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM public.users
        WHERE id = user_id
        AND role = 'super_admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION user_has_role TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION get_user_role TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION is_super_admin TO authenticated, service_role;

-- Test the functions
SELECT
    email,
    role,
    get_user_role(id) as computed_role,
    is_super_admin(id) as is_admin
FROM public.users
ORDER BY created_at DESC
LIMIT 5;
