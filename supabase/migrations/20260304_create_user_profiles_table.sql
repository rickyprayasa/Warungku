-- ===========================================
-- ALTERNATIVE MIGRATION: Create custom user_profiles table
-- Use this if public.users doesn't exist or has permission issues
-- ===========================================

-- STEP 1: Create user_profiles table
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    email TEXT NOT NULL,
    role TEXT DEFAULT 'store_owner',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STEP 2: Add check constraint for valid roles
ALTER TABLE public.user_profiles
    DROP CONSTRAINT IF EXISTS user_profiles_role_check;

ALTER TABLE public.user_profiles
    ADD CONSTRAINT user_profiles_role_check
    CHECK (role IN ('super_admin', 'store_owner', 'store_member', 'cashier'));

-- STEP 3: Create index
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id
    ON public.user_profiles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email
    ON public.user_profiles(email);

CREATE INDEX IF NOT EXISTS idx_user_profiles_role
    ON public.user_profiles(role);

-- STEP 4: Insert existing users
INSERT INTO public.user_profiles (user_id, email, role)
SELECT
    id,
    email,
    CASE
        WHEN email = 'admin@rsquareidea.my.id' THEN 'super_admin'
        ELSE 'store_owner'
    END
FROM auth.users
ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    role = CASE
        WHEN EXCLUDED.email = 'admin@rsquareidea.my.id' THEN 'super_admin'
        ELSE COALESCE(user_profiles.role, 'store_owner')
    END;

-- STEP 5: Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- STEP 6: Create RLS policies
-- Super admin can do everything
CREATE POLICY "Super admin can manage all profiles"
    ON public.user_profiles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role = 'super_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.user_id = auth.uid()
            AND up.role = 'super_admin'
        )
    );

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
    ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

-- STEP 7: Create helper functions
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS TEXT AS $$
DECLARE
    user_role TEXT;
BEGIN
    SELECT role INTO user_role
    FROM public.user_profiles
    WHERE user_id = user_id;

    RETURN COALESCE(user_role, 'store_member');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION user_has_role(user_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.user_profiles
        WHERE user_id = user_id
        AND role = required_role
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION set_user_role(user_id UUID, new_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    current_user_role TEXT;
BEGIN
    -- Check if executor is super admin
    SELECT role INTO current_user_role
    FROM public.user_profiles
    WHERE user_id = auth.uid();

    IF current_user_role != 'super_admin' THEN
        RAISE EXCEPTION 'Only super admins can change roles';
    END IF;

    -- Update the role
    UPDATE public.user_profiles
    SET role = new_role, updated_at = NOW()
    WHERE user_id = user_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant permissions
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role TO authenticated;
GRANT EXECUTE ON FUNCTION user_has_role TO authenticated;
GRANT EXECUTE ON FUNCTION set_user_role TO authenticated;

-- STEP 8: Verify results
SELECT
    up.email,
    up.role,
    up.created_at,
    au.email as auth_email
FROM public.user_profiles up
JOIN auth.users au ON au.id = up.user_id
ORDER BY up.created_at DESC
LIMIT 10;

-- Expected: admin@rsquareidea.my.id should have role = super_admin

-- STEP 9: Create view for easier access
CREATE OR REPLACE VIEW users_with_roles AS
SELECT
    au.id,
    au.email,
    au.created_at as auth_created_at,
    au.last_sign_in_at,
    up.role,
    up.created_at as profile_created_at,
    up.updated_at as profile_updated_at
FROM auth.users au
LEFT JOIN public.user_profiles up ON up.user_id = au.id;

-- Grant access
GRANT SELECT ON users_with_roles TO authenticated;

-- Test the view
SELECT * FROM users_with_roles LIMIT 5;
