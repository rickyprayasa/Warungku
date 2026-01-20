-- =============================================
-- Fix Public Storefront Access
-- =============================================
-- This migration ensures that unauthenticated users can access
-- the public storefront at /store/:slug without requiring login

-- First, let's see the current policies
-- DROP POLICY IF EXISTS "Public can view products" ON products;
-- DROP POLICY IF EXISTS "Public can view stores" ON stores;

-- =============================================
-- PRODUCTS: Public Read Access
-- =============================================
-- Drop existing restrictive policies for products
DROP POLICY IF EXISTS "Users can select their store products" ON products;
DROP POLICY IF EXISTS "Users can insert their store products" ON products;
DROP POLICY IF EXISTS "Users can update their store products" ON products;
DROP POLICY IF EXISTS "Users can delete their store products" ON products;
DROP POLICY IF EXISTS "Users can view products in their stores" ON products;
DROP POLICY IF EXISTS "Public can view active products by store" ON products;

-- Create policy that allows ANYONE (including unauthenticated) to view active products
CREATE POLICY "Public can view active products"
  ON products FOR SELECT
  USING (is_active = true);

-- Create policy for authenticated users to view ALL products (including inactive) in their stores
CREATE POLICY "Store members can view all products in their stores"
  ON products FOR SELECT
  TO authenticated
  USING (
    store_id IN (
      SELECT sm.store_id
      FROM store_members sm
      WHERE sm.user_id = auth.uid()
    )
  );

-- Insert/Update/Delete policies remain restricted to store members
CREATE POLICY "Store members can insert products"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    store_id IN (
      SELECT sm.store_id
      FROM store_members sm
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Store members can update products"
  ON products FOR UPDATE
  TO authenticated
  USING (
    store_id IN (
      SELECT sm.store_id
      FROM store_members sm
      WHERE sm.user_id = auth.uid()
    )
  );

CREATE POLICY "Store members can delete products"
  ON products FOR DELETE
  TO authenticated
  USING (
    store_id IN (
      SELECT sm.store_id
      FROM store_members sm
      WHERE sm.user_id = auth.uid()
    )
  );

-- =============================================
-- STORES: Public Read Access
-- =============================================
-- Drop existing restrictive policies for stores
DROP POLICY IF EXISTS "Users can view their stores" ON stores;
DROP POLICY IF EXISTS "Public can view stores by slug" ON stores;
DROP POLICY IF EXISTS "Public can view stores" ON stores;

-- Create policy that allows ANYONE to view store info (needed for public storefront)
CREATE POLICY "Public can view stores"
  ON stores FOR SELECT
  USING (true);

-- Update/Insert/Delete policies remain restricted
DROP POLICY IF EXISTS "Store owners can update their stores" ON stores;
DROP POLICY IF EXISTS "Store owners can delete their stores" ON stores;
DROP POLICY IF EXISTS "Users can insert stores (on signup)" ON stores;

CREATE POLICY "Anyone can insert stores"
  ON stores FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Store owners can update stores"
  ON stores FOR UPDATE
  TO authenticated
  USING (
    id IN (
      SELECT sm.store_id
      FROM store_members sm
      WHERE sm.user_id = auth.uid()
      AND sm.role = 'owner'
    )
  );

CREATE POLICY "Store owners can delete stores"
  ON stores FOR DELETE
  TO authenticated
  USING (
    id IN (
      SELECT sm.store_id
      FROM store_members sm
      WHERE sm.user_id = auth.uid()
      AND sm.role = 'owner'
    )
  );

-- =============================================
-- STORE MEMBERS: Keep as-is (private)
-- =============================================
-- No changes needed - store members should remain private

-- =============================================
-- VERIFICATION QUERY
-- =============================================
-- Run this to verify the policies are correctly set up:
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('products', 'stores')
ORDER BY tablename, policyname;

-- Expected results:
-- products:
--   - "Public can view active products" - SELECT, no roles (public), USING: is_active = true
--   - "Store members can view all products in their stores" - SELECT, authenticated, USING: store membership check
--   - "Store members can insert products" - INSERT, authenticated
--   - "Store members can update products" - UPDATE, authenticated
--   - "Store members can delete products" - DELETE, authenticated
--
-- stores:
--   - "Public can view stores" - SELECT, no roles (public), USING: true
--   - "Anyone can insert stores" - INSERT, no roles, WITH CHECK: true
--   - "Store owners can update stores" - UPDATE, authenticated, USING: owner check
--   - "Store owners can delete stores" - DELETE, authenticated, USING: owner check
