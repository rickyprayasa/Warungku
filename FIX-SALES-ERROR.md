# 🔧 Fix "Gagal memuat penjualan" Error

## 🎯 Problem
Error message: **"Gagal memuat penjualan"** - Data sales tidak keluar

## 🔍 Diagnosis Steps

### Step 1: Run Debug Tool

Buka file debug di browser:
```bash
# Option 1: Open file directly
open debug-sales.html

# Option 2: Serve via Python
python3 -m http.server 8000
# Then open: http://localhost:8000/debug-sales.html
```

Click **"Run Full Diagnosis"** dan lihat hasil testnya.

---

## 🚨 Common Causes & Solutions

### Cause 1: Tables Tidak Ada (Database Migration Belum Di-run)

**Gejala**: Error message contains "does not exist"

**Solution**: Run migrations di Supabase SQL Editor

```sql
-- 1. Buat tabel sales
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
    total NUMERIC NOT NULL DEFAULT 0,
    profit NUMERIC NOT NULL DEFAULT 0,
    sale_type TEXT DEFAULT 'retail',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Buat tabel sale_items
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id UUID REFERENCES products(id),
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price NUMERIC NOT NULL DEFAULT 0,
    cost NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_sales_store_id ON sales(store_id);
CREATE INDEX IF NOT EXISTS idx_sales_created_at ON sales(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_product_id ON sale_items(product_id);

-- 4. Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE sale_items;
```

---

### Cause 2: RLS (Row Level Security) Blocking Access

**Gejala**: 
- Debug tool shows "permission denied" atau "RLS policy violation"
- User sudah login tapi data tetap tidak muncul

**Quick Test**: Cek apakah RLS enabled
```sql
-- Run di SQL Editor
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('sales', 'sale_items');
```

**Solution A: Setup RLS Policies (Recommended)**

```sql
-- 1. Enable RLS
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;

-- 2. Policy: Users can view sales from their stores
CREATE POLICY "Users can view sales from their store"
ON sales FOR SELECT
USING (
    store_id IN (
        SELECT store_id FROM store_members 
        WHERE user_id = auth.uid()
    )
);

-- 3. Policy: Users can create sales for their stores
CREATE POLICY "Users can insert sales to their store"
ON sales FOR INSERT
WITH CHECK (
    store_id IN (
        SELECT store_id FROM store_members 
        WHERE user_id = auth.uid()
    )
);

-- 4. Policy: Users can update sales from their stores
CREATE POLICY "Users can update sales from their store"
ON sales FOR UPDATE
USING (
    store_id IN (
        SELECT store_id FROM store_members 
        WHERE user_id = auth.uid()
    )
);

-- 5. Policy: Users can delete sales from their stores
CREATE POLICY "Users can delete sales from their store"
ON sales FOR DELETE
USING (
    store_id IN (
        SELECT store_id FROM store_members 
        WHERE user_id = auth.uid()
    )
);

-- 6. Same policies for sale_items
CREATE POLICY "Users can view sale items"
ON sale_items FOR SELECT
USING (
    sale_id IN (
        SELECT id FROM sales 
        WHERE store_id IN (
            SELECT store_id FROM store_members 
            WHERE user_id = auth.uid()
        )
    )
);

CREATE POLICY "Users can insert sale items"
ON sale_items FOR INSERT
WITH CHECK (
    sale_id IN (
        SELECT id FROM sales 
        WHERE store_id IN (
            SELECT store_id FROM store_members 
            WHERE user_id = auth.uid()
        )
    )
);
```

**Solution B: Temporary Disable RLS (TESTING ONLY!)**

⚠️ **WARNING**: Only for testing! Re-enable after!

```sql
-- DISABLE RLS (testing only)
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;

-- After testing, RE-ENABLE:
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
```

---

### Cause 3: User Tidak Terhubung ke Store

**Gejala**: 
- RLS policies sudah benar
- User sudah login
- Tapi data tetap kosong

**Solution**: Link user ke store

```sql
-- Check apakah user sudah terhubung ke store
SELECT 
    sm.user_id,
    sm.store_id,
    sm.role,
    s.name as store_name,
    u.email
FROM store_members sm
JOIN stores s ON sm.store_id = s.id
JOIN auth.users u ON sm.user_id = u.id;

-- Jika user belum terhubung, tambahkan:
INSERT INTO store_members (store_id, user_id, role)
VALUES (
    'your-store-id',  -- Ganti dengan store ID yang benar
    'your-user-id',   -- Ganti dengan user ID dari auth.users
    'owner'           -- atau 'manager', 'staff'
);

-- Atau auto-link user pertama ke store pertama:
INSERT INTO store_members (store_id, user_id, role)
SELECT 
    (SELECT id FROM stores LIMIT 1) as store_id,
    (SELECT id FROM auth.users LIMIT 1) as user_id,
    'owner' as role
WHERE NOT EXISTS (
    SELECT 1 FROM store_members LIMIT 1
);
```

