import { z } from 'zod';

export const CreateProductSchema = z.object({
    name: z.string().min(1, 'Product name is required').max(255, 'Product name is too long'),
    price: z.number().positive('Price must be greater than zero').finite('Price must be finite'),
    cost: z.number().nonnegative('Cost cannot be negative').finite('Cost must be finite'),
    total_stock: z.number().int('Stock must be an integer').nonnegative('Stock cannot be negative'),
    min_stock_level: z.number().int('Min stock must be an integer').nonnegative('Min stock cannot be negative'),
    category: z.string().max(100, 'Category name is too long').optional().nullable(),
    store_id: z.string().uuid('Invalid store ID format'),
    // Additional fields common to products
    barcode: z.string().max(100).optional().nullable(),
    description: z.string().max(1000).optional().nullable(),
    image_url: z.string().url().max(1000).optional().nullable(),
});

export const UpdateProductSchema = CreateProductSchema.partial().extend({
    // Ensure store_id remains required or omitted, but not changed to null
    store_id: z.string().uuid('Invalid store ID format').optional(),
});

export const BulkCreateProductsSchema = z.object({
    products: z.array(CreateProductSchema).min(1, 'At least one product is required').max(500, 'Cannot bulk create more than 500 products at once'),
});

// Infer types
export type CreateProductInput = z.infer<typeof CreateProductSchema>;
export type UpdateProductInput = z.infer<typeof UpdateProductSchema>;
export type BulkCreateProductsInput = z.infer<typeof BulkCreateProductsSchema>;
