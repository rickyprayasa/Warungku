import { supabase } from './supabase';
import { useWarungStore } from './store-supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';

let activeChannels: RealtimeChannel[] = [];
let queryClientInstance: QueryClient | null = null;
let currentStoreId: string | null = null;

// Debounce helper to prevent rapid re-fetches
const debounceMap = new Map<string, NodeJS.Timeout>();
function debounce(key: string, fn: () => void, delay: number = 500) {
  const existing = debounceMap.get(key);
  if (existing) clearTimeout(existing);
  debounceMap.set(key, setTimeout(() => {
    debounceMap.delete(key);
    fn();
  }, delay));
}

// Set query client for cache invalidation
export function setRealtimeQueryClient(queryClient: QueryClient) {
  queryClientInstance = queryClient;
}

export function setupRealtimeSync(storeId: string) {
  // Prevent duplicate setup for same store
  if (currentStoreId === storeId && activeChannels.length > 0) {
    return cleanupRealtimeSync;
  }

  // Clean up any existing channels first
  cleanupRealtimeSync();
  currentStoreId = storeId;

  // Subscribe to products changes
  const productsChannel = supabase
    .channel(`products-changes-${storeId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'products',
        filter: `store_id=eq.${storeId}`,
      },
      (payload) => {
        // Debounce to prevent multiple rapid fetches
        debounce('products', () => {
          // Only use React Query - remove Zustand double-fetch
          if (queryClientInstance) {
            queryClientInstance.invalidateQueries({ queryKey: ['products', storeId] });
          } else {
            // Fallback to Zustand only if React Query not available
            useWarungStore.getState().fetchProducts();
          }
        });
      }
    )
    .subscribe();

  // Subscribe to sales changes
  const salesChannel = supabase
    .channel(`sales-changes-${storeId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sales',
        filter: `store_id=eq.${storeId}`,
      },
      (payload) => {
        debounce('sales', () => {
          if (queryClientInstance) {
            queryClientInstance.invalidateQueries({ queryKey: ['sales', storeId] });
            queryClientInstance.invalidateQueries({ queryKey: ['products', storeId] });
          } else {
            useWarungStore.getState().fetchSales();
            useWarungStore.getState().fetchProducts();
          }
        });
      }
    )
    .subscribe();

  // Subscribe to purchases changes
  const purchasesChannel = supabase
    .channel(`purchases-changes-${storeId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'purchases',
        filter: `store_id=eq.${storeId}`,
      },
      (payload) => {
        debounce('purchases', () => {
          if (queryClientInstance) {
            queryClientInstance.invalidateQueries({ queryKey: ['purchases', storeId] });
            queryClientInstance.invalidateQueries({ queryKey: ['products', storeId] });
          } else {
            useWarungStore.getState().fetchPurchases();
            useWarungStore.getState().fetchProducts();
          }
        });
      }
    )
    .subscribe();

  // Subscribe to suppliers changes
  const suppliersChannel = supabase
    .channel(`suppliers-changes-${storeId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'suppliers',
        filter: `store_id=eq.${storeId}`,
      },
      () => {
        debounce('suppliers', () => {
          useWarungStore.getState().fetchSuppliers();
        });
      }
    )
    .subscribe();

  // Subscribe to snack requests changes
  const requestsChannel = supabase
    .channel(`snack-requests-changes-${storeId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'snack_requests',
        filter: `store_id=eq.${storeId}`,
      },
      () => {
        debounce('requests', () => {
          useWarungStore.getState().fetchJajananRequests();
        });
      }
    )
    .subscribe();

  // Subscribe to reconciliations changes
  const reconciliationsChannel = supabase
    .channel(`reconciliations-changes-${storeId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'reconciliations',
        filter: `store_id=eq.${storeId}`,
      },
      () => {
        debounce('reconciliations', () => {
          useWarungStore.getState().fetchReconciliations();
        });
      }
    )
    .subscribe();

  // Store active channels for cleanup
  activeChannels = [
    productsChannel,
    salesChannel,
    purchasesChannel,
    suppliersChannel,
    requestsChannel,
    reconciliationsChannel,
  ];

  // Return cleanup function
  return cleanupRealtimeSync;
}

export function cleanupRealtimeSync() {
  // Clear all debounce timers
  debounceMap.forEach((timeout) => clearTimeout(timeout));
  debounceMap.clear();
  
  activeChannels.forEach((channel) => {
    supabase.removeChannel(channel);
  });
  
  activeChannels = [];
  currentStoreId = null;
}
