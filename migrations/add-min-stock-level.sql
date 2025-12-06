-- Add minimum stock level field to products table
-- This field is used for low stock alerts

ALTER TABLE products ADD COLUMN minStockLevel INTEGER DEFAULT 10;
