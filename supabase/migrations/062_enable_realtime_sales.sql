-- Migration: Enable Realtime for sales table
-- This allows realtime subscription for order notifications

-- Enable realtime for sales table
ALTER PUBLICATION supabase_realtime ADD TABLE sales;

-- Note: If you get an error "publication does not exist", run this first:
-- CREATE PUBLICATION supabase_realtime FOR ALL TABLES;

-- Or you can enable from Supabase Dashboard:
-- 1. Go to Database > Replication
-- 2. Find 'supabase_realtime' publication
-- 3. Enable 'sales' table in the list
