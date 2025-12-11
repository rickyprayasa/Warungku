-- =============================================
-- Public Store Access Policy
-- =============================================
-- Allow public (unauthenticated) users to view store info by slug
-- This is needed for the /store/:slug public storefront

-- Drop existing policy if exists and recreate
DROP POLICY IF EXISTS "Public can view stores by slug" ON stores;

-- Allow anyone to view basic store info (for public storefront)
CREATE POLICY "Public can view stores by slug"
  ON stores FOR SELECT
  USING (true);

-- Note: This allows reading all stores, but sensitive data should be
-- controlled at the application level (only expose what's needed)
-- The SELECT query in the app only fetches: id, name, slug, address, phone, logo_url, qris_code, cart_enabled
