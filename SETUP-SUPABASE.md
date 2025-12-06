# 🚀 Supabase Setup Guide - Warungku

Panduan lengkap untuk setup Supabase sebagai backend database untuk aplikasi Warungku.

---

## 📋 Prerequisites

- [x] Account Supabase (gratis): https://supabase.com
- [x] Node.js & npm terinstall
- [x] Git terinstall

---

## 🎯 Quick Start (5 Minutes)

### 1️⃣ Create Supabase Project

1. Login ke https://supabase.com/dashboard
2. Klik **"New Project"**
3. Isi:
   - **Name**: warungku (atau nama bebas)
   - **Database Password**: Buat password kuat (simpan baik-baik!)
   - **Region**: Southeast Asia (Singapore) - pilih yang terdekat
4. Klik **"Create new project"**
5. Tunggu ~2 menit hingga project selesai di-provision

### 2️⃣ Get API Credentials

1. Setelah project ready, buka **Settings** (⚙️ icon di sidebar kiri)
2. Pilih **API** dari menu Settings
3. Copy 2 values ini:
   - **Project URL** (contoh: `https://abcxyz.supabase.co`)
   - **anon public** key (yang panjang, dimulai dengan `eyJ...`)

### 3️⃣ Configure Environment Variables

```bash
# 1. Copy template file
cp .env.example .env.local

# 2. Edit .env.local
nano .env.local  # atau gunakan text editor favorit
```

