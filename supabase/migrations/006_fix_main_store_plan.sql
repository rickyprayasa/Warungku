-- =============================================
-- Fix Main Store Plan
-- =============================================
-- Update the main omzetin store to enterprise plan (no restrictions)
-- This fixes the issue where existing stores were incorrectly set to 'trial'

-- Update main store to enterprise
UPDATE stores 
SET plan = 'enterprise' 
WHERE id = '6c65a321-3576-4a38-a834-19afa1c4d83e';

-- Also update any stores owned by the main admin to enterprise
-- (stores that were created before the plan feature)
UPDATE stores 
SET plan = 'enterprise' 
WHERE plan = 'trial' 
  AND created_at < '2024-12-01 00:00:00+00'::timestamptz;
