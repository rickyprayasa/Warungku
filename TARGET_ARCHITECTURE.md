# TARGET ARCHITECTURE DESIGN
## Warungku/Omzetin - Production-Ready SaaS Platform

**Last Updated**: 2026-03-04
**Status**: Phase 2 Complete - Ready for Implementation Planning

---

## 🎯 ARCHITECTURE GOALS

Transform from current state (5.4/10) to production-ready SaaS:
- **Security**: 9/10 (from 5/10)
- **Scalability**: 9/10 (from 4/10)
- **Maintainability**: 8/10 (from 6/10)
- **Performance**: 8/10 (from 6/10)

---

## 📐 ARCHITECTURE RULES

### 1. Clean Architecture Principles

```
┌─────────────────────────────────────────────────────────────┐
│                     PRESENTATION LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   React UI   │  │  Admin CMS   │  │ Public Store │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼──────────────────┼──────────────────┼──────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
┌────────────────────────────┼────────────────────────────────┐
│                     API GATEWAY LAYER                         │
│  ┌──────────────────────────────────────────────────┐       │
│  │  Vercel Edge Functions / Cloudflare Workers       │       │
│  │  - Request Validation                            │       │
│  │  - Authentication (JWT + Refresh Token)          │       │
│  │  - Rate Limiting (Token Bucket)                  │       │
│  │  - Response Formatting                           │       │
│  └────────────────────────┬─────────────────────────┘       │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                     APPLICATION LAYER                          │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Services  │→│   Use Cases │→│  Handlers  │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                      DOMAIN LAYER                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Entities  │  │  Value Objs│  │  Events    │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└───────────────────────────┼─────────────────────────────────┘
                            │
┌───────────────────────────┼─────────────────────────────────┐
│                   INFRASTRUCTURE LAYER                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Repositories│ │   Cache    │  │   Events   │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└───────────────────────────┼─────────────────────────────────┘
                            │
        ┌───────────────────┴──────────────────┐
        │                  │                   │
┌───────┴────────┐  ┌───────┴────────┐  ┌─────┴─────────┐
│  Supabase DB   │  │  Redis Cache   │  │  Message Queue │
│  (Primary)     │  │  (KV Store)    │  │  (Background)  │
└────────────────┘  └────────────────┘  └────────────────┘
```

### 2. Clear Separation: Controller / Service / Repository

```typescript
// ==================== CONTROLLER LAYER ====================
// Location: src/api/controllers/
// Responsibility: Handle HTTP request/response only

interface Controller {
  validateRequest(req: Request): Promise<ValidatedRequest>;
  handleRequest(req: ValidatedRequest): Promise<Response>;
  handleError(error: Error): Response;
}

// ==================== SERVICE LAYER ====================
// Location: src/core/services/
// Responsibility: Business logic, use cases

interface Service<T, K> {
  execute(input: T): Promise<K>;
}

// Example Services:
// - CreateSaleService
// - UpdateInventoryService
// - ProcessPaymentService
// - GenerateReportService

// ==================== REPOSITORY LAYER ====================
// Location: src/infrastructure/repositories/
// Responsibility: Data access abstraction

interface Repository<T, K> {
  findById(id: K): Promise<T | null>;
  findAll(filter: QueryFilter): Promise<T[]>;
  create(entity: T): Promise<T>;
  update(id: K, updates: Partial<T>): Promise<T>;
  delete(id: K): Promise<void>;
}
```

### 3. Stateless API Design

```typescript
// ✅ CORRECT - Stateless
export const handler = async (req: Request) => {
  // 1. Extract all needed data from request
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  const userId = await verifyToken(token);

  // 2. Process without session state
  const result = await service.execute({ userId, ...data });

  // 3. Return response
  return Response.json(result);
};

// ❌ WRONG - Stateful
let sessionStore = new Map();
export const handler = async (req: Request) => {
  // Don't store session state in memory!
  sessionStore.set(userId, data);
};
```

### 4. Production-Ready Structure

