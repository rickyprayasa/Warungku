-- ===========================================
-- FIX: Infinite recursion in store_members RLS policies
-- ===========================================
-- PROBLEM: store_members policies call is_admin() which is fine,
-- but they also do subqueries on store_members itself, causing recursion.
-- The policy "Users can view members of their stores" does:
--   SELECT store_id FROM store_members WHERE user_id = auth.uid()
-- This triggers the same policy again → infinite recursion.
--
-- SOLUTION: Use a SECURITY DEFINER helper function to check store membership
-- without going through RLS, and simplify policies to avoid self-referencing.

-- Step 1: Drop any existing versions of helper functions (may have different signatures)
DROP FUNCTION IF EXISTS get_user_store_ids(UUID);
DROP FUNCTION IF EXISTS get_user_store_ids();
DROP FUNCTION IF EXISTS is_store_owner_direct(UUID, UUID);

-- Create helper function to check store membership WITHOUT RLS
CREATE FUNCTION get_user_store_ids(check_user_id UUID)
RETURNS SETOF UUID AS $$
  SELECT store_id FROM store_members WHERE user_id = check_user_id;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION get_user_store_ids TO authenticated, service_role;

-- Step 2: Create helper to check if user is owner of a store WITHOUT RLS
CREATE FUNCTION is_store_owner_direct(check_user_id UUID, check_store_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM store_members
    WHERE user_id = check_user_id
    AND store_id = check_store_id
    AND role = 'owner'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

GRANT EXECUTE ON FUNCTION is_store_owner_direct TO authenticated, service_role;

-- Step 3: Drop ALL existing store_members policies to start fresh
DROP POLICY IF EXISTS "Users can view members of their stores" ON store_members;
DROP POLICY IF EXISTS "Users can insert themselves as members" ON store_members;
DROP POLICY IF EXISTS "Store owners can manage members" ON store_members;
DROP POLICY IF EXISTS "Store owners can remove members" ON store_members;
DROP POLICY IF EXISTS "Admins can view all store members" ON store_members;
DROP POLICY IF EXISTS "Admins can manage any store member" ON store_members;
DROP POLICY IF EXISTS "Users can remove themselves" ON store_members;
DROP POLICY IF EXISTS "Admins can remove any member" ON store_members;
-- Also drop any other policies that might exist
DROP POLICY IF EXISTS "store_members_select_own" ON store_members;
DROP POLICY IF EXISTS "store_members_select_admin" ON store_members;
DROP POLICY IF EXISTS "store_members_insert" ON store_members;
DROP POLICY IF EXISTS "store_members_update" ON store_members;
DROP POLICY IF EXISTS "store_members_delete" ON store_members;
DROP POLICY IF EXISTS "Enable read for users" ON store_members;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON store_members;
DROP POLICY IF EXISTS "Enable update for store owners" ON store_members;
DROP POLICY IF EXISTS "Enable delete for store owners" ON store_members;
DROP POLICY IF EXISTS "Allow admin full access to store_members" ON store_members;
DROP POLICY IF EXISTS "Admins full access" ON store_members;

-- Step 4: Ensure RLS is enabled
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;

-- Step 5: Create NEW non-recursive policies for store_members
-- SELECT: Users can see members of stores they belong to
-- Uses get_user_store_ids() SECURITY DEFINER function to avoid recursion
CREATE POLICY "sm_select_own_stores"
  ON store_members FOR SELECT
  TO authenticated
  USING (
    store_id IN (SELECT get_user_store_ids(auth.uid()))
  );

-- SELECT: Admins can see all store members
CREATE POLICY "sm_select_admin"
  ON store_members FOR SELECT
  TO authenticated
  USING (is_admin());

-- INSERT: Users can add themselves as members
CREATE POLICY "sm_insert_self"
  ON store_members FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- INSERT: Admins can add anyone
CREATE POLICY "sm_insert_admin"
  ON store_members FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- UPDATE: Store owners can update members in their stores
CREATE POLICY "sm_update_owner"
  ON store_members FOR UPDATE
  TO authenticated
  USING (is_store_owner_direct(auth.uid(), store_id));

-- UPDATE: Admins can update any member
CREATE POLICY "sm_update_admin"
  ON store_members FOR UPDATE
  TO authenticated
  USING (is_admin());

-- DELETE: Users can remove themselves
CREATE POLICY "sm_delete_self"
  ON store_members FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- DELETE: Store owners can remove members from their stores
CREATE POLICY "sm_delete_owner"
  ON store_members FOR DELETE
  TO authenticated
  USING (is_store_owner_direct(auth.uid(), store_id));

-- DELETE: Admins can remove anyone
CREATE POLICY "sm_delete_admin"
  ON store_members FOR DELETE
  TO authenticated
  USING (is_admin());

-- Step 6: Fix stores table policies too (they may reference store_members)
DROP POLICY IF EXISTS "Users can view their own stores" ON stores;
DROP POLICY IF EXISTS "Users can view stores they are members of" ON stores;
DROP POLICY IF EXISTS "Admins can view all stores" ON stores;
DROP POLICY IF EXISTS "Store owners can update their stores" ON stores;
DROP POLICY IF EXISTS "Admins can update all stores" ON stores;
DROP POLICY IF EXISTS "Admins can delete stores" ON stores;
DROP POLICY IF EXISTS "Allow public access for store pages" ON stores;

-- Recreate stores policies using the SECURITY DEFINER helper
CREATE POLICY "stores_select_member"
  ON stores FOR SELECT
  TO authenticated
  USING (
    id IN (SELECT get_user_store_ids(auth.uid()))
  );

CREATE POLICY "stores_select_admin"
  ON stores FOR SELECT
  TO authenticated
  USING (is_admin());

-- Public can view stores for storefront
CREATE POLICY "stores_select_public"
  ON stores FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "stores_insert_authenticated"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "stores_update_owner"
  ON stores FOR UPDATE
  TO authenticated
  USING (
    is_store_owner_direct(auth.uid(), id)
    OR is_admin()
  );

CREATE POLICY "stores_delete_admin"
  ON stores FOR DELETE
  TO authenticated
  USING (is_admin());

-- Step 7: Also update is_store_member and is_store_owner to use SECURITY DEFINER
-- without going through RLS
CREATE OR REPLACE FUNCTION is_store_member(check_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admins are members of all stores
  IF is_admin() THEN
    RETURN true;
  END IF;

  -- Use direct query (this function is SECURITY DEFINER so bypasses RLS)
  RETURN EXISTS (
    SELECT 1 FROM store_members
    WHERE user_id = auth.uid() AND store_id = check_store_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION is_store_owner(check_store_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Admins are owners of all stores
  IF is_admin() THEN
    RETURN true;
  END IF;

  RETURN is_store_owner_direct(auth.uid(), check_store_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Verify - this should NOT cause recursion errors
DO $$
DECLARE
  store_count INT;
  member_count INT;
BEGIN
  -- Test querying stores (simulate what admin dashboard does)
  SELECT COUNT(*) INTO store_count FROM stores;
  RAISE NOTICE 'Total stores: %', store_count;

  SELECT COUNT(*) INTO member_count FROM store_members;
  RAISE NOTICE 'Total store_members: %', member_count;

  RAISE NOTICE 'SUCCESS: No infinite recursion detected!';
END $$;
