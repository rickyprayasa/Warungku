# SAFE REFACTOR STRATEGY & MIGRATION ROADMAP
## Warungku/Omzetin - Incremental Refactor Plan

**Last Updated**: 2026-03-04
**Status**: Phase 3 Complete - Ready for Implementation
**Estimated Timeline**: 8-12 weeks (modular approach)

---

## 🎯 REFACTOR CONSTRAINTS

✅ **System must stay live** - Zero downtime deployment
✅ **No full rewrite** - Incremental, modular changes
✅ **Backward compatible** - Old API continues working during transition
✅ **Rollback ready** - Each step can be reverted independently

---

## 📊 IMPLEMENTATION PHASES OVERVIEW

```
┌─────────────────────────────────────────────────────────────────┐
│                    REFACTOR TIMELINE                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  WEEK 1-2    SECURITY FIXES (CRITICAL)                          │
│  ├─ Fix RLS bypass                                              │
│  ├─ Remove hardcoded admin                                     │
│  └─ Add server-side validation                                  │
│                                                                 │
│  WEEK 3-4    INFRASTRUCTURE SETUP                               │
│  ├─ Setup caching layer                                         │
│  ├─ Add monitoring & logging                                    │
│  └─ Configure CI/CD pipeline                                     │
│                                                                 │
│  WEEK 5-6    DATA LAYER REFACTOR                                │
│  ├─ Create repository interfaces                                │
│  ├─ Implement new repositories                                  │
│  └─ Add database indexes                                        │
│                                                                 │
│  WEEK 7-8    SERVICE LAYER EXTRACTION                            │
│  ├─ Extract business logic to services                          │
│  ├─ Create use case classes                                     │
│  └─ Implement event system                                      │
│                                                                 │
│  WEEK 9-10   API LAYER MODERNIZATION                            │
│  ├─ Implement new controllers                                   │
│  ├─ Add middleware stack                                        │
│  ├─ Setup new API routes (versioned)                            │
│  └─ Migrate authentication flow                                 │
│                                                                 │
│  WEEK 11-12  FRONTEND MIGRATION & TESTING                       │
│  ├─ Update API client                                           │
│  ├─ Migrate to new endpoints                                    │
│  ├─ Add comprehensive testing                                   │
│  └─ Performance optimization                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔴 PHASE 1: CRITICAL SECURITY FIXES (Week 1-2)

### Priority: 🔴 CRITICAL - Do Immediately
### Risk Level: HIGH (but necessary)
### Rollback: Easy (revert code changes)

---

### Step 1.1: Fix RLS Policy Bypass
**Timeline**: 2 days
**Files to Modify**: Multiple files with `.select('*, stores(*)')` patterns

**Current Code (❌ Vulnerable)**:
```typescript
// src/lib/supabase.ts - Pattern found in multiple locations
const { data } = await supabase
  .from('sales')
  .select('*, stores(*)')  // ❌ May leak other stores' data
  .eq('store_id', storeId);
```

**Target Code (✅ Secure)**:
```typescript
// Use separate query for related data
const { data: sales } = await supabase
  .from('sales')
  .select('*')
  .eq('store_id', storeId);

// Only fetch store data if explicitly needed and RLS permits
const { data: store } = await supabase
  .from('stores')
  .select('*')
  .eq('id', storeId)
  .single();
```

**Migration Steps**:
1. Search for all `.select()` with joins: `grep -r "\.select.*\*" src/`
2. Review each for RLS bypass potential
3. Refactor to separate queries or secure RPC functions
4. Add comments explaining RLS safety

**Testing**:
- [ ] Unit tests for each refactored query
- [ ] Integration tests with multi-tenant data
- [ ] Manual testing with different store owners

**Rollback Plan**: Revert specific file changes, no data migration needed

---

### Step 1.2: Implement Role-Based Access Control
**Timeline**: 3 days
**Files to Create**:
- `src/core/domain/entities/Role.ts`
- `src/infrastructure/repositories/SupabaseUserRepository.ts`
- `src/api/middlewares/roleCheck.middleware.ts`

**Current Code (❌ Hardcoded)**:
```typescript
// Found in multiple files
const ADMIN_EMAILS = ['admin@rsquareidea.my.id'];
if (ADMIN_EMAILS.includes(user.email)) {
  // Grant admin access
}
```

**Target Code (✅ RBAC)**:
```typescript
// 1. Create Role entity
// src/core/domain/entities/Role.ts
export enum UserRole {
  SUPER_ADMIN = 'super_admin',
  STORE_OWNER = 'store_owner',
  STORE_MEMBER = 'store_member',
  CASHIER = 'cashier',
}

export interface UserPermissions {
  canManageUsers: boolean;
  canManageStores: boolean;
  canManageSubscriptions: boolean;
  canViewAnalytics: boolean;
}

// 2. Add role column to users table (migration)
// CREATE TABLE migration_add_user_role
ALTER TABLE public.users
  ADD COLUMN role TEXT DEFAULT 'store_owner',
  ADD CONSTRAINT role_constraint
    CHECK (role IN ('super_admin', 'store_owner', 'store_member', 'cashier'));

CREATE INDEX idx_users_role ON public.users(role);

-- Update existing admin
UPDATE public.users
SET role = 'super_admin'
WHERE email = 'admin@rsquareidea.my.id';

// 3. Create permission checker
// src/core/services/auth/PermissionService.ts
export class PermissionService {
  async getUserRole(userId: string): Promise<UserRole> {
    const { data } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    return data?.role || UserRole.STORE_MEMBER;
  }

  async hasPermission(
    userId: string,
    permission: keyof UserPermissions
  ): Promise<boolean> {
    const role = await this.getUserRole(userId);
    return ROLE_PERMISSIONS[role][permission];
  }
}

