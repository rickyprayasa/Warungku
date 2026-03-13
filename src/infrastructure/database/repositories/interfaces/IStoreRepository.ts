import { Database } from '@/types/supabase';
import { IRepository } from './IRepository';

type StoreRow = Database['public']['Tables']['stores']['Row'];
type StoreInsert = Database['public']['Tables']['stores']['Insert'];
type StoreUpdate = Database['public']['Tables']['stores']['Update'];

export interface IStoreRepository extends IRepository<StoreRow, StoreInsert, StoreUpdate> {
    findBySlug(slug: string): Promise<StoreRow | null>;
    findStoresByUserId(userId: string): Promise<StoreRow[]>;
}
