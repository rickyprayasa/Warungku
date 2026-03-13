import { BaseController } from '../common/BaseController';
import { ApiResponse } from '../common/ApiResponse';
import { ServiceContainer } from '@/core/services/ServiceContainer';
import { CreateUserService } from '@/core/services/user/CreateUserService';
import { RepositoryContainer } from '@/infrastructure/database/repositories/RepositoryContainer';
import { ErrorHandlerMiddleware } from '../middlewares/errorHandler.middleware';
import { AuthMiddleware } from '../middlewares/auth.middleware';
import { Database } from '@/types/supabase';
import { User } from '@supabase/supabase-js';

type StoreMemberRow = Database['public']['Tables']['store_members']['Row'];

export class UserController extends BaseController {
    private createUserService = ServiceContainer.getCreateUserService();
    private userRepo = RepositoryContainer.getUserRepository();

    constructor() {
        super();
        this.use(new ErrorHandlerMiddleware());
        this.use(new AuthMiddleware());
    }

    async registerUser(email: string, name: string, storeId: string, role: "owner" | "admin" | "staff", createdBy?: string): Promise<ApiResponse<User>> {
        return this.execute(async () => {
            // Note: `createdBy` isn't in CreateUserService yet, either add later or drop. Service ignores.
            return await this.createUserService.execute({ email, name, storeId, role });
        }, 'registerUser');
    }

    async getStoreMembers(storeId: string): Promise<ApiResponse<StoreMemberRow[]>> {
        return this.execute(async () => {
            if (!storeId) throw new Error("Store ID missing");
            throw new Error("Not implemented: Requires StoreMember repository or query");
        }, 'getStoreMembers');
    }
}
