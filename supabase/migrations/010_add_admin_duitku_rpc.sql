-- =============================================
-- ADMIN RPC FUNCTION FOR DUITKU SETTINGS
-- =============================================
-- Deskripsi: RPC function for admins to save Duitku settings bypassing RLS

CREATE OR REPLACE FUNCTION admin_save_duitku_settings(p_settings jsonb)
RETURNS jsonb AS $$
DECLARE
  v_key text;
  v_value text;
  v_result jsonb := '{}'::jsonb;
  v_updated_keys text[] := ARRAY[]::text[];
BEGIN
  -- Loop through JSON object
  FOR v_key, v_value IN (SELECT key, value FROM jsonb_each_text(p_settings))
  LOOP
    -- Upsert each setting
    INSERT INTO settings (key, value)
    VALUES (v_key, v_value)
    ON CONFLICT (key)
    DO UPDATE SET value = EXCLUDED.value;
    
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
