import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseStoreRepository } from '../SupabaseStoreRepository';
import { SupabaseClient } from '@supabase/supabase-js';

// Mock Supabase Client
const mockSupabase = {
    from: vi.fn(),
} as unknown as SupabaseClient<any>;

describe('SupabaseStoreRepository', () => {
    let repository: SupabaseStoreRepository;

    // Mock query builder chain
    const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        insert: vi.fn().mockReturnThis(),
        update: vi.fn().mockReturnThis(),
        delete: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn() // Used to resolve await
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (mockSupabase.from as any).mockReturnValue(queryBuilder);
        repository = new SupabaseStoreRepository(mockSupabase);
    });

    it('findById should fetch a single store', async () => {
        const mockStore = { id: 'store-1', name: 'Test Store' };
        queryBuilder.then.mockImplementation((cb) => cb({ data: mockStore, error: null }));

        const result = await repository.findById('store-1');

        expect(mockSupabase.from).toHaveBeenCalledWith('stores');
        expect(queryBuilder.select).toHaveBeenCalledWith('*');
        expect(queryBuilder.eq).toHaveBeenCalledWith('id', 'store-1');
        expect(queryBuilder.single).toHaveBeenCalled();
        expect(result).toEqual(mockStore);
    });

    it('findBySlug should fetch a single store by slug', async () => {
        const mockStore = { id: 'store-1', slug: 'test-slug' };
        queryBuilder.then.mockImplementation((cb) => cb({ data: mockStore, error: null }));

        const result = await repository.findBySlug('test-slug');

        expect(mockSupabase.from).toHaveBeenCalledWith('stores');
        expect(queryBuilder.eq).toHaveBeenCalledWith('slug', 'test-slug');
        expect(result).toEqual(mockStore);
    });

    it('create should insert new store', async () => {
        const insertData = { name: 'New Store', slug: 'new-store' } as any;
        const mockResponse = { id: 'store-2', ...insertData };
        queryBuilder.then.mockImplementation((cb) => cb({ data: mockResponse, error: null }));

        const result = await repository.create(insertData);

        expect(mockSupabase.from).toHaveBeenCalledWith('stores');
        expect(queryBuilder.insert).toHaveBeenCalledWith(insertData);
        expect(result).toEqual(mockResponse);
    });
});
