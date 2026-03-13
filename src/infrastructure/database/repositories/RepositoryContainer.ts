import { SupabaseClient } from '@supabase/supabase-js';
import { IUserRepository } from './interfaces/IUserRepository';
import { IStoreRepository } from './interfaces/IStoreRepository';
import { IProductRepository } from './interfaces/IProductRepository';
import { ISaleRepository } from './interfaces/ISaleRepository';

import { SupabaseUserRepository } from './SupabaseUserRepository';
import { SupabaseStoreRepository } from './SupabaseStoreRepository';
import { SupabaseProductRepository } from './SupabaseProductRepository';
import { SupabaseSaleRepository } from './SupabaseSaleRepository';
import { Database } from '@/types/supabase';

/**
 * Service Locator (Dependency Injection Container)
 * Instantiates and caches singletons for all repositories to easily mock/replace them out.
 */
export class RepositoryContainer {
    private static userRepository: IUserRepository;
    private static storeRepository: IStoreRepository;
    private static productRepository: IProductRepository;
    private static saleRepository: ISaleRepository;
    private static client: SupabaseClient<Database>;

    /**
     * Initialize the container with a specific Supabase Client.
     * This is very useful for dependency injection into our tests.
     */
    public static initialize(supabaseClient: SupabaseClient<Database>) {
        this.client = supabaseClient;
    }

    public static getUserRepository(): IUserRepository {
        if (!this.client) throw new Error('RepositoryContainer not initialized with SupabaseClient');
        if (!this.userRepository) {
            this.userRepository = new SupabaseUserRepository(this.client);
        }
        return this.userRepository;
    }

    public static getStoreRepository(): IStoreRepository {
        if (!this.client) throw new Error('RepositoryContainer not initialized with SupabaseClient');
        if (!this.storeRepository) {
            this.storeRepository = new SupabaseStoreRepository(this.client);
        }
        return this.storeRepository;
    }

    public static getProductRepository(): IProductRepository {
        if (!this.client) throw new Error('RepositoryContainer not initialized with SupabaseClient');
        if (!this.productRepository) {
            this.productRepository = new SupabaseProductRepository(this.client);
        }
        return this.productRepository;
    }

    public static getSaleRepository(): ISaleRepository {
        if (!this.client) throw new Error('RepositoryContainer not initialized with SupabaseClient');
        if (!this.saleRepository) {
            this.saleRepository = new SupabaseSaleRepository(this.client);
        }
        return this.saleRepository;
    }

    // Useful for unit tests to reset instances
    public static reset() {
        this.userRepository = undefined as any;
        this.storeRepository = undefined as any;
        this.productRepository = undefined as any;
        this.saleRepository = undefined as any;
    }
}
