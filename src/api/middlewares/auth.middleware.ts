import { ApiMiddleware, RequestContext } from '../common/BaseController';
import { ApiResponse, createErrorResponse } from '../common/ApiResponse';
import { supabase } from '@/lib/supabase';

export class AuthMiddleware implements ApiMiddleware {
    async handle(context: RequestContext, next: () => Promise<ApiResponse<any>>): Promise<ApiResponse<any>> {
        // Step 1: Authenticate (guard only auth errors)
        try {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error || !session) {
                return createErrorResponse('Unauthorized. Please login to continue.', 401);
            }

            // Populate the context for downstream controllers/middlewares
            context.user = session.user;
        } catch (err) {
            console.error('[AuthMiddleware] Error:', err);
            return createErrorResponse('Failed to authenticate session', 500);
        }

        // Step 2: Continue the pipeline — let downstream errors propagate
        // (they'll be handled by ErrorHandlerMiddleware)
        return await next();
    }
}
