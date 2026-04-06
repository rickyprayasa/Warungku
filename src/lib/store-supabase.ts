import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase, supabasePublic } from './supabase';
import { RepositoryContainer } from '@/infrastructure/database/repositories/RepositoryContainer';

RepositoryContainer.initialize(supabase);
import type { Product, ProductFormValues, Sale, SaleFormValues, Purchase, PurchaseFormValues, Supplier, SupplierFormValues, JajananRequest, JajananRequestFormValues, StockDetail, OpnamePayload, Reconciliation, ReconciliationPayload } from '@shared/types';
import { DEMO_EMAIL } from './constants';
import * as demoData from './demo-data';
import { AuditLogger } from './audit-logger';
import { offlineSync } from './offline-sync';
import { sessionEvents } from './session-events';
import { ProductController } from '@/api/controllers/ProductController';
import { SaleController } from '@/api/controllers/SaleController';

const productController = new ProductController();
const saleController = new SaleController();

// Helper to check if error is network related
function isNetworkError(error: any): boolean {
  return (
    !navigator.onLine ||
    error?.message?.includes('timeout') ||
    error?.message?.includes('Network request failed') ||
    error?.message?.includes('Failed to fetch') ||
    error?.code === 'PGRST301' // Connection error sometimes
  );
}

interface WarungState {
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  suppliers: Supplier[];
  jajananRequests: JajananRequest[];
  stockDetails: StockDetail[];
  reconciliations: Reconciliation[];
  initialBalance: number;
  storeProfile: {
    name: string;
    address: string;
    phone: string;
    logoUrl?: string;
    qrisCode?: string;
    cartEnabled?: boolean;
    paymentMethods?: string[];
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    phoneNumber?: string;
    slug?: string;
    category?: string;
  };
  opnameMode: 'retail' | 'display' | 'terpadu';
  isLoading: boolean;
  error: string | null;

  // Store context for multi-tenant
  currentStoreId: string | null;
  setCurrentStoreId: (storeId: string | null) => void;

  // Current User Context
  currentUser: {
    id: string;
    email: string;
    role: string;
    name?: string;
    permissions?: string[];
  } | null;

  isAuthenticated: boolean; // Added missing property

  // UI State
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

interface WarungActions {
  resetStore: () => void;
  resetToPublicStoreMode: () => void;
  fetchProducts: () => Promise<void>;
  fetchSales: () => Promise<void>;
  fetchPurchases: () => Promise<void>;
  fetchSuppliers: () => Promise<void>;
  fetchJajananRequests: () => Promise<void>;
  fetchStockDetails: (productId: string) => Promise<void>;
  fetchInitialBalance: () => Promise<void>;
  fetchStoreProfile: () => Promise<void>;
  fetchCurrentUser: (user?: any) => Promise<void>;
  fetchOpnameMode: () => Promise<void>;
  preloadDashboardData: () => Promise<void>;
  setInitialBalance: (balance: number) => Promise<void>;
  updateStoreProfile: (profile: WarungState['storeProfile']) => Promise<void>;
  updateOpnameMode: (mode: 'retail' | 'display' | 'terpadu') => Promise<void>;
  addProduct: (productData: ProductFormValues) => Promise<Product>;
  updateProduct: (productId: string, productData: ProductFormValues) => Promise<Product>;
  deleteProduct: (productId: string) => Promise<void>;
  addSale: (saleData: SaleFormValues) => Promise<Sale>;
  addPublicSale: (saleData: SaleFormValues) => Promise<any>;
  confirmSale: (saleId: string) => Promise<void>;
  deleteSale: (saleId: string) => Promise<void>;
  addPurchase: (purchaseData: PurchaseFormValues) => Promise<Purchase>;
  updatePurchase: (purchaseId: string, purchaseData: PurchaseFormValues) => Promise<Purchase>;
  deletePurchase: (purchaseId: string) => Promise<void>;
  addSupplier: (supplierData: SupplierFormValues) => Promise<Supplier>;
  updateSupplier: (supplierId: string, supplierData: SupplierFormValues) => Promise<Supplier>;
  deleteSupplier: (supplierId: string) => Promise<void>;
  addJajananRequest: (requestData: JajananRequestFormValues) => Promise<JajananRequest>;
  updateJajananRequestStatus: (requestId: string, status: JajananRequest['status']) => Promise<JajananRequest>;
  createOpname: (payload: OpnamePayload) => Promise<void>;
  adjustStock: (productId: string, quantity: number, unitCost: number, isFromProductForm?: boolean) => Promise<void>;
  fetchReconciliations: () => Promise<void>;
  createReconciliation: (payload: ReconciliationPayload) => Promise<Reconciliation>;
  processOfflineQueue: () => Promise<void>;
}

// Helper to convert Supabase snake_case to camelCase
function toProduct(row: any): Product {
  return {
    id: row.id,
    name: row.name,
    price: Number(row.price),
    cost: Number(row.cost) || 0,
    imageUrl: row.image_url || '',
    category: row.category || '',
    description: row.description || '',
    isPromo: row.is_promo || false,
    promoPrice: row.promo_price ? Number(row.promo_price) : undefined,
    isActive: row.is_active !== false,
    isBestSeller: row.is_best_seller || false,
    totalStock: row.total_stock || 0,
    minStockLevel: row.min_stock_level || 10,
    qtyPerUnit: row.qty_per_unit || 1,
    createdAt: new Date(row.created_at).getTime(),
  };
}

function toSupplier(row: any): Supplier {
  return {
    id: row.id,
    name: row.name,
    contactPerson: row.contact_person || '',
    phone: row.phone || '',
    address: row.address || '',
    createdAt: new Date(row.created_at).getTime(),
  };
}

function toJajananRequest(row: any): JajananRequest {
  return {
    id: row.id,
    productId: row.product_id || '',
    requesterName: row.requester_name,
    snackName: row.snack_name,
    quantity: row.quantity,
    notes: row.notes || '',
    requestType: row.request_type || 'stock_request',
    status: row.status || 'pending',
    isRead: row.is_read || false,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
  };
}

function toPurchase(row: any): Purchase {
  return {
    id: row.id,
    productId: row.product_id,
    productName: row.product_name,
    quantity: row.quantity,
    unitCost: Number(row.unit_cost),
    totalCost: Number(row.total_cost),
    packQuantity: row.pack_quantity,
    unitsPerPack: row.units_per_pack,
    supplierId: row.supplier_id,
    supplier: row.suppliers?.name,
    notes: row.notes || '',
    createdAt: new Date(row.created_at).getTime(),
  };
}

function toSale(row: any, items: any[], cashierMap?: Map<string, string>): Sale {
  return {
    id: row.id,
    total: Number(row.total),
    profit: Number(row.profit),
    saleType: row.sale_type || 'retail',
    notes: row.notes || '',
    customerName: row.customer_name || undefined,
    customerPhone: row.customer_phone || undefined,
    customerAddress: row.customer_address || undefined,
    paymentProofUrl: row.payment_proof_url || undefined,
    status: row.status || 'completed',
    createdAt: new Date(row.created_at).getTime(),
    userId: row.user_id || undefined,
    cashierName: (row.user_id && cashierMap) ? cashierMap.get(row.user_id) : undefined,
    items: items.map(item => ({
      productId: item.product_id,
      productName: item.product_name,
      quantity: item.quantity,
      price: Number(item.price),
      cost: Number(item.cost),
    })),
  };
}

function toStockDetail(row: any): StockDetail {
  return {
    id: row.id,
    productId: row.product_id,
    purchaseId: row.purchase_id,
    quantity: row.quantity,
    unitCost: Number(row.unit_cost),
    createdAt: new Date(row.created_at).getTime(),
  };
}

function toReconciliation(row: any): Reconciliation {
  return {
    id: row.id,
    date: row.date,
    expectedCash: Number(row.expected_cash),
    actualCash: Number(row.actual_cash),
    cashDifference: Number(row.cash_difference),
    stockItems: row.stock_items || [],
    totalStockValue: Number(row.total_stock_value),
    totalStockCost: Number(row.total_stock_cost),
    unidentifiedAmount: Number(row.unidentified_amount),
    generatedSaleIds: row.generated_sale_ids || [],
    notes: row.notes || '',
    status: row.status || 'completed',
    createdAt: new Date(row.created_at).getTime(),
  };
}

// Ensure session is valid before database operations
async function ensureSession(): Promise<boolean> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // Try to refresh session
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        console.warn('[ensureSession] Session expired, need re-login');
        sessionEvents.emitSessionExpired();
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error('[ensureSession] Error checking session:', err);
    sessionEvents.emitSessionExpired();
    return false;
  }
}

// Timeout helper with retry for session errors - increased default timeout
async function withTimeout<T>(
  promise: Promise<T> | PromiseLike<T>,
  timeoutMs: number = 60000, // Increased to 60s default
  errorMessage: string = 'Request timed out'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId!);
    // If auth error, try to refresh session
    if (sessionEvents.isAuthError(error)) {
      console.warn('[withTimeout] Auth error detected inside timeout wrapper');
      // For public store visitors, we don't have a session to refresh, so we shouldn't emitSessionExpired and force a login modal.
      // We only do that if they are actually supposed to be logged in.
      const isPublicRoute = typeof window !== 'undefined' &&
        window.location.pathname !== '/' &&
        !window.location.pathname.startsWith('/admin') &&
        !window.location.pathname.startsWith('/dashboard') &&
        !window.location.pathname.startsWith('/pos');

      if (!isPublicRoute) {
        const refreshed = await ensureSession();
        if (!refreshed) {
          sessionEvents.emitSessionExpired();
          throw new Error('Session expired. Please login again.');
        }
      } else {
        console.warn('[withTimeout] Auth error on public route, ignoring session refresh');
      }
    }
    throw error;
  }
}

