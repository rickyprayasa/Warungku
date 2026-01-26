import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { supabase } from './supabase';
import type { Product, ProductFormValues, Sale, SaleFormValues, Purchase, PurchaseFormValues, Supplier, SupplierFormValues, JajananRequest, JajananRequestFormValues, StockDetail, OpnamePayload, Reconciliation, ReconciliationPayload } from '@shared/types';
import { AuditLogger } from './audit-logger';

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
  };
  opnameMode: 'retail' | 'display' | 'terpadu';
  isLoading: boolean;
  error: string | null;

  // Store context for multi-tenant
  currentStoreId: string | null;
  setCurrentStoreId: (storeId: string | null) => void;

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

function toSale(row: any, items: any[]): Sale {
  return {
    id: row.id,
    total: Number(row.total),
    profit: Number(row.profit),
    saleType: row.sale_type || 'retail',
    notes: row.notes || '',
    createdAt: new Date(row.created_at).getTime(),
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

// Timeout helper - increased default timeout for slow connections
async function withTimeout<T>(
  promise: Promise<T> | PromiseLike<T>,
  timeoutMs: number = 30000,
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
  } catch (error) {
    clearTimeout(timeoutId!);
    throw error;
  }
}

export const useWarungStore = create<WarungState & WarungActions>()(
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
    sidebarCollapsed: false,

    setSidebarCollapsed: (collapsed) => {
      set({ sidebarCollapsed: collapsed });
    },

    setCurrentStoreId: (storeId) => {
      console.log('[STORE] Setting current store ID to:', storeId, 'previous:', get().currentStoreId);
      // Reset store profile when switching stores to avoid cross-store data leakage
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
        currentStoreId: null,
      });
    },

    fetchProducts: async () => {
      const storeId = get().currentStoreId;
      console.log('[FETCH PRODUCTS] Called with storeId:', storeId);
      if (!storeId) {
        console.log('[FETCH PRODUCTS] No storeId, skipping fetch (keeping existing data)');
        // CRITICAL FIX: Don't clear products when storeId is null
        // This prevents data from disappearing during store transitions
        return;
      }

      // Check if we are in public store mode FIRST (no async needed)
      // Public store URLs are anything that's NOT in internalRoutes
      const internalRoutes = ['/', '/pos', '/dashboard', '/opname', '/login', '/register', '/checkout', '/upgrade', '/forgot-password', '/update-password', '/auth/callback'];
      const isInternalRoute = internalRoutes.some(route => window.location.pathname.startsWith(route)) || window.location.pathname.startsWith('/admin');
      const isPublicStore = !isInternalRoute && window.location.pathname !== '/';

      // SECURITY: Only check membership for internal (dashboard) routes
      // For public store, RLS already protects modification, reading is allowed
      if (!isPublicStore) {
        // Lazy auth check - only when needed for internal routes
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: member } = await supabase
            .from('store_members')
            .select('id')
            .eq('store_id', storeId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (!member) {
            console.error('[SECURITY ALERT] User attempted to fetch products from a store they are not a member of!', { userId: user.id, storeId });
            set({ products: [] });
            return;
          }
        }
      }

      try {
        // Use withTimeout to prevent hanging indefinitely
        const { data, error } = await withTimeout(
          supabase
            .from('products')
            .select('*')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false }) as any,
          15000, // 15s timeout
          'Gagal memuat produk'
        );

        if (error) {
          console.error('[FETCH PRODUCTS] Supabase error:', error);
          throw error;
        }

        const mappedProducts = (data || []).map(toProduct);

        // Debug: Log products with their stock
        const debugProducts = mappedProducts.filter(p => p.name.toLowerCase().includes('good day'));
        if (debugProducts.length > 0) {
          console.log('[FETCH PRODUCTS] Good Day products:', debugProducts.map(p => ({ name: p.name, totalStock: p.totalStock })));
        }

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

        console.log('[FETCH PRODUCTS] Loaded', mappedProducts.length, 'products');
        set({ products: mappedProducts });
      } catch (error) {
        console.error('[FETCH PRODUCTS ERROR]', error);
        // Don't set global error state to prevent UI blocking
      }
    },

    fetchSales: async () => {
      const storeId = get().currentStoreId;
      if (!storeId) {
        // CRITICAL FIX: Don't clear sales when storeId is null
        return;
      }

      try {
        // Fetch sales with timeout
        const { data: salesData, error: salesError } = await withTimeout(
          supabase
            .from('sales')
            .select('*')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false }) as any,
          15000,
          'Gagal memuat penjualan'
        );

        if (salesError) throw salesError;

        // Fetch sale items
        const saleIds = (salesData || []).map((s: any) => s.id);
        let itemsData: any[] = [];

        if (saleIds.length > 0) {
          const { data, error: itemsError } = await withTimeout(
            supabase
              .from('sale_items')
              .select('*')
              .in('sale_id', saleIds) as any,
            15000,
            'Gagal memuat detail penjualan'
          );

          if (itemsError) throw itemsError;
          itemsData = data || [];
        }

        const sales = (salesData || []).map((sale: any) =>
          toSale(sale, itemsData.filter(item => item.sale_id === sale.id))
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

      try {
        const { data, error } = await supabase
          .from('purchases')
          .select('*, suppliers(name)')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false });

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

      try {
        const { data, error } = await supabase
          .from('suppliers')
          .select('*')
          .eq('store_id', storeId)
          .order('name');

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

      try {
        const { data, error } = await supabase
          .from('snack_requests')
          .select('*')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        set({ jajananRequests: (data || []).map(toJajananRequest) });
      } catch (error) {
        console.error('[FETCH JAJANAN REQUESTS ERROR]', error);
      }
    },

    fetchStockDetails: async (productId) => {
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

      try {
        const { data, error } = await supabase
          .from('settings')
          .select('value')
          .eq('store_id', storeId)
          .eq('key', 'initial_balance')
          .single() as any;

        if (error) {
          // Ignore 406 errors
          if (error.code === '406' || error.message?.includes('406')) {
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

      try {
        // Get store data directly
        const { data: store, error } = await supabase
          .from('stores')
          .select('*')
          .eq('id', storeId)
          .single() as any;

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
            }
          });
        }
      } catch (error) {
        console.error('Failed to fetch store profile:', error);
      }
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
          .from('settings')
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
      if (!storeId) throw new Error('No store selected');

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
              .from('stores')
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
          const { error: settingsError } = await supabase
            .from('settings')
            .upsert(settingsToUpsert, { onConflict: 'store_id,key' } as any);

          if (settingsError) console.error('Failed to save settings:', settingsError);
        } catch (settingsErr) {
          console.error('Exception saving settings:', settingsErr);
        }

        set({ storeProfile: profile });
      } catch (error) {
        console.error('Failed to save store profile:', error);
        throw error;
      }
    },

    updateOpnameMode: async (mode) => {
      const storeId = get().currentStoreId;
      if (!storeId) throw new Error('No store selected');

      try {
        const { error } = await supabase
          .from('settings')
          .upsert({
            store_id: storeId,
            key: 'opname_mode',
            value: mode,
          }, { onConflict: 'store_id,key' } as any);

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

      // Retry logic helper - more retries for slow connections
      const retryOperation = async (operation: () => Promise<any>, maxRetries = 4) => {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await operation();
          } catch (error: any) {
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

      const { data, error } = await retryOperation(() =>
        withTimeout(
          supabase
            .from('products')
            .insert({
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
              min_stock_level: productData.minStockLevel || 10,
              qty_per_unit: productData.qtyPerUnit || 1,
            })
            .select()
            .single() as any,
          45000, // 45s timeout - increased for slow connections and large images
          'Gagal menyimpan produk (timeout). Coba lagi dengan koneksi yang lebih stabil.'
        )
      );

      if (error) throw error;
      const newProduct = toProduct(data);
      set((state) => { state.products.push(newProduct); });

      // Log audit event
      const user = await supabase.auth.getUser();
      if (user.data.user) {
        await AuditLogger.logProductCreate(user.data.user.id, storeId, newProduct.id, newProduct);
      }

      return newProduct;
    },

    updateProduct: async (productId, productData) => {
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

      const { data, error } = await retryOperation(() =>
        withTimeout(
          supabase
            .from('products')
            .update({
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
            })
            .eq('id', productId)
            .select()
            .single() as any,
          45000, // 45s timeout - increased for slow connections and large images
          'Gagal update produk (timeout). Coba lagi dengan koneksi yang lebih stabil.'
        )
      );

      if (error) throw error;
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
      const { error } = await withTimeout(
        supabase
          .from('products')
          .delete()
          .eq('id', productId),
        20000,
        'Gagal menghapus produk (timeout)'
      );

      if (error) throw error;

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

      // Calculate totals
      const products = get().products;
      let total = 0;
      let profit = 0;
      const items = saleData.items.map(item => {
        const product = products.find(p => p.id === item.productId);
        const price = item.price;
        const cost = product?.cost || 0;
        total += price * item.quantity;
        profit += (price - cost) * item.quantity;
        return {
          product_id: item.productId,
          product_name: item.productName,
          quantity: item.quantity,
          price: price,
          cost: cost,
        };
      });

      // Insert sale
      const { data: saleRow, error: saleError } = await withTimeout(
        supabase
          .from('sales')
          .insert({
            store_id: storeId,
            total,
            profit,
            sale_type: (saleData as any).saleType || 'retail',
            notes: saleData.notes || '',
          })
          .select()
          .single() as any,
        30000,
        'Gagal menyimpan penjualan (timeout)'
      );


      if (saleError) throw saleError;

      // Insert sale items
      const { error: itemsError } = await withTimeout(
        supabase
          .from('sale_items')
          .insert(items.map(item => ({ ...item, sale_id: saleRow.id }))),
        30000,
        'Gagal menyimpan detail penjualan (timeout)'
      );

      if (itemsError) throw itemsError;

      // Update stock
      for (const item of saleData.items) {
        const product = products.find(p => p.id === item.productId);
        if (product) {
          const qtyToDeduct = item.quantity * (product.qtyPerUnit || 1);
          await withTimeout(
            supabase
              .from('products')
              .update({ total_stock: Math.max(0, (product.totalStock || 0) - qtyToDeduct) })
              .eq('id', item.productId),
            15000,
            'Gagal update stok produk (timeout)'
          );
        }
      }

      const newSale = toSale(saleRow, items.map(i => ({ ...i, sale_id: saleRow.id })));
      set((state) => { state.sales.unshift(newSale); });

      // Refresh products
      await get().fetchProducts();
      return newSale;
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

    deleteSale: async (saleId) => {
      // Get sale items first for stock restoration
      const { data: items } = await withTimeout(
        supabase
          .from('sale_items')
          .select('*')
          .eq('sale_id', saleId) as any,
        10000,
        'Gagal mengambil detail penjualan (timeout)'
      );

      // Delete sale (cascade deletes items)
      const { error } = await withTimeout(
        supabase
          .from('sales')
          .delete()
          .eq('id', saleId),
        20000,
        'Gagal menghapus penjualan (timeout)'
      );

      if (error) throw error;

      // Restore stock
      const products = get().products;
      for (const item of items || []) {
        const product = products.find(p => p.id === item.product_id);
        if (product) {
          const qtyToRestore = item.quantity * (product.qtyPerUnit || 1);
          await withTimeout(
            supabase
              .from('products')
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

      // Insert purchase
      const { data, error } = await withTimeout(
        supabase
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
      );

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
      );

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

      // Update product stock and cost - use simple update without .select() to avoid RLS issues
      const { error: stockUpdateError } = await withTimeout(
        supabase
          .from('products')
          .update({
            total_stock: newStock,
            cost: purchaseData.unitCost  // Update the cost to the latest purchase cost
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
          p.cost = purchaseData.unitCost;  // Update the cost to the latest purchase cost
          console.log('[addPurchase] Optimistic update - set product stock to:', p.totalStock, 'and cost to:', p.cost);
        }
      });

      // Refresh products to ensure UI is in sync
      await get().fetchProducts();
      return newPurchase;
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
      );

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
      );

      if (error) throw error;

      // Update stock detail
      // We assume one stock detail per purchase for simplicity
      await withTimeout(
        supabase
          .from('stock_details')
          .update({
            quantity: purchaseData.quantity,
            unit_cost: purchaseData.unitCost,
          })
          .eq('purchase_id', purchaseId),
        10000,
        'Gagal mengupdate detail stok'
      );

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

      // Update cost if the unit cost has changed
      if (oldPurchase.unit_cost !== purchaseData.unitCost) {
        productUpdates.cost = purchaseData.unitCost;
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
          // Update cost if the unit cost has changed
          if (oldPurchase.unit_cost !== purchaseData.unitCost) {
            p.cost = purchaseData.unitCost;
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
      );

      if (!purchase) throw new Error('Purchase not found');

      // Delete stock details
      await withTimeout(
        supabase
          .from('stock_details')
          .delete()
          .eq('purchase_id', purchaseId),
        10000,
        'Gagal menghapus detail stok (timeout)'
      );

      // Delete purchase
      const { error } = await withTimeout(
        supabase
          .from('purchases')
          .delete()
          .eq('id', purchaseId),
        20000,
        'Gagal menghapus pembelian (timeout)'
      );

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
        );
      }

      set((state) => { state.purchases = state.purchases.filter((p) => p.id !== purchaseId); });
      await get().fetchProducts();
    },

    addSupplier: async (supplierData) => {
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
      );

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
      );

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
      );

      if (error) throw error;
      set((state) => { state.suppliers = state.suppliers.filter((s) => s.id !== supplierId); });
    },

    addJajananRequest: async (requestData) => {
      const storeId = get().currentStoreId;
      if (!storeId) throw new Error('No store selected');

      const { data, error } = await withTimeout(
        supabase
          .from('snack_requests')
          .insert({
            store_id: storeId,
            requester_name: requestData.requesterName,
            snack_name: requestData.snackName,
            quantity: requestData.quantity,
            notes: requestData.notes || '',
            status: 'pending',
          })
          .select()
          .single(),
        20000,
        'Gagal menyimpan request (timeout)'
      );

      if (error) throw error;
      const newRequest = toJajananRequest(data);
      set((state) => { state.jajananRequests.unshift(newRequest); });
      return newRequest;
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
      );

      if (error) throw error;
      const updatedRequest = toJajananRequest(data);
      set((state) => {
        const index = state.jajananRequests.findIndex((r) => r.id === requestId);
        if (index !== -1) state.jajananRequests[index] = updatedRequest;
      });
      return updatedRequest;
    },

    createOpname: async (payload) => {
      // For now, just refresh data - full opname logic to be implemented
      await get().fetchProducts();
      await get().fetchSales();
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
        );
      }

      // Update product stock
      await withTimeout(
        supabase
          .from('products')
          .update({ total_stock: quantity })
          .eq('id', productId),
        10000,
        'Gagal update stok produk (timeout)'
      );

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
        const { data, error } = await supabase
          .from('reconciliations')
          .select('*')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false });

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
          const qtySold = Math.abs(difference);
          itemValue = qtySold * product.price;
          itemCost = qtySold * (product.cost || 0);

          totalStockValue += itemValue;
          totalStockCost += itemCost;

          soldItems.push({
            product_id: product.id,
            product_name: product.name,
            quantity: qtySold,
            price: product.price,
            cost: product.cost || 0
          });
        }

        stockItems.push({
          productId: product.id,
          productName: product.name,
          systemStock,
          physicalStock,
          difference,
          unitPrice: product.price,
          unitCost: product.cost || 0,
          totalValue: itemValue
        });

        // Update product stock
        if (difference !== 0) {
          await supabase
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

        const { data: sale, error: saleError } = await supabase
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

          const { error: itemsError } = await supabase
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

      const { data, error } = await supabase
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
  }))
);

// Clear old localStorage data on load to prevent stale state
if (typeof window !== 'undefined') {
  localStorage.removeItem('warung-storage-v3');
  localStorage.removeItem('warung-storage-v2');
  localStorage.removeItem('warung-storage');
}
