import { SupabaseClient } from '@supabase/supabase-js';
import { IStoreRepository } from './interfaces/IStoreRepository';
import { QueryFilter, SortOptions, PaginationOptions } from './interfaces/IRepository';
import { Database } from '@/types/supabase';

type StoreRow = Database['public']['Tables']['stores']['Row'];
type StoreInsert = Database['public']['Tables']['stores']['Insert'];
type StoreUpdate = Database['public']['Tables']['stores']['Update'];

export class SupabaseStoreRepository implements IStoreRepository {
    constructor(private readonly supabase: SupabaseClient<Database>) { }

    private applyFilters(query: any, filters?: QueryFilter[]) {
        if (!filters) return query;
        let filteredQuery = query;
        for (const filter of filters) {
            if (filter.operator === 'eq') filteredQuery = filteredQuery.eq(filter.field, filter.value);
            else if (filter.operator === 'neq') filteredQuery = filteredQuery.neq(filter.field, filter.value);
            else if (filter.operator === 'gt') filteredQuery = filteredQuery.gt(filter.field, filter.value);
            else if (filter.operator === 'lt') filteredQuery = filteredQuery.lt(filter.field, filter.value);
            else if (filter.operator === 'gte') filteredQuery = filteredQuery.gte(filter.field, filter.value);
            else if (filter.operator === 'lte') filteredQuery = filteredQuery.lte(filter.field, filter.value);
            else if (filter.operator === 'like') filteredQuery = filteredQuery.like(filter.field, filter.value);
            else if (filter.operator === 'ilike') filteredQuery = filteredQuery.ilike(filter.field, filter.value);
            else if (filter.operator === 'in') filteredQuery = filteredQuery.in(filter.field, filter.value);
        }
        return filteredQuery;
    }

    async findById(id: string): Promise<StoreRow | null> {
        const { data, error } = await this.supabase
            .from('stores')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async findAll(filters?: QueryFilter[], sort?: SortOptions, pagination?: PaginationOptions): Promise<StoreRow[]> {
        let query = this.supabase.from('stores').select('*');
        query = this.applyFilters(query, filters);

        if (sort) {
            query = query.order(sort.field, { ascending: sort.order === 'asc' });
        }

        if (pagination) {
            const from = (pagination.page - 1) * pagination.limit;
            const to = from + pagination.limit - 1;
            query = query.range(from, to);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    }

    async create(data: StoreInsert): Promise<StoreRow> {
        const { data: created, error } = await this.supabase
            .from('stores')
            .insert(data)
            .select()
            .single();
        if (error) throw error;
        return created;
    }

    async update(id: string, data: StoreUpdate): Promise<StoreRow> {
        const { data: updated, error } = await this.supabase
            .from('stores')
            .update(data)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return updated;
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.supabase
            .from('stores')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    }

    async findBySlug(slug: string): Promise<StoreRow | null> {
        const { data, error } = await this.supabase
            .from('stores')
            .select('*')
            .eq('slug', slug)
            .single();
        if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "No rows returned"
        return data;
    }

    async findStoresByUserId(userId: string): Promise<StoreRow[]> {
        const { data, error } = await this.supabase
            .from('store_members')
            .select('store_id, stores(*)')
            .eq('user_id', userId);

        if (error) throw error;
        return data?.map(row => row.stores).filter(Boolean) as unknown as StoreRow[] || [];
    }
}
