import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CreateProductService } from '../CreateProductService';
import { IProductRepository } from '@/infrastructure/database/repositories/interfaces/IProductRepository';

describe('CreateProductService', () => {
    let service: CreateProductService;
    let mockRepository: vi.Mocked<IProductRepository>;

    beforeEach(() => {
        mockRepository = {
            create: vi.fn(),
            update: vi.fn(),
            delete: vi.fn(),
            findById: vi.fn(),
            findAll: vi.fn(),
            findByStoreId: vi.fn(),
            findInStockByStoreId: vi.fn(),
            findBestSellersByStoreId: vi.fn(),
            searchByName: vi.fn(),
        } as any;

        service = new CreateProductService(mockRepository);
    });

    it('should throw an error if name is empty', async () => {
        await expect(service.execute({ name: '', store_id: 'store-1', price: 100 })).rejects.toThrow('Product name is required');
    });

    it('should throw an error if store_id is missing', async () => {
        await expect(service.execute({ name: 'Product', store_id: '', price: 100 })).rejects.toThrow('Store ID is required');
    });

    it('should apply default values and call repository create', async () => {
        const input = { name: 'New Product', store_id: 'store-1' };
        mockRepository.create.mockResolvedValue({ id: 'prod-1', ...input } as any);

        const result = await service.execute(input);

        expect(mockRepository.create).toHaveBeenCalledWith(expect.objectContaining({
            name: 'New Product',
            store_id: 'store-1',
            price: 0,
            cost: 0,
            total_stock: 0,
            is_active: true
        }));

        expect(result.id).toBe('prod-1');
    });
});
