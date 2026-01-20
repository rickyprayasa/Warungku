-- Function to update store plan (admin only)
CREATE OR REPLACE FUNCTION admin_update_store_plan(
  p_store_id UUID,
  p_new_plan TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store_name TEXT;
  v_old_plan TEXT;
BEGIN
  -- Check if executing user is an admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Validate plan value
  IF p_new_plan NOT IN ('free', 'pro', 'enterprise', 'demo') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid plan value. Must be one of: free, pro, enterprise, demo'
    );
  END IF;

  -- Get current store info
  SELECT name, plan INTO v_store_name, v_old_plan
  FROM stores
  WHERE id = p_store_id;

  IF v_store_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Store not found'
    );
  END IF;

  -- Update store plan
  UPDATE stores
  SET plan = p_new_plan
  WHERE id = p_store_id;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Plan berhasil diubah',
    'data', jsonb_build_object(
      'store_id', p_store_id,
      'store_name', v_store_name,
      'old_plan', v_old_plan,
      'new_plan', p_new_plan
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
GRANT EXECUTE ON FUNCTION admin_update_store_plan(UUID, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION admin_update_store_plan IS 'Allows platform admins to update the subscription plan for any store';
