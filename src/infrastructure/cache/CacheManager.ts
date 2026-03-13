import { ICache } from './CacheProvider';
import { MemoryCache } from './MemoryCache';

export const CACHE_TTL = {
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

export class CacheManager {
    private l1: MemoryCache;

    constructor() {
        // L1: Fast, in-memory cache for current tab/session
        this.l1 = new MemoryCache();
    }

    async get<T>(key: string): Promise<T | null> {
        // Try L1 Cache (Memory)
        const l1Data = await this.l1.get<T>(key);
        if (l1Data) {
            if (import.meta.env?.DEV) console.log(`[CacheManager] L1 HIT: ${key}`);
            return l1Data;
        }

        if (import.meta.env?.DEV) console.log(`[CacheManager] MISS: ${key}`);
        return null;
    }

    async set<T>(key: string, value: T, ttlSeconds: number): Promise<void> {
        await this.l1.set(key, value, Math.min(ttlSeconds, 300)); // L1 caches for max 300s
    }

    async delete(key: string): Promise<void> {
        await this.l1.delete(key);
    }

    async invalidate(pattern: string): Promise<void> {
        await this.l1.invalidate(pattern);
    }
}

// Global instance for client-side usage
export const cacheManager = new CacheManager();
