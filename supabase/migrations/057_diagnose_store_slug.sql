-- =============================================
-- DIAGNOSTIC: Check store with slug 'rsquare'
-- =============================================
-- Run this in the Supabase SQL Editor to diagnose the issue

-- 1. Check if the store exists with exact slug
SELECT id, name, slug, created_at FROM stores WHERE slug = 'rsquare';

-- 2. Check if the store exists with case-insensitive match
SELECT id, name, slug, created_at FROM stores WHERE LOWER(slug) = 'rsquare';

-- 3. Check all stores and their slugs
SELECT id, name, slug FROM stores ORDER BY created_at DESC LIMIT 10;

-- 4. Check RLS policies on stores table
SELECT 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual 
FROM pg_policies 
WHERE tablename = 'stores';

-- 5. Test public access (simulate anon role)
-- SET ROLE anon;
-- SELECT id, name, slug FROM stores WHERE slug = 'rsquare';
-- RESET ROLE;
