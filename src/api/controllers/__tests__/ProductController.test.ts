import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductController } from '../ProductController';
import { ServiceContainer } from '@/core/services/ServiceContainer';
import { RepositoryContainer } from '@/infrastructure/database/repositories/RepositoryContainer';
import { supabase } from '@/lib/supabase';

// Mock Dependencies
vi.mock('@/core/services/ServiceContainer', () => ({
    ServiceContainer: {
        getCreateProductService: vi.fn(),
        getUpdateProductService: vi.fn(),
        getDeleteProductService: vi.fn(),
    }
}));

vi.mock('@/infrastructure/database/repositories/RepositoryContainer', () => ({
    RepositoryContainer: {
        getProductRepository: vi.fn()
    }
}));

vi.mock('@/lib/supabase', () => ({
    supabase: {
        auth: {
            getSession: vi.fn()
        }
    }
}));

describe('ProductController', () => {
    let controller: ProductController;
    let mockCreateService: any;

    beforeEach(() => {
        mockCreateService = {
            execute: vi.fn()
        };
        (ServiceContainer.getCreateProductService as any).mockReturnValue(mockCreateService);
        (RepositoryContainer.getProductRepository as any).mockReturnValue({
            findByStoreId: vi.fn()
        });

        // Setup controller fresh with mocked locators
        controller = new ProductController();

        // Pass auth middleware universally for these unit tests
        (supabase.auth.getSession as any).mockResolvedValue({
            data: { session: { user: { id: 'test-user-id' } } },
            error: null
        });
    });

    it('returns ApiResponse<ProductRow> on success', async () => {
        const mockDbProduct = { id: 'prod-1', name: 'Coffee', price: 10 };
        mockCreateService.execute.mockResolvedValueOnce(mockDbProduct);

        const dto: any = {
            name: 'Coffee',
            price: 10,
            category: 'Beverage',
            store_id: 'db3b9ff0-e1e0-43ce-a4db-912808c32493' // Valid uuid
        };

        const response = await controller.createProduct(dto);

        expect(response.success).toBe(true);
        expect(response.data).toEqual(mockDbProduct);
        expect(response.error).toBeUndefined();
        expect(response.statusCode).toBe(200);
    });

    it('returns 400 Validation Error when Zod fails', async () => {
        // Reset auth mock natively for this scope
        (supabase.auth.getSession as any).mockResolvedValue({
            data: { session: { user: { id: 'test-user-id' } } },
            error: null
        });

        const dto: any = {
            name: 'Coffee',
            price: 'invalid_price', // Zod should catch this based on productSchema 
            store_id: 'bad-uuid'
        };

        const response = await controller.createProduct(dto);

        expect(response.success).toBe(false);
        expect(response.error).toContain('Validation Error');
        expect(response.statusCode).toBe(400);
        expect(mockCreateService.execute).not.toHaveBeenCalled();
    });

    it('returns 500 when Service Layer throws unexpected error', async () => {
        // Reset auth mock natively for this scope
        (supabase.auth.getSession as any).mockResolvedValue({
            data: { session: { user: { id: 'test-user-id' } } },
            error: null
        });

        mockCreateService.execute.mockRejectedValueOnce(new Error('Supabase constraint violation'));

        const dto: any = {
            name: 'Coffee',
            price: 10,
            category: 'Beverage',
            store_id: 'db3b9ff0-e1e0-43ce-a4db-912808c32493' // Valid uuid
        };

        const response = await controller.createProduct(dto);

        expect(response.success).toBe(false);
        expect(response.error).toBe('Supabase constraint violation');
        expect(response.statusCode).toBe(500);
    });
});
