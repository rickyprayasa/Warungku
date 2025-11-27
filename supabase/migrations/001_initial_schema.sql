-- =============================================
-- OMZETIN SaaS - Initial Schema Migration
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- STORES (Tenants)
-- =============================================
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  qris_code TEXT,
  cart_enabled BOOLEAN DEFAULT true,
  
  -- Subscription & Billing
  plan TEXT DEFAULT 'free',
  plan_expires_at TIMESTAMPTZ,
  
  -- Settings
  settings JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stores_slug ON stores(slug);

-- =============================================
-- STORE MEMBERS (User-Store Relationship)
-- =============================================
CREATE TABLE store_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(store_id, user_id)
);

CREATE INDEX idx_store_members_user ON store_members(user_id);
CREATE INDEX idx_store_members_store ON store_members(store_id);

-- =============================================
-- PRODUCTS
-- =============================================
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  cost DECIMAL(15,2) DEFAULT 0,
  image_url TEXT,
  category TEXT,
  description TEXT,
  
  is_promo BOOLEAN DEFAULT false,
  promo_price DECIMAL(15,2),
  is_active BOOLEAN DEFAULT true,
  is_best_seller BOOLEAN DEFAULT false,
  
  total_stock INTEGER DEFAULT 0,
  min_stock_level INTEGER DEFAULT 10,
  qty_per_unit INTEGER DEFAULT 1,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_products_store ON products(store_id);
CREATE INDEX idx_products_category ON products(store_id, category);
CREATE INDEX idx_products_name ON products(store_id, name);

-- =============================================
-- SUPPLIERS
-- =============================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  address TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_store ON suppliers(store_id);

-- =============================================
-- SALES
-- =============================================
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  total DECIMAL(15,2) NOT NULL,
  profit DECIMAL(15,2) NOT NULL,
  sale_type TEXT DEFAULT 'retail',
  notes TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_store ON sales(store_id);
CREATE INDEX idx_sales_store_date ON sales(store_id, created_at);

-- =============================================
-- SALE ITEMS
-- =============================================
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  cost DECIMAL(15,2) NOT NULL
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_product ON sale_items(product_id);

-- =============================================
-- PURCHASES
-- =============================================
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(15,2) NOT NULL,
  total_cost DECIMAL(15,2) NOT NULL,
  
  pack_quantity INTEGER,
  units_per_pack INTEGER,
  
  supplier_id UUID REFERENCES suppliers(id),
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_purchases_store ON purchases(store_id);
CREATE INDEX idx_purchases_product ON purchases(product_id);
CREATE INDEX idx_purchases_date ON purchases(store_id, created_at);

-- =============================================
-- STOCK DETAILS (FIFO Tracking)
-- =============================================
CREATE TABLE stock_details (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES purchases(id),
  
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(15,2) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_details_product ON stock_details(product_id);
CREATE INDEX idx_stock_details_store ON stock_details(store_id);
CREATE INDEX idx_stock_details_fifo ON stock_details(product_id, created_at);

-- =============================================
-- SNACK REQUESTS
-- =============================================
CREATE TABLE snack_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  
  requester_name TEXT NOT NULL,
  snack_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  notes TEXT,
  
  request_type TEXT DEFAULT 'stock_request',
  status TEXT DEFAULT 'pending',
  is_read BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_snack_requests_store ON snack_requests(store_id);
CREATE INDEX idx_snack_requests_status ON snack_requests(store_id, status);

-- =============================================
-- RECONCILIATIONS
-- =============================================
CREATE TABLE reconciliations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  date DATE NOT NULL,
  expected_cash DECIMAL(15,2) NOT NULL,
  actual_cash DECIMAL(15,2) NOT NULL,
  cash_difference DECIMAL(15,2) NOT NULL,
  
  stock_items JSONB NOT NULL DEFAULT '[]',
  total_stock_value DECIMAL(15,2) NOT NULL,
  total_stock_cost DECIMAL(15,2) NOT NULL,
  unidentified_amount DECIMAL(15,2) NOT NULL,
  
  generated_sale_ids UUID[] DEFAULT '{}',
  notes TEXT,
  status TEXT DEFAULT 'completed',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reconciliations_store ON reconciliations(store_id);
CREATE INDEX idx_reconciliations_date ON reconciliations(store_id, date);

-- =============================================
-- SETTINGS
-- =============================================
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  
  UNIQUE(store_id, key)
);

CREATE INDEX idx_settings_store ON settings(store_id);

-- =============================================
-- HELPER FUNCTIONS
-- =============================================

-- Get user's store IDs
CREATE OR REPLACE FUNCTION get_user_store_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(ARRAY_AGG(store_id), ARRAY[]::UUID[])
  FROM store_members
  WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user is member of a store
CREATE OR REPLACE FUNCTION is_store_member(check_store_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM store_members
    WHERE user_id = auth.uid() AND store_id = check_store_id
  )
$$ LANGUAGE SQL SECURITY DEFINER;

-- Check if user is owner of a store
CREATE OR REPLACE FUNCTION is_store_owner(check_store_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM store_members
    WHERE user_id = auth.uid() AND store_id = check_store_id AND role = 'owner'
  )
$$ LANGUAGE SQL SECURITY DEFINER;

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_snack_requests_updated_at
  BEFORE UPDATE ON snack_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
