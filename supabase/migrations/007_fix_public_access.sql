-- =============================================
-- Fix Public Access for Products and Stores
-- =============================================
-- This ensures unauthenticated users can view products and store info

-- 1. Drop and recreate products public policy
DROP POLICY IF EXISTS "Public can view active products by store" ON products;
DROP POLICY IF EXISTS "Public can view products" ON products;

CREATE POLICY "Public can view products"
  ON products FOR SELECT
  USING (true);  -- Allow all reads, RLS on write operations still applies

-- 2. Ensure stores are publicly readable
DROP POLICY IF EXISTS "Public can view stores by slug" ON stores;
DROP POLICY IF EXISTS "Public can view stores" ON stores;

CREATE POLICY "Public can view stores"
  ON stores FOR SELECT
  USING (true);

-- 3. Verify RLS is enabled but policies allow public read
-- Check current policies
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('products', 'stores');
