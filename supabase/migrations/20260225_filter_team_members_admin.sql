-- Migration: Update get_all_users_for_admin to hide team members
-- Only return users who are store owners or don't belong to any store

CREATE OR REPLACE FUNCTION get_all_users_for_admin()
RETURNS TABLE (
    id UUID,
    email VARCHAR(255),
    created_at TIMESTAMPTZ,
    last_sign_in_at TIMESTAMPTZ,
    user_id UUID,
    store_id UUID,
    store_name TEXT,
    store_slug TEXT,
    store_plan TEXT,
    plan_expires_at TIMESTAMPTZ,
    store_created_at TIMESTAMPTZ,
    role TEXT,
    member_created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Check if executing user is an admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Access denied. Admin privileges required.';
    END IF;

    -- Return all users with their store and membership information
    -- Filter out users who are just staff/members (not owners)
    RETURN QUERY
    SELECT
        au.id,
        au.email::VARCHAR(255),
        au.created_at,
        au.last_sign_in_at,
        au.id as user_id,
        s.id as store_id,
        s.name as store_name,
        s.slug as store_slug,
        s.plan as store_plan,
        s.plan_expires_at,
        s.created_at as store_created_at,
        sm.role,
        sm.created_at as member_created_at
    FROM auth.users au
    LEFT JOIN store_members sm ON sm.user_id = au.id
    LEFT JOIN stores s ON s.id = sm.store_id
    WHERE sm.role = 'owner' OR sm.role IS NULL
    ORDER BY au.created_at DESC;
END;
$$;