// FIFO Stock Deduction Helper - deducts stock from oldest batches first
async function deductStockFIFO(productId: string, qtyToDeduct: number): Promise<void> {
  try {
    // Get batches sorted by created_at (oldest first for FIFO)
    const { data: batches, error } = await supabase
      .from('stock_details')
      .select('*')
      .eq('product_id', productId)
      .gt('quantity', 0)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[deductStockFIFO] Failed to get batches:', error);
      return;
    }

    if (!batches || batches.length === 0) {
      console.warn('[deductStockFIFO] No stock batches found for product:', productId);
      return;
    }

    let remaining = qtyToDeduct;

    for (const batch of batches) {
      if (remaining <= 0) break;

      const deductFromBatch = Math.min(batch.quantity, remaining);
      const newQuantity = batch.quantity - deductFromBatch;
      remaining -= deductFromBatch;

      console.log(`[deductStockFIFO] Batch ${batch.id}: ${batch.quantity} -> ${newQuantity} (deducted ${deductFromBatch})`);

      // Update batch quantity
      const { error: updateError } = await supabase
        .from('stock_details' as any)
        .update({ quantity: newQuantity })
        .eq('id', batch.id);

      if (updateError) {
        console.error('[deductStockFIFO] Failed to update batch:', updateError);
      }
    }

    if (remaining > 0) {
      console.warn(`[deductStockFIFO] Could not deduct full quantity. Remaining: ${remaining}`);
    }
  } catch (err) {
    console.error('[deductStockFIFO] Error:', err);
  }
}

// FIFO Stock Restoration Helper - restores stock when sale is deleted
// Since we don't track which batch was used, we add to newest batch or create new one
async function restoreStockFIFO(
  storeId: string,
  productId: string,
  qtyToRestore: number,
  unitCost: number
): Promise<void> {
  try {
    // Get the newest batch for this product
    const { data: newestBatch, error } = await supabase
      .from('stock_details')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows found
      console.error('[restoreStockFIFO] Failed to get newest batch:', error);
    }

    if (newestBatch) {
      // Add to existing batch
      const newQuantity = newestBatch.quantity + qtyToRestore;
      console.log(`[restoreStockFIFO] Restoring to batch ${newestBatch.id}: ${newestBatch.quantity} -> ${newQuantity}`);

      await supabase
        .from('stock_details' as any)
        .update({ quantity: newQuantity })
        .eq('id', newestBatch.id);
    } else {
      // Create new batch
      console.log(`[restoreStockFIFO] Creating new batch for product ${productId} with qty ${qtyToRestore}`);

      await supabase
        .from('stock_details' as any)
        .insert({
          store_id: storeId,
          product_id: productId,
          quantity: qtyToRestore,
          unit_cost: unitCost,
        });
    }
  } catch (err) {
    console.error('[restoreStockFIFO] Error:', err);
  }
}

