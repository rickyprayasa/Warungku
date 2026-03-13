--
-- PERFORMANCE INDEXES 
-- Step 3.3: Add database indexes to improve read performance on large tables.
--

-- 1. Sales by Date
-- Used extensively in reporting and dashboard queries
CREATE INDEX IF NOT EXISTS idx_sales_store_date ON sales(store_id, created_at DESC);

-- 2. Active Products
-- Used by the POS frontend to fetch queryable product catalog
CREATE INDEX IF NOT EXISTS idx_products_store_active ON products(store_id, is_active);

-- 3. Low Stock Products
-- Used to rapidly sort and identify products dipping below threshold limits
CREATE INDEX IF NOT EXISTS idx_products_low_stock ON products(store_id, total_stock);

-- 4. Sale Items (Sale Link)
-- Fast retrieval of items constituting a specific receipt/sale
CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);

-- 5. Sale Items (Product Link)
-- Useful for calculating historically how many of a specific product have sold
CREATE INDEX IF NOT EXISTS idx_sale_items_product ON sale_items(product_id);

-- 6. Stock Details Log
-- Speeds up queries searching for recent incoming/outgoing stock movements of a specific product
CREATE INDEX IF NOT EXISTS idx_stock_details_product_date ON stock_details(product_id, created_at DESC);

-- 7. Store Members (Store)
-- Quick listing of all users attached to a specific store
CREATE INDEX IF NOT EXISTS idx_store_members_store ON store_members(store_id);

-- 8. Store Members (User)
-- Quick query on login to determine which stores the user has access to
CREATE INDEX IF NOT EXISTS idx_store_members_user ON store_members(user_id);

