// Making changes to this file is **STRICTLY** forbidden. Please add your routes in `userRoutes.ts` file.

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { userRoutes } from './user-routes';
import { Env, GlobalDurableObject } from './core-utils';

// Need to export GlobalDurableObject to make it available in wrangler
export { GlobalDurableObject };
export interface ClientErrorReport {
    message: string;
    url: string;
    userAgent: string;
    timestamp: string;
    stack?: string;
    componentStack?: string;
    errorBoundary?: boolean;
    errorBoundaryProps?: Record<string, unknown>;
    source?: string;
    lineno?: number;
    colno?: number;
    error?: unknown;
  }
// Content Security Policy and other security headers middleware
async function cspMiddleware(c: any, next: () => Promise<void>) {
  // Set Content Security Policy header to prevent XSS and other injection attacks
  c.header('Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' https://unpkg.com https://cdn.skypack.dev https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://*.supabase.co https://*.supabase.in https://*.supabase.red https://api.duitku.com https://sandbox.duitku.com; " +
    "frame-ancestors 'none'; " +
    "object-src 'none'; " +
    "base-uri 'self';"
  );

  // Additional security headers
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

  // HTTP Strict Transport Security (HSTS) - only add if request is HTTPS
  if (c.req.raw.url.startsWith('https://')) {
    c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }

  await next();
}

// Rate limiting middleware
async function rateLimit(c: any, next: () => Promise<void>) {
  // Get client IP
  const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || c.req.header('X-Real-IP') || 'unknown';

  // Use D1 to store rate limit data (simplified approach)
  // In a real implementation, you'd want to use Cloudflare KV or a dedicated rate limiting service
  try {
    // Check if we have rate limit data for this IP
    const windowStart = Date.now() - 60000; // 1 minute window
    const { results } = await c.env.DB
      .prepare('SELECT COUNT(*) as count FROM rate_limits WHERE ip = ? AND timestamp > ?')
      .bind(ip, windowStart)
      .all();

    const requestCount = results[0]?.count || 0;

    // Limit to 100 requests per minute per IP
    if (requestCount >= 100) {
      return c.json({ success: false, error: 'Rate limit exceeded. Please try again later.' }, 429);
    }

    // Record this request
    await c.env.DB
      .prepare('INSERT INTO rate_limits (ip, timestamp) VALUES (?, ?)')
      .bind(ip, Date.now())
      .run();
  } catch (error) {
    console.warn('Rate limiting error (continuing without rate limit):', error);
  }

  await next();
}

const app = new Hono<{ Bindings: Env }>();

app.use('*', logger());

// Apply security middleware
app.use('*', cspMiddleware);

// Apply rate limiting to all API routes
app.use('/api/*', rateLimit);

app.use('/api/*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowHeaders: ['Content-Type', 'Authorization'] }));

userRoutes(app);

app.get('/api/health', (c) => c.json({ success: true, data: { status: 'healthy', timestamp: new Date().toISOString() }}));

app.post('/api/client-errors', async (c) => {
  try {
    const e = await c.req.json<ClientErrorReport>();
    if (!e.message) return c.json({ success: false, error: 'Missing required fields' }, 400);
    console.error('[CLIENT ERROR]', JSON.stringify(e, null, 2));
    return c.json({ success: true });
  } catch (error) {
    console.error('[CLIENT ERROR HANDLER] Failed:', error);
    return c.json({ success: false, error: 'Failed to process' }, 500);
  }
});

app.notFound((c) => c.json({ success: false, error: 'Not Found' }, 404));
app.onError((err, c) => { console.error(`[ERROR] ${err}`); return c.json({ success: false, error: 'Internal Server Error' }, 500); });

console.log(`Server is running`)

export default { fetch: app.fetch } satisfies ExportedHandler<Env>;