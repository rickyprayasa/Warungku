import { DomainEvent } from '@/core/events/DomainEvents';

type EventHandler<T extends DomainEvent> = (event: T) => Promise<void> | void;

export class EventBus {
    private handlers: Map<string, EventHandler<any>[]> = new Map();

    /**
     * Subscribes a handler to a specific event type.
     * @param eventName The name of the event to subscribe to.
     * @param handler The function to execute when the event is published.
     */
    subscribe<T extends DomainEvent>(eventName: T['eventName'], handler: EventHandler<T>): void {
        const eventHandlers = this.handlers.get(eventName) || [];
        eventHandlers.push(handler);
        this.handlers.set(eventName, eventHandlers);
    }

    /**
     * Publishes an event to all subscribed handlers.
     * Execution is intentionally isolated per handler to avoid one failed handler throwing down the whole process.
     * @param event The event payload.
     */
    async publish(event: DomainEvent): Promise<void> {
        const eventHandlers = this.handlers.get(event.eventName);
        if (!eventHandlers) return;

        // Execute handlers asynchronously so the main thread isn't blocked by side effects
        // However, if strict consistency is needed, we could await them. 
        // For our use cases (analytics, emails), async is preferred.
        const promises = eventHandlers.map(async (handler) => {
            try {
                await handler(event);
            } catch (error) {
                // In a real production app, we would log this to an external service (Sentry, Datadog)
                // or a dead-letter queue table for retry.
                console.error(`[EventBus] Error executing handler for event ${event.eventName}:`, error);
            }
        });

        // Fire and forget, or await? 
        // Awaiting them guarantees they finish before the request closes (good for Serverless envs).
        await Promise.allSettled(promises);
    }
}
