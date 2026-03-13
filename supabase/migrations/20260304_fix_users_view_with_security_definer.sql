CREATE OR REPLACE FUNCTION get_user_role_data(p_user_id UUID)
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
        au.role,
        au.is_super_admin
    FROM auth.users au
    WHERE au.id = p_user_id
    AND au.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_role_data TO authenticated, service_role;