const ROLE_PERMISSIONS: Record<UserRole, UserPermissions> = {
  [UserRole.SUPER_ADMIN]: {
    canManageUsers: true,
    canManageStores: true,
    canManageSubscriptions: true,
    canViewAnalytics: true,
  },
  [UserRole.STORE_OWNER]: {
    canManageUsers: false,
    canManageStores: true,
    canManageSubscriptions: false,
    canViewAnalytics: true,
  },
  [UserRole.STORE_MEMBER]: {
    canManageUsers: false,
    canManageStores: true,
    canManageSubscriptions: false,
    canViewAnalytics: false,
  },
  [UserRole.CASHIER]: {
    canManageUsers: false,
    canManageStores: false,
    canManageSubscriptions: false,
    canViewAnalytics: false,
  },
};
```

**Migration Steps**:
1. Create database migration to add `role` column
2. Seed existing users with appropriate roles
3. Replace all `ADMIN_EMAILS` checks with `PermissionService`
4. Add role-based UI elements

**Testing**:
- [ ] Verify existing admin has super_admin role
- [ ] Test permission checks for each role
- [ ] Verify store owners can't access admin features
- [ ] Test role escalation attempts (should fail)

**Rollback Plan**:
- Revert code changes
- `ALTER TABLE users DROP COLUMN role`
- No data loss (role can be recalculated from email)

---

### Step 1.3: Add Server-Side Validation
**Timeline**: 2 days
**Files to Create**:
- `src/api/validators/` directory
- Individual validator files for each endpoint

**Current Code (❌ Client-side only)**:
```typescript
// Found in components - Zod validation on client only
const schema = z.object({
  name: z.string().min(1),
  price: z.number().positive(),
});
// No server-side validation!
```

**Target Code (✅ Server-side validation)**:
```typescript
// src/api/validators/product.validators.ts
import { z } from 'zod';

export const CreateProductSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().positive().finite(),
  cost: z.number().nonnegative().finite(),
  total_stock: z.number().int().nonnegative(),
  min_stock_level: z.number().int().nonnegative(),
  category: z.string().max(100).optional(),
  store_id: z.string().uuid(),
});

export const UpdateProductSchema = CreateProductSchema.partial();

export const BulkCreateProductsSchema = z.object({
  products: z.array(CreateProductSchema).min(1).max(100),
});

// src/api/validators/sale.validators.ts
export const CreateSaleSchema = z.object({
  store_id: z.string().uuid(),
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().positive().max(1000),
    unit_price: z.number().positive().finite(),
    cost: z.number().nonnegative().finite(),
  })).min(1).max(50),
  payment_method: z.enum(['cash', 'qris', 'debit', 'transfer']),
  customer_id: z.string().uuid().optional(),
  notes: z.string().max(500).optional(),
});

// Middleware to use validators
export async function validateRequest<T>(
  schema: z.ZodSchema<T>,
  req: Request
): Promise<T> {
  try {
    const body = await req.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new BadRequestError('Validation failed', {
        errors: error.errors,
      });
    }
    throw error;
  }
}
```

**Migration Steps**:
1. Create validator schemas for all endpoints
2. Add validation middleware to API routes
3. Test with valid and invalid payloads
4. Add client-side validation matching server rules

**Testing**:
- [ ] Test each validator with valid data
- [ ] Test each validator with invalid data (missing fields, wrong types)
- [ ] Test boundary conditions (min/max values)
- [ ] Test malicious payloads (SQL injection attempts)

**Rollback Plan**: Remove validation middleware from routes

---

### Step 1.4: Fix Authentication State Loop
**Timeline**: 1 day
**Files to Modify**: `src/contexts/AuthContext.tsx`

**Current Code (❌ Loops on every render)**:
```typescript
useEffect(() => {
  if (user) {
    createStoreIfNotExists(user);  // Runs every time!
  }
}, [user]);
```

**Target Code (✅ Single execution)**:
```typescript
useEffect(() => {
  async function initializeUser() {
    if (user && !userStoreInitialized.current) {
      userStoreInitialized.current = true;
      try {
        await ensureStoreExists(user);
      } catch (error) {
        logger.error('Failed to ensure store exists', { error, userId: user.id });
        // Don't block auth if store creation fails
      }
    }
  }

  initializeUser();
}, [user?.id]); // Only re-run if user ID changes
```

**Migration Steps**:
1. Add ref to track initialization
2. Change dependency array to `[user?.id]`
3. Add error handling (don't fail auth if store creation fails)
4. Add logging for debugging

**Testing**:
- [ ] Test fresh user signup
- [ ] Test existing user login
- [ ] Test with network failure (store creation should not block)
- [ ] Monitor for multiple store creation attempts

**Rollback Plan**: Revert useEffect changes

---

## 🟡 PHASE 2: INFRASTRUCTURE SETUP (Week 3-4)

### Priority: 🟡 HIGH - Foundation for other changes
### Risk Level: MEDIUM
### Rollback: Easy (disable features)

---

### Step 2.1: Setup Caching Layer
**Timeline**: 3 days
**Files to Create**:
- `src/infrastructure/cache/` directory
- Cache configuration and implementations

**Implementation**:
```typescript
// src/infrastructure/cache/CacheProvider.ts
export interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}

// src/infrastructure/cache/CloudflareKVCache.ts
export class CloudflareKVCache implements ICache {
  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.kv.get(key, 'json');
    return value as T | null;
  }

  async set<T>(key: string, value: T, ttl = 3600): Promise<void> {
    await this.kv.put(key, JSON.stringify(value), {
      expirationTtl: ttl,
    });
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }

  async invalidate(pattern: string): Promise<void> {
    // KV doesn't support pattern matching
    // Need to track keys in a list
    const keys = await this.kv.get(`keys:${pattern}`, 'json');
    if (Array.isArray(keys)) {
      await Promise.all(keys.map(k => this.delete(k)));
    }
  }
}

// src/infrastructure/cache/CacheManager.ts
export class CacheManager {
  private static instance: CacheManager;
  private cache: ICache;

  private constructor(cache: ICache) {
    this.cache = cache;
  }