```
src/
├── api/                      # API Layer (Stateless)
│   ├── controllers/          # Request/response handlers
│   │   ├── AuthController.ts
│   │   ├── StoreController.ts
│   │   ├── ProductController.ts
│   │   ├── SaleController.ts
│   │   └── AdminController.ts
│   ├── middlewares/          # Cross-cutting concerns
│   │   ├── auth.middleware.ts
│   │   ├── validation.middleware.ts
│   │   ├── rate-limit.middleware.ts
│   │   └── error-handler.middleware.ts
│   ├── routes/               # Route definitions
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── store.routes.ts
│   │   ├── product.routes.ts
│   │   └── admin.routes.ts
│   └── validators/           # Request validation schemas
│       ├── auth.validators.ts
│       ├── product.validators.ts
│       └── sale.validators.ts
│
├── core/                     # Business Logic Layer
│   ├── services/             # Use cases (business logic)
│   │   ├── auth/
│   │   │   ├── AuthenticateService.ts
│   │   │   ├── RefreshTokenService.ts
│   │   │   └── ResetPasswordService.ts
│   │   ├── store/
│   │   │   ├── CreateStoreService.ts
│   │   │   ├── UpdateStoreService.ts
│   │   │   └── DeleteStoreService.ts
│   │   ├── product/
│   │   │   ├── CreateProductService.ts
│   │   │   ├── UpdateProductService.ts
│   │   │   └── ListProductsService.ts
│   │   ├── sale/
│   │   │   ├── CreateSaleService.ts
│   │   │   ├── ProcessRefundService.ts
│   │   │   └── GetSalesReportService.ts
│   │   └── inventory/
│   │       ├── UpdateStockService.ts
│   │       ├── RecordPurchaseService.ts
│   │       └── CheckStockLevelService.ts
│   ├── domain/               # Domain entities
│   │   ├── entities/
│   │   │   ├── User.ts
│   │   │   ├── Store.ts
│   │   │   ├── Product.ts
│   │   │   ├── Sale.ts
│   │   │   └── Inventory.ts
│   │   ├── value-objects/
│   │   │   ├── Money.ts
│   │   │   ├── Quantity.ts
│   │   │   └── Email.ts
│   │   └── events/
│   │       ├── SaleCreatedEvent.ts
│   │       ├── StockLowEvent.ts
│   │       └── UserRegisteredEvent.ts
│   └── use-cases/           # Application-specific workflows
│       ├── CreateSaleUseCase.ts
│       ├── OnboardStoreUseCase.ts
│       └── GenerateMonthlyReportUseCase.ts
│
├── infrastructure/           # External Dependencies
│   ├── database/            # Database implementations
│   │   ├── supabase/
│   │   │   ├── SupabaseClient.ts
│   │   │   └── connection.ts
│   │   └── repositories/    # Repository implementations
│   │       ├── SupabaseUserRepository.ts
│   │       ├── SupabaseStoreRepository.ts
│   │       ├── SupabaseProductRepository.ts
│   │       ├── SupabaseSaleRepository.ts
│   │       └── SupabaseInventoryRepository.ts
│   ├── cache/               # Caching layer
│   │   ├── RedisCache.ts
│   │   ├── CloudflareKVCache.ts
│   │   └── CacheStrategy.ts
│   ├── auth/                # Authentication providers
│   │   ├── SupabaseAuthAdapter.ts
│   │   └── JWTService.ts
│   ├── events/              # Event handling
│   │   ├── EventBus.ts
│   │   └── handlers/
│   │       ├── SendLowStockEmail.ts
│   │       └── UpdateAnalytics.ts
│   └── logging/             # Logging infrastructure
│       ├── Logger.ts
│       └── transports/
│           ├── ConsoleTransport.ts
│           └── ExternalServiceTransport.ts
│
├── web/                     # Presentation Layer (React)
│   ├── pages/               # Page components
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── pos/
│   │   └── admin/
│   ├── components/          # UI components
│   │   ├── ui/              # shadcn/ui components
│   │   ├── domain/          # Domain-specific components
│   │   └── layouts/         # Layout components
│   ├── hooks/               # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useStore.ts
│   │   └── useQuery.ts
│   ├── lib/                 # Client utilities
│   │   ├── api-client.ts    # API client
│   │   ├── query-client.ts  # TanStack Query config
│   │   └── state-manager.ts # Zustand stores
│   └── types/               # Shared types
│       └── api.types.ts
│
└── shared/                  # Shared code (frontend + backend)
    ├── types/               # TypeScript types
    │   ├── domain.types.ts
    │   ├── api.types.ts
    │   └── dtos.ts
    ├── constants/           # Constants
    │   ├── error-codes.ts
    │   └── status-codes.ts
    └── utils/               # Pure utilities
        ├── date.utils.ts
        ├── money.utils.ts
        └── validation.utils.ts
```

### 5. Horizontal Scaling Strategy