Isi dengan credentials dari langkah 2:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_ENABLE_REALTIME=true
```

### 4️⃣ Setup Database Schema

Ada 2 cara:

**Cara A: Via Supabase Dashboard (Recommended)**

1. Buka **SQL Editor** di Supabase Dashboard
2. Klik **"New query"**
3. Copy-paste isi dari file `/migrations/*.sql` (jalankan satu per satu)
4. Klik **"Run"**

**Cara B: Via CLI**

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref your-project-id

# Push migrations
supabase db push
```

### 5️⃣ Enable Realtime on Tables ⚡ (IMPORTANT!)

Agar real-time sync bekerja, enable Realtime di tables:

**Via Dashboard:**
1. Buka **Database** → **Replication**
2. Scroll ke **"Replication"** section
3. Centang semua table berikut:
   - ✅ products
   - ✅ sales
   - ✅ sale_items
   - ✅ purchases
   - ✅ suppliers
   - ✅ snack_requests
   - ✅ reconciliations
   - ✅ stock_details
   - ✅ stores
   - ✅ store_members

**Via SQL:**
```sql
-- Run di SQL Editor
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE sale_items;
ALTER PUBLICATION supabase_realtime ADD TABLE purchases;
ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;
ALTER PUBLICATION supabase_realtime ADD TABLE snack_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE reconciliations;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_details;
ALTER PUBLICATION supabase_realtime ADD TABLE stores;
ALTER PUBLICATION supabase_realtime ADD TABLE store_members;
```

### 6️⃣ Test Connection

```bash
# Start development server
npm run dev

# Buka browser: http://localhost:3000
# Check console (F12) - harusnya tidak ada error Supabase
```

**Expected Console Output:**
```
[REALTIME] Setting up realtime sync for store: xxx
[REALTIME] Products channel status: SUBSCRIBED
[REALTIME] Sales channel status: SUBSCRIBED
✅ All good!
```

---

## 🔐 Security: Row Level Security (RLS)

Supabase menggunakan RLS untuk multi-tenant security. Pastikan RLS policies sudah di-setup!

### Check RLS Status

1. Buka **Authentication** → **Policies**
2. Semua table harus ada policies

### Basic RLS Policies

```sql
-- Example: Users hanya bisa akses store mereka sendiri

-- Products Policy
CREATE POLICY "Users can view products from their store"
ON products FOR SELECT
USING (
  store_id IN (
    SELECT store_id FROM store_members 
    WHERE user_id = auth.uid()
  )
);

-- Sales Policy
CREATE POLICY "Users can insert sales to their store"
ON sales FOR INSERT
WITH CHECK (
  store_id IN (
    SELECT store_id FROM store_members 
    WHERE user_id = auth.uid()
  )
);

-- Lihat file /supabase/policies.sql untuk policies lengkap
```

---

## 🧪 Testing Realtime Sync

### Test 1: Basic Sync
1. Buka aplikasi di 2 browser windows (atau 2 device berbeda)
2. Login dengan akun yang sama
3. Tambah produk di window 1
4. Produk harus muncul INSTANT di window 2 (tanpa refresh!)

### Test 2: Offline/Online
1. Disconnect internet (atau throttle network di DevTools)
2. Coba tambah produk → harusnya muncul toast error
3. Reconnect internet
4. Data harusnya auto-sync

### Test 3: Optimistic Updates
1. Throttle network ke "Slow 3G" (di Chrome DevTools)
2. Tambah sale → UI harus update INSTANT
3. Tunggu loading di background
4. Jika error, UI rollback otomatis

---

## 🔧 Troubleshooting

### ❌ "Supabase credentials not configured"

**Problem**: File `.env.local` tidak ada atau salah

**Solution**:
```bash
# Check apakah file ada
ls -la .env.local

# Kalau tidak ada, copy dari template
cp .env.example .env.local

# Edit dan isi credentials
nano .env.local
```

### ❌ "Failed to fetch products" / Timeout

**Problem**: Supabase project paused atau RLS blocking

**Solutions**:
1. Check Supabase Dashboard → harusnya status "Active" (hijau)
2. Free tier Supabase auto-pause setelah 1 minggu tidak aktif
3. Klik "Restore project" jika paused
4. Check RLS policies (lihat section RLS di atas)

### ❌ Real-time tidak bekerja

**Problem**: Realtime belum di-enable di tables

**Solution**:
1. Ikuti langkah 5️⃣ di atas (Enable Realtime)
2. Restart dev server: `npm run dev`
3. Hard refresh browser: `Ctrl+Shift+R` (Windows) atau `Cmd+Shift+R` (Mac)

### ❌ "JWT expired" / Auth errors

**Problem**: Session expired (normal setelah 1 jam)

**Solution**:
- User harus login ulang
- Atau set `autoRefreshToken: true` di Supabase config (sudah di-set by default)

### ❌ CORS errors

**Problem**: URL tidak match atau wrong credentials

**Solution**:
```env
# Pastikan URL TIDAK ada trailing slash
✅ VITE_SUPABASE_URL=https://abc.supabase.co
❌ VITE_SUPABASE_URL=https://abc.supabase.co/
```

---

## 📊 Database Structure

### Core Tables

```
stores
├── id (uuid, PK)
├── name (text)
├── slug (text, unique)
├── logo_url (text)
├── qris_code (text)
└── created_at (timestamp)

store_members (junction table)
├── store_id (uuid, FK → stores)
├── user_id (uuid, FK → auth.users)
├── role (enum: owner, manager, staff)
└── created_at (timestamp)

products
├── id (uuid, PK)
├── store_id (uuid, FK → stores)
├── name (text)
├── price (numeric)
├── cost (numeric)
├── total_stock (integer)
├── image_url (text)
└── ... (other fields)

sales
├── id (uuid, PK)
├── store_id (uuid, FK → stores)
├── total (numeric)
├── profit (numeric)
├── created_at (timestamp)
└── ... (other fields)

sale_items (junction table)
├── sale_id (uuid, FK → sales)
├── product_id (uuid, FK → products)
├── quantity (integer)
├── price (numeric)
└── cost (numeric)

purchases
├── id (uuid, PK)
├── store_id (uuid, FK → stores)
├── product_id (uuid, FK → products)
├── quantity (integer)
├── unit_cost (numeric)
└── ... (other fields)

suppliers
├── id (uuid, PK)
├── store_id (uuid, FK → stores)
├── name (text)
├── phone (text)
└── address (text)

snack_requests
├── id (uuid, PK)
├── store_id (uuid, FK → stores)
├── snack_name (text)
├── quantity (integer)
├── status (enum: pending, approved, rejected)
└── ... (other fields)
```

---

## 🌐 Production Deployment

### Vercel / Netlify

Environment variables di dashboard:
```
VITE_SUPABASE_URL=https://your-prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-prod-anon-key
VITE_ENABLE_REALTIME=true
```

### Cloudflare Pages

```bash
# Set via wrangler CLI
wrangler pages secret put VITE_SUPABASE_URL
wrangler pages secret put VITE_SUPABASE_ANON_KEY
```

### Best Practices

1. **Separate Projects**: Dev, Staging, Production
2. **Backup Database**: Setup automated backups di Supabase
3. **Monitor Usage**: Free tier = 500MB database, 2GB bandwidth/month
4. **Rotate Keys**: Jika keys exposed, regenerate di Supabase dashboard

---

## 📚 Resources

- **Supabase Docs**: https://supabase.com/docs
- **Realtime Guide**: https://supabase.com/docs/guides/realtime
- **RLS Guide**: https://supabase.com/docs/guides/auth/row-level-security
- **JavaScript Client**: https://supabase.com/docs/reference/javascript
- **Dashboard**: https://supabase.com/dashboard

---

## 💡 Tips & Tricks

### Supabase Studio (Local Development)

```bash
# Run Supabase locally
supabase start

# Use local credentials
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Stop local Supabase
supabase stop
```

### Monitoring Realtime Connections

Buka Chrome DevTools → Console:
```javascript
// Check active subscriptions
console.log('Active channels:', supabase.getChannels());

// Force invalidate cache
queryClient.invalidateQueries({ queryKey: ['products'] });
```

### Database Playground

Test queries di SQL Editor:
```sql
-- Check total products
SELECT COUNT(*) FROM products;

-- Check realtime enabled tables
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'products';
```

---

## ✅ Setup Checklist

- [ ] Supabase project created
- [ ] `.env.local` configured with correct credentials
- [ ] Database schema migrated
- [ ] Realtime enabled on all tables
- [ ] RLS policies setup
- [ ] Test connection successful
- [ ] Real-time sync tested (2 devices)
- [ ] Auth flow tested (signup/login/logout)
- [ ] Production environment variables set

---

## 🆘 Need Help?

1. **Check Console Logs**: Browser DevTools (F12) → Console
2. **Check Supabase Logs**: Dashboard → Logs → API Logs
3. **Review Docs**: 
   - `IMPLEMENTATION-SUMMARY.md` - Architecture overview
   - `CHANGELOG-REALTIME-SYNC.md` - Feature details
4. **GitHub Issues**: [Add your repo URL here]

---

**Last Updated**: 2025-12-06  
**Version**: 2.2.0
