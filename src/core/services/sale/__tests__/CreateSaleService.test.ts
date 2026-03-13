import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateSaleService } from '../CreateSaleService';
import { ISaleRepository } from '@/infrastructure/database/repositories/interfaces/ISaleRepository';
import { IProductRepository } from '@/infrastructure/database/repositories/interfaces/IProductRepository';
import { EventBus } from '@/infrastructure/events/EventBus';

describe('CreateSaleService', () => {
    let service: CreateSaleService;
    let mockSaleRepo: vi.Mocked<ISaleRepository>;
    let mockProductRepo: vi.Mocked<IProductRepository>;
    let mockEventBus: vi.Mocked<EventBus>;

    beforeEach(() => {
        mockSaleRepo = {
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            findById: vi.fn(),
            findAll: vi.fn(),
            findByStoreId: vi.fn(),
            findRecentByStoreId: vi.fn(),
            getSummaryByDateRange: vi.fn(),
        } as any;

        mockProductRepo = {
            findById: vi.fn(),
            findAll: vi.fn(),
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            findByStoreId: vi.fn(),
            findInStockByStoreId: vi.fn(),
            findBestSellersByStoreId: vi.fn(),
            searchByName: vi.fn()
        } as any;

        mockEventBus = {
            subscribe: vi.fn(),
            publish: vi.fn()
        } as any;

        service = new CreateSaleService(mockSaleRepo, mockProductRepo, mockEventBus);
    });

    it('throws if missing storeId', async () => {
        await expect(service.execute({ storeId: '', items: [] })).rejects.toThrow('Store ID is required for a sale');
    });

    it('throws if items array is empty', async () => {
        await expect(service.execute({ storeId: 'store-1', items: [] })).rejects.toThrow('Cannot create an empty sale');
    });

    it('throws if item quantity is zero or less', async () => {
        await expect(service.execute({
            storeId: 'store-1',
            items: [{ productId: 'p1', productName: 'prod', quantity: 0, price: 10, cost: 5 }]
        })).rejects.toThrow('Invalid item quantity for product p1');
    });

    it('calculates total revenue and profit correctly', async () => {
        const input = {
            storeId: 'store-1',
            items: [
                { productId: 'p1', productName: 'prod1', quantity: 2, price: 15, cost: 10 },
                { productId: 'p2', productName: 'prod2', quantity: 1, price: 20, cost: 5 }
            ]
        };

        // Revenue = (2 * 15) + (1 * 20) = 30 + 20 = 50
        // Profit = Revenue - TotalCost
        // TotalCost = (2 * 10) + (1 * 5) = 20 + 5 = 25
        // Profit = 50 - 25 = 25

        mockSaleRepo.create.mockResolvedValueOnce({ id: 'sale-1', total: 50, profit: 25 } as any);

        const result = await service.execute(input);

        expect(mockSaleRepo.create).toHaveBeenCalledWith(expect.objectContaining({
            store_id: 'store-1',
            total: 50,
            profit: 25,
            sale_type: 'cash'
        }));

        expect(result.id).toBe('sale-1');

        // Assert Event Bus
        expect(mockEventBus.publish).toHaveBeenCalledWith(expect.objectContaining({
            eventName: 'SaleCompletedEvent',
            saleId: 'sale-1',
            total: 50
        }));
    });
});