```typescript
// ==================== STATELESS DESIGN ====================
// Every request must be independent

// ✅ Stateless - Can scale horizontally
export async function GET(req: Request) {
  const { userId } = await authenticateRequest(req);
  const data = await getStoreData(userId);
  return Response.json(data);
}

// ==================== CACHE STRATEGY ====================
// Reduce database load with smart caching

interface CacheStrategy {
  // User session: 15 minutes
  userSession: { ttl: 900, key: (userId: string) => `session:${userId}` },

  // Store data: 5 minutes
  storeData: { ttl: 300, key: (storeId: string) => `store:${storeId}` },

  // Products: 2 minutes (invalidated on update)
  products: { ttl: 120, key: (storeId: string) => `products:${storeId}` },

  // Analytics: 15 minutes (stale data acceptable)
  analytics: { ttl: 900, key: (storeId: string) => `analytics:${storeId}` },

  // Reports: 1 hour (generated reports)
  reports: { ttl: 3600, key: (storeId: string, date: string) => `report:${storeId}:${date}` },
}

// ==================== DATABASE SCALING ====================
// Use read replicas for queries, primary for writes

interface DatabaseStrategy {
  write: 'primary',           // All writes go to primary
  read: 'replica',            // Reads go to replica (if available)
  readWrite: 'primary',       // Critical reads go to primary
}
```

---

## 🗄️ DATABASE RULES

### 1. Optimize Queries

```sql
-- ❌ BAD - N+1 Query
-- First query gets sales, then N queries for each sale's items
SELECT * FROM sales WHERE store_id = $1;
-- Then for each sale:
SELECT * FROM sale_items WHERE sale_id = $1;

-- ✅ GOOD - Single Query with Join
SELECT
  s.*,
  json_agg(
    json_build_object(
      'id', si.id,
      'product_name', si.product_name,
      'quantity', si.quantity,
      'price', si.price
    )
  ) as items
FROM sales s
LEFT JOIN sale_items si ON s.id = si.sale_id
WHERE s.store_id = $1
GROUP BY s.id
ORDER BY s.created_at DESC;
```

### 2. Avoid N+1 with Proper Indexes

```sql
-- Add composite indexes for common query patterns
CREATE INDEX idx_sales_store_date
  ON sales(store_id, created_at DESC)
  WHERE created_at > CURRENT_DATE - INTERVAL '6 months';

CREATE INDEX idx_products_store_active
  ON products(store_id, is_active)
  WHERE is_active = true;

CREATE INDEX idx_sale_items_sale
  ON sale_items(sale_id);

-- Partial index for low stock queries (common dashboard query)
CREATE INDEX idx_products_low_stock
  ON products(store_id, total_stock, min_stock_level)
  WHERE total_stock <= min_stock_level;
```

### 3. Use Pagination for Large Datasets

```typescript
// ✅ CORRECT - Cursor-based pagination
interface PaginatedResult<T> {
  data: T[];
  nextCursor: string | null;
  hasMore: boolean;
  totalCount: number;
}

async function getProducts(
  storeId: string,
  pageSize: number = 20,
  cursor?: string
): Promise<PaginatedResult<Product>> {
  const query = supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })
    .limit(pageSize + 1); // Fetch one extra to check if there's more

  if (cursor) {
    query.gt('created_at', cursor);
  }

  const { data } = await query;

  return {
    data: data.slice(0, pageSize),
    nextCursor: data.length > pageSize ? data[pageSize - 1].created_at : null,
    hasMore: data.length > pageSize,
    totalCount: await getTotalCount(storeId),
  };
}
```

### 4. Transaction Safety

