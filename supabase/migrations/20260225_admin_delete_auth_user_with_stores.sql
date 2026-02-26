-- Migration: Update admin_delete_auth_user to also delete owned stores
-- When an admin deletes a user, we should also delete any stores where they are the sole owner
-- This prevents orphaned stores from showing up in the Admin list or taking up space

CREATE OR REPLACE FUNCTION public.admin_delete_auth_user(p_user_id UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER -- Ensures the function runs with admin privileges
SET search_path = public
AS $$
DECLARE
  v_caller_email text;
  v_is_admin boolean;
  v_owned_stores uuid[];
BEGIN
  -- 1. Check if the caller is a platform admin
  SELECT email INTO v_caller_email FROM auth.users WHERE id = auth.uid();

  SELECT EXISTS (
      SELECT 1 FROM platform_admins WHERE email = v_caller_email
      UNION
      SELECT 1 WHERE v_caller_email IN ('admin@rsquareidea.my.id', 'rickyrickoard@gmail.com')
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
      RETURN jsonb_build_object(
          'success', false,
          'message', 'Hanya Platform Admin yang dapat menghapus user secara permanen.'
      );
  END IF;

  -- 2. Find stores owned by this user
  SELECT array_agg(store_id) INTO v_owned_stores
  FROM store_members
  WHERE user_id = p_user_id AND role = 'owner';

  -- 3. Delete the stores (this will cascade to products, sales, etc.)
  IF v_owned_stores IS NOT NULL AND array_length(v_owned_stores, 1) > 0 THEN
      DELETE FROM stores WHERE id = ANY(v_owned_stores);
  END IF;

  -- 4. Delete the user
  -- Contacting auth.users directly. The store_members relation will cascade delete automatically
  DELETE FROM auth.users WHERE id = p_user_id;

  -- Return success
  RETURN jsonb_build_object(
      'success', true,
      'message', 'User dan tokonya berhasil dihapus dari sistem.'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
        'success', false,
        'message', 'Gagal menghapus user: ' || SQLERRM
    );
END;
$$;
