-- =============================================
-- Fix RLS for Cross-Store Viewing
-- =============================================
-- Problem: Authenticated users can only see products from their own store
-- Solution: Allow authenticated users to VIEW products from any store,
--           but only MODIFY products from their own store

-- 1. Fix Products Policy - Allow all users (auth + anon) to view any products
DROP POLICY IF EXISTS "Users can view products in their stores" ON products;
DROP POLICY IF EXISTS "Public can view active products by store" ON products;
DROP POLICY IF EXISTS "Public can view products" ON products;

-- Single policy for viewing: anyone can view any product
CREATE POLICY "Anyone can view products"
  ON products FOR SELECT
  USING (true);

-- Keep write policies restricted to store members
-- (These should already exist, but recreate to be safe)
DROP POLICY IF EXISTS "Users can insert products in their stores" ON products;
DROP POLICY IF EXISTS "Users can update products in their stores" ON products;
DROP POLICY IF EXISTS "Users can delete products in their stores" ON products;

CREATE POLICY "Store members can insert products"
  ON products FOR INSERT
  WITH CHECK (is_store_member(store_id));

CREATE POLICY "Store members can update products"
  ON products FOR UPDATE
  USING (is_store_member(store_id));

CREATE POLICY "Store members can delete products"
  ON products FOR DELETE
  USING (is_store_member(store_id));

-- 2. Fix Stores Policy - Allow all users to view any store
DROP POLICY IF EXISTS "Users can view their stores" ON stores;
DROP POLICY IF EXISTS "Public can view stores by slug" ON stores;
DROP POLICY IF EXISTS "Public can view stores" ON stores;

CREATE POLICY "Anyone can view stores"
  ON stores FOR SELECT
  USING (true);

-- Keep write policies restricted
-- (These should already exist)
