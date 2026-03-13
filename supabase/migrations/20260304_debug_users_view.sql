-- ===========================================
-- DEBUG: Test users_view and admin data
-- ===========================================

-- 1. Check if users_view exists and has data
SELECT * FROM users_view WHERE email = 'admin@rsquareidea.my.id';

-- 2. Check auth.users directly
SELECT
    id,
    email,
    role,
    is_super_admin,
    created_at
FROM auth.users
WHERE email = 'admin@rsquareidea.my.id';

-- 3. Check if is_admin() function works for our admin user
-- First, we need to impersonate the admin user
-- Note: This won't work in SQL Editor directly, but shows the query pattern
SELECT
    email,
    role,
    is_super_admin,
    -- This will be null in SQL Editor since there's no auth context
    -- But should work when called from the app
    NULL as is_admin_result
FROM auth.users
WHERE email = 'admin@rsquareidea.my.id';

-- 4. Verify platform_admins table
SELECT * FROM platform_admins WHERE email = 'admin@rsquareidea.my.id';

-- Expected results:
-- - users_view should show: role='super_admin', is_super_admin=true
-- - auth.users should show: role='super_admin', is_super_admin=true
-- - platform_admins should show: email='admin@rsquareidea.my.id', role='super_admin'
