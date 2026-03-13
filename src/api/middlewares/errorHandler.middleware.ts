import { ApiMiddleware, RequestContext } from '../common/BaseController';
import { ApiResponse, createErrorResponse } from '../common/ApiResponse';
import { ZodError } from 'zod';

/**
 * Global ErrorHandler Middleware
 * Should ideally be placed at the very end of the pipeline, wrapping the execution
 * to guarantee no unhandled promises crash the frontend application state.
 */
export class ErrorHandlerMiddleware implements ApiMiddleware {
    async handle(context: RequestContext, next: () => Promise<ApiResponse<any>>): Promise<ApiResponse<any>> {
        try {
            return await next();
        } catch (error: any) {
            console.error(`[Pipeline Error][${context.actionName}]`, error);

            if (error instanceof ZodError || error.name === 'ZodError') {
                const issues = error.issues || (error as any).errors || [];
                const message = issues.map((e: any) => `${e.path?.join('.') || 'input'}: ${e.message}`).join(', ');
                return createErrorResponse(`Validation Error: ${message}`, 400);
            }

            // Map generic exceptions
            const message = error.message || 'An unexpected internal error occurred';
            const statusCode = error.status || error.statusCode || 500;
            return createErrorResponse(message, statusCode);
        }
    }
}
