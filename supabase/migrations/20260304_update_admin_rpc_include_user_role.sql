-- Migration: Update get_all_users_for_admin to include user role from users table
-- This adds the new role column from the users table for RBAC

CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
    id UUID,
    email VARCHAR(255),
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    user_id UUID,
    user_role TEXT,
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
        SELECT 1 FROM platform_admins
        WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        LIMIT 1
    ) THEN
        RAISE EXCEPTION 'Only admins can execute this function';
    END IF;

    RETURN QUERY
    SELECT
        au.id,
        au.email::VARCHAR(255),
        au.created_at,
        au.last_sign_in_at,
        au.id as user_id,
        u.role as user_role,
        s.id as store_id,
        s.name as store_name,
        s.slug as store_slug,
        s.plan as store_plan,
        s.plan_expires_at,
        s.created_at as store_created_at,
        sm.role as member_role,
        sm.created_at as member_created_at
    FROM auth.users au
    LEFT JOIN public.users u ON u.id = au.id
    LEFT JOIN store_members sm ON sm.user_id = au.id
    LEFT JOIN stores s ON s.id = sm.store_id
    ORDER BY au.created_at DESC;
END;
$$;

-- Add comment
COMMENT ON FUNCTION get_all_users_for_admin IS 'Returns all users in the platform for admin view with user role from users table';