  static initialize(cache: ICache) {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager(cache);
    }
    return CacheManager.instance;
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      throw new Error('CacheManager not initialized');
    }
    return CacheManager.instance;
  }

  // Convenience methods with typed keys
  async getUser(userId: string): Promise<User | null> {
    return this.cache.get<User>(`user:${userId}`);
  }

  async setUser(userId: string, user: User): Promise<void> {
    return this.cache.set(`user:${userId}`, user, 900); // 15 min
  }

  async getProducts(storeId: string): Promise<Product[] | null> {
    return this.cache.get<Product[]>(`products:${storeId}`);
  }

  async setProducts(storeId: string, products: Product[]): Promise<void> {
    return this.cache.set(`products:${storeId}`, products, 120); // 2 min
  }

  async invalidateStore(storeId: string): Promise<void> {
    await this.cache.invalidate(`store:${storeId}:*`);
  }
}
```

**Migration Steps**:
1. Add Cloudflare KV binding to `wrangler.toml`
2. Create cache interface and implementations
3. Initialize CacheManager in app entry point
4. Add caching to high-traffic endpoints (products, sales)
5. Add cache invalidation on mutations

**Testing**:
- [ ] Test cache hit/miss scenarios
- [ ] Test cache expiration
- [ ] Test cache invalidation
- [ ] Measure performance improvement

**Rollback Plan**: Disable cache by switching to NoOpCache implementation

---

### Step 2.2: Add Monitoring & Logging
**Timeline**: 3 days
**Services to Integrate**:
- LogRocket (session replay)
- Sentry (error tracking)
- Vercel Analytics (performance)

**Implementation**:
```typescript
// src/infrastructure/logging/Logger.ts
export class Logger {
  private static instance: Logger;

  private constructor(
    private service: string,
    private environment: string
  ) {}

  static initialize(service: string) {
    if (!Logger.instance) {
      Logger.instance = new Logger(
        service,
        process.env.NODE_ENV || 'development'
      );
    }
    return Logger.instance;
  }

  info(message: string, meta?: Record<string, any>) {
    this.log('info', message, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, any>) {
    this.log('error', message, {
      ...meta,
      error: {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
      },
    });

    // Send to Sentry in production
    if (this.environment === 'production' && error) {
      Sentry.captureException(error, { extra: meta });
    }
  }

  private log(level: string, message: string, meta?: Record<string, any>) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      message,
      ...meta,
    };

    // Console in development
    if (this.environment === 'development') {
      console.log(JSON.stringify(entry, null, 2));
    }

    // External service in production
    if (this.environment === 'production') {
      // Send to logging service
      fetch('/api/logs', {
        method: 'POST',
        body: JSON.stringify(entry),
      }).catch(err => console.error('Failed to send logs:', err));
    }
  }
}

// Usage in app
const logger = Logger.initialize('warungku-api');
logger.info('Sale created', { saleId, storeId, amount });
```

**Migration Steps**:
1. Add Sentry and LogRocket SDKs
2. Create Logger class
3. Initialize in app entry point
4. Add logging to critical paths
5. Setup error boundaries

**Testing**:
- [ ] Test logging in development
- [ ] Verify logs appear in Sentry
- [ ] Test error boundary triggering
- [ ] Verify session replay works

**Rollback Plan**: Remove logger initialization calls

---

### Step 2.3: Configure CI/CD Pipeline
**Timeline**: 2 days
**Tools**: GitHub Actions

**Implementation**:
```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run linter
        run: bun run lint

      - name: Run tests
        run: bun run test

      - name: Build
        run: bun run build

  deploy-preview:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel (Preview)
        run: vercel deploy --prebuilt
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}

  deploy-production:
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel (Production)
        run: vercel deploy --prebuilt --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

**Migration Steps**:
1. Create `.github/workflows/ci.yml`
2. Add required secrets to GitHub
3. Add test scripts to package.json
4. Configure Vercel for automatic deployments
5. Test PR workflow

**Testing**:
- [ ] Create PR and verify preview deployment
- [ ] Push to main and verify production deployment
- [ ] Intentionally break tests to verify failure handling

**Rollback Plan**: Delete workflow file, deploy manually

---

## 🟢 PHASE 3: DATA LAYER REFACTOR (Week 5-6)

### Priority: 🟢 MEDIUM - Foundation for service layer
### Risk Level: LOW (data access abstraction)
### Rollback: Easy (switch back to direct Supabase calls)

---

### Step 3.1: Create Repository Interfaces
**Timeline**: 2 days

**Implementation**:
```typescript
// src/infrastructure/database/repositories/IRepository.ts
export interface IRepository<T, K> {
  findById(id: K): Promise<T | null>;
  findAll(filter?: QueryFilter): Promise<T[]>;
  create(entity: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T>;
  update(id: K, updates: Partial<T>): Promise<T>;
  delete(id: K): Promise<void>;
}

export interface QueryFilter {
  where?: Record<string, any>;
  orderBy?: Record<string, 'asc' | 'desc'>;
  limit?: number;
  offset?: number;
}

// Specific repository interfaces
export interface IUserRepository extends IRepository<User, string> {
  findByEmail(email: string): Promise<User | null>;
  findByStore(storeId: string): Promise<User[]>;
}

export interface IStoreRepository extends IRepository<Store, string> {
  findBySlug(slug: string): Promise<Store | null>;
  findByOwner(userId: string): Promise<Store[]>;
}

export interface IProductRepository extends IRepository<Product, string> {
  findByStore(storeId: string, filter?: ProductFilter): Promise<Product[]>;
  findLowStock(storeId: string): Promise<Product[]>;
  search(query: string, storeId: string): Promise<Product[]>;
}

export interface ISaleRepository extends IRepository<Sale, string> {
  findByStore(storeId: string, dateRange?: DateRange): Promise<Sale[]>;
  getTodayStats(storeId: string): Promise<SaleStats>;
}
```

---

### Step 3.2: Implement Repository Pattern
**Timeline**: 4 days

