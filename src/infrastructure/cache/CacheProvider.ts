/**
 * Core caching interface for Warungku
 * Allows swapping between MemoryCache, Redis, or Cloudflare KV later
 */
export interface ICache {
    /**
     * Retrieves a value from the cache
     * @param key The cache key
     * @returns The parsed value or null if not found/expired
     */
    get<T>(key: string): Promise<T | null>;

    /**
     * Sets a value in the cache
     * @param key The cache key
     * @param value The value to cache
     * @param ttl Time to live in seconds
     */
    set<T>(key: string, value: T, ttl?: number): Promise<void>;

    /**
     * Deletes a specific key from the cache
     * @param key The cache key
     */
    delete(key: string): Promise<void>;

    /**
     * Deletes all keys matching a specific pattern (if supported)
     * or clears the entire cache
     * @param pattern Optional prefix/pattern to invalidate
     */
    invalidate(pattern?: string): Promise<void>;
}
