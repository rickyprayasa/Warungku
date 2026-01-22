-- =============================================
-- FIX: Correct RLS Policies Priority
-- =============================================
-- The issue is that we have BOTH public and authenticated policies.
-- We need to ensure authenticated users can access their OWN data.

-- DROP ALL existing policies first to avoid conflicts
DROP POLICY IF EXISTS "Public can access stores by slug" ON stores;
DROP POLICY IF EXISTS "Public can access products by store" ON products;
DROP POLICY IF EXISTS "Authenticated users can manage their stores" ON stores;
DROP POLICY IF EXISTS "Authenticated users can manage their products" ON products;
DROP POLICY IF EXISTS "Authenticated users can manage their sales" ON sales;
DROP POLICY IF EXISTS "Authenticated users can manage their purchases" ON purchases;
DROP POLICY IF EXISTS "Authenticated users can manage their suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can view their stores" ON stores;
DROP POLICY IF EXISTS "Authenticated users can update their stores" ON stores;
DROP POLICY IF EXISTS "Public can view stores" ON stores;
DROP POLICY IF EXISTS "Authenticated users can view their store products" ON products;
DROP POLICY IF EXISTS "Authenticated users can manage their store products" ON products;
DROP POLICY IF EXISTS "Public can view products" ON products;
DROP POLICY IF EXISTS "Authenticated users can view their sales" ON sales;
DROP POLICY IF EXISTS "Authenticated users can manage their sales" ON sales;
DROP POLICY IF EXISTS "Authenticated users can view their purchases" ON purchases;
DROP POLICY IF EXISTS "Authenticated users can manage their purchases" ON purchases;
DROP POLICY IF EXISTS "Authenticated users can view their suppliers" ON suppliers;
DROP POLICY IF EXISTS "Authenticated users can manage their suppliers" ON suppliers;
DROP POLICY IF EXISTS "Users can view their store memberships" ON store_members;
DROP POLICY IF EXISTS "Users can select store members of their stores" ON store_members;

-- 1. STORES table - Multiple policies for different roles

-- Policy for authenticated users (can only see their own stores)
CREATE POLICY "Authenticated users can view their stores" ON stores
FOR SELECT TO authenticated
USING (
  id IN (
    SELECT store_id
    FROM store_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can update their stores" ON stores
FOR UPDATE TO authenticated
USING (
  id IN (
    SELECT store_id
    FROM store_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  id IN (
    SELECT store_id
    FROM store_members
    WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
  )
);

-- Policy for public users (can view any store by slug - needed for storefront)
CREATE POLICY "Public can view stores" ON stores
FOR SELECT TO anon, authenticated
USING (
  true
);

-- 2. PRODUCTS table

CREATE POLICY "Authenticated users can view their store products" ON products
FOR SELECT TO authenticated
USING (
  store_id IN (
    SELECT store_id
    FROM store_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can manage their store products" ON products
FOR ALL TO authenticated
USING (
  store_id IN (
    SELECT store_id
    FROM store_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  store_id IN (
    SELECT store_id
    FROM store_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Public can view products" ON products
FOR SELECT TO anon, authenticated
USING (
  true
);

-- 3. SALES table (authenticated only - no public access)

CREATE POLICY "Authenticated users can view their sales" ON sales
FOR SELECT TO authenticated
USING (
  store_id IN (
    SELECT store_id
    FROM store_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can manage their sales" ON sales
FOR ALL TO authenticated
USING (
  store_id IN (
    SELECT store_id
    FROM store_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  store_id IN (
    SELECT store_id
    FROM store_members
    WHERE user_id = auth.uid()
  )
);

-- 4. PURCHASES table (authenticated only)

CREATE POLICY "Authenticated users can view their purchases" ON purchases
FOR SELECT TO authenticated
USING (
  store_id IN (
    SELECT store_id
    FROM store_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can manage their purchases" ON purchases
FOR ALL TO authenticated
USING (
  store_id IN (
    SELECT store_id
    FROM store_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  store_id IN (
    SELECT store_id
    FROM store_members
    WHERE user_id = auth.uid()
  )
);

-- 5. SUPPLIERS table (authenticated only)

CREATE POLICY "Authenticated users can view their suppliers" ON suppliers
FOR SELECT TO authenticated
USING (
  store_id IN (
    SELECT store_id
    FROM store_members
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Authenticated users can manage their suppliers" ON suppliers
FOR ALL TO authenticated
USING (
  store_id IN (
    SELECT store_id
    FROM store_members
    WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  store_id IN (
    SELECT store_id
    FROM store_members
    WHERE user_id = auth.uid()
  )
);

-- 6. STORE_MEMBERS table (authenticated only)

CREATE POLICY "Users can view their store memberships" ON store_members
FOR SELECT TO authenticated
USING (
  store_id IN (
    SELECT store_id
    FROM store_members
    WHERE user_id = auth.uid()
  )
);

-- Verify policies
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'RLS POLICIES FIXED';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Key changes:';
  RAISE NOTICE '- Authenticated users: Can view OWN stores';
  RAISE NOTICE '- Public (anon): Can view ALL stores';
  RAISE NOTICE '- Products: Public can view ALL';
  RAISE NOTICE '- Sales/Purchases/Suppliers: Authenticated only';
  RAISE NOTICE '========================================';
END $$;

-- Display active policies
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE tablename IN ('stores', 'products', 'sales', 'purchases', 'suppliers')
ORDER BY tablename, policyname;
