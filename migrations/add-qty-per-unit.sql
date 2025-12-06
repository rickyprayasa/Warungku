-- Add qtyPerUnit field to products table
-- This allows selling packages where 1 unit sold = X pcs deducted from stock
-- Example: "Permen Paket 3pcs" - price 1000, qtyPerUnit=3 means selling 1 deducts 3 from stock

ALTER TABLE products ADD COLUMN qtyPerUnit INTEGER DEFAULT 1;