export const useWarungStore = create<WarungState & WarungActions>()(
  persist(
    immer((set, get) => ({
      products: [],
      sales: [],
      purchases: [],
      suppliers: [],
      jajananRequests: [],
      stockDetails: [],
      reconciliations: [],
      initialBalance: 0,
      storeProfile: {
        name: 'Omzetin',
        address: '',
        phone: '',
        slug: '',
      },
      opnameMode: 'retail',
      isLoading: false,
      error: null,
      currentStoreId: null,
      currentUser: null,
      isAuthenticated: false,
      sidebarCollapsed: false,

      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed });
      },

      setCurrentStoreId: (storeId) => {
        const previousStoreId = get().currentStoreId;
        console.log('[STORE] Setting current store ID to:', storeId, 'previous:', previousStoreId);

        // Check if we are switching stores
        const isSwitchingStore = storeId !== previousStoreId;

        // Reset store data when switching to a different store or clearing
        // But preserve currentUser if we're just re-setting the same store ID
        // (This prevents race conditions with fetchCurrentUser)
        set({
          currentStoreId: storeId,
          storeProfile: {
            name: 'Omzetin',
            address: '',
            phone: '',
            logoUrl: undefined,
            qrisCode: undefined,
            cartEnabled: undefined,
            paymentMethods: undefined,
            bankName: undefined,
            accountNumber: undefined,
            accountName: undefined,
            phoneNumber: undefined,
            slug: '',
          },
          products: [],
          sales: [],
          purchases: [],
          suppliers: [],
          jajananRequests: [],
          stockDetails: [],
          reconciliations: [],
          // Only reset currentUser if identifying a NEW store context
          currentUser: isSwitchingStore ? null : get().currentUser,
        });
        // Note: Data fetching is handled by components that listen to currentStoreId changes
        // This prevents multiple parallel fetches and race conditions
      },

      // Add a function to reset to public store mode
      resetToPublicStoreMode: () => {
        console.log('[STORE] Resetting to public store mode');
        set({
          products: [],
          sales: [],
          purchases: [],
          suppliers: [],
          jajananRequests: [],
          stockDetails: [],
          reconciliations: [],
          initialBalance: 0,
          storeProfile: {
            name: 'Omzetin',
            address: '',
            phone: '',
            slug: '',
          },
          opnameMode: 'retail',
          isLoading: false,
          error: null,
          // NOTE: Don't reset currentStoreId - it will be set after loading the store
          // currentStoreId: null,
        });
      },

      resetStore: () => {
        set({
          products: [],
          sales: [],
          purchases: [],
          suppliers: [],
          jajananRequests: [],
          stockDetails: [],
          reconciliations: [],
          initialBalance: 0,
          storeProfile: {
            name: 'Omzetin',
            address: '',
            phone: '',
            slug: '',
          },
          opnameMode: 'retail',
          isLoading: false,
          error: null,
          // Do NOT clear currentStoreId or currentUser here because this state is synced via localStorage!
          // If we clear it, it logs out the admin user who opened the public store in a new tab.
        });
      },

      fetchProducts: async () => {
        const storeId = get().currentStoreId;
        if (!storeId) {
          // Don't clear products when storeId is null
          return;
        }

        if (get().currentUser?.email === DEMO_EMAIL) {
          set({ products: [...demoData.demoProducts] });
          return;
        }

        const isPublicRoute = typeof window !== 'undefined' &&
          window.location.pathname !== '/' &&
          !window.location.pathname.startsWith('/admin') &&
          !window.location.pathname.startsWith('/dashboard') &&
          !window.location.pathname.startsWith('/pos') &&
          !window.location.pathname.startsWith('/opname');
        const client = isPublicRoute ? supabasePublic : supabase;

        set({ isLoading: true, error: null });
        try {
          console.log(`[STORE] Fetching products for store: ${storeId} using ${isPublicRoute ? 'public' : 'auth'} client`);
          // Use withTimeout to prevent hanging indefinitely
          const { data, error } = await withTimeout(
            client
              .from('products' as any)
              .select('*')
              .eq('store_id', storeId)
              .order('name') as any, // Order by name
            15000, // 15s timeout
            'Gagal memuat produk'
          ) as any;

          if (error) {
            console.error('[FETCH PRODUCTS] Supabase error:', error);
            throw error;
          }

          const mappedProducts = (data || []).map(toProduct);


          // Sort: In-stock first (newest to oldest), then Out-of-stock (newest to oldest)
          mappedProducts.sort((a, b) => {
            const aOut = (a.totalStock || 0) <= 0;
            const bOut = (b.totalStock || 0) <= 0;

            if (aOut !== bOut) {
              return aOut ? 1 : -1; // Put out-of-stock last
            }
            // If stock status is same, sort by created_at desc
            return b.createdAt - a.createdAt;
          });

          console.log(`[STORE] Successfully mapped ${mappedProducts.length} products`);
          set({ products: mappedProducts });
        } catch (error) {
          console.error('[FETCH PRODUCTS ERROR]', error);
          // Don't set global error state to prevent UI blocking
        } finally {
          set({ isLoading: false });
        }
      },

      fetchSales: async () => {
        const storeId = get().currentStoreId;
        if (!storeId) {
          // CRITICAL FIX: Don't clear sales when storeId is null
          return;
        }

        if (get().currentUser?.email === DEMO_EMAIL) {
          set({ sales: [...demoData.demoSales] });
          return;
        }

        try {
          // Fetch members for cashier names
          const { data: members } = await supabase
            .from('store_members')
            .select('user_id, name')
            .eq('store_id', storeId);

          const cashierMap = new Map((members || []).map((m: any) => [m.user_id, m.name]));

          // Fetch sales with timeout
          const { data: salesData, error: salesError } = await withTimeout(
            supabase
              .from('sales' as any)
              .select('*')
              .eq('store_id', storeId)
              .order('created_at', { ascending: false }) as any,
            15000,
            'Gagal memuat penjualan'
          ) as any;

          if (salesError) throw salesError;

          // Fetch sale items
          const saleIds = (salesData || []).map((s: any) => s.id);
          let itemsData: any[] = [];

          if (saleIds.length > 0) {
            const { data, error: itemsError } = await withTimeout(
              supabase
                .from('sale_items' as any)
                .select('*')
                .in('sale_id', saleIds) as any,
              15000,
              'Gagal memuat detail penjualan'
            );

            if (itemsError) throw itemsError;
            itemsData = data || [];
          }

          const sales = (salesData || []).map((sale: any) =>
            toSale(sale, itemsData.filter(item => item.sale_id === sale.id), cashierMap)
          );

          set({ sales });
        } catch (error) {
          console.error('[FETCH SALES ERROR]', error);
          // Don't set global error state to prevent UI blocking
        }
      },

      fetchPurchases: async () => {
        const storeId = get().currentStoreId;
        if (!storeId) {
          // CRITICAL FIX: Don't clear purchases when storeId is null
          return;
        }

        if (get().currentUser?.email === DEMO_EMAIL) {
          set({ purchases: [...demoData.demoPurchases] });
          return;
        }

        try {
          const { data, error } = await withTimeout(
            supabase
              .from('purchases')
              .select('*, suppliers(name)')
              .eq('store_id', storeId)
              .order('created_at', { ascending: false }),
            15000,
            'Gagal memuat pembelian'
          );

          if (error) throw error;
          set({ purchases: (data || []).map(toPurchase) });
        } catch (error) {
          console.error('[FETCH PURCHASES ERROR]', error);
        }
      },

      fetchSuppliers: async () => {
        const storeId = get().currentStoreId;
        if (!storeId) {
          // CRITICAL FIX: Don't clear suppliers when storeId is null
          return;
        }

        if (get().currentUser?.email === DEMO_EMAIL) {
          set({ suppliers: [...demoData.demoSuppliers] });
          return;
        }

        try {
          const { data, error } = await withTimeout(
            supabase
              .from('suppliers')
              .select('*')
              .eq('store_id', storeId)
              .order('name'),
            15000,
            'Gagal memuat pemasok'
          );

          if (error) throw error;
          set({ suppliers: (data || []).map(toSupplier) });
        } catch (error) {
          console.error('[FETCH SUPPLIERS ERROR]', error);
        }
      },

      fetchJajananRequests: async () => {
        const storeId = get().currentStoreId;
        if (!storeId) {
          // CRITICAL FIX: Don't clear jajananRequests when storeId is null
          return;
        }

        if (get().currentUser?.email === DEMO_EMAIL) {
          set({ jajananRequests: [...demoData.demoJajananRequests] });
          return;
        }

        try {
          const { data, error } = await withTimeout(
            supabase
              .from('snack_requests')
              .select('*')
              .eq('store_id', storeId)
              .order('created_at', { ascending: false }),
            15000,
            'Gagal memuat request jajanan'
          );

          if (error) throw error;
          set({ jajananRequests: (data || []).map(toJajananRequest) });
        } catch (error) {
          console.error('[FETCH JAJANAN REQUESTS ERROR]', error);
        }
      },

      fetchStockDetails: async (productId) => {
        if (get().currentUser?.email === DEMO_EMAIL) {
          set({ stockDetails: [...demoData.demoStockDetails].filter(s => s.productId === productId) });
          return;
        }

        try {
          const { data, error } = await supabase
            .from('stock_details')
            .select('*')
            .eq('product_id', productId)
            .order('created_at');

          if (error) throw error;
          set({ stockDetails: (data || []).map(toStockDetail) });
        } catch (error) {
          console.error('[FETCH STOCK DETAILS ERROR]', error);
        }
      },

      fetchInitialBalance: async () => {
        const storeId = get().currentStoreId;
        if (!storeId) return;

        if (get().currentUser?.email === DEMO_EMAIL) {
          set({ initialBalance: demoData.demoInitialBalance });
          return;
        }

        try {
          const { data, error } = await withTimeout(
            supabase
              .from('settings')
              .select('value')
              .eq('store_id', storeId)
              .eq('key', 'initial_balance')
              .single() as any,
            10000,
            'Gagal memuat saldo awal'
          );

          if (error) {
            // Ignore 406 errors and other common errors
            if (error.code === '406' || error.message?.includes('406') || (error as any).status === 406) {
              set({ initialBalance: 0 });
              return;
            }
            if (error.code !== 'PGRST116') throw error;
          }

          const balance = data ? parseFloat(data.value) || 0 : 0;
          set({ initialBalance: balance });
        } catch (error) {
          console.error('Failed to fetch initial balance:', error);
          set({ initialBalance: 0 });
        }
      },

      fetchStoreProfile: async () => {
        const storeId = get().currentStoreId;
        if (!storeId) return;

        if (get().currentUser?.email === DEMO_EMAIL) {
          set({ storeProfile: { ...demoData.demoStoreProfile } });
          return;
        }

        try {
          // Get store data directly
          const { data: store, error } = await withTimeout(
            supabase
              .from('stores')
              .select('*')
              .eq('id', storeId)
              .single() as any,
            15000,
            'Gagal memuat profil toko'
          );

          if (error) throw error;

          if (store) {
            // Fetch all settings
            const { data: settingsData } = await supabase
              .from('settings')
              .select('key, value')
              .eq('store_id', storeId);

            const settingsMap = (settingsData || []).reduce((acc: any, curr: any) => {
              acc[curr.key] = curr.value;
              return acc;
            }, {});

            let paymentMethods: string[] = [];
            if (settingsMap.payment_methods) {
              try {
                paymentMethods = JSON.parse(settingsMap.payment_methods);
              } catch (e) {
                console.error('Failed to parse payment methods:', e);
              }
            }

            set({
              storeProfile: {
                name: store.name,
                address: store.address || '',
                phone: store.phone || '',
                logoUrl: store.logo_url || '',
                qrisCode: store.qris_code || '',
                cartEnabled: store.cart_enabled !== false,
                paymentMethods,
                slug: store.slug || '',
                bankName: settingsMap.bank_name || '',
                accountNumber: settingsMap.account_number || '',
                accountName: settingsMap.account_name || '',
                phoneNumber: settingsMap.phone_number || '',
                category: settingsMap.store_category || 'Warung',
              }
            });
          }
        } catch (error) {
          console.error('Failed to fetch store profile:', error);
        }
      },

      fetchCurrentUser: async (passedUser?: any) => {
        const storeId = get().currentStoreId;
        console.warn('[fetchCurrentUser] START - storeId:', storeId);
        if (!storeId) {
          console.warn('[fetchCurrentUser] No storeId, skipping');
          return;
        }

        let user = passedUser;
        let authUser = passedUser;

        if (!user) {
          try {
            const { data } = await supabase.auth.getUser();
            user = data.user;
            authUser = user;
          } catch (e) {
            console.warn('[fetchCurrentUser] Failed to get user from auth:', e);
          }
        }

        console.warn('[fetchCurrentUser] Auth user:', user?.id, user?.email);

        if (!user) {
          set({ currentUser: null });
          return;
        }

        // Priority 0: Try using RPC (most robust, bypasses RLS)
        try {
          console.warn('[fetchCurrentUser] Calling RPC get_my_role...');
          const rpcResult = await (supabase.rpc as any)('get_my_role', {
            p_store_id: storeId
          });
          const { data: role, error: rpcError } = rpcResult || {};
          console.warn('[fetchCurrentUser] RPC result:', { role, error: rpcError?.message });

          if (!rpcError && role) {
            console.warn('[fetchCurrentUser] RPC SUCCESS - role:', role);

            // FETCH PERMISSIONS MANUALLY since RPC doesn't return them
            let permissions: string[] = [];
            try {
              const { data: permData } = await supabase
                .from('store_members')
                .select('permissions')
                .eq('store_id', storeId)
                .eq('user_id', user.id)
                .maybeSingle();
              if (permData?.permissions) permissions = permData.permissions;
            } catch (e) {
              console.warn('[fetchCurrentUser] Failed to fetch permissions:', e);
            }

            set({
              currentUser: {
                id: user.id,
                email: user.email!,
                role: role,
                name: user.user_metadata?.name || user.user_metadata?.full_name ||
                  (role === 'owner' ? 'Pemilik Toko' : role === 'admin' ? 'Admin' : 'Staff'),
                permissions: permissions
              },
            });
            return;
          }
        } catch (e) {
          console.warn('[fetchCurrentUser] RPC exception:', e);
        }

        // Priority 1: Check store_members table directly
        // Note: Ownership is tracked via store_members.role = 'owner', NOT stores.owner_id
        try {
          console.warn('[fetchCurrentUser] Checking store_members...');
          const { data: member, error: memberError } = await (supabase
            .from('store_members') as any)
            .select('role, name, permissions') // Added permissions
            .eq('store_id', storeId)
            .eq('user_id', user.id)
            .limit(1)
            .maybeSingle();

          console.warn('[fetchCurrentUser] Member result:', { member, memberError: memberError?.message });

          if (!memberError && member) {
            console.warn('[fetchCurrentUser] Member found - role:', member.role);
            set({
              currentUser: {
                id: user.id,
                email: user.email!,
                role: member.role || 'staff',
                name: member.name || user.user_metadata?.name || user.email?.split('@')[0],
                permissions: member.permissions || []
              },
            });
            return;
          }
        } catch (e) {
          console.warn('[fetchCurrentUser] Member check exception:', e);
        }

        // Priority 2: FAILSAFE — set from auth session data
        console.warn('[fetchCurrentUser] All DB checks failed! Using auth session fallback.');
        set({
          currentUser: {
            id: user.id,
            email: user.email!,
            role: 'owner',
            name: user.user_metadata?.name || user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          },
        });


      },

      fetchOpnameMode: async () => {
        const storeId = get().currentStoreId;
        if (!storeId) return;

        try {
          const { data, error } = await supabase
            .from('settings')
            .select('value')
            .eq('store_id', storeId)
            .eq('key', 'opname_mode')
            .single() as any;

          if (error) {
            // Ignore 406 errors
            if (error.code === '406' || error.message?.includes('406')) {
              set({ opnameMode: 'retail' });
              return;
            }
            if (error.code !== 'PGRST116') throw error;
          }

          const mode = (data?.value as 'retail' | 'display' | 'terpadu') || 'retail';
          set({ opnameMode: mode });
        } catch (error) {
          console.error('Failed to fetch opname mode:', error);
          set({ opnameMode: 'retail' });
        }
      },

      setInitialBalance: async (balance) => {
        const storeId = get().currentStoreId;
        if (!storeId) throw new Error('No store selected');

        try {
          const { error } = await supabase
            .from('settings' as any)
            .upsert({
              store_id: storeId,
              key: 'initial_balance',
              value: balance.toString(),
            }, { onConflict: 'store_id,key' } as any);

          if (error) throw error;
          set({ initialBalance: balance });
        } catch (error) {
          console.error('Failed to save initial balance:', error);
          throw error;
        }
      },

      updateStoreProfile: async (profile) => {
        const storeId = get().currentStoreId;
        const currentUser = get().currentUser;
        if (!storeId) throw new Error('No store selected');

        if (currentUser?.email === DEMO_EMAIL) {
          console.log('[updateStoreProfile] Demo mode: simulating local update only');
          // Important: also update the auth store to keep it in sync, mostly for the name
          set({ storeProfile: profile });
          return;
        }

        // Retry logic helper - more retries for slow connections
        const retryOperation = async (operation: () => Promise<any>, maxRetries = 4) => {
          let lastError;
          for (let i = 0; i < maxRetries; i++) {
            try {
              return await operation();
            } catch (error: any) {
              console.warn(`[updateStoreProfile] Attempt ${i + 1}/${maxRetries} failed:`, error?.message || error);
              lastError = error;
              // Wait before retry (exponential backoff: 1s, 2s, 4s, 8s)
              if (i < maxRetries - 1) {
                const delay = 1000 * Math.pow(2, i);
                console.log(`[updateStoreProfile] Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }
          throw lastError;
        };

        try {
          // Use retry logic for the main update operation
          await retryOperation(async () => {
            // Use withTimeout to prevent hanging - 60s for large logo uploads
            const { error, data } = await withTimeout(
              supabase
                .from('stores' as any)
                .update({
                  name: profile.name,
                  address: profile.address,
                  phone: profile.phone,
                  logo_url: profile.logoUrl,
                  qris_code: profile.qrisCode,
                  cart_enabled: profile.cartEnabled,
                  slug: profile.slug,
                })
                .eq('id', storeId)
                .select('id') // Simplified select
                .single() as any,
              60000, // 60s timeout - increased for slow connections and large logo uploads
              'Gagal menyimpan profil toko (timeout). Coba lagi dengan koneksi yang lebih stabil.'
            );

            if (error) throw error;
            if (!data) throw new Error('Gagal menyimpan: Toko tidak ditemukan atau Anda tidak memiliki akses.');
          });

          // Save payment methods and bank details to settings
          // These are less critical, so we can do them in parallel or sequentially without blocking the main success
          const settingsToUpsert = [
            { store_id: storeId, key: 'payment_methods', value: JSON.stringify(profile.paymentMethods || []) },
            { store_id: storeId, key: 'bank_name', value: profile.bankName || '' },
            { store_id: storeId, key: 'account_number', value: profile.accountNumber || '' },
            { store_id: storeId, key: 'account_name', value: profile.accountName || '' },
            { store_id: storeId, key: 'phone_number', value: profile.phoneNumber || '' },
          ];

          // Use a separate try-catch for settings to not fail the whole operation if settings fail
          try {
            console.log('[updateStoreProfile] Upserting payment settings...');
            const { error: settingsError } = await supabase
              .from('settings')
              .upsert(settingsToUpsert, { onConflict: 'store_id,key' } as any);

            if (settingsError) console.error('Failed to save payment settings:', settingsError);
            else console.log('[updateStoreProfile] Payment settings saved successfully');
          } catch (settingsErr) {
            console.error('Exception saving payment settings:', settingsErr);
          }

          // Save store_category separately to avoid any batch upsert issues
          try {
            const categoryValue = profile.category || 'Warung';
            console.log('[updateStoreProfile] Saving store_category:', categoryValue);

            // Try upsert first
            const { error: catError } = await (supabase
              .from('settings')
              .upsert(
                { store_id: storeId, key: 'store_category', value: categoryValue },
                { onConflict: 'store_id,key' }
              ) as any);

            if (catError) {
              console.error('[updateStoreProfile] Upsert store_category failed:', catError);
              // Fallback: try insert, then update if conflict
              const { error: insertError } = await supabase
                .from('settings')
                .insert({ store_id: storeId, key: 'store_category', value: categoryValue } as any);

              if (insertError) {
                console.error('[updateStoreProfile] Insert store_category failed:', insertError);
                // Last resort: update
                const { error: updateError } = await (supabase as any)
                  .from('settings')
                  .update({ value: categoryValue } as any)
                  .eq('store_id', storeId)
                  .eq('key', 'store_category');

                if (updateError) console.error('[updateStoreProfile] Update store_category failed:', updateError);
                else console.log('[updateStoreProfile] store_category updated via UPDATE');
              } else {
                console.log('[updateStoreProfile] store_category inserted via INSERT');
              }
            } else {
              console.log('[updateStoreProfile] store_category saved via UPSERT ✓');
            }
          } catch (catErr) {
            console.error('[updateStoreProfile] Exception saving store_category:', catErr);
          }

          set({ storeProfile: profile });
        } catch (error) {
          console.error('Failed to save store profile:', error);
          throw error;
        }
      },

      updateOpnameMode: async (mode) => {
        const storeId = get().currentStoreId;
        const currentUser = get().currentUser;
        if (!storeId) throw new Error('No store selected');

        if (currentUser?.email === DEMO_EMAIL) {
          console.log('[updateOpnameMode] Demo mode: simulating local update only');
          set({ opnameMode: mode });
          window.dispatchEvent(new CustomEvent('opnameMode-changed'));
          return;
        }

        try {
          const { error } = await ((supabase as any)
            .from('settings')
            .upsert({
              store_id: storeId,
              key: 'opname_mode',
              value: mode,
            }, { onConflict: 'store_id,key' }) as any);

          if (error) throw error;
          set({ opnameMode: mode });

          // Dispatch event for other components
          window.dispatchEvent(new CustomEvent('opnameMode-changed'));
        } catch (error) {
          console.error('Failed to save opname mode:', error);
          throw error;
        }
      },

      addProduct: async (productData) => {
        const storeId = get().currentStoreId;
        if (!storeId) throw new Error('No store selected');

        if (get().currentUser?.email === DEMO_EMAIL) {
          const newProduct: Product = {
            id: `demo-prod-${Date.now()}`,
            name: productData.name,
            price: productData.price,
            cost: productData.cost || 0,
            imageUrl: productData.imageUrl || '',
            category: productData.category,
            description: productData.description || '',
            isPromo: productData.isPromo || false,
            promoPrice: productData.promoPrice,
            isActive: productData.isActive !== false,
            isBestSeller: productData.isBestSeller || false,
            totalStock: 0,
            minStockLevel: productData.minStockLevel || 10,
            qtyPerUnit: productData.qtyPerUnit || 1,
            unit: productData.unit,
            createdAt: Date.now(),
          };
          set((state) => { state.products.push(newProduct); });
          return newProduct;
        }

        // Retry logic helper - more retries for slow connections + DEADLOCK protection
        const retryOperation = async (operation: () => Promise<any>, maxRetries = 4) => {
          let lastError;
          for (let i = 0; i < maxRetries; i++) {
            try {
              // Wrap the operation in a 15s timeout to catch LockManager deadlocks
              const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('TIMEOUT_DEADLOCK')), 15000);
              });
              return await Promise.race([operation(), timeoutPromise]);
            } catch (error: any) {
              if (error?.message === 'TIMEOUT_DEADLOCK') {
                console.error('[addProduct] DEADLOCK DETECTED! Clearing corrupt cache and returning to refresh...');
                try {
                  for (let j = 0; j < localStorage.length; j++) {
                    const key = localStorage.key(j);
                    if (key && key.includes('-auth-token')) localStorage.removeItem(key);
                  }
                  window.location.reload();
                } catch (e) { }
                throw new Error('Sesi cache penuh menyebabkan nyangkut. Silakan refresh halaman.');
              }
              console.warn(`[addProduct] Attempt ${i + 1}/${maxRetries} failed:`, error?.message || error);
              lastError = error;
              // Wait before retry (exponential backoff: 1s, 2s, 4s, 8s)
              if (i < maxRetries - 1) {
                const delay = 1000 * Math.pow(2, i);
                console.log(`[addProduct] Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
              }
            }
          }
          throw lastError;
        };

        try {
          const newProductData = {
            store_id: storeId,
            name: productData.name,
            price: productData.price,
            cost: productData.cost || 0,
            image_url: productData.imageUrl || '',
            category: productData.category || '',
            description: productData.description || '',
            is_promo: productData.isPromo || false,
            promo_price: productData.promoPrice,
            is_active: productData.isActive !== false,
            is_best_seller: productData.isBestSeller || false,
            total_stock: Number(productData.totalStock) || 0,
            min_stock_level: productData.minStockLevel || 10,
            qty_per_unit: productData.qtyPerUnit || 1
          };

          const response = await retryOperation(() =>
            productController.createProduct(newProductData as any)
          );

          if (!response.success) throw new Error(response.error);
          const data = response.data!;

          const newProduct = toProduct(data);
          set((state) => { state.products.push(newProduct); });

          // Log audit event
          const user = await supabase.auth.getUser();
          if (user.data.user) {
            await AuditLogger.logProductCreate(user.data.user.id, storeId, newProduct.id, newProduct);
          }

          return newProduct;
        } catch (error: any) {
          // Handle Offline / Network Error
          if (isNetworkError(error)) {
            console.log('[addProduct] Network error detected, switching to offline mode');

            // Create temporary product object for optimistic UI
            const tempId = `temp-${Date.now()}`;
            const tempProduct: Product = {
              id: tempId,
              name: productData.name,
              price: productData.price,
              cost: productData.cost || 0,
              imageUrl: productData.imageUrl || '',
              category: productData.category || '',
              description: productData.description || '',
              isPromo: productData.isPromo || false,
              promoPrice: productData.promoPrice,
              isActive: productData.isActive !== false,
              isBestSeller: productData.isBestSeller || false,
              totalStock: 0,
              minStockLevel: productData.minStockLevel || 10,
              qtyPerUnit: productData.qtyPerUnit || 1,
              createdAt: Date.now(),
            };

            // Add to offline queue
            offlineSync.addToQueue('ADD_PRODUCT', productData);

            // Optimistic Update
            set((state) => { state.products.unshift(tempProduct); });

            return tempProduct;
          }

          throw error;
        }
      },

      updateProduct: async (productId, productData) => {
        if (get().currentUser?.email === DEMO_EMAIL) {
          let updated: Product | null = null;
          set((state) => {
            const index = state.products.findIndex(p => p.id === productId);
            if (index !== -1) {
              state.products[index] = { ...state.products[index], ...productData } as Product;
              updated = state.products[index];
            }
          });
          if (!updated) throw new Error("Product not found");
          return updated;
        }

        // Retry logic helper
        const retryOperation = async (operation: () => Promise<any>, maxRetries = 3) => {
          let lastError;
          for (let i = 0; i < maxRetries; i++) {
            try {
              return await operation();
            } catch (error: any) {
              console.warn(`[updateProduct] Attempt ${i + 1} failed:`, error);
              lastError = error;
              // Wait before retry (exponential backoff: 1s, 2s, 4s)
              if (i < maxRetries - 1) {
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, i)));
              }
            }
          }
          throw lastError;
        };

        const response = await retryOperation(() =>
          productController.updateProduct({
            id: productId,
            storeId: get().currentStoreId || '',
            data: {
              name: productData.name,
              price: productData.price,
              cost: productData.cost,
              image_url: productData.imageUrl,
              category: productData.category,
              description: productData.description,
              is_promo: productData.isPromo,
              promo_price: productData.promoPrice,
              is_active: productData.isActive,
              is_best_seller: productData.isBestSeller,
              min_stock_level: productData.minStockLevel,
              qty_per_unit: productData.qtyPerUnit,
            } as any
          })
        );

        if (!response.success) throw new Error(response.error);
        const data = response.data!;
        const updatedProduct = toProduct(data);

        // Get the old product for audit logging
        const oldProduct = get().products.find(p => p.id === productId);

        set((state) => {
          const index = state.products.findIndex((p) => p.id === productId);
          if (index !== -1) state.products[index] = updatedProduct;
        });

        // Log audit event
        const user = await supabase.auth.getUser();
        if (user.data.user && oldProduct) {
          await AuditLogger.logProductUpdate(user.data.user.id, get().currentStoreId, updatedProduct.id, oldProduct, updatedProduct);
        }

        return updatedProduct;
      },

      deleteProduct: async (productId) => {
        if (get().currentUser?.email === DEMO_EMAIL) {
          set((state) => { state.products = state.products.filter(p => p.id !== productId); });
          return;
        }

        const response = await productController.deleteProduct(productId, get().currentStoreId || '');
        if (!response.success) throw new Error(response.error);

        // Get the deleted product for audit logging
        const deletedProduct = get().products.find(p => p.id === productId);

        set((state) => { state.products = state.products.filter((p) => p.id !== productId); });

        // Log audit event
        const user = await supabase.auth.getUser();
        if (user.data.user && deletedProduct) {
          await AuditLogger.logProductDelete(user.data.user.id, get().currentStoreId, deletedProduct.id, deletedProduct);
        }
      },

      addSale: async (saleData) => {
        const storeId = get().currentStoreId;
        if (!storeId) throw new Error('No store selected');

        if (get().currentUser?.email === DEMO_EMAIL) {
          const products = get().products;
          let total = 0; let profit = 0;
          const items = saleData.items.map(item => {
            const product = products.find(p => p.id === item.productId);
            const price = item.price;
            const cost = product?.cost || 0;
            total += price * item.quantity;
            profit += (price - cost) * item.quantity;
            return {
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              price: price,
              cost: cost,
            };
          });

          const newSale: Sale = {
            id: `demo-sale-${Date.now()}`,
            items,
            total,
            profit,
            createdAt: Date.now(),
            saleType: (saleData as any).saleType || 'retail',
            notes: saleData.notes,
            customerName: saleData.customerName,
            status: 'completed',
            cashierName: 'Ryus (Demo Owner)'
          };

          set((state) => {
            state.sales.unshift(newSale);
            // deduct stock
            for (const item of items) {
              const pIdx = state.products.findIndex(p => p.id === item.productId);
              if (pIdx !== -1) {
                state.products[pIdx].totalStock = (state.products[pIdx].totalStock || 0) - item.quantity;
              }
            }
          });
          return newSale;
        }

        const products = get().products;
        const items = saleData.items.map(item => {
          const product = products.find(p => p.id === item.productId);
          const price = item.price;
          const cost = product?.cost || 0;
          return {
            productId: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            price: price,
            cost: cost,
          };
        });

        const dbItems = items.map(item => ({
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          price: item.price,
          cost: item.cost,
        }));

        try {
          // Ensure valid session before database operations
          // If offline, ensureSession might fail, so we skip it if navigator is offline
          if (navigator.onLine) {
            const sessionValid = await ensureSession();
            if (!sessionValid) {
              throw new Error('Session expired. Silakan login kembali.');
            }
          } else {
            // Force throw to trigger offline handling
            throw new Error('Network request failed (offline)');
          }

          // Insert sale using isolated Service
          const response = await saleController.processSale({
            storeId,
            items,
            saleType: (saleData as any).saleType || 'retail',
            notes: saleData.notes || '',
            createdBy: get().currentUser?.id
          });

          if (!response.success) throw new Error(response.error);
          const saleRow = response.data!;

          // Insert sale items
          const { error: itemsError } = await withTimeout(
            supabase
              .from('sale_items' as any)
              .insert(dbItems.map(item => ({ ...item, sale_id: saleRow.id }))),
            30000,
            'Gagal menyimpan detail penjualan (timeout)'
          ) as any;

          if (itemsError) throw itemsError;

          // Update stock
          for (const item of saleData.items) {
            const product = products.find(p => p.id === item.productId);
            if (product) {
              const qtyToDeduct = item.quantity * (product.qtyPerUnit || 1);

              // FIFO: Deduct from stock_details (oldest batches first)
              await deductStockFIFO(item.productId, qtyToDeduct);

              // Also update product total_stock
              await withTimeout(
                (supabase as any)
                  .from('products')
                  .update({ total_stock: Math.max(0, (product.totalStock || 0) - qtyToDeduct) })
                  .eq('id', item.productId),
                15000,
                'Gagal update stok produk (timeout)'
              );
            }
          }

          const currentUser = get().currentUser;
          const cashierMap = currentUser ? new Map([[currentUser.id, currentUser.name || '']]) : undefined;

          const newSale = toSale(saleRow, dbItems.map(i => ({ ...i, sale_id: saleRow.id })), cashierMap);
          set((state) => { state.sales.unshift(newSale); });

          // Refresh products
          await get().fetchProducts();
          return newSale;

        } catch (error: any) {
          // Handle Offline / Network Error
          if (isNetworkError(error)) {
            console.log('[addSale] Network error detected, switching to offline mode');

            // Create temporary sale object for optimistic UI
            const tempId = `temp-${Date.now()}`;
            const tempSale: Sale = {
              id: tempId,
              storeId,
              total,
              profit,
              saleType: (saleData as any).saleType || 'retail',
              items: saleData.items.map(item => ({
                id: `temp-item-${Math.random()}`,
                saleId: tempId,
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                price: item.price,
                cost: products.find(p => p.id === item.productId)?.cost || 0,
              })),
              createdAt: Date.now(),
              notes: saleData.notes,
              userId: get().currentUser?.id,
              cashierName: get().currentUser?.name,
            };

            // Add to offline queue
            offlineSync.addToQueue('ADD_SALE', saleData);

            // Optimistic Update
            set((state) => {
              state.sales.unshift(tempSale);

              // Optimistic Stock Update
              for (const item of saleData.items) {
                const product = state.products.find(p => p.id === item.productId);
                if (product) {
                  const qtyToDeduct = item.quantity * (product.qtyPerUnit || 1);
                  product.totalStock = Math.max(0, (product.totalStock || 0) - qtyToDeduct);
                }
              }
            });

            return tempSale;
          }

          throw error;
        }
      },

      addPublicSale: async (saleData) => {
        const storeId = get().currentStoreId;
        if (!storeId) throw new Error('No store selected');

        try {
          console.log('[addPublicSale] Calling RPC create_public_sale with:', { storeId, itemsCount: saleData.items.length });

          // Call RPC function for public sale creation
          const { data, error } = await supabase.rpc('create_public_sale', {
            sale_data: {
              store_id: storeId,
              items: saleData.items.map(item => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
                price: item.price,
              })),
              notes: saleData.notes || '',
              customer_name: saleData.customerName || '',
              customer_phone: saleData.customerPhone || '',
              customer_address: saleData.customerAddress || '',
              payment_proof_url: saleData.paymentProofUrl || '',
            },
          });

          console.log('[addPublicSale] RPC Result:', { data, error });

          if (error) {
            console.error('[addPublicSale] RPC error object:', JSON.stringify(error, null, 2));
            throw error;
          }

          // Check if RPC returned an error
          if (data && data.error) {
            console.error('[addPublicSale] RPC returned error:', data.error);
            throw new Error(data.error);
          }

          // Refresh products to get updated stock
          await get().fetchProducts();

          // Also refresh sales if authenticated
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            await get().fetchSales();
          }

          return data;
        } catch (err) {
          console.error('[addPublicSale] Failed to create public sale:', err);
          throw err;
        }
      },

      confirmSale: async (saleId: string) => {
        const storeId = get().currentStoreId;
        if (!storeId) throw new Error('No store selected');

        try {
          const { error } = await withTimeout(
            supabase
              .from('sales' as any)
              .update({ status: 'completed' })
              .eq('id', saleId)
              .eq('store_id', storeId),
            15000,
            'Gagal mengkonfirmasi pesanan (timeout)'
          ) as any;

          if (error) throw error;

          // Update local state
          set((state) => {
            const saleIndex = state.sales.findIndex(s => s.id === saleId);
            if (saleIndex !== -1) {
              state.sales[saleIndex].status = 'completed';
            }
          });
        } catch (err) {
          console.error('[confirmSale] Failed to confirm sale:', err);
          throw err;
        }
      },

      deleteSale: async (saleId) => {
        if (get().currentUser?.email === DEMO_EMAIL) {
          set((state) => {
            const sale = state.sales.find(s => s.id === saleId);
            if (sale) {
              for (const item of sale.items) {
                const pIdx = state.products.findIndex(p => p.id === item.productId);
                if (pIdx !== -1) {
                  state.products[pIdx].totalStock = (state.products[pIdx].totalStock || 0) + item.quantity;
                }
              }
            }
            state.sales = state.sales.filter((s) => s.id !== saleId);
          });
          return;
        }

        // Get sale items first for stock restoration
        const { data: items } = await withTimeout(
          supabase
            .from('sale_items' as any)
            .select('*')
            .eq('sale_id', saleId) as any,
          10000,
          'Gagal mengambil detail penjualan (timeout)'
        );

        // Delete sale (cascade deletes items)
        const { error } = await withTimeout(
          supabase
            .from('sales' as any)
            .delete()
            .eq('id', saleId),
          20000,
          'Gagal menghapus penjualan (timeout)'
        );

        if (error) throw error;

        // Restore stock
        const storeId = get().currentStoreId;
        const products = get().products;
        for (const item of items || []) {
          const product = products.find(p => p.id === item.product_id);
          if (product) {
            const qtyToRestore = item.quantity * (product.qtyPerUnit || 1);

            // FIFO: Restore to stock_details
            if (storeId) {
              await restoreStockFIFO(storeId, item.product_id, qtyToRestore, item.cost || product.cost || 0);
            }

            // Also update product total_stock
            await withTimeout(
              supabase
                .from('products' as any)
                .update({ total_stock: (product.totalStock || 0) + qtyToRestore })
                .eq('id', item.product_id),
              10000,
              'Gagal mengembalikan stok (timeout)'
            );
          }
        }

        set((state) => { state.sales = state.sales.filter((s) => s.id !== saleId); });
        await get().fetchProducts();
      },

      addPurchase: async (purchaseData) => {
        const storeId = get().currentStoreId;
        if (!storeId) throw new Error('No store selected');

        if (get().currentUser?.email === DEMO_EMAIL) {
          const qty = purchaseData.isPackPurchase
            ? (purchaseData.packQuantity || 1) * (purchaseData.unitsPerPack || 1)
            : purchaseData.quantity || 1;

          const newPurchase: Purchase = {
            id: `demo-purch-${Date.now()}`,
            productId: purchaseData.productId,
            productName: purchaseData._display?.productName || 'Unknown',
            quantity: qty,
            packQuantity: purchaseData.packQuantity,
            unitsPerPack: purchaseData.unitsPerPack,
            unitCost: purchaseData.unitCost,
            totalCost: qty * purchaseData.unitCost,
            supplier: purchaseData._display?.supplierName,
            supplierId: purchaseData.supplierId,
            notes: purchaseData.notes,
            createdAt: Date.now(),
          };

          set((state) => {
            state.purchases.unshift(newPurchase);
            const pIdx = state.products.findIndex(p => p.id === purchaseData.productId);
            if (pIdx !== -1) {
              state.products[pIdx].totalStock = (state.products[pIdx].totalStock || 0) + qty;
              state.products[pIdx].cost = purchaseData.unitCost;
            }
          });
          return newPurchase;
        }

        const product = get().products.find(p => p.id === purchaseData.productId);
        if (!product) throw new Error('Product not found');

        // CRITICAL FIX: Calculate totalCost correctly
        // In pack purchase mode: unitCost is already the per-unit cost (divided by unitsPerPack)
        // In regular mode: unitCost is the per-unit cost directly
        let totalCost: number;
        if (purchaseData.packQuantity && purchaseData.unitsPerPack) {
          // Pack purchase: unitCost is already calculated per unit
          // totalCost = quantity (already in units) × unitCost (per unit)
          totalCost = Math.round(purchaseData.quantity * purchaseData.unitCost);
        } else {
          // Regular unit purchase
          totalCost = Math.round(purchaseData.quantity * purchaseData.unitCost);
        }

        try {
          // Insert purchase
          const { data, error } = await withTimeout(
            (supabase as any)
              .from('purchases')
              .insert({
                store_id: storeId,
                product_id: purchaseData.productId,
                product_name: product.name,
                quantity: purchaseData.quantity,
                unit_cost: purchaseData.unitCost,
                total_cost: totalCost,
                pack_quantity: purchaseData.packQuantity,
                units_per_pack: purchaseData.unitsPerPack,
                supplier_id: purchaseData.supplierId || null,
                notes: purchaseData.notes || '',
              })
              .select('*, suppliers(name)')
              .single() as any,
            20000,
            'Gagal menyimpan data pembelian (timeout)'
          ) as any;

          if (error) throw error;

          // Add stock detail
          await withTimeout(
            supabase
              .from('stock_details')
              .insert({
                store_id: storeId,
                product_id: purchaseData.productId,
                purchase_id: data.id,
                quantity: purchaseData.quantity,
                unit_cost: purchaseData.unitCost,
              }),
            10000,
            'Gagal menyimpan detail stok'
          ) as any;

          // Fetch latest stock to ensure accuracy
          const { data: latestProduct, error: fetchError } = await supabase
            .from('products')
            .select('total_stock')
            .eq('id', purchaseData.productId)
            .single();

          if (fetchError) {
            console.error('[addPurchase] Error fetching product stock:', fetchError);
          }

          const currentStock = latestProduct?.total_stock || 0;
          const newStock = currentStock + purchaseData.quantity;
          console.log('[addPurchase] Updating stock:', { productId: purchaseData.productId, currentStock, quantity: purchaseData.quantity, newStock });

          // Calculate weighted average cost from all batches
          const { data: allBatches } = await supabase
            .from('stock_details')
            .select('quantity, unit_cost')
            .eq('product_id', purchaseData.productId)
            .gt('quantity', 0);
          let weightedAvgCost = purchaseData.unitCost;
          if (allBatches && allBatches.length > 0) {
            const totalQty = allBatches.reduce((s: number, b: any) => s + b.quantity, 0);
            const totalValue = allBatches.reduce((s: number, b: any) => s + (b.quantity * b.unit_cost), 0);
            weightedAvgCost = totalQty > 0 ? Math.round((totalValue / totalQty) * 100) / 100 : purchaseData.unitCost;
          }

          // Update product stock and cost - use simple update without .select() to avoid RLS issues
          const { error: stockUpdateError } = await withTimeout(
            supabase
              .from('products')
              .update({
                total_stock: newStock,
                cost: weightedAvgCost  // Weighted average cost from all batches
              })
              .eq('id', purchaseData.productId) as any,
            10000,
            'Gagal update stok produk'
          );

          if (stockUpdateError) {
            console.error('[addPurchase] Error updating product stock:', stockUpdateError);
            throw stockUpdateError;
          }

          // Verify the update was successful by fetching the product
          const { data: verifyProduct } = await supabase
            .from('products')
            .select('total_stock')
            .eq('id', purchaseData.productId)
            .single();

          console.log('[addPurchase] Stock update verification - expected:', newStock, 'actual:', verifyProduct?.total_stock);

          const newPurchase = toPurchase(data);

          set((state) => {
            state.purchases.unshift(newPurchase);
            // Optimistically update product stock and cost in local state
            const p = state.products.find(p => p.id === purchaseData.productId);
            if (p) {
              p.totalStock = newStock;
              p.cost = weightedAvgCost;  // Weighted average cost from all batches
              console.log('[addPurchase] Optimistic update - set product stock to:', p.totalStock, 'and cost to:', p.cost);
            }
          });

          // Refresh products to ensure UI is in sync
          await get().fetchProducts();
          return newPurchase;
        } catch (error: any) {
          // Handle Offline / Network Error
          if (isNetworkError(error)) {
            console.log('[addPurchase] Network error detected, switching to offline mode');

            // Create temporary purchase object for optimistic UI
            const tempId = `temp-${Date.now()}`;
            const tempPurchase: Purchase = {
              id: tempId,
              productId: purchaseData.productId,
              productName: product.name,
              quantity: purchaseData.quantity,
              unitCost: purchaseData.unitCost,
              totalCost: totalCost,
              packQuantity: purchaseData.packQuantity,
              unitsPerPack: purchaseData.unitsPerPack,
              supplierId: purchaseData.supplierId,
              supplier: undefined,
              notes: purchaseData.notes || '',
              createdAt: Date.now(),
            };

            // Add to offline queue
            offlineSync.addToQueue('ADD_PURCHASE', purchaseData);

            // Optimistic Update
            set((state) => {
              state.purchases.unshift(tempPurchase);
              // Optimistically update product stock and cost in local state
              const p = state.products.find(p => p.id === purchaseData.productId);
              if (p) {
                p.totalStock = (p.totalStock || 0) + purchaseData.quantity;
                p.cost = purchaseData.unitCost;
              }
            });

            return tempPurchase;
          }

          throw error;
        }
      },

      updatePurchase: async (purchaseId, purchaseData) => {
        const storeId = get().currentStoreId;
        if (!storeId) throw new Error('No store selected');

        // Get old purchase to calculate stock difference
        const { data: oldPurchase } = await withTimeout(
          supabase
            .from('purchases')
            .select('*')
            .eq('id', purchaseId)
            .single() as any,
          10000,
          'Gagal mengambil data pembelian lama'
        ) as any;

        if (!oldPurchase) throw new Error('Purchase not found');

        // Calculate stock difference
        const oldQuantity = oldPurchase.quantity;
        const newQuantity = purchaseData.quantity;
        const quantityDiff = newQuantity - oldQuantity;

        // CRITICAL FIX: Calculate totalCost correctly
        // In pack purchase mode: unitCost is already the per-unit cost (divided by unitsPerPack)
        // In regular mode: unitCost is the per-unit cost directly
        let totalCost: number;
        if (purchaseData.packQuantity && purchaseData.unitsPerPack) {
          // Pack purchase: unitCost is already calculated per unit
          // totalCost = quantity (already in units) × unitCost (per unit)
          totalCost = Math.round(purchaseData.quantity * purchaseData.unitCost);
        } else {
          // Regular unit purchase
          totalCost = Math.round(purchaseData.quantity * purchaseData.unitCost);
        }

        // Update purchase
        const { data, error } = await withTimeout(
          supabase
            .from('purchases')
            .update({
              quantity: purchaseData.quantity,
              unit_cost: purchaseData.unitCost,
              total_cost: totalCost,
              pack_quantity: purchaseData.packQuantity,
              units_per_pack: purchaseData.unitsPerPack,
              supplier_id: purchaseData.supplierId || null,
              notes: purchaseData.notes || '',
            })
            .eq('id', purchaseId)
            .select('*, suppliers(name)')
            .single() as any,
          20000,
          'Gagal mengupdate data pembelian'
        ) as any;

        if (error) throw error;

        // Update stock detail
        // We assume one stock detail per purchase for simplicity
        const { error: stockDetailError, data: stockDetailResult } = await withTimeout(
          supabase
            .from('stock_details')
            .update({
              quantity: purchaseData.quantity,
              unit_cost: purchaseData.unitCost,
            })
            .eq('purchase_id', purchaseId)
            .select() as any,
          10000,
          'Gagal mengupdate detail stok'
        ) as any;

        if (stockDetailError) {
          console.error('[updatePurchase] Error updating stock_details:', stockDetailError);
        } else if (!stockDetailResult || stockDetailResult.length === 0) {
          console.warn('[updatePurchase] No stock_details matched purchase_id:', purchaseId, '- falling back to product_id match');
          // Fallback: try matching by product_id and closest created_at to the purchase
          const { error: fallbackError } = await supabase
            .from('stock_details')
            .update({
              quantity: purchaseData.quantity,
              unit_cost: purchaseData.unitCost,
            })
            .eq('product_id', oldPurchase.product_id)
            .gte('created_at', new Date(new Date(oldPurchase.created_at).getTime() - 5000).toISOString())
            .lte('created_at', new Date(new Date(oldPurchase.created_at).getTime() + 5000).toISOString());

          if (fallbackError) {
            console.error('[updatePurchase] Fallback stock_details update also failed:', fallbackError);
          } else {
            console.log('[updatePurchase] Fallback stock_details update succeeded');
          }
        } else {
          console.log('[updatePurchase] stock_details updated successfully:', stockDetailResult.length, 'row(s)');
        }

        // Update product stock and cost if relevant
        const productUpdates: { total_stock?: number; cost?: number } = {};
        if (quantityDiff !== 0) {
          // Fetch latest stock
          const { data: latestProduct } = await supabase
            .from('products')
            .select('total_stock')
            .eq('id', oldPurchase.product_id)
            .single();

          const currentStock = latestProduct?.total_stock || 0;
          productUpdates.total_stock = currentStock + quantityDiff;
        }

        // Recalculate weighted average cost from all batches
        const { data: allBatches } = await supabase
          .from('stock_details')
          .select('quantity, unit_cost')
          .eq('product_id', oldPurchase.product_id)
          .gt('quantity', 0);
        if (allBatches && allBatches.length > 0) {
          const totalQty = allBatches.reduce((s: number, b: any) => s + b.quantity, 0);
          const totalValue = allBatches.reduce((s: number, b: any) => s + (b.quantity * b.unit_cost), 0);
          productUpdates.cost = totalQty > 0 ? Math.round((totalValue / totalQty) * 100) / 100 : purchaseData.unitCost;
        }

        if (Object.keys(productUpdates).length > 0) {
          await withTimeout(
            supabase
              .from('products')
              .update(productUpdates)
              .eq('id', oldPurchase.product_id),
            10000,
            'Gagal update stok produk'
          );
        }

        const updatedPurchase = toPurchase(data);

        set((state) => {
          const index = state.purchases.findIndex(p => p.id === purchaseId);
          if (index !== -1) {
            state.purchases[index] = updatedPurchase;
          }

          // Optimistically update product stock and cost
          const p = state.products.find(p => p.id === oldPurchase.product_id);
          if (p) {
            if (quantityDiff !== 0) {
              p.totalStock = (p.totalStock || 0) + quantityDiff;
            }
            // Optimistically update cost to weighted average
            if (productUpdates.cost !== undefined) {
              p.cost = productUpdates.cost;
            }
          }
        });

        await get().fetchProducts();
        return updatedPurchase;
      },

      deletePurchase: async (purchaseId) => {
        // Get purchase for stock restoration
        const { data: purchase } = await withTimeout(
          supabase
            .from('purchases')
            .select('*')
            .eq('id', purchaseId)
            .single() as any,
          10000,
          'Gagal mengambil data pembelian (timeout)'
        ) as any;

        if (!purchase) throw new Error('Purchase not found');

        // Delete stock details
        await withTimeout(
          supabase
            .from('stock_details')
            .delete()
            .eq('purchase_id', purchaseId),
          10000,
          'Gagal menghapus detail stok (timeout)'
        ) as any;

        // Delete purchase
        const { error } = await withTimeout(
          supabase
            .from('purchases')
            .delete()
            .eq('id', purchaseId),
          20000,
          'Gagal menghapus pembelian (timeout)'
        ) as any;

        if (error) throw error;

        // Update product stock
        const product = get().products.find(p => p.id === purchase.product_id);
        if (product) {
          await withTimeout(
            supabase
              .from('products')
              .update({ total_stock: Math.max(0, (product.totalStock || 0) - purchase.quantity) })
              .eq('id', purchase.product_id),
            10000,
            'Gagal update stok produk (timeout)'
          ) as any;
        }

        set((state) => { state.purchases = state.purchases.filter((p) => p.id !== purchaseId); });
        await get().fetchProducts();
      },

      addSupplier: async (supplierData) => {
        if (get().currentUser?.email === DEMO_EMAIL) {
          const newSupplier: Supplier = {
            id: `demo-sup-${Date.now()}`,
            name: supplierData.name,
            contactPerson: supplierData.contactPerson,
            phone: supplierData.phone,
            address: supplierData.address,
            createdAt: Date.now(),
          };
          set((state) => { state.suppliers.push(newSupplier); });
          return newSupplier;
        }

        const storeId = get().currentStoreId;
        if (!storeId) throw new Error('No store selected');

        const { data, error } = await withTimeout(
          supabase
            .from('suppliers')
            .insert({
              store_id: storeId,
              name: supplierData.name,
              contact_person: supplierData.contactPerson || '',
              phone: supplierData.phone || '',
              address: supplierData.address || '',
            })
            .select()
            .single(),
          20000,
          'Gagal menyimpan pemasok (timeout)'
        ) as any;

        if (error) throw error;
        const newSupplier = toSupplier(data);
        set((state) => { state.suppliers.push(newSupplier); });
        return newSupplier;
      },

      updateSupplier: async (supplierId, supplierData) => {
        const { data, error } = await withTimeout(
          supabase
            .from('suppliers')
            .update({
              name: supplierData.name,
              contact_person: supplierData.contactPerson,
              phone: supplierData.phone,
              address: supplierData.address,
            })
            .eq('id', supplierId)
            .select()
            .single(),
          20000,
          'Gagal update pemasok (timeout)'
        ) as any;

        if (error) throw error;
        const updatedSupplier = toSupplier(data);
        set((state) => {
          const index = state.suppliers.findIndex((s) => s.id === supplierId);
          if (index !== -1) state.suppliers[index] = updatedSupplier;
        });
        return updatedSupplier;
      },

      deleteSupplier: async (supplierId) => {
        const { error } = await withTimeout(
          supabase
            .from('suppliers')
            .delete()
            .eq('id', supplierId),
          20000,
          'Gagal menghapus pemasok (timeout)'
        ) as any;

        if (error) throw error;
        set((state) => { state.suppliers = state.suppliers.filter((s) => s.id !== supplierId); });
      },

      addJajananRequest: async (requestData) => {
        const storeId = get().currentStoreId;
        if (!storeId) throw new Error('No store selected');

        // Check if we are in public mode or visiting another store
        const { data: { session } } = await supabase.auth.getSession();
        let shouldSelectReturn = false;

        if (session?.user) {
          // Check if user is a member of this store
          const { data: member } = await supabase
            .from('store_members')
            .select('id')
            .eq('store_id', storeId)
            .eq('user_id', session.user.id)
            .maybeSingle();

          shouldSelectReturn = !!member;
        }

        let query = supabase
          .from('snack_requests')
          .insert({
            store_id: storeId,
            requester_name: requestData.requesterName,
            snack_name: requestData.snackName,
            quantity: requestData.quantity,
            notes: requestData.notes || '',
            status: 'pending',
          });

        // Only select returned row if we are a store member (authorized to view)
        if (shouldSelectReturn) {
          // @ts-expect-error
          query = query.select().single();
        }

        const { data, error } = await withTimeout(
          query,
          20000,
          'Gagal menyimpan request (timeout)'
        ) as any;

        if (error) throw error;

        // Only update local state if we got data back (authenticated mode)
        if (data) {
          const newRequest = toJajananRequest(data);
          set((state) => { state.jajananRequests.unshift(newRequest); });
          return newRequest;
        }

        // Return a mock object for public mode success
        return {
          id: 'temp-id',
          storeId,
          requesterName: requestData.requesterName,
          snackName: requestData.snackName,
          quantity: requestData.quantity,
          notes: requestData.notes,
          status: 'pending',
          isRead: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        } as JajananRequest;
      },

      updateJajananRequestStatus: async (requestId, status) => {
        const { data, error } = await withTimeout(
          supabase
            .from('snack_requests')
            .update({ status, is_read: true })
            .eq('id', requestId)
            .select()
            .single(),
          20000,
          'Gagal update status request (timeout)'
        ) as any;

        if (error) throw error;
        const updatedRequest = toJajananRequest(data);
        set((state) => {
          const index = state.jajananRequests.findIndex((r) => r.id === requestId);
          if (index !== -1) state.jajananRequests[index] = updatedRequest;
        });
        return updatedRequest;
      },

      createOpname: async (payload) => {
        const storeId = get().currentStoreId;
        if (!storeId) throw new Error('No store selected');

        const products = get().products;
        const soldItems: any[] = [];
        let totalValue = 0;
        let totalCost = 0;

        try {
          // Process updates sequentially to avoid race conditions
          for (const item of payload.items) {
            const product = products.find(p => p.id === item.productId);
            if (!product) continue;

            const currentStock = product.totalStock || 0;
            const physicalStock = item.quantity;
            const difference = physicalStock - currentStock;

            if (difference === 0) continue;

            // Update product total_stock
            await withTimeout(
              supabase
                .from('products')
                .update({ total_stock: physicalStock })
                .eq('id', product.id),
              10000,
              `Gagal update stok ${product.name}`
            );

            // Handle Stock Details (Correcting batches)
            if (difference < 0) {
              // Missing stock (assumed sold)
              const qtyMissing = Math.abs(difference);
              await deductStockFIFO(product.id, qtyMissing);

              // Prepare for Sale Record
              // USER REQUEST: Record as pieces to match Opname visual
              const qtyPerUnit = product.qtyPerUnit || 1;
              const unitsSold = qtyMissing / qtyPerUnit;

              // If it's a pack (qtyPerUnit > 1), we convert price/cost to per-piece
              const isPack = qtyPerUnit > 1;
              const quantityToRecord = qtyMissing; // Always record pieces
              const priceToRecord = isPack ? Math.round(product.price / qtyPerUnit) : product.price;
              const costToRecord = isPack ? Math.round((product.cost || 0) / qtyPerUnit) : (product.cost || 0);

              console.log(`[createOpname] V2 - Item: ${product.name}`);
              console.log(`[createOpname] Missing Qty (pcs): ${qtyMissing}`);
              console.log(`[createOpname] Recording as: ${quantityToRecord} pcs @ ${priceToRecord}`);

              soldItems.push({
                product_id: product.id,
                product_name: isPack ? `${product.name} (${qtyMissing} pcs)` : product.name, // Add info if it was a pack
                quantity: quantityToRecord,
                price: priceToRecord,
                cost: costToRecord
              });

              // Total value calculation remains based on exact units sold to ensure currency accuracy
              // totalValue += unitsSold * product.price; 
              // Equivalent to:
              totalValue += quantityToRecord * priceToRecord;
              totalCost += quantityToRecord * costToRecord;

            } else {
              // Surplus stock (Found)
              // Add to newest batch or create new
              // Use last purchase cost or product cost
              await restoreStockFIFO(storeId, product.id, difference, product.cost || 0);
            }
          }

          // Create "Opname / Correction" Sale if there are missing items
          if (soldItems.length > 0) {
            const saleData = {
              store_id: storeId,
              total: Math.round(totalValue),
              profit: Math.round(totalValue - totalCost),
              sale_type: 'retail', // treat as retail sale
              status: 'completed',
              notes: `[OPNAME] Penyesuaian Stok Otomatis (${new Date().toLocaleDateString('id-ID')})`,
            };

            const { data: sale, error: saleError } = await withTimeout(
              supabase
                .from('sales')
                .insert(saleData)
                .select()
                .single(),
              15000,
              'Gagal membuat data penjualan otomatis'
            ) as any;

            if (saleError) throw saleError;

            if (sale) {
              const saleItems = soldItems.map(item => ({
                sale_id: sale.id,
                ...item
              }));

              const { error: itemsError } = await withTimeout(
                supabase
                  .from('sale_items')
                  .insert(saleItems),
                10000,
                'Gagal menyimpan detail penjualan otomatis'
              );

              if (itemsError) console.error("Failed to save opname sale items", itemsError);
            }
          }

          // Refresh data
          await get().fetchProducts();
          await get().fetchSales();
          await get().fetchStockDetails(soldItems[0]?.product_id || ''); // Fetch for at least one if exists? optional.

        } catch (error) {
          console.error('[createOpname] Error:', error);
          throw error;
        }
      },

      adjustStock: async (productId, quantity, unitCost, isFromProductForm = false) => {
        const storeId = get().currentStoreId;
        if (!storeId) throw new Error('No store selected');

        const product = get().products.find(p => p.id === productId);
        if (!product) throw new Error('Product not found');

        const currentStock = product.totalStock || 0;
        const delta = quantity - currentStock;

        if (delta > 0) {
          // Add stock
          await withTimeout(
            supabase
              .from('stock_details')
              .insert({
                store_id: storeId,
                product_id: productId,
                quantity: delta,
                unit_cost: unitCost,
              }),
            10000,
            'Gagal menyimpan detail stok (timeout)'
          ) as any;
        }

        // Update product stock
        await withTimeout(
          supabase
            .from('products')
            .update({ total_stock: quantity })
            .eq('id', productId),
          10000,
          'Gagal update stok produk (timeout)'
        ) as any;

        await get().fetchProducts();
      },

      fetchReconciliations: async () => {
        const storeId = get().currentStoreId;
        if (!storeId) {
          // CRITICAL FIX: Don't clear reconciliations when storeId is null
          return;
        }

        try {
          set({ isLoading: true, error: null });
          const { data, error } = await withTimeout(
            supabase
              .from('reconciliations' as any)
              .select('*')
              .eq('store_id', storeId)
              .order('created_at', { ascending: false }),
            15000,
            'Gagal memuat riwayat rekonsiliasi'
          ) as any;

          if (error) throw error;
          set({ reconciliations: (data || []).map(toReconciliation), isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch reconciliations';
          set({ isLoading: false, error: errorMessage });
        }
      },

      // Preload all dashboard data at once
      preloadDashboardData: async () => {
        set({ isLoading: true });
        try {
          // Fetch all data in parallel
          await Promise.all([
            get().fetchProducts(),
            get().fetchSales(),
            get().fetchPurchases(),
            get().fetchSuppliers(),
            get().fetchJajananRequests(),
            get().fetchInitialBalance(),
            get().fetchStoreProfile(),
            get().fetchReconciliations(),
          ]);

          set({ isLoading: false });
        } catch (error: any) {
          console.error('[PRELOAD DASHBOARD DATA ERROR]', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to preload dashboard data';
          set({ error: errorMessage, isLoading: false });
        }
      },

      createReconciliation: async (payload) => {
        const storeId = get().currentStoreId;
        if (!storeId) throw new Error('No store selected');

        const products = get().products;
        const expectedCash = 0; // For self-service mode, we assume 0 expected cash from system for now

        const stockItems: any[] = [];
        let totalStockValue = 0;
        let totalStockCost = 0;
        const soldItems: any[] = [];

        // Process each stock item
        for (const item of payload.stockItems) {
          const product = products.find(p => p.id === item.productId);
          if (!product) continue;

          const systemStock = product.totalStock || 0;
          const physicalStock = item.physicalStock;
          const difference = physicalStock - systemStock; // negative = sold

          // Calculate value if sold (difference < 0)
          let itemValue = 0;
          let itemCost = 0;

          if (difference < 0) {
            const qtySold = Math.abs(difference); // in pieces
            const qtyPerUnit = product.qtyPerUnit || 1;

            // USER FIX: Record as pieces to match Opname visual and avoid integer errors
            const isPack = qtyPerUnit > 1;
            const quantityToRecord = qtySold; // Always record pieces
            const priceToRecord = isPack ? Math.round(product.price / qtyPerUnit) : product.price;
            const costToRecord = isPack ? Math.round((product.cost || 0) / qtyPerUnit) : (product.cost || 0);

            // Calculate totals based on actual piece value
            itemValue = quantityToRecord * priceToRecord;
            itemCost = quantityToRecord * costToRecord;

            totalStockValue += itemValue;
            totalStockCost += itemCost;

            console.log(`[createReconciliation] Item: ${product.name}`);
            console.log(`[createReconciliation] Sold: ${quantityToRecord} pcs @ ${priceToRecord}`);

            soldItems.push({
              product_id: product.id,
              product_name: isPack ? `${product.name} (${qtySold} pcs)` : product.name,
              quantity: quantityToRecord,
              price: priceToRecord,
              cost: costToRecord
            });
          }

          stockItems.push({
            productId: product.id,
            productName: product.name,
            systemStock,
            physicalStock,
            difference,
            unitPrice: product.price / (product.qtyPerUnit || 1), // per-piece price
            unitCost: (product.cost || 0) / (product.qtyPerUnit || 1),
            totalValue: itemValue
          });

          // Update product stock
          if (difference !== 0) {
            await (supabase as any)
              .from('products')
              .update({ total_stock: physicalStock })
              .eq('id', product.id);
          }
        }

        const generatedSaleIds: string[] = [];

        // Create a sale record if there are sold items
        if (soldItems.length > 0) {
          const saleData = {
            store_id: storeId,
            total: totalStockValue,
            profit: totalStockValue - totalStockCost,
            sale_type: 'retail', // Default to retail
            notes: '[REKON] Penjualan cash dari rekonsiliasi terpadu'
          };

          const { data: sale, error: saleError } = await (supabase as any)
            .from('sales')
            .insert(saleData)
            .select()
            .single();

          if (saleError) throw saleError;
          if (sale) {
            generatedSaleIds.push(sale.id);

            // Create sale items
            const saleItems = soldItems.map(item => ({
              sale_id: sale.id,
              ...item
            }));

            const { error: itemsError } = await (supabase as any)
              .from('sale_items')
              .insert(saleItems);

            if (itemsError) throw itemsError;
          }
        }

        // Calculate unidentified amount (Cash Difference - Stock Value)
        // If cash > stock value, it's surplus. If cash < stock value, it's missing money.
        // But here logic is: Actual Cash is what we have. 
        // We assume "sold items" *should* generate cash.
        // So expected cash from THIS session = totalStockValue.
        // But we might have previous cash. 
        // Let's stick to the requirement: Unidentified = Actual Cash - Total Stock Value (assuming 0 start)
        const unidentifiedAmount = payload.actualCash - totalStockValue;

        const { data, error } = await (supabase as any)
          .from('reconciliations')
          .insert({
            store_id: storeId,
            date: new Date().toISOString().split('T')[0],
            expected_cash: expectedCash,
            actual_cash: payload.actualCash,
            cash_difference: payload.actualCash - expectedCash, // Total cash difference
            stock_items: stockItems,
            total_stock_value: totalStockValue,
            total_stock_cost: totalStockCost,
            unidentified_amount: unidentifiedAmount,
            generated_sale_ids: generatedSaleIds,
            notes: payload.notes || '',
            status: unidentifiedAmount !== 0 ? 'has_discrepancy' : 'completed',
          })
          .select()
          .single();

        if (error) throw error;
        const newRecon = toReconciliation(data);
        set((state) => { state.reconciliations.unshift(newRecon); });

        // Refresh data
        await get().fetchProducts();
        await get().fetchSales();

        return newRecon;
      },

      processOfflineQueue: async () => {
        const queue = offlineSync.getQueue();
        if (queue.length === 0 || !navigator.onLine) {
          return;
        }

        console.log('[processOfflineQueue] Processing', queue.length, 'items');

        await offlineSync.processQueue(async (item) => {
          switch (item.type) {
            case 'ADD_SALE':
              // Re-add the sale using the original addSale logic
              // We need to temporarily bypass offline mode for this
              await get().addSale(item.payload);
              break;

            case 'ADD_PRODUCT':
              await get().addProduct(item.payload);
              break;

            case 'UPDATE_PRODUCT':
              // For updates, we need productId which should be in payload
              if ((item.payload as any).productId) {
                await get().updateProduct((item.payload as any).productId, item.payload);
              }
              break;

            case 'ADD_PURCHASE':
              await get().addPurchase(item.payload);
              break;

            case 'UPDATE_PURCHASE':
              if ((item.payload as any).purchaseId) {
                await get().updatePurchase((item.payload as any).purchaseId, item.payload);
              }
              break;

            case 'ADD_SUPPLIER':
              await get().addSupplier(item.payload);
              break;

            case 'ADD_REQUEST':
              await get().addJajananRequest(item.payload);
              break;

            default:
              console.warn('[processOfflineQueue] Unknown operation type:', item.type);
          }
        });

        // Refresh data after syncing
        await get().fetchProducts();
        await get().fetchSales();
        await get().fetchPurchases();
      },
    })),
    {
      name: 'warung-storage-v5',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        products: state.products,
        sales: state.sales,
        suppliers: state.suppliers,
        storeProfile: state.storeProfile,
        opnameMode: state.opnameMode,
        currentStoreId: state.currentStoreId,
        currentUser: state.currentUser, // Persist user data across reloads
      }),
    }
  )
);

// Clear old localStorage data on load to prevent stale state
if (typeof window !== 'undefined') {
  localStorage.removeItem('warung-storage-v4');
  localStorage.removeItem('warung-storage-v3');
  localStorage.removeItem('warung-storage-v2');
  localStorage.removeItem('warung-storage');
}
