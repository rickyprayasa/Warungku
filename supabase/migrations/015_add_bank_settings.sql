-- Update platform_settings to include bank account information
-- This allows users to pay manually via bank transfer

-- Note: The admin_save_duitku_settings RPC should be updated to handle these new fields
-- This migration is primarily for documentation purposes as the RPC will handle it

-- Insert default bank settings if they don't exist
INSERT INTO platform_settings (key, value, updated_at)
VALUES
  ('bank_name', '', NOW()),
  ('account_number', '', NOW()),
  ('account_name', '', NOW())
ON CONFLICT (key) DO NOTHING;

-- Add comment to document the new settings
COMMENT ON COLUMN platform_settings.value IS 'JSON value for the setting';
COMMENT ON TABLE platform_settings IS 'Platform-wide settings including payment gateway and bank info';

-- Verify the settings were added
SELECT key, value, updated_at
FROM platform_settings
WHERE key IN ('bank_name', 'account_number', 'account_name');
