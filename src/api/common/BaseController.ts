import { ApiResponse, createErrorResponse, createSuccessResponse } from './ApiResponse';
import { ZodError, ZodSchema } from 'zod';

export type RequestContext = {
    // Basic user/session info populated by AuthMiddleware
    user?: any;
    // Current route/action context 
    actionName?: string;
    // Client IP or unique token for rate limiting (can be simulated or fetched)
    clientToken?: string;
    // Arbitrary data passed down the pipe
    data?: Record<string, any>;
};

export interface ApiMiddleware {
    handle(context: RequestContext, next: () => Promise<ApiResponse<any>>): Promise<ApiResponse<any>>;
}

export abstract class BaseController {
    protected middlewares: ApiMiddleware[] = [];

    /**
     * Register a middleware to run before actions in this controller.
     * Order matters: The first registered runs first.
     */
    protected use(middleware: ApiMiddleware) {
        this.middlewares.push(middleware);
    }
    /**
     * Standardized executor for all controller actions.
     * Captures Zod validation errors, business logic throws, and generic exceptions.
     * @param action The asynchronous function executing core logic
     */
    protected async execute<T>(action: () => Promise<T>, actionName?: string): Promise<ApiResponse<T>> {
        const context: RequestContext = {
            actionName: actionName || this.constructor.name,
            data: {}
        };

        // The core business logic wrapped as the final step in the chain
        const coreAction = async (): Promise<ApiResponse<any>> => {
            const data = await action();
            return createSuccessResponse(data);
        };

        // Recursive helper to execute middlewares in order
        const runPipeline = async (index: number): Promise<ApiResponse<any>> => {
            if (index < this.middlewares.length) {
                // Call current middleware, passing the next one in the chain as `next`
                return this.middlewares[index].handle(context, () => runPipeline(index + 1));
            }
            // All middlewares passed, run the actual controller logic
            return coreAction();
        };

        try {
            // Initiate the chain
            const result = await runPipeline(0);
            return result as ApiResponse<T>;
        } catch (error: any) {
            console.error(`[Controller Error]`, error);

            if (error instanceof ZodError || error.name === 'ZodError') {
                // Map Zod errors to a readable string
                const issues = error.issues || (error as any).errors || [];
                const message = issues.map((e: any) => `${e.path?.join('.') || 'input'}: ${e.message}`).join(', ');
                return createErrorResponse(`Validation Error: ${message}`, 400);
            }

            // You can add more specific error captures (e.g. Supabase errors vs JS errors)
            const message = error.message || 'An unexpected internal error occurred';
            const statusCode = error.status || error.statusCode || 500;
            return createErrorResponse(message, statusCode);
        }
    }

    /**
     * Utility to validate inputs cleanly within the controller flow.
     */
    protected validate<T>(schema: ZodSchema<T>, data: unknown): T {
        return schema.parse(data);
    }
}