**Implementation**:
```typescript
// src/infrastructure/database/repositories/SupabaseUserRepository.ts
export class SupabaseUserRepository implements IUserRepository {
  constructor(private supabase: SupabaseClient) {}

  async findById(id: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await this.supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) throw error;
    return data;
  }

  async findByStore(storeId: string): Promise<User[]> {
    const { data, error } = await this.supabase
      .from('store_members')
      .select('user_id, users(*)')
      .eq('store_id', storeId);

    if (error) throw error;
    return data?.map(sm => sm.users).filter(Boolean) || [];
  }

  async create(userData: CreateUserDTO): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .insert(userData)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async update(id: string, updates: Partial<User>): Promise<User> {
    const { data, error } = await this.supabase
      .from('users')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('users')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async findAll(filter?: QueryFilter): Promise<User[]> {
    let query = this.supabase.from('users').select('*');

    if (filter?.where) {
      Object.entries(filter.where).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    if (filter?.orderBy) {
      Object.entries(filter.orderBy).forEach(([key, direction]) => {
        query = query.order(key, { ascending: direction === 'asc' });
      });
    }

    if (filter?.limit) {
      query = query.limit(filter.limit);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  }
}

// src/infrastructure/database/repositories/SupabaseProductRepository.ts
export class SupabaseProductRepository implements IProductRepository {
  constructor(
    private supabase: SupabaseClient,
    private cache: CacheManager
  ) {}

  async findByStore(
    storeId: string,
    filter?: ProductFilter
  ): Promise<Product[]> {
    // Try cache first
    const cacheKey = `products:${storeId}`;
    const cached = await this.cache.getProducts(cacheKey);
    if (cached && !filter) return cached;

    // Build query
    let query = this.supabase
      .from('products')
      .select('*, stock_details(quantity)');

    query = query.eq('store_id', storeId);

    if (filter?.category) {
      query = query.eq('category', filter.category);
    }

    if (filter?.isActive !== undefined) {
      query = query.eq('is_active', filter.isActive);
    }

    if (filter?.search) {
      query = query.ilike('name', `%${filter.search}%`);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    // Cache results
    if (!filter) {
      await this.cache.setProducts(cacheKey, data || []);
    }

    return data || [];
  }

  async findLowStock(storeId: string): Promise<Product[]> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId)
      .lte('total_stock', supabase.raw('min_stock_level'))
      .order('total_stock', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  // ... other methods
}
```

**Migration Steps**:
1. Create repository interfaces
2. Implement Supabase repositories
3. Add dependency injection container
4. Replace direct Supabase calls with repositories (gradually)
5. Add integration tests

**Testing**:
- [ ] Unit tests for each repository method
- [ ] Integration tests with real Supabase
- [ ] Test cache integration
- [ ] Test error handling

**Rollback Plan**: Keep old Supabase calls commented out, revert if needed

---

### Step 3.3: Add Database Indexes
**Timeline**: 1 day

**Migration File**:
```sql
-- supabase/migrations/20260304_add_performance_indexes.sql

-- Sales query optimization
CREATE INDEX IF NOT EXISTS idx_sales_store_date
  ON sales(store_id, created_at DESC)
  WHERE created_at > CURRENT_DATE - INTERVAL '6 months';

CREATE INDEX IF NOT EXISTS idx_sales_store_status
  ON sales(store_id, created_at DESC)
  WHERE sale_type = 'sale';

-- Product query optimization
CREATE INDEX IF NOT EXISTS idx_products_store_active
  ON products(store_id, is_active, created_at DESC)
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_products_low_stock
  ON products(store_id, total_stock)
  WHERE total_stock <= min_stock_level;

CREATE INDEX IF NOT EXISTS idx_products_category
  ON products(store_id, category)
  WHERE category IS NOT NULL;

-- Sale items optimization
CREATE INDEX IF NOT EXISTS idx_sale_items_sale
  ON sale_items(sale_id);

CREATE INDEX IF NOT EXISTS idx_sale_items_product
  ON sale_items(product_id);

-- Stock details optimization
CREATE INDEX IF NOT EXISTS idx_stock_details_product_date
  ON stock_details(product_id, created_at DESC);

-- Store members optimization
CREATE INDEX IF NOT EXISTS idx_store_members_store
  ON store_members(store_id, role);

CREATE INDEX IF NOT EXISTS idx_store_members_user
  ON store_members(user_id);

-- Users optimization
CREATE INDEX IF NOT EXISTS idx_users_email
  ON users(email)
  WHERE email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_role
  ON users(role);

-- Function to check if indexes exist
CREATE OR REPLACE FUNCTION check_indexes()
RETURNS TABLE(name text, exists boolean) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'idx_sales_store_date'::text,
    EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_sales_store_date')
  UNION ALL
  SELECT
    'idx_products_store_active'::text,
    EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_products_store_active');
  -- ... add all indexes
END;
$$ LANGUAGE plpgsql;

-- Verify indexes
SELECT * FROM check_indexes();
```

**Migration Steps**:
1. Create migration file
2. Run in development environment
3. Verify indexes are created
4. Run EXPLAIN ANALYZE on common queries
5. Deploy to production

**Testing**:
- [ ] Verify all indexes are created
- [ ] Run EXPLAIN ANALYZE on slow queries
- [ ] Measure query performance improvement
- [ ] Test with production-like data volume

**Rollback Plan**: `DROP INDEX CONCURRENTLY index_name`

---

## 🔵 PHASE 4: SERVICE LAYER EXTRACTION (Week 7-8)

### Priority: 🔵 MEDIUM - Improves maintainability
### Risk Level: LOW (business logic extraction)
### Rollback: Easy (call repositories directly)

---

### Step 4.1: Create Service Classes
**Timeline**: 5 days

