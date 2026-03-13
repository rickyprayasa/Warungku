import { z } from 'zod';

export * from './product.validators';
export * from './sale.validators';
export * from './store.validators';
export * from './user.validators';

export class BadRequestError extends Error {
    public errors: any;

    constructor(message: string, details?: any) {
        super(message);
        this.name = 'BadRequestError';
        this.errors = details?.errors;
    }
}

/**
 * Validates a request object using a Zod schema.
 * Note: This is designed for standard Web Request objects (used in Edge Functions or new web frameworks).
 * 
 * @param schema The Zod schema to validate against
 * @param req The Request object
 * @returns The parsed and validated body data
 * @throws BadRequestError if validation fails
 */
export async function validateRequest<T>(
    schema: z.ZodSchema<T>,
    req: Request
): Promise<T> {
    let body: unknown;

    try {
        body = await req.json();
    } catch (error) {
        throw new BadRequestError('Invalid JSON body');
    }

    try {
        return schema.parse(body);
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new BadRequestError('Validation failed', {
                errors: error.format(),
            });
        }
        throw error; // Re-throw if it's not a ZodError
    }
}

/**
 * Validates raw data directly using a Zod schema.
 * Useful for validating data inside existing Supabase Edge Functions or client-side.
 * 
 * @param schema The Zod schema to validate against
 * @param data The data object to validate
 * @returns The parsed and validated data
 * @throws BadRequestError if validation fails
 */
export function validateData<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): T {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new BadRequestError('Validation failed', {
                errors: error.format(),
            });
        }
        throw error;
    }
}
