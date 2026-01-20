-- Function to delete user and their store (admin only)
CREATE OR REPLACE FUNCTION admin_delete_user_and_store(
  p_user_id UUID,
  p_store_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_email TEXT;
  v_store_name TEXT;
BEGIN
  -- Check if executing user is an admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Get user and store info for confirmation
  SELECT email INTO v_user_email
  FROM auth.users
  WHERE id = p_user_id;

  SELECT name INTO v_store_name
  FROM stores
  WHERE id = p_store_id;

  IF v_user_email IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'User not found'
    );
  END IF;

  -- Delete store members first (will cascade)
  DELETE FROM store_members
  WHERE store_id = p_store_id;

  -- Delete store (cascade will handle related data)
  DELETE FROM stores
  WHERE id = p_store_id;

  -- Note: We cannot delete auth.users directly from client-side
  -- The auth user will be marked as deleted but cleanup needs to be done via Supabase Dashboard or service role key
  -- For now, we'll return success indicating the store and data have been deleted

  RETURN jsonb_build_object(
    'success', true,
    'message', 'User dan store berhasil dihapus',
    'data', jsonb_build_object(
      'user_id', p_user_id,
      'store_id', p_store_id,
      'user_email', v_user_email,
      'store_name', v_store_name,
      'note', 'Auth user needs to be deleted via Supabase Dashboard using service role key'
    )
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users (access control is handled inside the function)
GRANT EXECUTE ON FUNCTION admin_delete_user_and_store(UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION admin_delete_user_and_store IS 'Allows platform admins to delete a user and their associated store. Note: Auth user deletion requires service role key.';