```typescript
// ✅ CORRECT - Use transactions for multi-step operations
async function createSaleWithInventoryUpdate(
  saleData: CreateSaleDTO
): Promise<Sale> {
  return await supabase.rpc('create_sale_with_inventory', {
    p_store_id: saleData.storeId,
    p_items: JSON.stringify(saleData.items),
    p_payment_method: saleData.paymentMethod,
  });
}

-- SQL RPC Function with Transaction
CREATE OR REPLACE FUNCTION create_sale_with_inventory(
  p_store_id UUID,
  p_items JSONB,
  p_payment_method TEXT
) RETURNS JSONB AS $$
DECLARE
  v_sale_id UUID;
  v_item JSONB;
  v_product_id UUID;
  v_quantity INTEGER;
BEGIN
  -- Start transaction (implicit in RPC)

  -- Create sale
  INSERT INTO sales (store_id, total, profit, sale_type, created_by)
  VALUES (
    p_store_id,
    p_items->>'total',
    p_items->>'profit',
    p_payment_method,
    auth.uid()
  )
  RETURNING id INTO v_sale_id;

  -- Process each item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_product_id := v_item->>'product_id';
    v_quantity := (v_item->>'quantity')::INTEGER;

    -- Create sale item
    INSERT INTO sale_items (sale_id, product_id, product_name, quantity, price, cost)
    VALUES (
      v_sale_id,
      v_product_id,
      v_item->>'product_name',
      v_quantity,
      v_item->>'price',
      v_item->>'cost'
    );

    -- Update inventory (FIFO)
    PERFORM update_inventory_fifo(v_product_id, v_quantity);

  END LOOP;

  -- Return result
  RETURN jsonb_build_object('success', true, 'sale_id', v_sale_id);

EXCEPTION
  WHEN OTHERS THEN
    -- Rollback happens automatically
    RAISE EXCEPTION 'Sale creation failed: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## ⚡ PERFORMANCE RULES

### 1. Caching Layer

```typescript
// ==================== CACHE INTERFACE ====================
interface ICache {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttl?: number): Promise<void>;
  delete(key: string): Promise<void>;
  invalidate(pattern: string): Promise<void>;
}

// ==================== MULTI-LAYER CACHE ====================
class CacheManager {
  private l1: MemoryCache;        // Fast, in-memory (1 min TTL)
  private l2: RedisCache;         // Shared cache (5-15 min TTL)
  private l3: DatabaseCache;      // Fallback to DB

  async get<T>(key: string): Promise<T | null> {
    // Try L1 first
    const l1Data = await this.l1.get<T>(key);
    if (l1Data) return l1Data;

    // Try L2
    const l2Data = await this.l2.get<T>(key);
    if (l2Data) {
      await this.l1.set(key, l2Data, 60); // Populate L1
      return l2Data;
    }

    // Fallback to L3
    const l3Data = await this.l3.get<T>(key);
    if (l3Data) {
      await this.l1.set(key, l3Data, 60);
      await this.l2.set(key, l3Data, 300);
      return l3Data;
    }

    return null;
  }

  async set<T>(key: string, value: T, ttl: number): Promise<void> {
    await Promise.all([
      this.l1.set(key, value, Math.min(ttl, 60)),
      this.l2.set(key, value, ttl),
      this.l3.set(key, value, ttl),
    ]);
  }

  async invalidate(pattern: string): Promise<void> {
    await Promise.all([
      this.l1.invalidate(pattern),
      this.l2.invalidate(pattern),
      this.l3.invalidate(pattern),
    ]);
  }
}
```

### 2. TTL Strategy

```typescript
// ==================== CACHE TTL CONFIGURATION ====================
const CACHE_TTL = {
  // Fast-changing data
  SESSION: 15 * 60,          // 15 minutes
  CART: 5 * 60,              // 5 minutes

  // User data
  USER_PROFILE: 10 * 60,     // 10 minutes
  USER_PERMISSIONS: 15 * 60, // 15 minutes

  // Store data
  STORE_SETTINGS: 15 * 60,   // 15 minutes
  STORE_MEMBERS: 10 * 60,    // 10 minutes

  // Product data
  PRODUCTS: 2 * 60,          // 2 minutes (invalidated on update)
  PRODUCT_DETAIL: 5 * 60,    // 5 minutes
  INVENTORY: 1 * 60,         // 1 minute (critical for stock)

  // Sales & Reports
  SALES_TODAY: 1 * 60,       // 1 minute
  ANALYTICS: 15 * 60,        // 15 minutes
  REPORTS: 60 * 60,          // 1 hour (generated reports)

  // Reference data
  CATEGORIES: 24 * 60 * 60,  // 1 day
  PAYMENT_METHODS: 24 * 60 * 60, // 1 day
} as const;

// ==================== CACHE INVALIDATION ====================
async function invalidateProductCache(productId: string): Promise<void> {
  const patterns = [
    `product:${productId}`,
    `products:store:*`,
    `inventory:product:${productId}`,
  ];

  await Promise.all(patterns.map(p => cache.invalidate(p)));
}
```

### 3. Bottleneck Identification

```typescript
// ==================== PERFORMANCE MONITORING ====================
class PerformanceMonitor {
  async track<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - start;

      // Log slow operations
      if (duration > 1000) {
        logger.warn('Slow operation', { operation, duration });
      }

