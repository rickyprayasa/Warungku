-- =============================================
-- Create Demo Store for Public Access
-- =============================================
-- This creates a demo store that anyone can view without authentication
-- URL: /store/demo

-- Create demo store (if not exists)
-- Using uuid_generate_v4() or a valid hex UUID
INSERT INTO stores (id, name, slug, address, phone, cart_enabled, plan)
VALUES (
  'de000000-0000-0000-0000-000000000001',
  'Demo Store - Warung Jajanan',
  'demo',
  'Jl. Demo No. 123, Jakarta',
  '08123456789',
  true,
  'demo'
)
ON CONFLICT (slug) DO NOTHING;

-- Set existing stores without plan to 'trial' (for existing users)
UPDATE stores SET plan = 'trial' WHERE plan IS NULL OR plan = '' OR plan = 'free';

-- Optional: Add some sample products for demo store
-- You can customize these or add through the admin panel later

-- Note: Since demo store has no owner, you may want to create a demo user
-- and add them as owner if you need to manage it via dashboard
