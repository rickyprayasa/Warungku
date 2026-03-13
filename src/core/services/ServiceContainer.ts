// src/core/services/ServiceContainer.ts
import { RepositoryContainer } from '@/infrastructure/database/repositories/RepositoryContainer';
import { CreateProductService } from './product/CreateProductService';
import { UpdateProductService } from './product/UpdateProductService';
import { DeleteProductService } from './product/DeleteProductService';
import { CreateSaleService } from './sale/CreateSaleService';
import { CreateUserService } from './user/CreateUserService';
import { EventBus } from '@/infrastructure/events/EventBus';
import { UpdateAnalyticsCacheHandler } from '../events/handlers/UpdateAnalyticsCacheHandler';
import { SendSaleReceiptHandler } from '../events/handlers/SendSaleReceiptHandler';
import { LowStockAlertHandler } from '../events/handlers/LowStockAlertHandler';

export class ServiceContainer {
    private static createProductService: CreateProductService;
    private static updateProductService: UpdateProductService;
    private static deleteProductService: DeleteProductService;
    private static createSaleService: CreateSaleService;
    private static createUserService: CreateUserService;
    private static eventBus: EventBus;

    public static getEventBus(): EventBus {
        if (!this.eventBus) {
            this.eventBus = new EventBus();

            // Register handlers
            const analyticsHandler = new UpdateAnalyticsCacheHandler();
            const receiptHandler = new SendSaleReceiptHandler();
            const lowStockHandler = new LowStockAlertHandler();

            this.eventBus.subscribe('SaleCompletedEvent', analyticsHandler.handle.bind(analyticsHandler));
            this.eventBus.subscribe('SaleCompletedEvent', receiptHandler.handle.bind(receiptHandler));
            this.eventBus.subscribe('ProductLowStockEvent', lowStockHandler.handle.bind(lowStockHandler));
        }
        return this.eventBus;
    }

    public static getCreateProductService(): CreateProductService {
        if (!this.createProductService) {
            this.createProductService = new CreateProductService(RepositoryContainer.getProductRepository());
        }
        return this.createProductService;
    }

    public static getUpdateProductService(): UpdateProductService {
        if (!this.updateProductService) {
            this.updateProductService = new UpdateProductService(
                RepositoryContainer.getProductRepository(),
                this.getEventBus() // Inject EventBus
            );
        }
        return this.updateProductService;
    }

    public static getDeleteProductService(): DeleteProductService {
        if (!this.deleteProductService) {
            this.deleteProductService = new DeleteProductService(RepositoryContainer.getProductRepository());
        }
        return this.deleteProductService;
    }

    public static getCreateSaleService(): CreateSaleService {
        if (!this.createSaleService) {
            this.createSaleService = new CreateSaleService(
                RepositoryContainer.getSaleRepository(),
                RepositoryContainer.getProductRepository(),
                this.getEventBus() // Inject EventBus
            );
        }
        return this.createSaleService;
    }

    public static getCreateUserService(): CreateUserService {
        if (!this.createUserService) {
            this.createUserService = new CreateUserService(RepositoryContainer.getUserRepository());
        }
        return this.createUserService;
    }
}
