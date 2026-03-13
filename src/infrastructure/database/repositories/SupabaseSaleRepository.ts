import { SupabaseClient } from '@supabase/supabase-js';
import { ISaleRepository, SalesSummary } from './interfaces/ISaleRepository';
import { QueryFilter, SortOptions, PaginationOptions } from './interfaces/IRepository';
import { Database } from '@/types/supabase';

type SaleRow = Database['public']['Tables']['sales']['Row'];
type SaleInsert = Database['public']['Tables']['sales']['Insert'];
type SaleUpdate = Database['public']['Tables']['sales']['Update'];

export class SupabaseSaleRepository implements ISaleRepository {
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

    async findById(id: string): Promise<SaleRow | null> {
        const { data, error } = await this.supabase
            .from('sales')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async findAll(filters?: QueryFilter[], sort?: SortOptions, pagination?: PaginationOptions): Promise<SaleRow[]> {
        let query = this.supabase.from('sales').select('*');
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

    async create(data: SaleInsert): Promise<SaleRow> {
        const { data: created, error } = await this.supabase
            .from('sales')
            .insert(data)
            .select()
            .single();
        if (error) throw error;
        return created;
    }

    async update(id: string, data: SaleUpdate): Promise<SaleRow> {
        const { data: updated, error } = await this.supabase
            .from('sales')
            .update(data)
            .eq('id', id)
            .select()
            .single();
        if (error) throw error;
        return updated;
    }

    async delete(id: string): Promise<boolean> {
        const { error } = await this.supabase
            .from('sales')
            .delete()
            .eq('id', id);
        if (error) throw error;
        return true;
    }

    async findByStoreId(storeId: string, pagination?: PaginationOptions): Promise<SaleRow[]> {
        return this.findAll([{ field: 'store_id', operator: 'eq', value: storeId }], undefined, pagination);
    }

    async findRecentByStoreId(storeId: string, limit: number): Promise<SaleRow[]> {
        return this.findAll(
            [{ field: 'store_id', operator: 'eq', value: storeId }],
            { field: 'created_at', order: 'desc' },
            { page: 1, limit }
        );
    }

    async getSummaryByDateRange(storeId: string, startDate: Date, endDate: Date): Promise<SalesSummary> {
        // Real implementation should probably use an RPC for aggregate math,
        // but doing it in code here for abstraction demonstration.
        const sales = await this.findAll([
            { field: 'store_id', operator: 'eq', value: storeId },
            { field: 'created_at', operator: 'gte', value: startDate.toISOString() },
            { field: 'created_at', operator: 'lte', value: endDate.toISOString() }
        ]);

        const totalRevenue = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
        const totalProfit = sales.reduce((sum, sale) => sum + (sale.profit || 0), 0);

        return {
            totalRevenue,
            totalProfit,
            transactionCount: sales.length
        };
    }
}
