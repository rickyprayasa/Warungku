import { IService } from '../interfaces/IService';
import { IProductRepository } from '@/infrastructure/database/repositories/interfaces/IProductRepository';
import { Database } from '@/types/supabase';
import { EventBus } from '@/infrastructure/events/EventBus';

type ProductRow = Database['public']['Tables']['products']['Row'];
type ProductUpdate = Database['public']['Tables']['products']['Update'];

export interface UpdateProductInput {
    id: string;
    data: ProductUpdate;
    storeId: string; // Ensure the user modifying the product owns the store
}

export class UpdateProductService implements IService<UpdateProductInput, ProductRow> {
    constructor(
        private readonly productRepository: IProductRepository,
        private readonly eventBus: EventBus
    ) { }

    async execute(input: UpdateProductInput): Promise<ProductRow> {
        if (!input.id) {
            throw new Error('Product ID is required for update');
        }

        // Attempt to update
        const dataToUpdate = {
            ...input.data,
            updated_at: new Date().toISOString()
        };

        const updatedProduct = await this.productRepository.update(input.id, dataToUpdate);

        await this.eventBus.publish({
            eventName: 'ProductUpdatedEvent',
            timestamp: new Date().toISOString(),
            productId: updatedProduct.id,
            storeId: updatedProduct.store_id,
            name: updatedProduct.name
        });

        // Trigger Low Stock Alert if stock drops below threshold
        if (updatedProduct.total_stock !== null && updatedProduct.total_stock <= (updatedProduct.min_stock_level || 10)) {
            await this.eventBus.publish({
                eventName: 'ProductLowStockEvent',
                timestamp: new Date().toISOString(),
                productId: updatedProduct.id,
                productName: updatedProduct.name,
                storeId: updatedProduct.store_id,
                currentStock: updatedProduct.total_stock,
                minStockLevel: updatedProduct.min_stock_level || 10
            });
        }

        return updatedProduct;
    }
}
