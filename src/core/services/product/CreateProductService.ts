import { IService } from '../interfaces/IService';
import { IProductRepository } from '@/infrastructure/database/repositories/interfaces/IProductRepository';
import { Database } from '@/types/supabase';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];

export class CreateProductService implements IService<ProductInsert, ProductRow> {
    constructor(private readonly productRepository: IProductRepository) { }

    async execute(input: ProductInsert): Promise<ProductRow> {
        // Validate inputs
        if (!input.name || input.name.trim() === '') {
            throw new Error('Product name is required');
        }
        if (!input.store_id) {
            throw new Error('Store ID is required');
        }

        // Ensure initial values
        const dataToInsert = {
            ...input,
            price: input.price ?? 0,
            cost: input.cost ?? 0,
            total_stock: input.total_stock ?? 0,
            is_active: input.is_active ?? true,
            created_at: new Date().toISOString()
        };

        return await this.productRepository.create(dataToInsert);
    }
}
