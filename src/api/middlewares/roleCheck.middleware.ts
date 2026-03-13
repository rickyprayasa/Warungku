import { ApiMiddleware, RequestContext } from '../common/BaseController';
import { ApiResponse, createErrorResponse } from '../common/ApiResponse';
import { supabase } from '@/lib/supabase';

export class RoleCheckMiddleware implements ApiMiddleware {
    private allowedRoles: string[];

    constructor(...roles: string[]) {
        this.allowedRoles = roles;
    }

    async handle(context: RequestContext, next: () => Promise<ApiResponse<any>>): Promise<ApiResponse<any>> {
        // Assume AuthMiddleware ran first and populated context.user
        if (!context.user) {
            return createErrorResponse('Unauthorized. Missing user context.', 401);
        }

        try {
            // In a real app we might cache this in the session or Zustand
            // Here we do a quick fetch to store_members to verify role
            // NOTE: We need storeId. It should be passed in context.data.storeId
            const storeId = context.data?.storeId;
            if (!storeId) {
                return createErrorResponse('Store ID is required for role verification', 400);
            }

            const { data, error } = await supabase
                .from('store_members')
                .select('role')
                .eq('user_id', context.user.id)
                .eq('store_id', storeId)
                .single();

            const member = data as { role: string } | null;

            if (error || !member) {
                return createErrorResponse('Forbidden. You do not have access to this store.', 403);
            }

            if (!this.allowedRoles.includes(member.role)) {
                return createErrorResponse(`Forbidden. Requires one of: ${this.allowedRoles.join(', ')}`, 403);
            }

            // Populate the verified role
            if (!context.data) context.data = {};
            context.data.role = member.role;

            return await next();
        } catch (err) {
            console.error('[RoleCheckMiddleware] Error:', err);
            return createErrorResponse('Failed to verify user roles', 500);
        }
    }
}
