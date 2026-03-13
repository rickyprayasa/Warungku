import { SaleItem } from '@shared/types';

export interface BaseEvent {
    eventName: string;
    timestamp: string;
}

export interface SaleCompletedEvent extends BaseEvent {
    eventName: 'SaleCompletedEvent';
    saleId: string;
    storeId: string;
    items: SaleItem[];
    total: number;
}

export interface ProductLowStockEvent extends BaseEvent {
    eventName: 'ProductLowStockEvent';
    productId: string;
    productName: string;
    storeId: string;
    currentStock: number;
    minStockLevel: number;
}

export interface ProductCreatedEvent extends BaseEvent {
    eventName: 'ProductCreatedEvent';
    productId: string;
    storeId: string;
    name: string;
}

export interface ProductUpdatedEvent extends BaseEvent {
    eventName: 'ProductUpdatedEvent';
    productId: string;
    storeId: string;
    name: string;
}

// Union type of all possible domain events
export type DomainEvent =
    | SaleCompletedEvent
    | ProductLowStockEvent
    | ProductCreatedEvent
    | ProductUpdatedEvent;
