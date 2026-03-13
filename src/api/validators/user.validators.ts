import { z } from 'zod';
import { UserRole, isValidRole } from '../../core/domain/entities/Role';

export const CreateUserSchema = z.object({
    email: z.string().email('Invalid email format').max(255),
    password: z.string().min(6, 'Password must be at least 6 characters').max(100),
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    role: z.enum([UserRole.SUPER_ADMIN, UserRole.STORE_OWNER, UserRole.STORE_MEMBER, UserRole.CASHIER])
        .default(UserRole.STORE_OWNER),
});

export const UpdateUserRoleSchema = z.object({
    target_user_id: z.string().uuid('Invalid user ID format'),
    new_role: z.string().refine((val) => isValidRole(val), {
        message: 'Invalid role provided',
    }),
});

// Infer types
export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof UpdateUserRoleSchema>;
