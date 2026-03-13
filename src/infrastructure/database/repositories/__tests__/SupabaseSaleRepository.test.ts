import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SupabaseSaleRepository } from '../SupabaseSaleRepository';
import { SupabaseClient } from '@supabase/supabase-js';

const mockSupabase = {
    from: vi.fn(),
} as unknown as SupabaseClient<any>;

describe('SupabaseSaleRepository', () => {
    let repository: SupabaseSaleRepository;

    const queryBuilder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        lte: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        range: vi.fn().mockReturnThis(),
        then: vi.fn()
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (mockSupabase.from as any).mockReturnValue(queryBuilder);
        repository = new SupabaseSaleRepository(mockSupabase);
    });

    it('findRecentByStoreId should apply limits correctly', async () => {
        const mockSales = [{ id: 'sale-1' }];
        queryBuilder.then.mockImplementation((cb) => cb({ data: mockSales, error: null }));

        const result = await repository.findRecentByStoreId('store-1', 10);

        expect(queryBuilder.order).toHaveBeenCalledWith('created_at', { ascending: false });
        expect(queryBuilder.range).toHaveBeenCalledWith(0, 9);
        expect(result).toEqual(mockSales);
    });

    it('getSummaryByDateRange should sum profits and revenues', async () => {
        const mockSales = [
            { id: '1', total: 100, profit: 50 },
            { id: '2', total: 200, profit: 100 }
        ];
        queryBuilder.then.mockImplementation((cb) => cb({ data: mockSales, error: null }));

        const start = new Date('2026-03-01T00:00:00Z');
        const end = new Date('2026-03-31T23:59:59Z');

        const summary = await repository.getSummaryByDateRange('store-1', start, end);

        expect(queryBuilder.gte).toHaveBeenCalledWith('created_at', start.toISOString());
        expect(queryBuilder.lte).toHaveBeenCalledWith('created_at', end.toISOString());
        expect(summary.totalRevenue).toBe(300);
        expect(summary.totalProfit).toBe(150);
        expect(summary.transactionCount).toBe(2);
    });
});
