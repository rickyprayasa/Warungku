import { BaseController } from '../common/BaseController';
import { ApiResponse } from '../common/ApiResponse';
import { ServiceContainer } from '@/core/services/ServiceContainer';
import { ErrorHandlerMiddleware } from '../middlewares/errorHandler.middleware';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { RateLimitMiddleware } from '../middlewares/rateLimit.middleware';
import { CreateSaleInput } from '@/core/services/sale/CreateSaleService';
import { RepositoryContainer } from '@/infrastructure/database/repositories/RepositoryContainer';
import { Database } from '@/types/supabase';

type SaleRow = Database['public']['Tables']['sales']['Row'];
type SaleItemRow = Database['public']['Tables']['sale_items']['Row'];

export interface SaleWithItems extends SaleRow {
    items: SaleItemRow[];
}

export class SaleController extends BaseController {
    private createSaleService = ServiceContainer.getCreateSaleService();
    private saleRepo = RepositoryContainer.getSaleRepository();

    constructor() {
        super();
        this.use(new ErrorHandlerMiddleware());
        this.use(new AuthMiddleware());
        this.use(new RateLimitMiddleware(10, 60000)); // Max 10 sales per minute to prevent multi-click anomalies
    }

    async processSale(dto: CreateSaleInput): Promise<ApiResponse<SaleRow>> {
        return this.execute(async () => {
            // Service handles business constraint validation (e.g. valid items, enough stock)
            return await this.createSaleService.execute(dto);
        }, 'processSale');
    }

    async getSalesHistory(storeId: string, limit?: number): Promise<ApiResponse<SaleRow[]>> {
        return this.execute(async () => {
            if (!storeId) throw new Error("Store ID missing");
            // Standard read
            return await this.saleRepo.findRecentByStoreId(storeId, limit);
        }, 'getSalesHistory');
    }

    async getSaleDetails(saleId: string): Promise<ApiResponse<SaleWithItems>> {
        return this.execute(async () => {
            // Example fetching parent + children. 
            // Normally the `ISaleRepository` should have a `findByIdWithItems` method
            // We can mock that read logic here for now
            throw new Error('Not implemented: Requires SaleItemRepository mapping to be built');
        }, 'getSaleDetails');
    }
}
