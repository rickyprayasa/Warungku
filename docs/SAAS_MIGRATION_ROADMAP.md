# Roadmap Migrasi Omzetin ke SaaS dengan Supabase

> **Dokumen ini berisi perencanaan detail untuk mengubah Omzetin dari aplikasi single-tenant menjadi SaaS multi-tenant dengan Supabase sebagai backend.**

---

## Daftar Isi

1. [Overview](#1-overview)
2. [Arsitektur Saat Ini vs Target](#2-arsitektur-saat-ini-vs-target)
3. [Fase 1: Persiapan & Database Schema](#fase-1-persiapan--database-schema)
4. [Fase 2: Setup Supabase](#fase-2-setup-supabase)
5. [Fase 3: Authentication & Authorization](#fase-3-authentication--authorization)
6. [Fase 4: API Migration](#fase-4-api-migration)
7. [Fase 5: Frontend Integration](#fase-5-frontend-integration)
8. [Fase 6: Testing & QA](#fase-6-testing--qa)
9. [Fase 7: Deployment & Go-Live](#fase-7-deployment--go-live)
10. [Fase 8: Post-Launch](#fase-8-post-launch)
11. [Timeline & Estimasi](#timeline--estimasi)
12. [Risk & Mitigation](#risk--mitigation)
13. [Checklist](#checklist)

---

## 1. Overview

### Tujuan Migrasi
- Mengubah Omzetin menjadi platform SaaS multi-tenant
- Setiap toko/warung memiliki data terisolasi
- Skalabilitas untuk ribuan tenant
- Keamanan data dengan Row Level Security (RLS)

### Tech Stack Target
| Layer | Current | Target |
|-------|---------|--------|
| Database | Cloudflare D1 | Supabase PostgreSQL |
| Auth | Custom (localStorage) | Supabase Auth |
| API | Cloudflare Worker | Supabase Edge Functions / Keep Worker |
| Storage | Base64 in DB | Supabase Storage |
| Realtime | - | Supabase Realtime (optional) |

---

## 2. Arsitektur Saat Ini vs Target

### Arsitektur Saat Ini (Single-Tenant)
```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (React)                    │
│                    localStorage session                  │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Cloudflare Worker (Hono)                │
│                    No Auth Middleware                    │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                    Cloudflare D1                         │
│              Semua data dalam 1 database                 │
│                   Tidak ada tenant_id                    │
└─────────────────────────────────────────────────────────┘
```

### Arsitektur Target (Multi-Tenant SaaS)
```
┌─────────────────────────────────────────────────────────┐
│                      Frontend (React)                    │
│                   Supabase Auth Client                   │
│                      JWT Token                           │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│              API Layer (Worker / Edge Functions)         │
│                  JWT Validation Middleware               │
│                  Tenant Context Injection                │
└─────────────────────────┬───────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                  Supabase PostgreSQL                     │
│                 Row Level Security (RLS)                 │
│              Automatic tenant_id filtering               │
└─────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────┐
│                   Supabase Storage                       │
│              Product images per tenant                   │
└─────────────────────────────────────────────────────────┘
```

---

## Fase 1: Persiapan & Database Schema

### 1.1 Database Schema Baru

#### Tabel: `stores` (Tenant)
```sql
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- untuk subdomain: warung-abc.omzetin.com
  address TEXT,
  phone TEXT,
  logo_url TEXT,
  qris_code TEXT,
  cart_enabled BOOLEAN DEFAULT true,
  
  -- Subscription & Billing
  plan TEXT DEFAULT 'free', -- free, basic, pro, enterprise
  plan_expires_at TIMESTAMPTZ,
  
  -- Settings
  settings JSONB DEFAULT '{}',
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stores_slug ON stores(slug);
```

#### Tabel: `store_members` (User-Store Relationship)
```sql
CREATE TABLE store_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff', -- owner, admin, staff
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(store_id, user_id)
);

CREATE INDEX idx_store_members_user ON store_members(user_id);
CREATE INDEX idx_store_members_store ON store_members(store_id);
```

#### Tabel: `products` (Updated)
```sql
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
```

#### Tabel: `sales` (Updated)
```sql
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  total DECIMAL(15,2) NOT NULL,
  profit DECIMAL(15,2) NOT NULL,
  sale_type TEXT DEFAULT 'retail', -- retail, display, opname
  notes TEXT,
  
  -- Optional: staff who made the sale
  created_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_store ON sales(store_id);
CREATE INDEX idx_sales_store_date ON sales(store_id, created_at);
```

#### Tabel: `sale_items` (Updated)
```sql
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  
  product_name TEXT NOT NULL, -- snapshot
  quantity INTEGER NOT NULL,
  price DECIMAL(15,2) NOT NULL,
  cost DECIMAL(15,2) NOT NULL
);

CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
```

#### Tabel: `purchases` (Updated)
```sql
CREATE TABLE purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
```

#### Tabel: `stock_details` (Updated)
```sql
CREATE TABLE stock_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  purchase_id UUID REFERENCES purchases(id),
  
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(15,2) NOT NULL,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_stock_details_product ON stock_details(product_id);
CREATE INDEX idx_stock_details_store ON stock_details(store_id);
```

#### Tabel: `suppliers` (Updated)
```sql
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  address TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suppliers_store ON suppliers(store_id);
```

#### Tabel: `snack_requests` (Updated)
```sql
CREATE TABLE snack_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
```

#### Tabel: `reconciliations` (Updated)
```sql
CREATE TABLE reconciliations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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
```

#### Tabel: `settings` (Updated)
```sql
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  
  UNIQUE(store_id, key)
);

CREATE INDEX idx_settings_store ON settings(store_id);
```

### 1.2 Row Level Security (RLS) Policies

```sql
-- Enable RLS on all tables
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE snack_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliations ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's store IDs
CREATE OR REPLACE FUNCTION get_user_store_ids()
RETURNS UUID[] AS $$
  SELECT ARRAY_AGG(store_id)
  FROM store_members
  WHERE user_id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Helper function to check store membership
CREATE OR REPLACE FUNCTION is_store_member(check_store_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM store_members
    WHERE user_id = auth.uid() AND store_id = check_store_id
  )
$$ LANGUAGE SQL SECURITY DEFINER;

-- Stores: Users can only see stores they're members of
CREATE POLICY "Users can view their stores"
  ON stores FOR SELECT
  USING (id IN (SELECT unnest(get_user_store_ids())));

CREATE POLICY "Store owners can update their stores"
  ON stores FOR UPDATE
  USING (
    id IN (
      SELECT store_id FROM store_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- Products: Based on store membership
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

-- Public access for product viewing (customer-facing)
CREATE POLICY "Public can view active products"
  ON products FOR SELECT
  USING (is_active = true);

-- Apply similar policies to other tables...
-- (sales, purchases, suppliers, etc.)
```

---

## Fase 2: Setup Supabase

### 2.1 Create Supabase Project
1. Buat project baru di [supabase.com](https://supabase.com)
2. Pilih region terdekat (Singapore untuk Indonesia)
3. Catat credentials:
   - Project URL
   - Anon Key
   - Service Role Key (untuk backend)

### 2.2 Environment Variables
```env
# .env.local (Frontend)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx

# Worker/Backend
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx
```

### 2.3 Database Migration
```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link project
supabase link --project-ref xxxxx

# Run migrations
supabase db push
```

### 2.4 Data Migration Script
```typescript
// scripts/migrate-d1-to-supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function migrateData() {
  // 1. Create default store from current data
  const { data: store } = await supabase
    .from('stores')
    .insert({
      name: 'Omzetin Store', // dari settings
      slug: 'omzetin',
    })
    .select()
    .single();

  // 2. Migrate products
  const d1Products = await fetchFromD1('/api/products');
  for (const product of d1Products) {
    await supabase.from('products').insert({
      store_id: store.id,
      name: product.name,
      price: product.price,
      // ... map semua fields
    });
  }

  // 3. Migrate sales, purchases, etc...
}
```

---

## Fase 3: Authentication & Authorization

### 3.1 Supabase Auth Setup

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Auth helpers
export const auth = {
  signUp: async (email: string, password: string, storeName: string) => {
    // 1. Create user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (authError) throw authError;
    
    // 2. Create store
    const { data: store } = await supabase
      .from('stores')
      .insert({ name: storeName, slug: generateSlug(storeName) })
      .select()
      .single();
    
    // 3. Add user as owner
    await supabase.from('store_members').insert({
      store_id: store.id,
      user_id: authData.user!.id,
      role: 'owner',
    });
    
    return { user: authData.user, store };
  },
  
  signIn: async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  },
  
  signOut: async () => {
    return supabase.auth.signOut();
  },
  
  getSession: async () => {
    return supabase.auth.getSession();
  },
};
```

### 3.2 Auth Context & Provider

```typescript
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  store: Store | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, storeName: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [store, setStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserStore(session.user.id);
      }
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserStore(session.user.id);
        } else {
          setStore(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const fetchUserStore = async (userId: string) => {
    const { data } = await supabase
      .from('store_members')
      .select('stores(*)')
      .eq('user_id', userId)
      .single();
    
    setStore(data?.stores as Store);
  };

  // ... implement signIn, signUp, signOut

  return (
    <AuthContext.Provider value={{ user, session, store, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
```

### 3.3 API Authentication Middleware

```typescript
// worker/middleware/auth.ts
import { createClient } from '@supabase/supabase-js';
import type { Context, Next } from 'hono';

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Unauthorized' }, 401);
  }

  const token = authHeader.replace('Bearer ', '');
  
  const supabase = createClient(
    c.env.SUPABASE_URL,
    c.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return c.json({ success: false, error: 'Invalid token' }, 401);
  }

  // Get user's store
  const { data: membership } = await supabase
    .from('store_members')
    .select('store_id, role')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return c.json({ success: false, error: 'No store access' }, 403);
  }

  // Inject into context
  c.set('user', user);
  c.set('storeId', membership.store_id);
  c.set('role', membership.role);

  await next();
}
```

---

## Fase 4: API Migration

### 4.1 Repository Pattern Update

```typescript
// worker/supabase-repository.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Product, Sale, Purchase } from '@shared/types';

export class SupabaseRepository {
  private client: SupabaseClient;
  private storeId: string;

  constructor(url: string, serviceKey: string, storeId: string) {
    this.client = createClient(url, serviceKey);
    this.storeId = storeId;
  }

  // Products
  async getProducts(): Promise<Product[]> {
    const { data, error } = await this.client
      .from('products')
      .select('*')
      .eq('store_id', this.storeId)
      .order('name');

    if (error) throw error;
    return data;
  }

  async getProduct(id: string): Promise<Product | null> {
    const { data, error } = await this.client
      .from('products')
      .select('*')
      .eq('id', id)
      .eq('store_id', this.storeId)
      .single();

    if (error) return null;
    return data;
  }

  async createProduct(product: Omit<Product, 'id' | 'store_id'>): Promise<Product> {
    const { data, error } = await this.client
      .from('products')
      .insert({ ...product, store_id: this.storeId })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const { data, error } = await this.client
      .from('products')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('store_id', this.storeId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteProduct(id: string): Promise<void> {
    const { error } = await this.client
      .from('products')
      .delete()
      .eq('id', id)
      .eq('store_id', this.storeId);

    if (error) throw error;
  }

  // Sales with stock update (transaction)
  async createSaleWithStock(sale: Omit<Sale, 'id'>, stockUpdates: StockUpdate[]): Promise<Sale> {
    // Use Supabase RPC for transaction
    const { data, error } = await this.client.rpc('create_sale_with_stock', {
      p_store_id: this.storeId,
      p_sale: sale,
      p_stock_updates: stockUpdates,
    });

    if (error) throw error;
    return data;
  }

  // ... implement other methods
}
```

### 4.2 Updated Routes

```typescript
// worker/user-routes.ts
import { Hono } from 'hono';
import { authMiddleware } from './middleware/auth';
import { SupabaseRepository } from './supabase-repository';

export function userRoutes(app: Hono) {
  // Public routes (no auth needed)
  app.get('/api/public/products/:storeSlug', async (c) => {
    const { storeSlug } = c.req.param();
    // Fetch public products for customer view
  });

  // Protected routes
  app.use('/api/*', authMiddleware);

  app.get('/api/products', async (c) => {
    const storeId = c.get('storeId');
    const repo = new SupabaseRepository(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY,
      storeId
    );

    const products = await repo.getProducts();
    return c.json({ success: true, data: products });
  });

  app.post('/api/products', async (c) => {
    const storeId = c.get('storeId');
    const body = await c.req.json();
    
    const repo = new SupabaseRepository(
      c.env.SUPABASE_URL,
      c.env.SUPABASE_SERVICE_ROLE_KEY,
      storeId
    );

    const product = await repo.createProduct(body);
    return c.json({ success: true, data: product });
  });

  // ... other routes
}
```

---

## Fase 5: Frontend Integration

### 5.1 Update Store (Zustand)

```typescript
// src/lib/store.ts
import { create } from 'zustand';
import { supabase } from './supabase';

interface WarungState {
  products: Product[];
  isLoading: boolean;
  error: string | null;
  
  // New: Current store context
  currentStore: Store | null;
  setCurrentStore: (store: Store) => void;
}

export const useWarungStore = create<WarungState>((set, get) => ({
  products: [],
  isLoading: false,
  error: null,
  currentStore: null,

  setCurrentStore: (store) => set({ currentStore: store }),

  fetchProducts: async () => {
    const { currentStore } = get();
    if (!currentStore) return;

    set({ isLoading: true, error: null });

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', currentStore.id)
      .order('name');

    if (error) {
      set({ error: error.message, isLoading: false });
    } else {
      set({ products: data || [], isLoading: false });
    }
  },

  // Realtime subscription
  subscribeToProducts: () => {
    const { currentStore } = get();
    if (!currentStore) return;

    const subscription = supabase
      .channel('products')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `store_id=eq.${currentStore.id}`,
        },
        (payload) => {
          // Handle realtime updates
          if (payload.eventType === 'INSERT') {
            set((state) => ({ products: [...state.products, payload.new as Product] }));
          } else if (payload.eventType === 'UPDATE') {
            set((state) => ({
              products: state.products.map((p) =>
                p.id === payload.new.id ? (payload.new as Product) : p
              ),
            }));
          } else if (payload.eventType === 'DELETE') {
            set((state) => ({
              products: state.products.filter((p) => p.id !== payload.old.id),
            }));
          }
        }
      )
      .subscribe();

    return () => subscription.unsubscribe();
  },
}));
```

### 5.2 API Client Update

```typescript
// src/lib/api-client.ts
import { supabase } from './supabase';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const { data: { session } } = await supabase.auth.getSession();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init?.headers || {}),
  };

  if (session?.access_token) {
    headers['Authorization'] = `Bearer ${session.access_token}`;
  }

  const res = await fetch(path, { ...init, headers });
  const json = await res.json();

  if (!res.ok || !json.success) {
    throw new Error(json.error || 'Request failed');
  }

  return json.data;
}
```

### 5.3 Login Page Update

```typescript
// src/pages/LoginPage.tsx
import { useAuth } from '@/contexts/AuthContext';

export function LoginPage() {
  const { signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isSignUp) {
      await signUp(email, password, storeName);
    } else {
      await signIn(email, password);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      {isSignUp && (
        <input
          type="text"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="Nama Toko"
        />
      )}
      <button type="submit">{isSignUp ? 'Daftar' : 'Masuk'}</button>
    </form>
  );
}
```

---

## Fase 6: Testing & QA

### 6.1 Test Cases

#### Unit Tests
```typescript
// tests/repository.test.ts
describe('SupabaseRepository', () => {
  it('should only fetch products for current store', async () => {
    const repo = new SupabaseRepository(url, key, 'store-1');
    const products = await repo.getProducts();
    
    expect(products.every(p => p.store_id === 'store-1')).toBe(true);
  });

  it('should not allow accessing other store products', async () => {
    const repo = new SupabaseRepository(url, key, 'store-1');
    const product = await repo.getProduct('product-from-store-2');
    
    expect(product).toBeNull();
  });
});
```

#### E2E Tests
```typescript
// tests/e2e/multi-tenant.spec.ts
test('tenant isolation', async ({ page }) => {
  // Login as Store A
  await loginAs(page, 'store-a@test.com');
  await page.goto('/dashboard');
  
  // Create product
  await page.click('text=Tambah Produk');
  await page.fill('[name=name]', 'Product A');
  await page.click('text=Simpan');
  
  // Logout and login as Store B
  await logout(page);
  await loginAs(page, 'store-b@test.com');
  await page.goto('/dashboard');
  
  // Should not see Store A's product
  await expect(page.locator('text=Product A')).not.toBeVisible();
});
```

### 6.2 Security Testing Checklist
- [ ] RLS policies block cross-tenant access
- [ ] JWT token validation works correctly
- [ ] Rate limiting prevents abuse
- [ ] SQL injection prevented
- [ ] XSS prevented in user inputs
- [ ] CSRF tokens validated

---

## Fase 7: Deployment & Go-Live

### 7.1 Deployment Checklist
- [ ] Backup existing D1 data
- [ ] Run Supabase migrations
- [ ] Run data migration script
- [ ] Update environment variables
- [ ] Deploy worker with new code
- [ ] Deploy frontend
- [ ] Test all critical flows
- [ ] Monitor error logs

### 7.2 Rollback Plan
```bash
# If something goes wrong:
# 1. Revert worker to previous version
wrangler rollback

# 2. Frontend rollback (via Cloudflare Pages)
# Use dashboard to rollback deployment

# 3. Data is still in D1 as backup
```

### 7.3 DNS & Domain Setup
```
# Subdomain routing for multi-tenant
*.omzetin.com -> Worker (extract store slug)
app.omzetin.com -> Main dashboard
api.omzetin.com -> API endpoint
```

---

## Fase 8: Post-Launch

### 8.1 Monitoring Setup
```typescript
// Structured logging
import { Logger } from './logger';

const logger = new Logger({
  service: 'omzetin-api',
  environment: process.env.NODE_ENV,
});

// Usage
logger.info('Product created', { storeId, productId });
logger.error('Failed to create sale', { storeId, error });
```

### 8.2 Analytics & Metrics
- Track active stores
- Track daily transactions per store
- Monitor API response times
- Track error rates

### 8.3 Billing Integration (Future)
```typescript
// Integration dengan Stripe/Xendit untuk subscription
interface Subscription {
  storeId: string;
  plan: 'free' | 'basic' | 'pro';
  status: 'active' | 'past_due' | 'canceled';
  currentPeriodEnd: Date;
}
```

---

## Timeline & Estimasi

| Fase | Durasi | Dependencies |
|------|--------|--------------|
| Fase 1: Schema | 2-3 jam | - |
| Fase 2: Supabase Setup | 1-2 jam | Fase 1 |
| Fase 3: Auth | 2-3 jam | Fase 2 |
| Fase 4: API Migration | 3-4 jam | Fase 2, 3 |
| Fase 5: Frontend | 2-3 jam | Fase 3, 4 |
| Fase 6: Testing | 2-3 jam | Fase 5 |
| Fase 7: Deployment | 1-2 jam | Fase 6 |
| Fase 8: Post-Launch | Ongoing | Fase 7 |

**Total: ~2-3 hari kerja**

---

## Risk & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during migration | High | Full backup sebelum migrasi, test di staging |
| RLS policy bugs | High | Extensive testing, audit queries |
| Performance degradation | Medium | Monitor query times, add indexes |
| Auth token issues | Medium | Implement token refresh, handle edge cases |
| Breaking changes | Medium | Feature flags, gradual rollout |

---

## Checklist

### Pre-Migration
- [ ] Backup semua data D1
- [ ] Document current API contracts
- [ ] Setup Supabase project
- [ ] Test migration script di staging

### Database
- [ ] Create all tables
- [ ] Setup RLS policies
- [ ] Create helper functions
- [ ] Add necessary indexes
- [ ] Migrate data from D1

### Authentication
- [ ] Setup Supabase Auth
- [ ] Implement AuthContext
- [ ] Update login/signup flows
- [ ] Add auth middleware to API

### API
- [ ] Update repository layer
- [ ] Add tenant filtering to all endpoints
- [ ] Update error handling
- [ ] Add rate limiting

### Frontend
- [ ] Update API client with auth headers
- [ ] Update store to use Supabase
- [ ] Add realtime subscriptions
- [ ] Update all components

### Testing
- [ ] Unit tests for repository
- [ ] Integration tests for API
- [ ] E2E tests for critical flows
- [ ] Security testing

### Deployment
- [ ] Update environment variables
- [ ] Deploy to staging
- [ ] Full QA on staging
- [ ] Deploy to production
- [ ] Monitor for issues

---

## Appendix

### A. Useful Supabase CLI Commands
```bash
# Generate types from database
supabase gen types typescript --project-id xxxxx > src/types/supabase.ts

# Run migrations
supabase db push

# Reset database (development)
supabase db reset

# View logs
supabase logs
```

### B. Sample .env Files
```env
# .env.local (Frontend)
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxx

# .env (Worker)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJxxxxx
```

### C. Contacts & Resources
- Supabase Docs: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Project Repository: [your-repo-url]

---

*Dokumen ini akan diupdate seiring progress migrasi.*

*Last updated: November 2024*
