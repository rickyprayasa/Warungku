import { ApiMiddleware, RequestContext } from '../common/BaseController';
import { ApiResponse, createErrorResponse } from '../common/ApiResponse';
import { ZodSchema, ZodError } from 'zod';

export class ValidationMiddleware<T> implements ApiMiddleware {
    constructor(private schema: ZodSchema<T>) { }

    async handle(context: RequestContext, next: () => Promise<ApiResponse<any>>): Promise<ApiResponse<any>> {
        if (!context.data || !context.data.body) {
            return createErrorResponse('No data provided for validation', 400);
        }

        try {
            // Validate and overwrite the raw body with the sanitized/parsed data
            context.data.body = this.schema.parse(context.data.body);
            return await next();
        } catch (error) {
            if (error instanceof ZodError || (error as any).name === 'ZodError') {
                const issues = (error as any).issues || (error as any).errors || [];
                const message = issues.map((e: any) => `${e.path?.join('.') || 'input'}: ${e.message}`).join(', ');
                return createErrorResponse(`Validation Error: ${message}`, 400);
            }
            return createErrorResponse('An unexpected validation error occurred', 500);
        }
    }
}