---

### Cause 4: Data Sales Memang Kosong

**Gejala**: Semua test pass, tapi data kosong

**Solution**: Insert sample data

```sql
-- 1. Check apakah ada stores
SELECT id, name FROM stores;

-- 2. Check apakah ada products
SELECT id, name, price FROM products LIMIT 5;

-- 3. Insert sample sale
DO $$
DECLARE
    v_store_id UUID;
    v_product_id UUID;
    v_sale_id UUID;
BEGIN
    -- Get first store
    SELECT id INTO v_store_id FROM stores LIMIT 1;
    
    -- Get first product
    SELECT id INTO v_product_id FROM products WHERE store_id = v_store_id LIMIT 1;
    
    -- Create sale
    INSERT INTO sales (store_id, total, profit, sale_type, notes)
    VALUES (v_store_id, 25000, 7500, 'retail', 'Sample sale for testing')
    RETURNING id INTO v_sale_id;
    
    -- Add sale item
    INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price, cost)
    VALUES (
        v_sale_id,
        v_product_id,
        'Sample Product',
        2,
        12500,
        8750
    );
    
    RAISE NOTICE 'Sample sale created: %', v_sale_id;
END $$;
```

---

### Cause 5: Timeout / Network Issues

**Gejala**: Error message "Koneksi lambat - Gagal memuat penjualan"

**Solution**: 
1. Check internet connection
2. Check Supabase project status (might be paused)
3. Increase timeout di `store-supabase.ts`:

```typescript
// In fetchSales function, change timeout from 15000 to 30000
const { data: salesData, error: salesError } = await withTimeout(
    supabase
      .from('sales')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false }) as any,
    30000,  // ← Change to 30 seconds
    'Koneksi lambat - Gagal memuat penjualan'
);
```

---

## ✅ Verification Checklist

After applying fixes, verify:

```bash
# 1. Restart dev server
npm run dev

# 2. Hard refresh browser
# Windows: Ctrl+Shift+R
# Mac: Cmd+Shift+R

# 3. Open browser console (F12)
# Should see:
# ✅ [REALTIME] Sales channel status: SUBSCRIBED
# ✅ No errors about "Gagal memuat penjualan"

# 4. Check Dashboard page
# Sales data should appear

# 5. Run debug tool again
# Open: debug-sales.html
# All tests should pass
```

---

## 🔍 Advanced Debugging

### Check Supabase Logs

1. Go to Supabase Dashboard
2. Logs → API Logs
3. Filter by "sales"
4. Look for error messages

### Check Network Tab

1. Open DevTools (F12)
2. Network tab
3. Filter by "supabase.co"
4. Look for failed requests (red)
5. Click on failed request → Preview tab
6. Check error details

### Check Current User & Store

```javascript
// Run in browser console
const checkUserStore = async () => {
    // Get Supabase client from app
    const client = window.supabaseClient || 
                   window.supabase?.createClient(
                       'https://ysujcewkfhbenxtaguuw.supabase.co',
                       'your-anon-key'
                   );
    
    // Check user
    const { data: { user } } = await client.auth.getUser();
    console.log('Current user:', user);
    
    // Check store membership
    if (user) {
        const { data: membership } = await client
            .from('store_members')
            .select('*, stores(*)')
            .eq('user_id', user.id);
        console.log('Store membership:', membership);
    }
};

checkUserStore();
```

---

## 📞 Still Not Working?

1. Run `debug-sales.html` and screenshot the results
2. Check browser console and copy error messages
3. Check Supabase Dashboard → Logs
4. Provide these details:
   - What tests passed/failed in debug tool?
   - Any error messages in console?
   - Are you logged in?
   - Does products data load correctly?

---

## 🎓 Understanding the Flow

```
User Opens Dashboard
    ↓
HomePage mounts
    ↓
setCurrentStoreId() called
    ↓
fetchSales() triggered
    ↓
Query: SELECT * FROM sales WHERE store_id = ?
    ↓
RLS Policy checks if user has access
    ↓
    ├─ YES → Return data
    │   ↓
    │   Fetch sale_items for each sale
    │   ↓
    │   Map to Sale objects
    │   ↓
    │   Update Zustand store
    │   ↓
    │   UI displays sales
    │
    └─ NO → Return empty / error
        ↓
        Error: "Gagal memuat penjualan"
```

---

**Last Updated**: 2025-12-06  
**Version**: 2.2.0
