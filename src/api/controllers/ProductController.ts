import { BaseController } from '../common/BaseController';
import { ApiResponse } from '../common/ApiResponse';
import { ServiceContainer } from '@/core/services/ServiceContainer';
import { ErrorHandlerMiddleware } from '../middlewares/errorHandler.middleware';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { ValidationMiddleware } from '../middlewares/validation.middleware';
import { UpdateProductInput } from '@/core/services/product/UpdateProductService';
import { z } from 'zod';
import { productSchema } from '@shared/types';
import { Database } from '@/types/supabase';
import { RepositoryContainer } from '@/infrastructure/database/repositories/RepositoryContainer';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];

// Schemas for API Input strictness (if they differ or extend the shared UI schemas)
const createProductDtoSchema = productSchema.extend({
    store_id: z.string().uuid()
});

export class ProductController extends BaseController {

    // Instead of instantiating tightly here, we rely on the ServiceLocator
    private createService = ServiceContainer.getCreateProductService();
    private updateService = ServiceContainer.getUpdateProductService();
    private deleteService = ServiceContainer.getDeleteProductService();

    // To read products, we can use a Read Service OR just the repository directly 
    // since CQRS often splits write/read models. For simplicity, reading hits repo.
    private productRepo = RepositoryContainer.getProductRepository();

    constructor() {
        super();
        this.use(new ErrorHandlerMiddleware());
        this.use(new AuthMiddleware());
        // Validation could be added per-method dynamically, but for demonstration we'll rely on the manual `validate` 
        // fallbacks currently inside the methods or add them as specific pipeline runs if we refactor routing.
    }

    async createProduct(dto: ProductInsert): Promise<ApiResponse<ProductRow>> {
        return this.execute(async () => {
            // Instead of mapping manually and invoking TS property errors,
            // we let the zod parser strip and validate the raw DTO generically.
            this.validate(createProductDtoSchema, dto as unknown);

            return await this.createService.execute(dto);
        }, 'createProduct');
    }

    async updateProduct(dto: UpdateProductInput): Promise<ApiResponse<ProductRow>> {
        return this.execute(async () => {
            // Let Service handle constraints
            return await this.updateService.execute(dto);
        }, 'updateProduct');
    }

    async deleteProduct(productId: string, storeId: string): Promise<ApiResponse<boolean>> {
        return this.execute(async () => {
            // DeleteProductService doesn't explicitly check storeId yet, so the controller bridges auth context if needed.
            return await this.deleteService.execute({ id: productId, storeId });
        }, 'deleteProduct');
    }

    async getProducts(storeId: string): Promise<ApiResponse<ProductRow[]>> {
        return this.execute(async () => {
            if (!storeId) throw new Error("Store ID missing");
            // Standard read flow 
            return await this.productRepo.findByStoreId(storeId);
        }, 'getProducts');
    }

    async getInventoryLowStock(storeId: string): Promise<ApiResponse<ProductRow[]>> {
        return this.execute(async () => {
            if (!storeId) throw new Error("Store ID missing");
            // Read products and filter for stock logic. Or add `findLowStock` to Repo.
            const all = await this.productRepo.findByStoreId(storeId);
            return all.filter(p => p.total_stock !== null && p.total_stock <= (p.min_stock_level || 10));
        }, 'getInventoryLowStock');
    }
}