      // Track metrics
      metrics.record(operation, duration);

      return result;
    } catch (error) {
      const duration = performance.now() - start;
      metrics.recordError(operation, duration, error);
      throw error;
    }
  }
}

// ==================== QUERY OPTIMIZATION ====================
// Identify slow queries and add optimization hints

async function getSalesReport(storeId: string, dateRange: DateRange) {
  return await supabase
    .from('sales')
    .select('id, total, profit, created_at')
    .eq('store_id', storeId)
    .gte('created_at', dateRange.start)
    .lte('created_at', dateRange.end)
    // Performance hint: Use index on store_id + created_at
    .order('created_at', { ascending: false });
}
```

---

## 🔐 SECURITY RULES

### 1. Input Validation Everywhere

```typescript
// ==================== VALIDATION LAYER ====================
import { z } from 'zod';

// Request validation schemas
const CreateProductSchema = z.object({
  name: z.string().min(1).max(255),
  price: z.number().positive().finite(),
  cost: z.number().nonnegative().finite(),
  stock: z.number().int().nonnegative(),
  categoryId: z.string().uuid(),
});

const CreateSaleSchema = z.object({
  storeId: z.string().uuid(),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().positive().max(1000),
    price: z.number().positive().finite(),
  })).min(1).max(100),
  paymentMethod: z.enum(['cash', 'qris', 'debit', 'transfer']),
});

// ==================== CONTROLLER VALIDATION ====================
async function createProductHandler(req: Request): Promise<Response> {
  // 1. Validate request body
  const body = await req.json();
  const validatedData = CreateProductSchema.parse(body);

  // 2. Validate business rules
  const store = await storeRepository.findById(validatedData.storeId);
  if (!store) {
    throw new NotFoundError('Store not found');
  }

  if (!await canUserCreateProduct(req.user, store)) {
    throw new ForbiddenError('Insufficient permissions');
  }

  // 3. Execute use case
  const product = await createProductService.execute(validatedData);

  return Response.json(product, { status: 201 });
}
```

### 2. Parameterized Queries Only

```typescript
// ✅ CORRECT - Parameterized query
async function findProductsByStore(storeId: string): Promise<Product[]> {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('store_id', storeId); // Automatically parameterized

  if (error) throw error;
  return data;
}

// ✅ CORRECT - RPC function with parameters
CREATE OR REPLACE FUNCTION get_products_by_store(
  p_store_id UUID,
  p_is_active BOOLEAN DEFAULT true
) RETURNS SETOF products AS $$
BEGIN
  RETURN QUERY
  SELECT * FROM products
  WHERE store_id = p_store_id
    AND is_active = p_is_active;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

// ❌ WRONG - String concatenation (SQL injection risk)
const query = `SELECT * FROM products WHERE store_id = '${storeId}'`;
```

### 3. Secure Authentication

```typescript
// ==================== JWT WITH REFRESH TOKEN ROTATION ====================
interface AuthService {
  // Generate access token (short-lived: 15 minutes)
  generateAccessToken(userId: string): Promise<string>;

  // Generate refresh token (long-lived: 7 days)
  generateRefreshToken(userId: string): Promise<string>;

  // Rotate refresh token on each use
  rotateRefreshToken(oldToken: string): Promise<{
    accessToken: string;
    refreshToken: string;
  }>;

  // Validate token and check revocation
  validateAccessToken(token: string): Promise<JwtPayload>;

  // Revoke all user tokens (logout from all devices)
  revokeAllTokens(userId: string): Promise<void>;
}

// ==================== REFRESH TOKEN ENDPOINT ====================
async function refreshAccessTokenHandler(req: Request): Promise<Response> {
  const refreshToken = req.cookies.get('refresh_token')?.value;

  if (!refreshToken) {
    throw new UnauthorizedError('No refresh token provided');
  }

  // Validate and rotate refresh token
  const tokens = await authService.rotateRefreshToken(refreshToken);

  // Set new tokens in httpOnly cookies
  return Response.json({
    accessToken: tokens.accessToken,
  }, {
    headers: {
      'Set-Cookie': [
        `refresh_token=${tokens.refreshToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=604800`,
        `access_token=${tokens.accessToken}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=900`,
      ].join(', '),
    },
  });
}
```

### 4. Rate Limiting

```typescript
// ==================== RATE LIMITING STRATEGY ====================
interface RateLimitConfig {
  windowMs: number;      // Time window
  maxRequests: number;   // Max requests per window
  keyGenerator: (req: Request) => string;
}

