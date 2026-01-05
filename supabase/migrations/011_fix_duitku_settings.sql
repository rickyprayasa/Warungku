-- =============================================
-- FIX DUITKU SETTINGS - PLATFORM-LEVEL SETTINGS
-- =============================================
-- Deskripsi: Create platform_settings table for global settings like Duitku
-- and fix the admin RPC function

-- Create platform_settings table for global (non-store-specific) settings
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on platform_settings
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can access platform settings
CREATE POLICY "Admins can view platform settings"
  ON platform_settings FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert platform settings"
  ON platform_settings FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update platform settings"
  ON platform_settings FOR UPDATE
  USING (is_admin());

CREATE POLICY "Admins can delete platform settings"
  ON platform_settings FOR DELETE
  USING (is_admin());

-- Update the admin_save_duitku_settings function to use platform_settings table
CREATE OR REPLACE FUNCTION admin_save_duitku_settings(p_settings jsonb)
RETURNS jsonb AS $$
DECLARE
  v_key text;
  v_value text;
  v_result jsonb := '{}'::jsonb;
  v_updated_keys text[] := ARRAY[]::text[];
  v_is_admin boolean;
BEGIN
  -- Check if user is admin
  SELECT is_admin() INTO v_is_admin;
  
  IF NOT v_is_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Admin access required');
  END IF;

  -- Loop through JSON object
  FOR v_key, v_value IN (SELECT key, value FROM jsonb_each_text(p_settings))
  LOOP
    -- Upsert each setting to platform_settings table
    INSERT INTO platform_settings (key, value, updated_at)
    VALUES (v_key, v_value, NOW())
    ON CONFLICT (key)
    DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();
    
    -- Track updated keys
    v_updated_keys := array_append(v_updated_keys, v_key);
  END LOOP;
  
  -- Build result with updated keys
  v_result := jsonb_build_object('success', true, 'updated_keys', v_updated_keys, 'count', array_length(v_updated_keys, 1));
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION admin_save_duitku_settings TO authenticated;

-- Create function to get Duitku settings
CREATE OR REPLACE FUNCTION get_duitku_settings()
RETURNS TABLE (key text, value text) AS $$
BEGIN
  -- Check if user is admin
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  RETURN QUERY
  SELECT ps.key, ps.value
  FROM platform_settings ps
  WHERE ps.key LIKE 'duitku_%';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_duitku_settings TO authenticated;
