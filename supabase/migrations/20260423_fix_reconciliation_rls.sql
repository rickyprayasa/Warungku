-- =============================================
-- Fix RLS policies for reconciliations table
-- Bug: Only SELECT policy existed, INSERT was missing
-- causing createReconciliation to fail at the final step
-- while stock updates and sales were already committed.
-- =============================================

-- Drop the broken placeholder SELECT policy
DROP POLICY IF EXISTS "Users can select their store reconciliations" ON reconciliations;

-- Recreate proper SELECT policy with store_id check
CREATE POLICY "Users can select their store reconciliations" ON reconciliations
FOR SELECT TO authenticated
USING (
    store_id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

-- Add INSERT policy (this was missing!)
DROP POLICY IF EXISTS "Users can insert their store reconciliations" ON reconciliations;
CREATE POLICY "Users can insert their store reconciliations" ON reconciliations
FOR INSERT TO authenticated
WITH CHECK (
    store_id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

-- Add DELETE policy
DROP POLICY IF EXISTS "Users can delete their store reconciliations" ON reconciliations;
CREATE POLICY "Users can delete their store reconciliations" ON reconciliations
FOR DELETE TO authenticated
USING (
    store_id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

-- =============================================
-- Fix RLS policies for sale_items table
-- Only SELECT existed, INSERT and DELETE were missing
-- =============================================

-- Add INSERT policy for sale_items
DROP POLICY IF EXISTS "Users can insert their store sale items" ON sale_items;
CREATE POLICY "Users can insert their store sale items" ON sale_items
FOR INSERT TO authenticated
WITH CHECK (
    sale_id IN (
        SELECT s.id 
        FROM sales s
        WHERE s.store_id IN (
            SELECT sm.store_id 
            FROM store_members sm 
            WHERE sm.user_id = auth.uid()
        )
    )
);

-- Add DELETE policy for sale_items
DROP POLICY IF EXISTS "Users can delete their store sale items" ON sale_items;
CREATE POLICY "Users can delete their store sale items" ON sale_items
FOR DELETE TO authenticated
USING (
    sale_id IN (
        SELECT s.id 
        FROM sales s
        WHERE s.store_id IN (
            SELECT sm.store_id 
            FROM store_members sm 
            WHERE sm.user_id = auth.uid()
        )
    )
);
