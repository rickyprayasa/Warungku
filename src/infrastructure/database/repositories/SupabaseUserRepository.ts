import { SupabaseClient, User } from '@supabase/supabase-js';
import { IUserRepository } from './interfaces/IUserRepository';
import { QueryFilter, SortOptions, PaginationOptions } from './interfaces/IRepository';

export class SupabaseUserRepository implements IUserRepository {
    constructor(private readonly supabase: SupabaseClient) { }

    async findById(id: string): Promise<User | null> {
        const { data: { user }, error } = await this.supabase.auth.admin.getUserById(id);
        if (error || !user) throw error || new Error('User not found');
        return user;
    }

    async findAll(filters?: QueryFilter[], sort?: SortOptions, pagination?: PaginationOptions): Promise<User[]> {
        const limit = pagination?.limit || 50;
        const page = pagination?.page || 1;
        const { data: { users }, error } = await this.supabase.auth.admin.listUsers({
            page,
            perPage: limit
        });
        if (error) throw error;

        // Note: Admin API doesn't support generic filters/sorts cleanly without fetching all users.
        // Real implementation evaluating complex filters would usually need a custom Supabase RPC or a synchronized public.users table.
        return users;
    }

    async create(data: Partial<User>): Promise<User> {
        if (!data.email || !data.password) throw new Error('Email and password required for creating user');
        const { data: { user }, error } = await this.supabase.auth.admin.createUser({
            email: data.email,
            password: data.password as string,
            email_confirm: true,
            user_metadata: data.user_metadata
        });
        if (error || !user) throw error || new Error('Failed to create user');
        return user;
    }

    async update(id: string, data: Partial<User>): Promise<User> {
        const { data: { user }, error } = await this.supabase.auth.admin.updateUserById(id, {
            email: data.email,
            user_metadata: data.user_metadata
        });
        if (error || !user) throw error || new Error('Failed to update user');
        return user;
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.supabase.auth.admin.deleteUser(id);
        if (error) throw error;
        return true;
    }

    async findByEmail(email: string): Promise<User | null> {
        // Admin list API is the most reliable way to find by email without a secondary table
        const { data: { users }, error } = await this.supabase.auth.admin.listUsers();
        if (error) throw error;
        return users.find(u => u.email === email) || null;
    }
}
