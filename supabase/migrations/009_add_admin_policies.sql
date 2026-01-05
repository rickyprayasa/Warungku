-- =============================================
-- ADMIN POLICIES FOR SETTINGS
-- =============================================
-- Deskripsi: Add admin policies to allow platform admins to manage Duitku settings across all stores

-- Create platform_admins table if not exists
CREATE TABLE IF NOT EXISTS platform_admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'admin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert initial admins (matching AdminContext whitelist)
INSERT INTO platform_admins (email, role) VALUES
  ('info@rsquareidea.my.id', 'super_admin'),
  ('admin@rsquareidea.my.id', 'super_admin')
ON CONFLICT (email) DO NOTHING;

-- Add is_admin function - checks both platform_admins table and hardcoded whitelist
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM platform_admins
    WHERE email = (
      SELECT email FROM auth.users
      WHERE id = auth.uid()
    )
  )
$$ LANGUAGE SQL SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;

-- =============================================
-- ADMIN POLICIES FOR SETTINGS TABLE
-- =============================================

-- Admins can view all settings (not limited to their store)
CREATE POLICY "Admins can view all settings"
  ON settings FOR SELECT
  USING (is_admin());

-- Admins can insert settings (for initial setup or updates)
CREATE POLICY "Admins can insert settings"
  ON settings FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update any settings (for Duitku configuration)
CREATE POLICY "Admins can update all settings"
  ON settings FOR UPDATE
  USING (is_admin());

-- Admins can delete settings
CREATE POLICY "Admins can delete settings"
  ON settings FOR DELETE
  USING (is_admin());

-- =============================================
-- ENABLE RLS ON platform_admins
-- =============================================

ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;

-- Admins can view all platform admins
CREATE POLICY "Admins can view platform admins"
  ON platform_admins FOR SELECT
  USING (is_admin());

-- Admins can insert new platform admins
CREATE POLICY "Admins can insert platform admins"
  ON platform_admins FOR INSERT
  WITH CHECK (is_admin());

-- Admins can update platform admins
CREATE POLICY "Admins can update platform admins"
  ON platform_admins FOR UPDATE
  USING (is_admin());

-- Admins can delete platform admins
CREATE POLICY "Admins can delete platform admins"
  ON platform_admins FOR DELETE
  USING (is_admin());
