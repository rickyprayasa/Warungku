import { IService } from '../interfaces/IService';
import { IProductRepository } from '@/infrastructure/database/repositories/interfaces/IProductRepository';

export class DeleteProductService implements IService<string, boolean> {
    constructor(private readonly productRepository: IProductRepository) { }

    async execute(productId: string): Promise<boolean> {
        if (!productId) {
            throw new Error('Product ID is required for deletion');
        }

        // Usually we do a soft delete, or constraint checks here
        // e.g., Throw if the product has associated sales. For now, rely on DB constraints or just execute hard delete.
        return await this.productRepository.delete(productId);
    }
}
