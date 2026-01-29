import { toast } from 'sonner';

export type SyncOperationType =
    | 'ADD_SALE'
    | 'ADD_PRODUCT'
    | 'UPDATE_PRODUCT'
    | 'ADD_PURCHASE'
    | 'UPDATE_PURCHASE'
    | 'ADD_SUPPLIER'
    | 'ADD_REQUEST';

export interface SyncItem {
    id: string;
    type: SyncOperationType;
    payload: any;
    timestamp: number;
    retryCount: number;
    status: 'PENDING' | 'PROCESSING' | 'FAILED';
    error?: string;
}

const STORAGE_KEY = 'warungku_offline_queue';

class OfflineSyncService {
    private queue: SyncItem[] = [];
    private isProcessing = false;
    private listeners: ((queue: SyncItem[]) => void)[] = [];

    constructor() {
        this.loadQueue();
        // Listen for online status
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => {
                console.log('[OfflineSync] Online detected, processing queue...');
                this.processQueue();
            });
        }
    }

    private loadQueue() {
        if (typeof window === 'undefined') return;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                this.queue = JSON.parse(stored);
            }
        } catch (e) {
            console.error('[OfflineSync] Failed to load queue:', e);
        }
    }

    private saveQueue() {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue));
            this.notifyListeners();
        } catch (e) {
            console.error('[OfflineSync] Failed to save queue:', e);
        }
    }

    subscribe(listener: (queue: SyncItem[]) => void) {
        this.listeners.push(listener);
        listener(this.queue);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    private notifyListeners() {
        this.listeners.forEach(l => l(this.queue));
    }

    addToQueue(type: SyncOperationType, payload: any) {
        const item: SyncItem = {
            id: crypto.randomUUID(),
            type,
            payload,
            timestamp: Date.now(),
            retryCount: 0,
            status: 'PENDING'
        };

        this.queue.push(item);
        this.saveQueue();

        toast.info('Disimpan offline. Akan disinkronkan otomatis saat online.', {
            id: 'offline-save-' + item.id,
            duration: 3000
        });

        // Try to process immediately if online
        if (navigator.onLine) {
            this.processQueue();
        }
    }

    removeFromQueue(id: string) {
        this.queue = this.queue.filter(item => item.id !== id);
        this.saveQueue();
    }

    getQueue() {
        return this.queue;
    }

    getPendingCount() {
        return this.queue.length;
    }

    async processQueue(processItemCallback?: (item: SyncItem) => Promise<void>) {
        if (this.isProcessing || this.queue.length === 0 || !navigator.onLine) return;

        this.isProcessing = true;
        console.log(`[OfflineSync] Processing ${this.queue.length} items...`);

        const currentQueue = [...this.queue]; // Copy to avoid mutation issues during iteration

        for (const item of currentQueue) {
            if (item.status === 'PROCESSING') continue;

            try {
                // Update status to processing
                item.status = 'PROCESSING';
                this.saveQueue();

                if (processItemCallback) {
                    await processItemCallback(item);
                } else {
                    // If no callback provided (e.g. called from event listener), 
                    // we need a way to get the processor. 
                    // For now, we'll rely on the store calling this with a callback.
                    // Or we can emit an event that the store listens to.
                    console.warn('[OfflineSync] No processor callback provided');
                    item.status = 'PENDING'; // Revert
                    continue;
                }

                // Success
                this.removeFromQueue(item.id);
                toast.success(`Sinkronisasi berhasil: ${this.getLabel(item.type)}`);

            } catch (error: any) {
                console.error(`[OfflineSync] Failed to process item ${item.id}:`, error);

                item.retryCount++;
                item.status = 'FAILED';
                item.error = error.message || 'Unknown error';

                // If retried too many times, maybe move to "Dead Letter Queue" or keep as failed
                if (item.retryCount > 5) {
                    // Keep it but mark as failed permanently until manual retry?
                    // For now just keep retrying on next online event
                }

                this.saveQueue();
            }
        }

        this.isProcessing = false;

        // If there are still items (failed ones), try again later?
        if (this.queue.length > 0) {
            // Maybe schedule another run?
        }
    }

    private getLabel(type: SyncOperationType): string {
        switch (type) {
            case 'ADD_SALE': return 'Penjualan';
            case 'ADD_PRODUCT': return 'Produk Baru';
            case 'UPDATE_PRODUCT': return 'Update Produk';
            case 'ADD_PURCHASE': return 'Pembelian';
            default: return 'Data';
        }
    }
}

export const offlineSync = new OfflineSyncService();
