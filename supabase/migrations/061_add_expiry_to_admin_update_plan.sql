-- Migration: Update admin_update_store_plan to accept expiry date
-- This allows admin to set plan duration when updating user plans

-- Drop old function first (need to drop because signature changes)
DROP FUNCTION IF EXISTS admin_update_store_plan(UUID, TEXT);

-- Create new function with expires_at parameter
CREATE OR REPLACE FUNCTION admin_update_store_plan(
  p_store_id UUID,
  p_new_plan TEXT,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_store_name TEXT;
  v_old_plan TEXT;
  v_old_expires_at TIMESTAMPTZ;
BEGIN
  -- Check if executing user is an admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admin privileges required.';
  END IF;

  -- Validate plan value
  IF p_new_plan NOT IN ('free', 'pro', 'enterprise', 'demo', 'trial') THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Invalid plan value. Must be one of: free, pro, enterprise, demo, trial'
    );
  END IF;

  -- Get current store info
  SELECT name, plan, plan_expires_at INTO v_store_name, v_old_plan, v_old_expires_at
  FROM stores
  WHERE id = p_store_id;

  IF v_store_name IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Store not found'
    );
  END IF;

  -- Update store plan and expiry date
  UPDATE stores
  SET 
    plan = p_new_plan,
    plan_expires_at = COALESCE(p_expires_at, plan_expires_at)
  WHERE id = p_store_id;

  -- Return success response
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Plan berhasil diubah',
    'data', jsonb_build_object(
      'store_id', p_store_id,
      'store_name', v_store_name,
      'old_plan', v_old_plan,
      'new_plan', p_new_plan,
      'old_expires_at', v_old_expires_at,
      'new_expires_at', p_expires_at
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION admin_update_store_plan(UUID, TEXT, TIMESTAMPTZ) TO authenticated;

-- Add comment
COMMENT ON FUNCTION admin_update_store_plan IS 'Allows platform admins to update store plan and expiry date';
