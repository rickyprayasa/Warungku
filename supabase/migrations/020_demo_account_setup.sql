-- Demo Account Setup
-- Creates demo account for testing: ryussquall@gmail.com / omzetindemo
-- This account will be used for demo login button

-- Note: Run this manually or through Supabase Dashboard to create the demo user
-- 1. Email: ryussquall@gmail.com
-- 2. Password: omzetindemo
-- 3. User metadata: { role: 'super_admin' }

-- The demo user can be created via Supabase Dashboard (Authentication > Users)
-- Or by calling the signup API from the app

-- To create via Supabase Dashboard:
-- 1. Go to Authentication > Users
-- 2. Click "Add user"
-- 3. Email: ryussquall@gmail.com, Password: omzetindemo
-- 4. In User Metadata, add: { "role": "super_admin" }
-- 5. Click "Create"

-- After creating the user, also create a store for them:
-- This can be done from the Admin Users page (Create User button)

COMMENT ON FUNCTION is_admin IS 'Checks if current user is platform admin (role: admin in user_metadata or platform_admins table)';
