import { ApiMiddleware, RequestContext } from '../common/BaseController';
import { ApiResponse, createErrorResponse } from '../common/ApiResponse';

// Simple in-memory store for rate limiting
// Maps clientTokens to their request timestamps
const hitCache = new Map<string, number[]>();

export class RateLimitMiddleware implements ApiMiddleware {
    private maxRequests: number;
    private windowMs: number;

    constructor(maxRequests: number = 20, windowMs: number = 60000) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
    }

    async handle(context: RequestContext, next: () => Promise<ApiResponse<any>>): Promise<ApiResponse<any>> {
        // Fallback token if not provided (e.g. user ID or generic "frontend")
        const clientToken = context.clientToken || context.user?.id || 'anonymous';

        // Isolate cache by action route to prevent blocking all actions if 1 is spammed
        const cacheKey = `${context.actionName}:${clientToken}`;

        const now = Date.now();
        const timestamps = hitCache.get(cacheKey) || [];

        // Filter out timestamps older than the window
        const validTimestamps = timestamps.filter(ts => (now - ts) < this.windowMs);

        if (validTimestamps.length >= this.maxRequests) {
            return createErrorResponse('Too many requests, please try again later.', 429);
        }

        // Add current timestamp and save back to cache
        validTimestamps.push(now);
        hitCache.set(cacheKey, validTimestamps);

        return await next();
    }
}
