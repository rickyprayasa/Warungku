import { z } from 'zod';

// Item in a sale
export const SaleItemSchema = z.object({
    product_id: z.string().uuid('Invalid product ID format'),
    quantity: z.number().int('Quantity must be an integer').positive('Quantity must be greater than zero').max(10000, 'Quantity too high'),
    unit_price: z.number().positive('Unit price must be greater than zero').finite(),
    cost: z.number().nonnegative('Cost cannot be negative').finite(),
});

export const CreateSaleSchema = z.object({
    store_id: z.string().uuid('Invalid store ID format'),
    items: z.array(SaleItemSchema).min(1, 'Sale must have at least one item').max(100, 'Too many items in a single sale'),
    payment_method: z.enum(['cash', 'qris', 'debit', 'transfer']),
    customer_id: z.string().uuid('Invalid customer ID format').optional().nullable(),
    notes: z.string().max(500, 'Notes too long').optional().nullable(),

    // Computed totals for verification
    total_amount: z.number().nonnegative().finite(),
    discount: z.number().nonnegative().finite().optional().default(0),
    tax: z.number().nonnegative().finite().optional().default(0),
    cash_tendered: z.number().nonnegative().finite().optional(),
});

// Infer types
export type SaleItemInput = z.infer<typeof SaleItemSchema>;
export type CreateSaleInput = z.infer<typeof CreateSaleSchema>;
