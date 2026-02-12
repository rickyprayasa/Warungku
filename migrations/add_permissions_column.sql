-- Add permissions column to store_members table
ALTER TABLE public.store_members 
ADD COLUMN IF NOT EXISTS permissions jsonb DEFAULT '[]'::jsonb;

-- Comment on column
COMMENT ON COLUMN public.store_members.permissions IS 'Array of allowed menu keys for the member';
