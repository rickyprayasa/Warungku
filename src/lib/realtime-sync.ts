import { supabase } from './supabase';
import { useWarungStore } from './store-supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';

let activeChannels: RealtimeChannel[] = [];
let queryClientInstance: QueryClient | null = null;

// Set query client for cache invalidation
export function setRealtimeQueryClient(queryClient: QueryClient) {
  queryClientInstance = queryClient;
}

export function setupRealtimeSync(storeId: string) {
  console.log('[REALTIME] Setting up realtime sync for store:', storeId);

  // Clean up any existing channels first
  cleanupRealtimeSync();

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
        console.log('[REALTIME] Products change detected:', payload.eventType);
        
        // Invalidate React Query cache
        if (queryClientInstance) {
          queryClientInstance.invalidateQueries({ queryKey: ['products', storeId] });
        }
        
        // Also update Zustand store (for backward compatibility)
        useWarungStore.getState().fetchProducts();
      }
    )
    .subscribe((status) => {
      console.log('[REALTIME] Products channel status:', status);
    });

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
        console.log('[REALTIME] Sales change detected:', payload.eventType);
        
        if (queryClientInstance) {
          queryClientInstance.invalidateQueries({ queryKey: ['sales', storeId] });
          // Sales changes might affect product stock
          queryClientInstance.invalidateQueries({ queryKey: ['products', storeId] });
        }
        
        useWarungStore.getState().fetchSales();
      }
    )
    .subscribe((status) => {
      console.log('[REALTIME] Sales channel status:', status);
    });

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
        console.log('[REALTIME] Purchases change detected:', payload.eventType);
        
        if (queryClientInstance) {
          queryClientInstance.invalidateQueries({ queryKey: ['purchases', storeId] });
          // Purchases affect product stock
          queryClientInstance.invalidateQueries({ queryKey: ['products', storeId] });
        }
        
        useWarungStore.getState().fetchPurchases();
      }
    )
    .subscribe((status) => {
      console.log('[REALTIME] Purchases channel status:', status);
    });

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
      (payload) => {
        console.log('[REALTIME] Suppliers change detected:', payload.eventType);
        useWarungStore.getState().fetchSuppliers();
      }
    )
    .subscribe((status) => {
      console.log('[REALTIME] Suppliers channel status:', status);
    });

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
      (payload) => {
        console.log('[REALTIME] Snack requests change detected:', payload.eventType);
        useWarungStore.getState().fetchJajananRequests();
      }
    )
    .subscribe((status) => {
      console.log('[REALTIME] Snack requests channel status:', status);
    });

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
      (payload) => {
        console.log('[REALTIME] Reconciliations change detected:', payload.eventType);
        useWarungStore.getState().fetchReconciliations();
      }
    )
    .subscribe((status) => {
      console.log('[REALTIME] Reconciliations channel status:', status);
    });

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
  console.log('[REALTIME] Cleaning up realtime subscriptions');
  
  activeChannels.forEach((channel) => {
    supabase.removeChannel(channel);
  });
  
  activeChannels = [];
}