const rateLimitConfigs: Record<string, RateLimitConfig> = {
  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000,  // 15 minutes
    maxRequests: 5,
    keyGenerator: (req) => `auth:${getClientIP(req)}`,
  },

  // API endpoints
  api: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 100,
    keyGenerator: (req) => `api:${await getUserIdFromToken(req) || getClientIP(req)}`,
  },

  // Public endpoints
  public: {
    windowMs: 60 * 1000,  // 1 minute
    maxRequests: 20,
    keyGenerator: (req) => `public:${getClientIP(req)}`,
  },
};

// ==================== RATE LIMIT MIDDLEWARE ====================
async function rateLimitMiddleware(
  req: Request,
  config: RateLimitConfig
): Promise<void> {
  const key = config.keyGenerator(req);
  const identifier = `ratelimit:${key}`;

  // Use Redis for distributed rate limiting
  const current = await cache.incr(identifier);

  if (current === 1) {
    await cache.expire(identifier, config.windowMs / 1000);
  }

  if (current > config.maxRequests) {
    throw new TooManyRequestsError(
      `Too many requests. Limit: ${config.maxRequests} per ${config.windowMs}ms`
    );
  }
}
```

### 5. Proper Password Handling

```typescript
// ==================== PASSWORD HASHING (Server-side) ====================
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// ==================== SECURE PASSWORD RESET ====================
async function initiatePasswordReset(email: string): Promise<void> {
  // 1. Generate secure random token
  const resetToken = crypto.randomBytes(32).toString('hex');

  // 2. Hash token before storing
  const hashedToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  // 3. Store with expiration (1 hour)
  await db.passwordResetTokens.insert({
    email,
    token: hashedToken,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  // 4. Send email with unhashed token
  await emailService.sendPasswordReset(email, resetToken);
}

async function resetPassword(
  token: string,
  newPassword: string
): Promise<void> {
  // 1. Hash received token
  const hashedToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // 2. Find valid token
  const resetRequest = await db.passwordResetTokens.find({
    token: hashedToken,
    expiresAt: { $gt: new Date() },
  });

  if (!resetRequest) {
    throw new BadRequestError('Invalid or expired reset token');
  }

  // 3. Update password
  const hashedPassword = await hashPassword(newPassword);
  await db.users.update(
    { email: resetRequest.email },
    { password: hashedPassword }
  );

  // 4. Invalidate all refresh tokens
  await authService.revokeAllTokens(resetRequest.email);

  // 5. Delete reset token
  await db.passwordResetTokens.delete({ id: resetRequest.id });
}
```

---

## 🛡️ RELIABILITY RULES

### 1. Graceful Error Handling

```typescript
// ==================== ERROR CLASS HIERARCHY ====================
abstract class AppError extends Error {
  abstract readonly statusCode: number;
  abstract readonly isOperational: boolean;

  constructor(message: string, readonly context?: Record<string, any>) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }
}

class BadRequestError extends AppError {
  readonly statusCode = 400;
  readonly isOperational = true;
}

class UnauthorizedError extends AppError {
  readonly statusCode = 401;
  readonly isOperational = true;
}

class ForbiddenError extends AppError {
  readonly statusCode = 403;
  readonly isOperational = true;
}

class NotFoundError extends AppError {
  readonly statusCode = 404;
  readonly isOperational = true;
}

class TooManyRequestsError extends AppError {
  readonly statusCode = 429;
  readonly isOperational = true;
}

// ==================== ERROR HANDLER MIDDLEWARE ====================
async function errorHandlerMiddleware(
  error: Error,
  req: Request
): Promise<Response> {
  // Log error
  logger.error('Request failed', {
    error: error.message,
    stack: error.stack,
    path: req.url,
    method: req.method,
    userId: req.user?.id,
  });

  // Operational errors: send friendly message
  if (error instanceof AppError) {
    return Response.json({
      error: {
        message: error.message,
        code: error.constructor.name,
        ...(process.env.NODE_ENV === 'development' && { context: error.context }),
      },
    }, { status: error.statusCode });
  }

  // Programming errors: don't leak details
  logger.error('Unexpected error', error);
  return Response.json({
    error: {
      message: 'An unexpected error occurred',
      code: 'INTERNAL_SERVER_ERROR',
    },
  }, { status: 500 });
}
```

### 2. Retry with Exponential Backoff

```typescript
// ==================== RETRY STRATEGY ====================
interface RetryConfig {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  shouldRetry: (error: Error) => boolean;
}

async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      // Don't retry if error is not retryable
      if (!config.shouldRetry(lastError)) {
        throw lastError;
      }

      // Don't retry on last attempt
      if (attempt === config.maxAttempts) {
        throw lastError;
      }

      // Calculate delay with exponential backoff + jitter
      const delay = Math.min(
        config.baseDelayMs * Math.pow(2, attempt - 1),
        config.maxDelayMs
      ) + Math.random() * 1000;

      logger.warn(`Operation failed, retrying in ${delay}ms`, {
        attempt,
        maxAttempts: config.maxAttempts,
        error: lastError.message,
      });

      await sleep(delay);
    }
  }

  throw lastError!;
}

