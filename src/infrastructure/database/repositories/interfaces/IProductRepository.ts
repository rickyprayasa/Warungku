import { Database } from '@/types/supabase';
import { IRepository, PaginationOptions } from './IRepository';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

export interface IProductRepository extends IRepository<ProductRow, ProductInsert, ProductUpdate> {
    findByStoreId(storeId: string, pagination?: PaginationOptions): Promise<ProductRow[]>;
    findInStockByStoreId(storeId: string): Promise<ProductRow[]>;
    findBestSellersByStoreId(storeId: string): Promise<ProductRow[]>;
    searchByName(storeId: string, nameQuery: string): Promise<ProductRow[]>;
}