**Implementation**:
```typescript
// src/core/services/product/CreateProductService.ts
export class CreateProductService {
  constructor(
    private productRepo: IProductRepository,
    private storeRepo: IStoreRepository,
    private cache: CacheManager,
    private eventBus: EventBus
  ) {}

  async execute(input: CreateProductInput): Promise<Product> {
    // 1. Business rules validation
    const store = await this.storeRepo.findById(input.storeId);
    if (!store) {
      throw new NotFoundError('Store not found');
    }

    if (!await this.canUserCreateProduct(input.userId, store)) {
      throw new ForbiddenError('Insufficient permissions');
    }

    // 2. Check if product name already exists in store
    const existing = await this.productRepo.findByName(
      input.storeId,
      input.name
    );
    if (existing) {
      throw new BadRequestError('Product with this name already exists');
    }

    // 3. Create product
    const product = await this.productRepo.create({
      store_id: input.storeId,
      name: input.name,
      price: input.price,
      cost: input.cost || 0,
      total_stock: input.stock || 0,
      min_stock_level: input.minStockLevel || 5,
      category: input.category,
      is_active: true,
    });

    // 4. Invalidate cache
    await this.cache.invalidate(`products:${input.storeId}:*`);

    // 5. Publish event
    await this.eventBus.publish(new ProductCreatedEvent(product));

    return product;
  }

  private async canUserCreateProduct(
    userId: string,
    store: Store
  ): Promise<boolean> {
    // Check if user is store owner or member
    const member = await this.storeRepo.findMember(store.id, userId);
    return member && ['owner', 'admin'].includes(member.role);
  }
}

// src/core/services/sale/CreateSaleService.ts
export class CreateSaleService {
  constructor(
    private saleRepo: ISaleRepository,
    private productRepo: IProductRepository,
    private inventoryService: InventoryService,
    private cache: CacheManager,
    private eventBus: EventBus
  ) {}

  async execute(input: CreateSaleInput): Promise<Sale> {
    // 1. Validate store
    const store = await this.storeRepo.findById(input.storeId);
    if (!store) {
      throw new NotFoundError('Store not found');
    }

    // 2. Validate products and calculate totals
    const validatedItems = await this.validateSaleItems(
      input.storeId,
      input.items
    );

    // 3. Check stock availability
    await this.ensureStockAvailable(validatedItems);

    // 4. Calculate totals
    const total = validatedItems.reduce(
      (sum, item) => sum + (item.quantity * item.price),
      0
    );
    const totalCost = validatedItems.reduce(
      (sum, item) => sum + (item.quantity * item.cost),
      0
    );
    const profit = total - totalCost;

    // 5. Create sale (transaction handled by repository)
    const sale = await this.saleRepo.create({
      store_id: input.storeId,
      total,
      profit,
      sale_type: input.paymentMethod,
      created_by: input.userId,
      items: validatedItems,
    });

    // 6. Update inventory
    await this.inventoryService.recordSale(sale);

    // 7. Invalidate cache
    await this.cache.invalidate(`products:${input.storeId}:*`);
    await this.cache.invalidate(`sales:${input.storeId}:*`);

    // 8. Publish events
    await Promise.all([
      this.eventBus.publish(new SaleCreatedEvent(sale)),
      this.eventBus.publish(new InventoryUpdatedEvent(input.storeId)),
    ]);

    // 9. Check for low stock
    const lowStockProducts = await this.productRepo.findLowStock(input.storeId);
    if (lowStockProducts.length > 0) {
      await this.eventBus.publish(new LowStockEvent(input.storeId, lowStockProducts));
    }

    return sale;
  }

  private async validateSaleItems(
    storeId: string,
    items: SaleItemInput[]
  ): Promise<ValidatedSaleItem[]> {
    const productIds = items.map(i => i.productId);
    const products = await this.productRepo.findByIds(productIds);
    const productMap = new Map(products.map(p => [p.id, p]));

    return items.map(item => {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new NotFoundError(`Product ${item.productId} not found`);
      }

      if (product.store_id !== storeId) {
        throw new BadRequestError('Product does not belong to this store');
      }

      if (!product.is_active) {
        throw new BadRequestError(`Product ${product.name} is not active`);
      }

      return {
        productId: item.productId,
        productName: product.name,
        quantity: item.quantity,
        price: item.price || product.price,
        cost: product.cost,
      };
    });
  }

  private async ensureStockAvailable(items: ValidatedSaleItem[]): Promise<void> {
    const stockChecks = items.map(async (item) => {
      const available = await this.productRepo.getAvailableStock(item.productId);
      if (available < item.quantity) {
        throw new BadRequestError(
          `Insufficient stock for ${item.productName}. Available: ${available}, Requested: ${item.quantity}`
        );
      }
    });

    await Promise.all(stockChecks);
  }
}
```

**Migration Steps**:
1. Create service interfaces
2. Implement service classes
3. Replace business logic in components with services
4. Add unit tests for services
5. Gradual migration (one feature at a time)

**Testing**:
- [ ] Unit tests for each service
- [ ] Integration tests with repositories
- [ ] Test business rules validation
- [ ] Test event publishing

**Rollback Plan**: Keep old logic in components, revert to calling repositories directly

---

### Step 4.2: Implement Event System
**Timeline**: 3 days

**Implementation**:
```typescript
// src/infrastructure/events/EventBus.ts
export interface DomainEvent {
  eventType: string;
  occurredAt: Date;
  data: Record<string, any>;
}

export interface EventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}

export class EventBus {
  private handlers: Map<string, EventHandler<DomainEvent>[]> = new Map();

  subscribe<T extends DomainEvent>(
    eventType: string,
    handler: EventHandler<T>
  ): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }
    this.handlers.get(eventType)!.push(handler as EventHandler<DomainEvent>);
  }

  async publish(event: DomainEvent): Promise<void> {
    const handlers = this.handlers.get(event.eventType) || [];

    // Execute handlers in parallel
    await Promise.allSettled(
      handlers.map(handler =>
        handler.handle(event).catch(error => {
          logger.error('Event handler failed', error, {
            eventType: event.eventType,
            eventData: event.data,
          });
        })
      )
    );
  }
}

// Example events
// src/core/domain/events/SaleCreatedEvent.ts
export class SaleCreatedEvent implements DomainEvent {
  eventType = 'SaleCreated';
  occurredAt = new Date();

  constructor(public data: {
    saleId: string;
    storeId: string;
    total: number;
    items: SaleItem[];
    createdAt: Date;
  }) {}
}

// src/infrastructure/events/handlers/SendSaleReceiptHandler.ts
export class SendSaleReceiptHandler implements EventHandler<SaleCreatedEvent> {
  constructor(private emailService: EmailService) {}

  async handle(event: SaleCreatedEvent): Promise<void> {
    const { saleId, storeId } = event.data;

    // Check if store has email receipt enabled
    const store = await this.storeRepo.findById(storeId);
    if (!store.settings?.sendReceiptEmail) {
      return;
    }

    // Get customer email from sale
    const sale = await this.saleRepo.findById(saleId);
    if (!sale.customer_email) {
      return;
    }

    // Send receipt
    await this.emailService.sendSaleReceipt(sale.customer_email, sale);
  }
}

// src/infrastructure/events/handlers/UpdateAnalyticsCacheHandler.ts
export class UpdateAnalyticsCacheHandler implements EventHandler<SaleCreatedEvent> {
  constructor(private cache: CacheManager) {}

  async handle(event: SaleCreatedEvent): Promise<void> {
    // Invalidate analytics cache for the store
    await this.cache.invalidate(`analytics:${event.data.storeId}:*`);
  }
}
```

