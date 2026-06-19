-- =========================================================================
-- ADDITIONAL PERFORMANCE INDEXES FOR DB QUERIES AND FOREIGN KEYS
-- =========================================================================

-- 1. Index on sales(created_by) to optimize user-level reporting and sales filtering
CREATE INDEX IF NOT EXISTS idx_sales_created_by ON sales(created_by);

-- 2. Index on purchases(supplier_id) to optimize supplier-specific purchase history
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id ON purchases(supplier_id);

-- 3. Index on stock_details(purchase_id) to optimize purchase deletes and lookups
CREATE INDEX IF NOT EXISTS idx_stock_details_purchase_id ON stock_details(purchase_id);

-- 4. Composite index on store_members(user_id, store_id) for faster store-access queries
CREATE INDEX IF NOT EXISTS idx_store_members_user_store ON store_members(user_id, store_id);
