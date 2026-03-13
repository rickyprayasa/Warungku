import { ICache } from './CacheProvider';

interface CacheEntry<T> {
    value: T;
    expiresAt: number | null;
}

/**
 * In-memory cache implementation
 * Fast, L1 cache that lives in the application memory space
 */
export class MemoryCache implements ICache {
    private cache = new Map<string, CacheEntry<any>>();

    // Optional: Automatically clean up expired items periodically
    constructor(cleanupIntervalMs = 60000) {
        if (typeof window !== 'undefined') {
            setInterval(() => this.cleanup(), cleanupIntervalMs);
        }
    }

    async get<T>(key: string): Promise<T | null> {
        const entry = this.cache.get(key);

        if (!entry) {
            return null;
        }

        // Check expiration
        if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
            this.cache.delete(key);
            return null;
        }

        return entry.value as T;
    }

    async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
        const expiresAt = ttlSeconds ? Date.now() + ttlSeconds * 1000 : null;
        this.cache.set(key, { value, expiresAt });
    }

    async delete(key: string): Promise<void> {
        this.cache.delete(key);
    }

    async invalidate(pattern?: string): Promise<void> {
        if (!pattern) {
            this.cache.clear();
            return;
        }

        // Convert glob-like pattern to regex (e.g. "product:*" -> /^product:.*$/)
        const regexPattern = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');

        for (const key of this.cache.keys()) {
            if (regexPattern.test(key)) {
                this.cache.delete(key);
            }
        }
    }

    /**
     * Internal method to proactively clean expired items
     */
    private cleanup(): void {
        const now = Date.now();
        for (const [key, entry] of this.cache.entries()) {
            if (entry.expiresAt !== null && now > entry.expiresAt) {
                this.cache.delete(key);
            }
        }
    }
}
