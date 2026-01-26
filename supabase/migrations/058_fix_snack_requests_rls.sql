-- Fix RLS policies for snack_requests

-- 1. Ensure RLS is enabled
ALTER TABLE public.snack_requests ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies to start fresh
DROP POLICY IF EXISTS "Allow public insert to snack_requests" ON public.snack_requests;
DROP POLICY IF EXISTS "Allow store owners to view requests" ON public.snack_requests;
DROP POLICY IF EXISTS "Allow store owners to manage requests" ON public.snack_requests;

-- 3. Create policy for PUBLIC INSERT (anyone can request)
-- This covers both anonymous and authenticated users
CREATE POLICY "Allow public insert to snack_requests"
ON public.snack_requests
FOR INSERT
TO public
WITH CHECK (true);

-- 4. Create policy for STORE OWNERS to VIEW and MANAGE requests
-- They can see requests for stores they are members of
CREATE POLICY "Allow store owners to manage requests"
ON public.snack_requests
FOR ALL
TO authenticated
USING (
  store_id IN (
    SELECT store_id FROM public.store_members WHERE user_id = auth.uid()
  )
);

-- 5. Explicitly GRANT permissions to roles
GRANT INSERT ON public.snack_requests TO anon;
GRANT ALL ON public.snack_requests TO authenticated;
GRANT ALL ON public.snack_requests TO service_role;
