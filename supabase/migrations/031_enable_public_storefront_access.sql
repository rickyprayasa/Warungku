-- =============================================
-- Enable Public Storefront Access
-- =============================================
-- This migration ensures that public (unauthenticated) users can access
-- store information and products for the public storefront feature
-- Routes like /:slug should work for anyone without authentication

-- 1. Add public access policy for stores table
-- This allows unauthenticated users to view store info by slug
DROP POLICY IF EXISTS "Public can view stores" ON stores;

CREATE POLICY "Public can view stores"
  ON stores FOR SELECT
  TO public
  USING (true);

-- 2. Add public access policy for products table
-- This allows unauthenticated users to view products for the public storefront
DROP POLICY IF EXISTS "Public can view products" ON products;

CREATE POLICY "Public can view products"
  ON products FOR SELECT
  TO public
  USING (true);

-- 3. Verify the policies are created correctly
-- This query shows all policies for stores and products tables
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE tablename IN ('stores', 'products')
ORDER BY tablename, policyname;

-- Expected result should show:
-- - "Users can select their stores" (for authenticated)
-- - "Public can view stores" (for public/anon)
-- - "Users can select their store products" (for authenticated)
-- - "Public can view products" (for public/anon)
