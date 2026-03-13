import { BaseController } from '../common/BaseController';
import { ApiResponse, createErrorResponse } from '../common/ApiResponse';
import { ErrorHandlerMiddleware } from '../middlewares/errorHandler.middleware';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { RoleCheckMiddleware } from '../middlewares/roleCheck.middleware';
import { RepositoryContainer } from '@/infrastructure/database/repositories/RepositoryContainer';
import { Database } from '@/types/supabase';

type StoreRow = Database['public']['Tables']['stores']['Row'];
type SettingsUpdate = Database['public']['Tables']['settings']['Update'];

export class StoreController extends BaseController {
    private storeRepo = RepositoryContainer.getStoreRepository();

    constructor() {
        super();
        this.use(new ErrorHandlerMiddleware());
        this.use(new AuthMiddleware());
        // For demonstration, requires someone to be at least staff to do basic store fetches or mutations.
        // If "getStore" needs to be public, we'd split the controllers or use decorators.
        this.use(new RoleCheckMiddleware('owner', 'admin', 'staff'));
    }

    async getStore(storeId: string): Promise<ApiResponse<StoreRow>> {
        return this.execute(async () => {
            const store = await this.storeRepo.findById(storeId);
            if (!store) {
                throw new Error("Store not found");
            }
            return store;
        }, 'getStore');
    }

    async updateStore(storeId: string, data: Partial<StoreRow>): Promise<ApiResponse<StoreRow>> {
        return this.execute(async () => {
            return await this.storeRepo.update(storeId, data as any);
        }, 'updateStore');
    }
}