// ==================== USAGE EXAMPLE ====================
const dbRetryConfig: RetryConfig = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  shouldRetry: (error) => {
    // Retry on connection errors and timeouts
    return (
      error.message.includes('connection') ||
      error.message.includes('timeout') ||
      (error as any).code === 'CONNECTION_ERROR'
    );
  },
};

async function getStoreWithRetry(storeId: string) {
  return await retryWithBackoff(
    () => storeRepository.findById(storeId),
    dbRetryConfig
  );
}
```

### 3. Centralized Logging

```typescript
// ==================== LOGGER INTERFACE ====================
interface Logger {
  debug(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  error(message: string, error?: Error, meta?: Record<string, any>): void;
}

// ==================== STRUCTURED LOGGING ====================
class StructuredLogger implements Logger {
  constructor(
    private service: string,
    private environment: string,
    private transports: LogTransport[]
  ) {}

  private log(
    level: 'debug' | 'info' | 'warn' | 'error',
    message: string,
    meta?: Record<string, any>
  ): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      service: this.service,
      environment: this.environment,
      message,
      ...meta,
    };

    this.transports.forEach(transport => {
      transport.log(logEntry);
    });
  }

  debug(message: string, meta?: Record<string, any>): void {
    if (this.environment === 'development') {
      this.log('debug', message, meta);
    }
  }

  info(message: string, meta?: Record<string, any>): void {
    this.log('info', message, meta);
  }

  warn(message: string, meta?: Record<string, any>): void {
    this.log('warn', message, meta);
  }

  error(message: string, error?: Error, meta?: Record<string, any>): void {
    this.log('error', message, {
      ...meta,
      error: error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : undefined,
    });
  }
}

// ==================== LOG TRANSPORTS ====================
interface LogTransport {
  log(entry: LogEntry): void;
}

class ConsoleTransport implements LogTransport {
  log(entry: LogEntry): void {
    const logFn = console[entry.level] || console.log;
    logFn(JSON.stringify(entry));
  }
}

class ExternalServiceTransport implements LogTransport {
  constructor(private endpoint: string) {}

  async log(entry: LogEntry): Promise<void> {
    // Send to external logging service (e.g., Datadog, LogRocket)
    await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    }).catch(err => console.error('Failed to send logs:', err));
  }
}
```

### 4. Structured Error Response Format

```typescript
// ==================== API RESPONSE FORMAT ====================
interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}

// ==================== SUCCESS RESPONSE ====================
function successResponse<T>(data: T, meta?: Record<string, any>): Response {
  return Response.json({
    success: true,
    data,
    meta: {
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: API_VERSION,
      ...meta,
    },
  });
}

