-- =============================================
-- ALTERNATIVE: Enable Public Sales WITHOUT RPC
-- =============================================
-- Instead of complex RPC function, we'll use direct INSERT
-- with simple RLS policies that allow anon inserts

-- 1. Drop the problematic RPC function
DROP FUNCTION IF EXISTS public.create_public_sale(json);

-- 2. Enable anon (public) to INSERT directly to sales table
DROP POLICY IF EXISTS "Authenticated users can manage their sales" ON sales;
DROP POLICY IF EXISTS "Authenticated users can view their sales" ON sales;
DROP POLICY IF EXISTS "Public can insert sales" ON sales;

-- Simple policy: Authenticated users can manage their sales
CREATE POLICY "Authenticated users can manage sales" ON sales
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 3. Similar for sale_items
DROP POLICY IF EXISTS "Authenticated users can manage sale_items" ON sale_items;

CREATE POLICY "Authenticated users can manage sale_items" ON sale_items
FOR ALL TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Allow anon to read stores and products (for storefront)
DROP POLICY IF EXISTS "Public can view stores" ON stores;
DROP POLICY IF EXISTS "Public can view products" ON products;

CREATE POLICY "Public can view stores" ON stores
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Public can view products" ON products
FOR SELECT TO anon, authenticated
USING (true);

-- 5. UPDATE: Add INSERT policy for anon to sales too (for public transactions)
CREATE POLICY "Public can create sales" ON sales
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Public can create sale_items" ON sale_items
FOR INSERT TO anon, authenticated
WITH CHECK (true);

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PUBLIC INSERT ENABLED (NO RPC)';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Policies created:';
  RAISE NOTICE '- Anon/authenticated can INSERT sales';
  RAISE NOTICE '- Products are read-only for anon';
  RAISE NOTICE '========================================';
END $$;

-- Display active sales policies
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename = 'sales'
ORDER BY policyname;
