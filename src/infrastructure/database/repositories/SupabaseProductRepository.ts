import { SupabaseClient } from '@supabase/supabase-js';
import { IProductRepository } from './interfaces/IProductRepository';
import { QueryFilter, SortOptions, PaginationOptions } from './interfaces/IRepository';
import { Database } from '@/types/supabase';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

export class SupabaseProductRepository implements IProductRepository {
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

    async findById(id: string): Promise<ProductRow | null> {
        const { data, error } = await this.supabase
            .from('products')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async findAll(filters?: QueryFilter[], sort?: SortOptions, pagination?: PaginationOptions): Promise<ProductRow[]> {
        let query = this.supabase.from('products').select('*');
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

    async create(data: ProductInsert): Promise<ProductRow> {
        const { data: created, error } = await this.supabase
            .from('products')
            .insert(data)
            .select()
            .single();
        if (error) throw error;
        return created;
    }

    async update(id: string, data: ProductUpdate): Promise<ProductRow> {
        const { data: updated, error } = await this.supabase
            .from('products')
            .update(data)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return updated;
    }

    async delete(id: string): Promise<boolean> {
        // Soft delete is usually preferred for products, but interface expects standard delete.
        const { error } = await this.supabase
            .from('products')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    }

    async findByStoreId(storeId: string, pagination?: PaginationOptions): Promise<ProductRow[]> {
        return this.findAll([{ field: 'store_id', operator: 'eq', value: storeId }], undefined, pagination);
    }

    async findInStockByStoreId(storeId: string): Promise<ProductRow[]> {
        return this.findAll([
            { field: 'store_id', operator: 'eq', value: storeId },
            { field: 'total_stock', operator: 'gt', value: 0 },
            { field: 'is_active', operator: 'eq', value: true }
        ]);
    }

    async findBestSellersByStoreId(storeId: string): Promise<ProductRow[]> {
        return this.findAll([
            { field: 'store_id', operator: 'eq', value: storeId },
            { field: 'is_best_seller', operator: 'eq', value: true },
            { field: 'is_active', operator: 'eq', value: true }
        ]);
    }

    async searchByName(storeId: string, nameQuery: string): Promise<ProductRow[]> {
        return this.findAll([
            { field: 'store_id', operator: 'eq', value: storeId },
            { field: 'name', operator: 'ilike', value: `%${nameQuery}%` }
        ]);
    }
}
