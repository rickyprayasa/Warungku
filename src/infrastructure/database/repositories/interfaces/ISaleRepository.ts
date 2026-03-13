import { Database } from '@/types/supabase';
import { IRepository, PaginationOptions } from './IRepository';

type SaleRow = Database['public']['Tables']['sales']['Row'];
type SaleInsert = Database['public']['Tables']['sales']['Insert'];
type SaleUpdate = Database['public']['Tables']['sales']['Update'];

// Define aggregate return type for reports
export interface SalesSummary {
    totalRevenue: number;
    totalProfit: number;
    transactionCount: number;
}

export interface ISaleRepository extends IRepository<SaleRow, SaleInsert, SaleUpdate> {
    findByStoreId(storeId: string, pagination?: PaginationOptions): Promise<SaleRow[]>;
    getSummaryByDateRange(storeId: string, startDate: Date, endDate: Date): Promise<SalesSummary>;
    findRecentByStoreId(storeId: string, limit: number): Promise<SaleRow[]>;
}
