-- =============================================
-- FIX: Separate User Data if Accidentally Shared
-- =============================================
-- WARNING: This script will remove ricky.yusar@gmail.com from
-- any stores that belong to ricky.yusar@rsquareidea.my.id
-- and create a new store for ricky.yusar@gmail.com if needed.

DO $$
DECLARE
  v_user1_id uuid;
  v_user2_id uuid;
  v_shared_store_id uuid;
  v_new_store_id uuid;
  v_user1_email text := 'ricky.yusar@rsquareidea.my.id';
  v_user2_email text := 'ricky.yusar@gmail.com';
  v_new_slug text;
BEGIN
  -- Get user IDs
  SELECT id INTO v_user1_id FROM auth.users WHERE email = v_user1_email LIMIT 1;
  SELECT id INTO v_user2_id FROM auth.users WHERE email = v_user2_email LIMIT 1;

  IF v_user1_id IS NULL OR v_user2_id IS NULL THEN
    RAISE EXCEPTION 'One or both users not found!';
  END IF;

  RAISE NOTICE 'User 1: % (%)', v_user1_email, v_user1_id;
  RAISE NOTICE 'User 2: % (%)', v_user2_email, v_user2_id;

  -- Check if there's a shared store
  SELECT DISTINCT sm1.store_id INTO v_shared_store_id
  FROM store_members sm1
  JOIN store_members sm2 ON sm1.store_id = sm2.store_id
  WHERE sm1.user_id = v_user1_id
    AND sm2.user_id = v_user2_id
  LIMIT 1;

  IF v_shared_store_id IS NULL THEN
    RAISE NOTICE 'No shared store found. Users are already separated.';
    RETURN;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '⚠️  SHARED STORE FOUND: %', v_shared_store_id;
  RAISE NOTICE 'Removing user 2 (%) from shared store...', v_user2_email;

  -- Remove user2 from the shared store
  DELETE FROM store_members
  WHERE user_id = v_user2_id
    AND store_id = v_shared_store_id;

  RAISE NOTICE 'User 2 removed from shared store.';

  -- Check if user2 has any other stores
  IF NOT EXISTS (
    SELECT 1 FROM store_members WHERE user_id = v_user2_id
  ) THEN
    RAISE NOTICE 'User 2 has no other stores. Creating a new store...';

    -- Generate unique slug
    v_new_slug := 'toko-saya-' || substr(md5(random()::text), 1, 8);

    -- Create a new store for user2 (NOTE: stores table does NOT have user_id column)
    INSERT INTO stores (name, slug, plan, created_at, updated_at)
    VALUES (
      'Toko Saya',
      v_new_slug,
      'free',
      NOW(),
      NOW()
    )
    RETURNING id INTO v_new_store_id;

    RAISE NOTICE 'New store created for user 2: % (slug: %)', v_new_store_id, v_new_slug;

    -- Add user2 as owner of the new store
    INSERT INTO store_members (store_id, user_id, role)
    VALUES (v_new_store_id, v_user2_id, 'owner');

    RAISE NOTICE 'User 2 added as owner of new store.';
  ELSE
    RAISE NOTICE 'User 2 already has other stores. No new store created.';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DATA SEPARATION COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User 1 (%) owns the original store', v_user1_email;
  RAISE NOTICE 'User 2 (%) now has their own store', v_user2_email;
  RAISE NOTICE '========================================';
END $$;

-- Verify separation
SELECT
  u.email as user_email,
  s.name as store_name,
  s.slug as store_slug,
  sm.role as user_role,
  s.plan as store_plan
FROM auth.users u
JOIN store_members sm ON sm.user_id = u.id
JOIN stores s ON s.id = sm.store_id
WHERE u.email IN ('ricky.yusar@rsquareidea.my.id', 'ricky.yusar@gmail.com')
ORDER BY u.email, s.name;
