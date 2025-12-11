-- =============================================
-- Fix Product Delete Cascade
-- =============================================
-- This migration fixes the issue where products with sales or purchases
-- cannot be deleted due to foreign key constraints.

-- Drop existing foreign key constraints
ALTER TABLE sale_items DROP CONSTRAINT IF EXISTS sale_items_product_id_fkey;
ALTER TABLE purchases DROP CONSTRAINT IF EXISTS purchases_product_id_fkey;
ALTER TABLE snack_requests DROP CONSTRAINT IF EXISTS snack_requests_product_id_fkey;

-- Re-add with ON DELETE SET NULL for sale_items (preserve sale history)
ALTER TABLE sale_items 
  ADD CONSTRAINT sale_items_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Make product_id nullable in sale_items to allow SET NULL
ALTER TABLE sale_items ALTER COLUMN product_id DROP NOT NULL;

-- Re-add with ON DELETE SET NULL for purchases (preserve purchase history)
ALTER TABLE purchases 
  ADD CONSTRAINT purchases_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- Make product_id nullable in purchases to allow SET NULL
ALTER TABLE purchases ALTER COLUMN product_id DROP NOT NULL;

-- Re-add with ON DELETE SET NULL for snack_requests
ALTER TABLE snack_requests 
  ADD CONSTRAINT snack_requests_product_id_fkey 
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;
