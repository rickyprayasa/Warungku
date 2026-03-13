import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseProductRepository } from '../SupabaseProductRepository';
import { SupabaseClient } from '@supabase/supabase-js';

const mockSupabase = {
    from: vi.fn(),
} as unknown as SupabaseClient<any>;

describe('SupabaseProductRepository', () => {
    let repository: SupabaseProductRepository;

    const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gt: vi.fn().mockReturnThis(),
        ilike: vi.fn().mockReturnThis(),
        single: vi.fn().mockReturnThis(),
        then: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (mockSupabase.from as any).mockReturnValue(queryBuilder);
        repository = new SupabaseProductRepository(mockSupabase);
    });

    it('findInStockByStoreId should apply multiple filters', async () => {
        const mockProducts = [{ id: 'prod-1', name: 'Item 1' }];
        queryBuilder.then.mockImplementation((cb) => cb({ data: mockProducts, error: null }));

        const result = await repository.findInStockByStoreId('store-1');

        expect(mockSupabase.from).toHaveBeenCalledWith('products');
        expect(queryBuilder.select).toHaveBeenCalledWith('*');
        expect(queryBuilder.eq).toHaveBeenCalledWith('store_id', 'store-1');
        expect(queryBuilder.gt).toHaveBeenCalledWith('total_stock', 0);
        expect(queryBuilder.eq).toHaveBeenCalledWith('is_active', true);
        expect(result).toEqual(mockProducts);
    });

    it('searchByName should use ilike', async () => {
        const mockProducts = [{ id: 'prod-1', name: 'apple' }];
        queryBuilder.then.mockImplementation((cb) => cb({ data: mockProducts, error: null }));

        const result = await repository.searchByName('store-1', 'app');

        expect(queryBuilder.ilike).toHaveBeenCalledWith('name', '%app%');
        expect(result).toEqual(mockProducts);
    });
});
