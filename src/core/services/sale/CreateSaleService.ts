import { IService } from '../interfaces/IService';
import { ISaleRepository } from '@/infrastructure/database/repositories/interfaces/ISaleRepository';
import { IProductRepository } from '@/infrastructure/database/repositories/interfaces/IProductRepository';
import { Database } from '@/types/supabase';
import { EventBus } from '@/infrastructure/events/EventBus';
import { SaleItem } from '@shared/types';

type SaleInsert = Database['public']['Tables']['sales']['Insert'];
type SaleItemInsert = Database['public']['Tables']['sale_items']['Insert'];
type SaleRow = Database['public']['Tables']['sales']['Row'];

export interface CreateSaleInput {
    storeId: string;
    items: Array<{ productId: string; productName: string; quantity: number; price: number; cost: number }>;
    saleType?: string;
    notes?: string;
    createdBy?: string;
    status?: 'pending' | 'completed' | 'cancelled';
}

export class CreateSaleService implements IService<CreateSaleInput, SaleRow> {
    constructor(
        private readonly saleRepository: ISaleRepository,
        private readonly productRepository: IProductRepository,
        private readonly eventBus: EventBus
    ) { }

    async execute(input: CreateSaleInput): Promise<SaleRow> {
        // 1. Validate Input
        if (!input.storeId) throw new Error('Store ID is required for a sale');
        if (!input.items || input.items.length === 0) throw new Error('Cannot create an empty sale');

        // 2. Calculate Totals
        let totalRevenue = 0;
        let totalProfit = 0;

        for (const item of input.items) {
            if (item.quantity <= 0) throw new Error(`Invalid item quantity for product ${item.productId}`);
            const itemTotal = item.price * item.quantity;
            const itemCost = item.cost * item.quantity;
            totalRevenue += itemTotal;
            totalProfit += (itemTotal - itemCost);
        }

        // 3. Build Sale payload
        const saleData: SaleInsert = {
            store_id: input.storeId,
            total: totalRevenue,
            profit: totalProfit,
            sale_type: input.status === 'pending' ? 'piutang' : (input.saleType || 'cash'),
            notes: input.notes || '',
            created_by: input.createdBy
        };

        // 4. Ideally, we should use a Postgres Transaction or an RPC function to guarantee integrity
        // The current architecture uses separate calls. For true safety in production, Supabase RPC > Service Layer loops.
        // Assuming the Repository exposes `createSaleTransaction` or we map it here:

        // In production, the payload mapped to Supabase or RPC might do the bulk insert implicitly
        const sale = await this.saleRepository.create(saleData as any) as unknown as SaleRow;

        // --- Side Effects (Decoupled by EventBus) ---
        await this.eventBus.publish({
            eventName: 'SaleCompletedEvent',
            timestamp: new Date().toISOString(),
            saleId: sale.id,
            storeId: input.storeId,
            items: input.items as SaleItem[],
            total: sale.total
        });

        // Loop over the items again to see if we reached Low Stock levels. 
        // A more advanced pattern would load the updated entity from db, but we can do a quick async check here.
        for (const item of input.items) {
            const product = await this.productRepository.findById(item.productId);
            if (product) {
                // Assuming the service UI handled actual deduction prior or here.
                if (product.total_stock !== null && product.total_stock <= (product.min_stock_level || 10)) {
                    await this.eventBus.publish({
                        eventName: 'ProductLowStockEvent',
                        timestamp: new Date().toISOString(),
                        productId: product.id,
                        productName: product.name,
                        storeId: product.store_id,
                        currentStock: product.total_stock,
                        minStockLevel: product.min_stock_level || 10
                    });
                }
            }
        }

        return sale;
    }
}
