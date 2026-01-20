-- =============================================
-- Debug Query: Check User's Store Association
-- =============================================
-- Run this query to see which store ricky.yusar@rsquareidea.my.id is associated with

SELECT
  sm.user_id,
  u.email,
  sm.store_id,
  s.name as store_name,
  s.slug,
  s.plan,
  sm.role,
  sm.created_at as member_since
FROM store_members sm
JOIN stores s ON s.id = sm.store_id
JOIN auth.users u ON u.id = sm.user_id
WHERE u.email = 'ricky.yusar@rsquareidea.my.id';

-- Also check if there are multiple stores for this user
SELECT
  u.email,
  COUNT(*) as store_count,
  ARRAY_AGG(s.name) as store_names
FROM store_members sm
JOIN stores s ON s.id = sm.store_id
JOIN auth.users u ON u.id = sm.user_id
WHERE u.email = 'ricky.yusar@rsquareidea.my.id'
GROUP BY u.email;

-- Check what the DEFAULT_STORE_ID is
SELECT
  id,
  name,
  slug,
  plan
FROM stores
WHERE id = '6c65a321-3576-4a38-a834-19afalc4d83e';
