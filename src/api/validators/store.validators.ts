import { z } from 'zod';

export const CreateStoreSchema = z.object({
    name: z.string().min(3, 'Store name must be at least 3 characters').max(100, 'Store name is too long'),
    slug: z.string()
        .min(3, 'Slug must be at least 3 characters')
        .max(50, 'Slug is too long')
        .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
    address: z.string().max(500, 'Address is too long').optional().nullable(),
    phone: z.string()
        .max(20, 'Phone number is too long')
        .regex(/^[\d\+\-\s]+$/, 'Phone number contains invalid characters')
        .optional().nullable(),
    owner_id: z.string().uuid('Invalid owner ID format'),
});

export const UpdateStoreSchema = CreateStoreSchema.partial().extend({
    // Protect owner_id from being changed via standard updates
    owner_id: z.undefined(),
    // Additional updateable settings
    settings: z.record(z.string(), z.any()).optional(),
    logo_url: z.string().url('Invalid logo URL format').max(1000).optional().nullable(),
});

// Infer types
export type CreateStoreInput = z.infer<typeof CreateStoreSchema>;
export type UpdateStoreInput = z.infer<typeof UpdateStoreSchema>;
