-- Script to remove admin stores from the database
-- Run this in Supabase SQL Editor

-- STEP 1: View stores owned by admin
-- Copy the store_id(s) that appear below
SELECT
    s.id as store_id,
    s.name as store_name,
    s.slug,
    s.plan,
    s.created_at
FROM stores s
JOIN store_members sm ON s.id = sm.store_id
WHERE sm.user_id = (SELECT id FROM auth.users WHERE email = 'admin@rsquareidea.my.id');

-- STEP 2a: Remove admin from all store_members (removes admin ownership)
-- This keeps the stores but removes admin from them
DELETE FROM store_members
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@rsquareidea.my.id');

-- STEP 2b: Delete stores where admin is the ONLY member (complete cleanup)
-- WARNING: This will DELETE the stores completely!
-- Only run this if you want to completely remove admin-owned stores
/*
WITH admin_owned_stores AS (
    SELECT s.id
    FROM stores s
    WHERE s.id IN (
        SELECT sm.store_id
        FROM store_members sm
        WHERE sm.user_id = (SELECT id FROM auth.users WHERE email = 'admin@rsquareidea.my.id')
    )
    AND NOT EXISTS (
        SELECT 1
        FROM store_members sm2
        WHERE sm2.store_id = s.id
        AND sm2.user_id != (SELECT id FROM auth.users WHERE email = 'admin@rsquareidea.my.id')
    )
)
DELETE FROM stores
WHERE id IN (SELECT id FROM admin_owned_stores);
*/

-- STEP 3: Verification - should return 0 rows if cleanup was successful
SELECT
    COUNT(*) as admin_store_count
FROM store_members
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'admin@rsquareidea.my.id');

