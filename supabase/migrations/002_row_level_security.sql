-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE snack_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- =============================================
-- STORES POLICIES
-- =============================================
CREATE POLICY "Users can view their stores"
  ON stores FOR SELECT
  USING (id = ANY(get_user_store_ids()));

CREATE POLICY "Users can insert stores (on signup)"
  ON stores FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Store owners can update their stores"
  ON stores FOR UPDATE
  USING (is_store_owner(id));

CREATE POLICY "Store owners can delete their stores"
  ON stores FOR DELETE
  USING (is_store_owner(id));

-- =============================================
-- STORE MEMBERS POLICIES
-- =============================================
CREATE POLICY "Users can view members of their stores"
  ON store_members FOR SELECT
  USING (store_id = ANY(get_user_store_ids()));

CREATE POLICY "Users can insert themselves as members"
  ON store_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Store owners can manage members"
  ON store_members FOR UPDATE
  USING (is_store_owner(store_id));

CREATE POLICY "Store owners can remove members"
  ON store_members FOR DELETE
  USING (is_store_owner(store_id) OR user_id = auth.uid());

-- =============================================
-- PRODUCTS POLICIES
-- =============================================
CREATE POLICY "Users can view products in their stores"
  ON products FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY "Users can insert products in their stores"
  ON products FOR INSERT
  WITH CHECK (is_store_member(store_id));

CREATE POLICY "Users can update products in their stores"
  ON products FOR UPDATE
  USING (is_store_member(store_id));

CREATE POLICY "Users can delete products in their stores"
  ON products FOR DELETE
  USING (is_store_member(store_id));

-- Public access for customer-facing pages (by store slug)
CREATE POLICY "Public can view active products by store"
  ON products FOR SELECT
  USING (
    is_active = true 
    AND EXISTS (
      SELECT 1 FROM stores WHERE stores.id = products.store_id
    )
  );

-- =============================================
-- SUPPLIERS POLICIES
-- =============================================
CREATE POLICY "Users can view suppliers in their stores"
  ON suppliers FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY "Users can insert suppliers in their stores"
  ON suppliers FOR INSERT
  WITH CHECK (is_store_member(store_id));

CREATE POLICY "Users can update suppliers in their stores"
  ON suppliers FOR UPDATE
  USING (is_store_member(store_id));

CREATE POLICY "Users can delete suppliers in their stores"
  ON suppliers FOR DELETE
  USING (is_store_member(store_id));

-- =============================================
-- SALES POLICIES
-- =============================================
CREATE POLICY "Users can view sales in their stores"
  ON sales FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY "Users can insert sales in their stores"
  ON sales FOR INSERT
  WITH CHECK (is_store_member(store_id));

CREATE POLICY "Users can update sales in their stores"
  ON sales FOR UPDATE
  USING (is_store_member(store_id));

CREATE POLICY "Users can delete sales in their stores"
  ON sales FOR DELETE
  USING (is_store_member(store_id));

-- =============================================
-- SALE ITEMS POLICIES
-- =============================================
CREATE POLICY "Users can view sale items via sales"
  ON sale_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM sales 
      WHERE sales.id = sale_items.sale_id 
      AND is_store_member(sales.store_id)
    )
  );

CREATE POLICY "Users can insert sale items via sales"
  ON sale_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sales 
      WHERE sales.id = sale_items.sale_id 
      AND is_store_member(sales.store_id)
    )
  );

CREATE POLICY "Users can delete sale items via sales"
  ON sale_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM sales 
      WHERE sales.id = sale_items.sale_id 
      AND is_store_member(sales.store_id)
    )
  );

-- =============================================
-- PURCHASES POLICIES
-- =============================================
CREATE POLICY "Users can view purchases in their stores"
  ON purchases FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY "Users can insert purchases in their stores"
  ON purchases FOR INSERT
  WITH CHECK (is_store_member(store_id));

CREATE POLICY "Users can update purchases in their stores"
  ON purchases FOR UPDATE
  USING (is_store_member(store_id));

CREATE POLICY "Users can delete purchases in their stores"
  ON purchases FOR DELETE
  USING (is_store_member(store_id));

-- =============================================
-- STOCK DETAILS POLICIES
-- =============================================
CREATE POLICY "Users can view stock details in their stores"
  ON stock_details FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY "Users can insert stock details in their stores"
  ON stock_details FOR INSERT
  WITH CHECK (is_store_member(store_id));

CREATE POLICY "Users can update stock details in their stores"
  ON stock_details FOR UPDATE
  USING (is_store_member(store_id));

CREATE POLICY "Users can delete stock details in their stores"
  ON stock_details FOR DELETE
  USING (is_store_member(store_id));

-- =============================================
-- SNACK REQUESTS POLICIES
-- =============================================
CREATE POLICY "Users can view requests in their stores"
  ON snack_requests FOR SELECT
  USING (is_store_member(store_id));

-- Public can submit snack requests
CREATE POLICY "Public can submit snack requests"
  ON snack_requests FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update requests in their stores"
  ON snack_requests FOR UPDATE
  USING (is_store_member(store_id));

CREATE POLICY "Users can delete requests in their stores"
  ON snack_requests FOR DELETE
  USING (is_store_member(store_id));

-- =============================================
-- RECONCILIATIONS POLICIES
-- =============================================
CREATE POLICY "Users can view reconciliations in their stores"
  ON reconciliations FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY "Users can insert reconciliations in their stores"
  ON reconciliations FOR INSERT
  WITH CHECK (is_store_member(store_id));

CREATE POLICY "Users can update reconciliations in their stores"
  ON reconciliations FOR UPDATE
  USING (is_store_member(store_id));

CREATE POLICY "Users can delete reconciliations in their stores"
  ON reconciliations FOR DELETE
  USING (is_store_member(store_id));

-- =============================================
-- SETTINGS POLICIES
-- =============================================
CREATE POLICY "Users can view settings in their stores"
  ON settings FOR SELECT
  USING (is_store_member(store_id));

CREATE POLICY "Users can insert settings in their stores"
  ON settings FOR INSERT
  WITH CHECK (is_store_member(store_id));

CREATE POLICY "Users can update settings in their stores"
  ON settings FOR UPDATE
  USING (is_store_member(store_id));

CREATE POLICY "Users can delete settings in their stores"
  ON settings FOR DELETE
  USING (is_store_member(store_id));
