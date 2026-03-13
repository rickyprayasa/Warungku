import { ProductLowStockEvent } from '../DomainEvents';
import { supabase } from '@/lib/supabase';

/**
 * Handles alerting when a product's stock falls below a minimum threshold.
 * This can automatically draft a JajananRequest logic or trigger a notification email.
 */
export class LowStockAlertHandler {
    async handle(event: ProductLowStockEvent): Promise<void> {
        console.warn(`[Event: LowStockAlert] Product ${event.productName} is below stock threshold! Current: ${event.currentStock}, Min: ${event.minStockLevel}`);

        // Simulate auto-drafting a restock request for admins to approve if stock is truly 0
        if (event.currentStock <= 0) {
            try {
                // Optionally insert a record to restock requests
                const { error } = await supabase.from('jajanan_requests').insert({
                    store_id: event.storeId,
                    requester_name: 'System Auto-Restock',
                    snack_name: event.productName,
                    quantity: event.minStockLevel > 0 ? event.minStockLevel * 2 : 10,
                    notes: `Auto-generated restock request for ${event.productName}. Items remaining: ${event.currentStock}`,
                    status: 'pending'
                });

                if (error) {
                    // Not a strict failure, just a failed alert
                    console.error('[Event: LowStockAlert] Failed to create auto-restock request.', error.message);
                } else {
                    console.log(`[Event: LowStockAlert] Successfully drafted restock for ${event.productName}`);
                }
            } catch (err) {
                console.error('[Event: LowStockAlert] Handler threw an error', err);
            }
        }
    }
}
