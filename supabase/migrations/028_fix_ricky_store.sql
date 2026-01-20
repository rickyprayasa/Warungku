-- =============================================
-- Fix: Buat Store Baru untuk ricky.yusar@rsquareidea.my.id
-- =============================================
-- Query ini akan otomatis membuat store baru dan mengassign user sebagai owner

WITH new_store AS (
  INSERT INTO stores (name, slug, plan, created_at)
  VALUES (
    'Warungku Ricky',
    'warungku-ricky-' || extract(epoch from now())::bigint,
    'free',
    NOW()
  )
  RETURNING id, name, slug
),
user_record AS (
  SELECT id FROM auth.users WHERE email = 'ricky.yusar@rsquareidea.my.id' LIMIT 1
)
-- Hapus association dengan default store
DELETE FROM store_members
WHERE user_id = (SELECT id FROM user_record);

-- Assign user ke store baru
INSERT INTO store_members (store_id, user_id, role, created_at)
SELECT
  ns.id,
  u.id,
  'owner',
  NOW()
FROM new_store ns, user_record u;

-- Tampilkan hasil
SELECT
  'SUCCESS! Store baru telah dibuat untuk ricky.yusar@rsquareidea.my.id' as status,
  s.id as store_id,
  s.name as store_name,
  s.slug,
  s.plan,
  u.email
FROM stores s
CROSS JOIN auth.users u
WHERE u.email = 'ricky.yusar@rsquareidea.my.id'
AND s.slug LIKE 'warungku-ricky-%'
ORDER BY s.created_at DESC
LIMIT 1;