// ==================== ERROR RESPONSE ====================
function errorResponse(
  error: AppError,
  req: Request
): Response {
  return Response.json({
    success: false,
    error: {
      code: error.constructor.name,
      message: error.message,
      ...(process.env.NODE_ENV === 'development' && {
        details: error.context,
      }),
    },
    meta: {
      requestId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      version: API_VERSION,
      path: req.url,
    },
  }, { status: error.statusCode });
}
```

---

## 📊 DATA FLOW EXPLANATION

### Example: Creating a Sale

```
┌──────────────────────────────────────────────────────────────┐
│ 1. USER ACTION                                               │
│    User clicks "Complete Sale" button in POS interface       │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 2. PRESENTATION LAYER (React)                                │
│    - Form validation (client-side)                           │
│    - Loading state                                           │
│    - API call: POST /api/sales                               │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 3. API GATEWAY LAYER (Vercel Edge Function)                 │
│    - Rate limit check (100 req/min per user)                 │
│    - Authentication (JWT validation)                         │
│    - Request validation (Zod schema)                         │
│    - Route to appropriate controller                         │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 4. CONTROLLER LAYER (SaleController)                         │
│    - Extract user context                                    │
│    - Validate request body                                   │
│    - Call service layer                                      │
│    - Format response                                         │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 5. APPLICATION LAYER (CreateSaleService)                     │
│    - Business rules validation                               │
│    - Check if products are available                         │
│    - Calculate totals & profit                               │
│    - Create sale entity                                      │
│    - Publish domain events                                   │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 6. INFRASTRUCTURE LAYER (Repositories)                        │
│    - Begin database transaction                              │
│    - Insert sale record                                      │
│    - Insert sale items                                       │
│    - Update inventory (FIFO)                                 │
│    - Commit transaction                                      │
│    - Update cache (invalidate affected keys)                 │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 7. DATABASE (Supabase PostgreSQL)                            │
│    - Execute INSERT queries                                  │
│    - Update stock_details table                              │
│    - Return success                                          │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 8. EVENT HANDLING (Background)                               │
│    - SaleCreatedEvent published                              │
│    - Send email receipt (if requested)                       │
│    - Update analytics cache                                  │
│    - Check stock levels & alert if low                       │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│ 9. RESPONSE                                                   │
│    - Return JSON response with sale data                     │
│    - UI updates with TanStack Query                          │
│    - Show success notification                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 🚀 SCALING STRATEGY SUMMARY

### Horizontal Scaling Readiness

| Component | Current State | Target State | Scaling Strategy |
|-----------|--------------|--------------|------------------|
| **API Servers** | Cloudflare Workers | Vercel Edge Functions | Auto-scaling, stateless |
| **Database** | Single Supabase | Primary + Read Replicas | Read scaling |
| **Cache** | None | Redis Cluster | Distributed caching |
| **File Storage** | Supabase Storage | CDN + S3-compatible | Global distribution |
| **Background Jobs** | Cloudflare Cron | Message Queue | Horizontal processing |

### Performance Targets

| Metric | Current | Target | Strategy |
|--------|---------|--------|----------|
| **API Response Time** | ~800ms | &lt;200ms (p95) | Caching, indexes |
| **Database Query Time** | ~300ms | &lt;50ms (p95) | Read replicas, optimization |
| **Page Load Time** | ~3.5s | &lt;2s | Code splitting, lazy loading |
| **Time to Interactive** | ~4.2s | &lt;3s | Bundle optimization |
| **Concurrent Users** | ~100 | 10,000+ | Horizontal scaling |

### Cost Optimization

1. **Database Connection Pooling**: Reduce active connections
2. **Cache Hit Rate Target**: &gt;80% (reduce DB load)
3. **CDN Usage**: Serve all static assets from edge
4. **Background Job Optimization**: Queue batching for efficiency

---

## 📋 NEXT STEPS

### Before Implementation (PHASE 3)

1. Review this architecture with team
2. Identify any missing requirements
3. Estimate effort for each module
4. Create detailed migration plan

### Implementation Readiness Checklist

- [ ] Team aligned on architecture principles
- [ ] Development environment setup
- [ ] CI/CD pipeline configured
- [ ] Monitoring & logging tools selected
- [ ] Database migration strategy defined
- [ ] Testing strategy established (unit, integration, e2e)

---

## 📚 ARCHITECTURE DECISION RECORDS

### ADR-001: Clean Architecture Adoption
**Status**: Approved
**Context**: Current codebase mixes concerns, making it hard to maintain
**Decision**: Adopt clean architecture with clear layer separation
**Consequences**: More upfront setup, better long-term maintainability

### ADR-002: Move to Vercel from Cloudflare Workers
**Status**: Approved
**Context**: Better integration with React ecosystem, simpler deployment
**Decision**: Use Vercel Edge Functions for API
**Consequences**: Better DX, improved performance

### ADR-003: Implement Caching Layer
**Status**: Approved
**Context**: Database queries are slow, system doesn't scale
**Decision**: Add Redis caching layer with multi-level strategy
**Consequences**: Increased complexity, significant performance improvement

### ADR-004: Use Supabase as Primary Database
**Status**: Approved
**Context**: Need managed PostgreSQL with real-time features
**Decision**: Continue with Supabase, add read replicas for scaling
**Consequences**: Vendor lock-in, but excellent DX and features

---

**Document Version**: 1.0
**Last Updated**: 2026-03-04
**Next Review**: After PHASE 3 completion
