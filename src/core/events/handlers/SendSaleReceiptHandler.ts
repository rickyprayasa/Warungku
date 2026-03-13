import { SaleCompletedEvent } from '../DomainEvents';

/**
 * Handles sending automated receipts (Email/WhatsApp) to customers after a sale.
 */
export class SendSaleReceiptHandler {
    async handle(event: SaleCompletedEvent): Promise<void> {
        console.log(`[Event: SendSaleReceipt] Checking if Receipt should be sent for ${event.saleId}`);

        // In our payload, we don't have customer contact in the base `SaleCompletedEvent` yet.
        // However, if we extend it, we could do:
        // if (event.customerEmail) {
        //   await EmailService.send(event.customerEmail, 'Your Receipt', ...);
        // }

        // For this module, we just simulate the side effect for testing decouplement.
        await new Promise(resolve => setTimeout(resolve, 300)); // Simulate network latency
        console.log(`[Event: SendSaleReceipt] Processed successfully for ${event.saleId}`);
    }
}
