-- ===========================================
-- SAFE MIGRATION: Add user role column
-- Run this step-by-step in Supabase SQL Editor
-- ===========================================

-- STEP 1: Add role column (without constraint first)
-- This will fail if column already exists, which is OK

DO $$
BEGIN
    -- Check if column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'users'
        AND table_schema = 'public'
        AND column_name = 'role'
    ) THEN
        ALTER TABLE public.users
        ADD COLUMN role TEXT DEFAULT 'store_owner';

        RAISE NOTICE 'Column role added successfully';
    ELSE
        RAISE NOTICE 'Column role already exists, skipping';
    END IF;
END $$;

-- STEP 2: Set existing admin role
-- Only update if not already super_admin

UPDATE public.users
SET role = 'super_admin'
WHERE email = 'admin@rsquareidea.my.id'
  AND (role IS NULL OR role != 'super_admin');

-- STEP 3: Set default role for NULL values
UPDATE public.users
SET role = 'store_owner'
WHERE role IS NULL;

-- STEP 4: Create index (ignore if exists)
CREATE INDEX IF NOT EXISTS idx_users_role
  ON public.users(role);

-- STEP 5: Verify results
SELECT
    email,
    role,
    created_at
FROM public.users
ORDER BY created_at DESC
LIMIT 10;

-- Expected result: admin@rsquareidea.my.id should have role = 'super_admin'
