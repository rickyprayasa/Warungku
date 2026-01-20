# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Warungku (OMZETIN)** is a Neo-Brutalist Point-of-Sale (POS) and inventory management system designed for Indonesian small shops ("warung"). It's a multi-tenant SaaS application with a React frontend and Cloudflare Workers backend.

## Development Commands

```bash
# Install dependencies (uses Bun)
bun install

# Development server (frontend + backend)
bun run dev

# Production build
bun run build

# Deploy to Cloudflare Workers
bun run deploy

# Lint code
bun run lint

# Preview production build locally
bun run preview

# Generate Cloudflare Workers types
bun run cf-typegen
```

**Important**: Use `bun` as the primary package manager, not npm.

## Architecture

### Monorepo Structure

The project is organized as two main parts:

- **Frontend**: React + Vite application in the root directory
- **Backend**: Cloudflare Workers (Hono framework) in `worker/` directory
- **Shared**: Common types and utilities in `shared/` directory

### Key Technologies

**Frontend:**
- React 18 + TypeScript
- Vite 6 (build tool with advanced code splitting)
- Tailwind CSS with Neo-Brutalist design system
- shadcn/ui components (Radix UI primitives)
- React Router v6 with lazy loading for all pages
- Zustand (global state) + TanStack Query (server state)
- React Hook Form + Zod validation
- Framer Motion animations

**Backend:**
- Hono framework on Cloudflare Workers
- Supabase (PostgreSQL) - primary database
- Cloudflare D1 (SQLite) - caching/analytics
- Duitku payment gateway integration

### Path Aliases

The project uses TypeScript path aliases configured in `tsconfig.json`:
- `@/*` → `./src/*`
- `@shared/*` → `./shared/*`

These are also configured in `vite.config.ts`.

### Data Flow Architecture

1. **Frontend** → **Supabase** (direct read/write operations)
2. **Supabase** → **Cloudflare Workers** (API gateway for business logic)
3. **Workers** → **D1 Database** (cache, rate limiting, analytics)
4. **Real-time sync** via Supabase subscriptions

All API routes are in `worker/user-routes.ts`. **DO NOT modify `worker/index.ts`** - it contains core middleware (CSP, rate limiting, CORS).

## State Management

- **Global State**: Zustand stores in `src/lib/store.ts`
- **Server State**: TanStack Query with 5-minute stale time
- **Form State**: React Hook Form with Zod schemas
- **Context Providers**: Wrapped in `src/main.tsx` in this order:
  1. `AuthProvider` (Supabase auth)
  2. `AdminProvider` (admin users)
  3. `StoreProvider` (store data)
  4. `PlanProvider` (subscription plans)

## Routing & Pages

All pages are lazy-loaded for code splitting. Route structure:

- `/` - Landing page
- `/pos` - Point of Sale interface
- `/dashboard` - Main dashboard (protected)
- `/opname` - Stock adjustment (protected)
- `/store/:slug` - Public store view
- `/admin/*` - Admin CMS dashboard (admin-protected)

See `src/main.tsx` for the complete router configuration.

## Security Features

- **Content Security Policy** headers configured in `worker/index.ts`
- **Rate limiting**: 100 requests/minute per IP via D1
- **Authentication**: Supabase Auth with Google OAuth + Email/Password
- **Role-based access**: Owner, Member, Admin roles
- **Row Level Security (RLS)**: Enforced in Supabase

## Build Configuration

The Vite config (`vite.config.ts`) includes:
- Manual chunk splitting for optimal caching (react-vendor, ui-vendor, charts, animation, utils)
- Terser minification with console.log removal in production
- Gzip + Brotli compression
- Cloudflare plugin (production only)
- Custom Pino logger support

## Core Business Logic

### Inventory System
- **FIFO (First-In-First-Out)** stock tracking with batch management
- Stock purchases tracked in `purchases` table
- Low stock alerts based on reorder thresholds

### Multi-Tenancy
- Each user can have multiple stores
- Store slugs for public URLs (`/store/:slug`)
- Store-specific data isolation

### Payment Integration
- Duitku QRIS payment gateway
- Payment status tracking
- Transaction history

## Important File Locations

| Purpose | Location |
|---------|----------|
| API routes | `worker/user-routes.ts` |
| Database models | `worker/entities.ts` |
| D1 repository | `worker/d1-repository.ts` |
| Supabase client | `src/lib/supabase.ts` |
| Store state | `src/lib/store.ts` |
| Auth context | `src/contexts/AuthContext.tsx` |
| Type definitions | `src/types/supabase.ts` |
| API client | `src/lib/api-client.ts` |
| Audit logging | `src/lib/audit-logger.ts` |

## Development Notes

### Worker Configuration
- `wrangler.jsonc` contains Cloudflare Workers config
- D1 database binding: `DB` → `warungku_db`
- Durable Object: `GlobalDurableObject`
- Custom domain: `omzetin.web.id`
- **DO NOT modify the comment about hidden AI files**

### Environment Variables
Required in `.env.local`:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### Error Handling
- Client errors reported to `/api/client-errors` endpoint
- Error boundaries: `src/components/ErrorBoundary.tsx` and `src/components/RouteErrorBoundary.tsx`
- Error reporter: `src/lib/errorReporter.ts`

### Styling Conventions
- Neo-Brutalist design: bold borders, high contrast, solid colors
- Primary color: `#F38020` (orange)
- Black borders: `#1A1A1A`
- Use `tailwind-merge` and `clsx` for conditional classes
- All UI components in `src/components/ui/` follow shadcn/ui patterns

### Deployment
- Frontend: Vercel (from Vite build)
- Backend: Cloudflare Workers
- `bun run deploy` builds and deploys both

## Common Patterns

### Supabase Queries
Use the typed client: `supabase.from('table').select('*')`

### TanStack Query
```tsx
const { data, error, isLoading } = useQuery({
  queryKey: ['key'],
  queryFn: () => fetchFunction(),
  staleTime: 1000 * 60 * 5, // 5 minutes
});
```

### Form Validation
```tsx
const form = useForm<z.infer<typeof schema>>({
  resolver: zodResolver(schema),
});
```

### Protected Routes
- Use `<ProtectedRoute>` for authenticated users
- Use `<AdminProtectedRoute>` for admin-only pages