**Migration Steps**:
1. Create event bus and interfaces
2. Define domain events
3. Create event handlers
4. Register handlers in app initialization
5. Add event publishing in services

**Testing**:
- [ ] Test event publishing
- [ ] Test handler execution
- [ ] Test handler error isolation
- [ ] Test async event processing

**Rollback Plan**: Remove event publishing calls

---

## 🟣 PHASE 5: API LAYER MODERNIZATION (Week 9-10)

### Priority: 🟣 LOW - Completes architecture
### Risk Level: MEDIUM (API changes)
### Rollback: Medium (keep old API versioned)

---

### Step 5.1: Implement New Controllers
**Timeline**: 4 days

**Implementation**:
```typescript
// src/api/controllers/ProductController.ts
export class ProductController {
  constructor(
    private createProductService: CreateProductService,
    private updateProductService: UpdateProductService,
    private deleteProductService: DeleteProductService,
    private listProductsService: ListProductsService
  ) {}

  async create(req: Request): Promise<Response> {
    try {
      // 1. Validate request
      const input = await validateRequest(CreateProductSchema, req);

      // 2. Get authenticated user
      const userId = await getUserIdFromToken(req);

      // 3. Execute service
      const product = await this.createProductService.execute({
        ...input,
        userId,
      });

      // 4. Return response
      return successResponse(product, { statusCode: 201 });
    } catch (error) {
      return errorResponse(error, req);
    }
  }

  async list(req: Request): Promise<Response> {
    try {
      const { storeId } = await validateRequest(
        z.object({ storeId: z.string().uuid() }),
        req
      );

      const products = await this.listProductsService.execute({
        storeId,
        filter: req.query,
      });

      return successResponse(products);
    } catch (error) {
      return errorResponse(error, req);
    }
  }

  async update(req: Request): Promise<Response> {
    try {
      const { id } = req.params;
      const updates = await validateRequest(UpdateProductSchema, req);
      const userId = await getUserIdFromToken(req);

      const product = await this.updateProductService.execute({
        productId: id,
        updates,
        userId,
      });

      return successResponse(product);
    } catch (error) {
      return errorResponse(error, req);
    }
  }

  async delete(req: Request): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = await getUserIdFromToken(req);

      await this.deleteProductService.execute({
        productId: id,
        userId,
      });

      return successResponse({ message: 'Product deleted' });
    } catch (error) {
      return errorResponse(error, req);
    }
  }
}
```

---

### Step 5.2: Add Middleware Stack
**Timeline**: 2 days

**Implementation**:
```typescript
// src/api/middlewares/auth.middleware.ts
export async function authMiddleware(req: Request): Promise<void> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');

  if (!token) {
    throw new UnauthorizedError('No token provided');
  }

  try {
    const payload = await verifyAccessToken(token);
    req.user = payload;
  } catch (error) {
    throw new UnauthorizedError('Invalid token');
  }
}

// src/api/middlewares/roleCheck.middleware.ts
export function requireRole(...roles: UserRole[]) {
  return async (req: Request): Promise<void> => {
    if (!req.user) {
      throw new UnauthorizedError('Not authenticated');
    }

    const userRole = await getUserRole(req.user.id);
    if (!roles.includes(userRole)) {
      throw new ForbiddenError('Insufficient permissions');
    }
  };
}

// src/api/middlewares/validation.middleware.ts
export function validateBody<T>(schema: z.ZodSchema<T>) {
  return async (req: Request): Promise<void> => {
    const body = await req.json();
    try {
      req.validatedBody = schema.parse(body);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new BadRequestError('Validation failed', {
          errors: error.errors,
        });
      }
      throw error;
    }
  };
}

// src/api/middlewares/rateLimit.middleware.ts
export function rateLimit(config: RateLimitConfig) {
  return async (req: Request): Promise<void> => {
    const key = config.keyGenerator(req);
    const identifier = `ratelimit:${key}`;

    const current = await cache.incr(identifier);

    if (current === 1) {
      await cache.expire(identifier, config.windowMs / 1000);
    }

    if (current > config.maxRequests) {
      throw new TooManyRequestsError('Too many requests');
    }
  };
}

// src/api/middlewares/errorHandler.middleware.ts
export function errorHandlerMiddleware(
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      return errorResponse(error as Error, req);
    }
  };
}
```

---

### Step 5.3: Setup Versioned API Routes
**Timeline**: 3 days

