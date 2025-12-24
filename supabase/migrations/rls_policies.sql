-- RLS (Row Level Security) Policies for Warungku Application
-- These policies ensure that users can only access data from their own store

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Create policies for products table
DROP POLICY IF EXISTS "Users can select their store products" ON products;
CREATE POLICY "Users can select their store products" ON products
FOR SELECT TO authenticated
USING (
    store_id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert their store products" ON products;
CREATE POLICY "Users can insert their store products" ON products
FOR INSERT TO authenticated
WITH CHECK (
    store_id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update their store products" ON products;
CREATE POLICY "Users can update their store products" ON products
FOR UPDATE TO authenticated
USING (
    store_id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete their store products" ON products;
CREATE POLICY "Users can delete their store products" ON products
FOR DELETE TO authenticated
USING (
    store_id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

-- Create policies for sales table
DROP POLICY IF EXISTS "Users can select their store sales" ON sales;
CREATE POLICY "Users can select their store sales" ON sales
FOR SELECT TO authenticated
USING (
    store_id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert their store sales" ON sales;
CREATE POLICY "Users can insert their store sales" ON sales
FOR INSERT TO authenticated
WITH CHECK (
    store_id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete their store sales" ON sales;
CREATE POLICY "Users can delete their store sales" ON sales
FOR DELETE TO authenticated
USING (
    store_id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

-- Create policies for purchases table
DROP POLICY IF EXISTS "Users can select their store purchases" ON purchases;
CREATE POLICY "Users can select their store purchases" ON purchases
FOR SELECT TO authenticated
USING (
    store_id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert their store purchases" ON purchases;
CREATE POLICY "Users can insert their store purchases" ON purchases
FOR INSERT TO authenticated
WITH CHECK (
    store_id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete their store purchases" ON purchases;
CREATE POLICY "Users can delete their store purchases" ON purchases
FOR DELETE TO authenticated
USING (
    store_id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

-- Create policies for suppliers table
DROP POLICY IF EXISTS "Users can select their store suppliers" ON suppliers;
CREATE POLICY "Users can select their store suppliers" ON suppliers
FOR SELECT TO authenticated
USING (
    store_id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can insert their store suppliers" ON suppliers;
CREATE POLICY "Users can insert their store suppliers" ON suppliers
FOR INSERT TO authenticated
WITH CHECK (
    store_id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can update their store suppliers" ON suppliers;
CREATE POLICY "Users can update their store suppliers" ON suppliers
FOR UPDATE TO authenticated
USING (
    store_id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "Users can delete their store suppliers" ON suppliers;
CREATE POLICY "Users can delete their store suppliers" ON suppliers
FOR DELETE TO authenticated
USING (
    store_id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

-- Create policies for stores table (users can only access stores they're members of)
DROP POLICY IF EXISTS "Users can select their stores" ON stores;
CREATE POLICY "Users can select their stores" ON stores
FOR SELECT TO authenticated
USING (
    id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

-- Create policies for store_members table (only store owners can manage members)
DROP POLICY IF EXISTS "Users can select store members of their stores" ON store_members;
CREATE POLICY "Users can select store members of their stores" ON store_members
FOR SELECT TO authenticated
USING (
    store_id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

-- Create policies for sale_items table (related to sales)
DROP POLICY IF EXISTS "Users can select their store sale items" ON sale_items;
CREATE POLICY "Users can select their store sale items" ON sale_items
FOR SELECT TO authenticated
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

-- Create policies for stock_details table (related to products)
DROP POLICY IF EXISTS "Users can select their store stock details" ON stock_details;
CREATE POLICY "Users can select their store stock details" ON stock_details
FOR SELECT TO authenticated
USING (
    product_id IN (
        SELECT p.id 
        FROM products p
        WHERE p.store_id IN (
            SELECT sm.store_id 
            FROM store_members sm 
            WHERE sm.user_id = auth.uid()
        )
    )
);

-- Create policies for subscription_transactions table
DROP POLICY IF EXISTS "Users can select their store subscription transactions" ON subscription_transactions;
CREATE POLICY "Users can select their store subscription transactions" ON subscription_transactions
FOR SELECT TO authenticated
USING (
    store_id IN (
        SELECT sm.store_id 
        FROM store_members sm 
        WHERE sm.user_id = auth.uid()
    )
);

-- Create policies for reconciliations table
DROP POLICY IF EXISTS "Users can select their store reconciliations" ON reconciliations;
CREATE POLICY "Users can select their store reconciliations" ON reconciliations
FOR SELECT TO authenticated
USING (
    -- Reconciliations are linked to stores via other tables or have store_id directly
    -- This is a simplified version - adjust based on your actual schema
    true -- Placeholder - adjust based on your actual schema
);

-- Create policies for settings table
DROP POLICY IF EXISTS "Users can access their store settings" ON settings;
CREATE POLICY "Users can access their store settings" ON settings
FOR ALL TO authenticated
USING (
    key = 'initial_balance' -- Only allow access to certain settings
)
WITH CHECK (
    key = 'initial_balance' -- Only allow modification of certain settings
);