**Implementation**:
```typescript
// src/api/routes/v1/index.ts
import { Hono } from 'hono';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { errorHandlerMiddleware } from '../../middlewares/errorHandler.middleware';
import { ProductController } from '../../controllers/ProductController';
import { SaleController } from '../../controllers/SaleController';

const v1 = new Hono();

// Apply global middleware
v1.use('*', errorHandlerMiddleware);

// Public routes
v1.post('/auth/login', loginHandler);
v1.post('/auth/register', registerHandler);
v1.post('/auth/refresh', refreshAccessTokenHandler);

// Protected routes
v1.use('/api/*', authMiddleware);

// Product routes
v1.get('/api/products', productController.list.bind(productController));
v1.post('/api/products', productController.create.bind(productController));
v1.get('/api/products/:id', productController.getById.bind(productController));
v1.put('/api/products/:id', productController.update.bind(productController));
v1.delete('/api/products/:id', productController.delete.bind(productController));

// Sale routes
v1.get('/api/sales', saleController.list.bind(saleController));
v1.post('/api/sales', saleController.create.bind(saleController));
v1.get('/api/sales/:id', saleController.getById.bind(saleController));

// Admin routes (with role check)
v1.use('/api/admin/*', requireRole(UserRole.SUPER_ADMIN));
v1.get('/api/admin/users', adminController.listUsers.bind(adminController));
v1.post('/api/admin/users', adminController.createUser.bind(adminController));

export default v1;

// Main API entry point
// src/api/routes/index.ts
import { Hono } from 'hono';
import v1Routes from './v1';

const api = new Hono();

// Mount versioned routes
api.route('/v1', v1Routes);

// Add API info endpoint
api.get('/', (c) => {
  return c.json({
    name: 'Warungku API',
    version: '1.0.0',
    endpoints: {
      v1: '/v1',
    },
  });
});

export default api;
```

**Migration Steps**:
1. Create new API structure in `/api` directory
2. Implement controllers for each entity
3. Add middleware stack
4. Setup versioned routes
5. Deploy alongside old API (canary release)
6. Gradually migrate frontend to new endpoints

**Testing**:
- [ ] Test each endpoint with valid/invalid data
- [ ] Test authentication and authorization
- [ ] Test rate limiting
- [ ] Test error handling
- [ ] Load test new endpoints

**Rollback Plan**: Keep old API running, switch DNS back if needed

---

## 🟤 PHASE 6: FRONTEND MIGRATION & TESTING (Week 11-12)

### Priority: 🟤 LOW - Completes migration
### Risk Level: LOW (client-side changes)
### Rollback: Easy (revert commits)

---

### Step 6.1: Update API Client
**Timeline**: 2 days

**Implementation**:
```typescript
// src/web/lib/api-client.ts
class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_URL || '/api/v1';
    this.token = localStorage.getItem('access_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('access_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('access_token');
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`, window.location.origin);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }

    const response = await fetch(url.toString(), {
      headers: this.getHeaders(),
    });

    return await this.handleResponse<T>(response);
  }

  async post<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return await this.handleResponse<T>(response);
  }

  async put<T>(endpoint: string, data: any): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'PUT',
      headers: this.getHeaders(),
      body: JSON.stringify(data),
    });

    return await this.handleResponse<T>(response);
  }

  async delete<T>(endpoint: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'DELETE',
      headers: this.getHeaders(),
    });

    return await this.handleResponse<T>(response);
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json();

    if (!response.ok) {
      throw new ApiError(data.error?.message || 'Request failed', {
        statusCode: response.status,
        code: data.error?.code,
        details: data.error?.details,
      });
    }

    return data.data as T;
  }
}

export const apiClient = new ApiClient();
```

---

### Step 6.2: Add Comprehensive Testing
**Timeline**: 5 days

**Implementation**:
```typescript
// Repository unit tests
// src/infrastructure/database/repositories/__tests__/SupabaseUserRepository.test.ts
describe('SupabaseUserRepository', () => {
  let repository: SupabaseUserRepository;
  let mockSupabase: jest.Mocked<SupabaseClient>;

  beforeEach(() => {
    mockSupabase = createMockSupabase();
    repository = new SupabaseUserRepository(mockSupabase);
  });

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser = createMockUser();
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      const result = await repository.findById(mockUser.id);

      expect(result).toEqual(mockUser);
    });

    it('should return null when not found', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: null,
      });

      const result = await repository.findById('non-existent');

      expect(result).toBeNull();
    });

    it('should throw on database error', async () => {
      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: null,
        error: { message: 'Database error', code: 'DB_ERROR' },
      });

      await expect(repository.findById('test-id')).rejects.toThrow();
    });
  });
});

// Service unit tests
// src/core/services/product/__tests__/CreateProductService.test.ts
describe('CreateProductService', () => {
  let service: CreateProductService;
  let mockProductRepo: jest.Mocked<IProductRepository>;
  let mockStoreRepo: jest.Mocked<IStoreRepository>;
  let mockCache: jest.Mocked<CacheManager>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(() => {
    mockProductRepo = createMockProductRepository();
    mockStoreRepo = createMockStoreRepository();
    mockCache = createMockCacheManager();
    mockEventBus = createMockEventBus();

    service = new CreateProductService(
      mockProductRepo,
      mockStoreRepo,
      mockCache,
      mockEventBus
    );
  });

  it('should create product successfully', async () => {
    const input = {
      storeId: 'store-123',
      name: 'Test Product',
      price: 10000,
      userId: 'user-123',
    };

    mockStoreRepo.findById.mockResolvedValue(createMockStore());
    mockProductRepo.findByName.mockResolvedValue(null);
    mockProductRepo.create.mockResolvedValue(createMockProduct(input));

    const result = await service.execute(input);

    expect(result).toBeDefined();
    expect(mockProductRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        name: input.name,
        price: input.price,
      })
    );
    expect(mockCache.invalidate).toHaveBeenCalled();
    expect(mockEventBus.publish).toHaveBeenCalled();
  });

  it('should throw when store not found', async () => {
    const input = {
      storeId: 'non-existent',
      name: 'Test Product',
      price: 10000,
      userId: 'user-123',
    };

    mockStoreRepo.findById.mockResolvedValue(null);

    await expect(service.execute(input)).rejects.toThrow(NotFoundError);
  });

  it('should throw when product name already exists', async () => {
    const input = {
      storeId: 'store-123',
      name: 'Existing Product',
      price: 10000,
      userId: 'user-123',
    };

    mockStoreRepo.findById.mockResolvedValue(createMockStore());
    mockProductRepo.findByName.mockResolvedValue(createMockProduct());

    await expect(service.execute(input)).rejects.toThrow(BadRequestError);
  });
});

// Integration tests
// src/api/__tests__/integration/products.e2e.test.ts
describe('Product API Integration Tests', () => {
  let testServer: any;
  let authToken: string;

  beforeAll(async () => {
    testServer = await startTestServer();
    authToken = await getTestAuthToken();
  });

  afterAll(async () => {
    await testServer.close();
    await cleanupTestData();
  });

  describe('POST /api/v1/products', () => {
    it('should create product with valid data', async () => {
      const response = await fetch(`${TEST_API_URL}/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          storeId: TEST_STORE_ID,
          name: 'Integration Test Product',
          price: 15000,
          stock: 100,
        }),
      });

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.data).toMatchObject({
        name: 'Integration Test Product',
        price: 15000,
        total_stock: 100,
      });
    });

    it('should reject invalid data', async () => {
      const response = await fetch(`${TEST_API_URL}/products`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: '', // Invalid: empty name
          price: -100, // Invalid: negative price
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data.error).toBeDefined();
      expect(data.error.code).toBe('BadRequestError');
    });
  });
});
```

**Migration Steps**:
1. Setup testing infrastructure (Jest, test-utils)
2. Write unit tests for repositories
3. Write unit tests for services
4. Write integration tests for API endpoints
5. Setup CI to run tests automatically
6. Aim for 80%+ code coverage

**Testing Checklist**:
- [ ] Unit tests for all repositories
- [ ] Unit tests for all services
- [ ] Integration tests for API endpoints
- [ ] E2E tests for critical user flows
- [ ] Performance tests for high-traffic endpoints
- [ ] Security tests (auth, rate limiting, input validation)

---

## 📋 TESTING CHECKPOINTS

### After Each Phase

**Phase 1 (Security Fixes)**:
- [ ] Verify RLS policies work correctly
- [ ] Test RBAC with different user roles
- [ ] Verify input validation blocks malicious payloads
- [ ] Test auth state no longer loops

**Phase 2 (Infrastructure)**:
- [ ] Verify caching reduces database load
- [ ] Check logs appear in monitoring dashboard
- [ ] Verify CI/CD pipeline runs successfully
- [ ] Test preview deployments

**Phase 3 (Data Layer)**:
- [ ] Verify all repositories return correct data
- [ ] Check query performance with EXPLAIN ANALYZE
- [ ] Verify cache integration works
- [ ] Test repository error handling

**Phase 4 (Service Layer)**:
- [ ] Verify business rules are enforced
- [ ] Check events are published correctly
- [ ] Test service error handling
- [ ] Verify transaction safety

**Phase 5 (API Layer)**:
- [ ] Verify all endpoints return correct responses
- [ ] Test authentication and authorization
- [ ] Verify rate limiting works
- [ ] Test API error responses

**Phase 6 (Frontend)**:
- [ ] Verify all features work with new API
- [ ] Check UI performance improved
- [ ] Test error handling in UI
- [ ] Verify state management works correctly

---

## 🔄 ROLLBACK PLANS

### By Phase

| Phase | Rollback Strategy | Time to Rollback | Data Risk |
|-------|------------------|-----------------|-----------|
| **1 - Security** | Revert code changes | &lt;5 min | None |
| **2 - Infrastructure** | Disable features via config | &lt;10 min | None |
| **3 - Data Layer** | Switch to old Supabase calls | &lt;15 min | None |
| **4 - Service Layer** | Call repos directly | &lt;20 min | None |
| **5 - API Layer** | Switch DNS to old API | &lt;5 min | None |
| **6 - Frontend** | Revert commits | &lt;10 min | None |

### Emergency Rollback Procedure

1. **Stop the bleeding**
   ```bash
   # Revert last deployment
   vercel rollback --to <previous-deployment-url>
   ```

2. **Assess the damage**
   - Check error logs
   - Verify data integrity
   - Identify affected users

3. **Communicate**
   - Notify team
   - Post status update
   - Prepare incident report

4. **Fix and redeploy**
   - Create hotfix branch
   - Test thoroughly
   - Deploy to staging first
   - Then deploy to production

---

## 📊 SUCCESS METRICS

### Before vs After

| Metric | Before | Target | How to Measure |
|--------|--------|--------|----------------|
| **Security Score** | 5/10 | 9/10 | Manual audit + automated scans |
| **API Response Time (p95)** | ~800ms | &lt;200ms | Vercel Analytics |
| **Database Query Time (p95)** | ~300ms | &lt;50ms | Supabase query stats |
| **Page Load Time** | ~3.5s | &lt;2s | Lighthouse CI |
| **Test Coverage** | 0% | &gt;80% | Jest coverage reports |
| **Critical Bugs** | 5+ known | 0 | Sentry issues |
| **Concurrent Users** | ~100 | 10,000+ | Load testing |

---

## 🎯 FINAL CHECKLIST BEFORE GOING LIVE

### Security
- [ ] All RLS bypasses fixed
- [ ] RBAC implemented and tested
- [ ] Input validation on all endpoints
- [ ] Rate limiting configured
- [ ] Security audit passed

### Performance
- [ ] Caching layer operational
- [ ] Database indexes added
- [ ] Query optimization verified
- [ ] Bundle size optimized
- [ ] CDN configured

### Reliability
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Monitoring setup
- [ ] Alert rules configured
- [ ] Backup strategy tested

### Quality
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Code review complete
- [ ] Documentation updated

---

## 📝 CONCLUSION

This refactor roadmap provides a **safe, incremental approach** to transforming Warungku into a production-ready SaaS platform. By following this plan:

✅ **Zero downtime** - Each phase can be deployed independently
✅ **Rollback ready** - Every step can be reverted
✅ **Tested thoroughly** - Comprehensive testing at each stage
✅ **Performance improved** - Caching, indexes, optimization
✅ **Security hardened** - RLS fixed, RBAC implemented, validation added

**Timeline**: 8-12 weeks
**Team Size**: 2-3 developers
**Risk Level**: Medium (mitigated by incremental approach)

---

**Next Step**: Begin Phase 1 implementation with Step 1.1 (Fix RLS Bypass)

---

**Document Version**: 1.0
**Last Updated**: 2026-03-04
**Owner**: Development Team
