import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { persist, createJSONStorage } from 'zustand/middleware';
import { supabase } from './supabase';
import type { Product, ProductFormValues, Sale, SaleFormValues, Purchase, PurchaseFormValues, Supplier, SupplierFormValues, JajananRequest, JajananRequestFormValues, StockDetail, OpnamePayload, Reconciliation, ReconciliationPayload } from '@shared/types';

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
  };
  opnameMode: 'retail' | 'display' | 'terpadu';
  isLoading: boolean;
  error: string | null;

  // Store context for multi-tenant
  currentStoreId: string | null;
  setCurrentStoreId: (storeId: string | null) => void;
}

interface WarungActions {
  fetchProducts: () => Promise<void>;
  fetchSales: () => Promise<void>;
  fetchPurchases: () => Promise<void>;
  fetchSuppliers: () => Promise<void>;
  fetchJajananRequests: () => Promise<void>;
  fetchStockDetails: (productId: string) => Promise<void>;
  fetchInitialBalance: () => Promise<void>;
  fetchStoreProfile: () => Promise<void>;
  fetchOpnameMode: () => Promise<void>;
  setInitialBalance: (balance: number) => Promise<void>;
  updateStoreProfile: (profile: WarungState['storeProfile']) => Promise<void>;
  updateOpnameMode: (mode: 'retail' | 'display' | 'terpadu') => Promise<void>;
  addProduct: (productData: ProductFormValues) => Promise<Product>;
  updateProduct: (productId: string, productData: ProductFormValues) => Promise<Product>;
  deleteProduct: (productId: string) => Promise<void>;
  addSale: (saleData: SaleFormValues) => Promise<Sale>;
  deleteSale: (saleId: string) => Promise<void>;
  addPurchase: (purchaseData: PurchaseFormValues) => Promise<Purchase>;
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
        name: 'Warungku',
        address: '',
        phone: '',
      },
      opnameMode: 'retail',
      isLoading: false,
      error: null,
      currentStoreId: null,

      setCurrentStoreId: (storeId) => {
        set({ currentStoreId: storeId });
      },

      fetchProducts: async () => {
        const storeId = get().currentStoreId;
        if (!storeId) {
          set({ products: [], isLoading: false });
          return;
        }

        try {
          set({ isLoading: true, error: null });
          const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('store_id', storeId)
            .order('name');

          if (error) throw error;
          set({ products: (data || []).map(toProduct) });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch products';
          set({ error: errorMessage });
        } finally {
          set({ isLoading: false });
        }
      },

      fetchSales: async () => {
        const storeId = get().currentStoreId;
        if (!storeId) {
          set({ sales: [] });
          return;
        }

        try {
          set({ isLoading: true, error: null });

          // Fetch sales
          const { data: salesData, error: salesError } = await supabase
            .from('sales')
            .select('*')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });

          if (salesError) throw salesError;

          // Fetch sale items for all sales
          const saleIds = (salesData || []).map(s => s.id);
          let itemsData: any[] = [];

          if (saleIds.length > 0) {
            const { data, error: itemsError } = await supabase
              .from('sale_items')
              .select('*')
              .in('sale_id', saleIds);

            if (itemsError) throw itemsError;
            itemsData = data || [];
          }

          const sales = (salesData || []).map(sale =>
            toSale(sale, itemsData.filter(item => item.sale_id === sale.id))
          );

          set({ sales });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch sales';
          set({ error: errorMessage });
        } finally {
          set({ isLoading: false });
        }
      },

      fetchPurchases: async () => {
        const storeId = get().currentStoreId;
        if (!storeId) {
          set({ purchases: [], isLoading: false });
          return;
        }

        try {
          set({ isLoading: true, error: null });
          const { data, error } = await supabase
            .from('purchases')
            .select('*, suppliers(name)')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });

          if (error) throw error;
          set({ purchases: (data || []).map(toPurchase), isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch purchases';
          set({ isLoading: false, error: errorMessage });
        }
      },

      fetchSuppliers: async () => {
        const storeId = get().currentStoreId;
        if (!storeId) {
          set({ suppliers: [], isLoading: false });
          return;
        }

        try {
          set({ isLoading: true, error: null });
          const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .eq('store_id', storeId)
            .order('name');

          if (error) throw error;
          set({ suppliers: (data || []).map(toSupplier), isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch suppliers';
          set({ isLoading: false, error: errorMessage });
        }
      },

      fetchJajananRequests: async () => {
        const storeId = get().currentStoreId;
        if (!storeId) {
          set({ jajananRequests: [], isLoading: false });
          return;
        }

        try {
          set({ isLoading: true, error: null });
          const { data, error } = await supabase
            .from('snack_requests')
            .select('*')
            .eq('store_id', storeId)
            .order('created_at', { ascending: false });

          if (error) throw error;
          set({ jajananRequests: (data || []).map(toJajananRequest), isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch requests';
          set({ isLoading: false, error: errorMessage });
        }
      },

      fetchStockDetails: async (productId) => {
        try {
          set({ isLoading: true, error: null });
          const { data, error } = await supabase
            .from('stock_details')
            .select('*')
            .eq('product_id', productId)
            .order('created_at');

          if (error) throw error;
          set({ stockDetails: (data || []).map(toStockDetail), isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch stock details';
          set({ isLoading: false, error: errorMessage });
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
            .single();

          if (error && error.code !== 'PGRST116') throw error;
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
            .single();

          if (error) throw error;

          if (store) {
            set({
              storeProfile: {
                name: store.name,
                address: store.address || '',
                phone: store.phone || '',
                logoUrl: store.logo_url || '',
                qrisCode: store.qris_code || '',
                cartEnabled: store.cart_enabled !== false,
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
            .single();

          if (error && error.code !== 'PGRST116') throw error;
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
            }, { onConflict: 'store_id,key' });

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

        try {
          const { error } = await supabase
            .from('stores')
            .update({
              name: profile.name,
              address: profile.address,
              phone: profile.phone,
              logo_url: profile.logoUrl,
              qris_code: profile.qrisCode,
              cart_enabled: profile.cartEnabled,
            })
            .eq('id', storeId);

          if (error) throw error;
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
            }, { onConflict: 'store_id,key' });

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

        const { data, error } = await supabase
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
          .single();

        if (error) throw error;
        const newProduct = toProduct(data);
        set((state) => { state.products.push(newProduct); });
        return newProduct;
      },

      updateProduct: async (productId, productData) => {
        const { data, error } = await supabase
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
          .single();

        if (error) throw error;
        const updatedProduct = toProduct(data);
        set((state) => {
          const index = state.products.findIndex((p) => p.id === productId);
          if (index !== -1) state.products[index] = updatedProduct;
        });
        return updatedProduct;
      },

      deleteProduct: async (productId) => {
        const { error } = await supabase
          .from('products')
          .delete()
          .eq('id', productId);

        if (error) throw error;
        set((state) => { state.products = state.products.filter((p) => p.id !== productId); });
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
        const { data: saleRow, error: saleError } = await supabase
          .from('sales')
          .insert({
            store_id: storeId,
            total,
            profit,
            sale_type: 'retail',
            notes: saleData.notes || '',
          })
          .select()
          .single();

        if (saleError) throw saleError;

        // Insert sale items
        const { error: itemsError } = await supabase
          .from('sale_items')
          .insert(items.map(item => ({ ...item, sale_id: saleRow.id })));

        if (itemsError) throw itemsError;

        // Update stock
        for (const item of saleData.items) {
          const product = products.find(p => p.id === item.productId);
          if (product) {
            const qtyToDeduct = item.quantity * (product.qtyPerUnit || 1);
            await supabase
              .from('products')
              .update({ total_stock: Math.max(0, (product.totalStock || 0) - qtyToDeduct) })
              .eq('id', item.productId);
          }
        }

        const newSale = toSale(saleRow, items.map(i => ({ ...i, sale_id: saleRow.id })));
        set((state) => { state.sales.unshift(newSale); });

        // Refresh products
        await get().fetchProducts();
        return newSale;
      },

      deleteSale: async (saleId) => {
        // Get sale items first for stock restoration
        const { data: items } = await supabase
          .from('sale_items')
          .select('*')
          .eq('sale_id', saleId);

        // Delete sale (cascade deletes items)
        const { error } = await supabase
          .from('sales')
          .delete()
          .eq('id', saleId);

        if (error) throw error;

        // Restore stock
        const products = get().products;
        for (const item of items || []) {
          const product = products.find(p => p.id === item.product_id);
          if (product) {
            const qtyToRestore = item.quantity * (product.qtyPerUnit || 1);
            await supabase
              .from('products')
              .update({ total_stock: (product.totalStock || 0) + qtyToRestore })
              .eq('id', item.product_id);
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

        const totalCost = purchaseData.quantity * purchaseData.unitCost;

        // Insert purchase
        const { data, error } = await supabase
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
          .single();

        if (error) throw error;

        // Add stock detail
        await supabase
          .from('stock_details')
          .insert({
            store_id: storeId,
            product_id: purchaseData.productId,
            purchase_id: data.id,
            quantity: purchaseData.quantity,
            unit_cost: purchaseData.unitCost,
          });

        // Update product stock
        await supabase
          .from('products')
          .update({ total_stock: (product.totalStock || 0) + purchaseData.quantity })
          .eq('id', purchaseData.productId);

        const newPurchase = toPurchase(data);
        set((state) => { state.purchases.unshift(newPurchase); });
        await get().fetchProducts();
        return newPurchase;
      },

      deletePurchase: async (purchaseId) => {
        // Get purchase for stock restoration
        const { data: purchase } = await supabase
          .from('purchases')
          .select('*')
          .eq('id', purchaseId)
          .single();

        if (!purchase) throw new Error('Purchase not found');

        // Delete stock details
        await supabase
          .from('stock_details')
          .delete()
          .eq('purchase_id', purchaseId);

        // Delete purchase
        const { error } = await supabase
          .from('purchases')
          .delete()
          .eq('id', purchaseId);

        if (error) throw error;

        // Update product stock
        const product = get().products.find(p => p.id === purchase.product_id);
        if (product) {
          await supabase
            .from('products')
            .update({ total_stock: Math.max(0, (product.totalStock || 0) - purchase.quantity) })
            .eq('id', purchase.product_id);
        }

        set((state) => { state.purchases = state.purchases.filter((p) => p.id !== purchaseId); });
        await get().fetchProducts();
      },

      addSupplier: async (supplierData) => {
        const storeId = get().currentStoreId;
        if (!storeId) throw new Error('No store selected');

        const { data, error } = await supabase
          .from('suppliers')
          .insert({
            store_id: storeId,
            name: supplierData.name,
            contact_person: supplierData.contactPerson || '',
            phone: supplierData.phone || '',
            address: supplierData.address || '',
          })
          .select()
          .single();

        if (error) throw error;
        const newSupplier = toSupplier(data);
        set((state) => { state.suppliers.push(newSupplier); });
        return newSupplier;
      },

      updateSupplier: async (supplierId, supplierData) => {
        const { data, error } = await supabase
          .from('suppliers')
          .update({
            name: supplierData.name,
            contact_person: supplierData.contactPerson,
            phone: supplierData.phone,
            address: supplierData.address,
          })
          .eq('id', supplierId)
          .select()
          .single();

        if (error) throw error;
        const updatedSupplier = toSupplier(data);
        set((state) => {
          const index = state.suppliers.findIndex((s) => s.id === supplierId);
          if (index !== -1) state.suppliers[index] = updatedSupplier;
        });
        return updatedSupplier;
      },

      deleteSupplier: async (supplierId) => {
        const { error } = await supabase
          .from('suppliers')
          .delete()
          .eq('id', supplierId);

        if (error) throw error;
        set((state) => { state.suppliers = state.suppliers.filter((s) => s.id !== supplierId); });
      },

      addJajananRequest: async (requestData) => {
        const storeId = get().currentStoreId;
        if (!storeId) throw new Error('No store selected');

        const { data, error } = await supabase
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
          .single();

        if (error) throw error;
        const newRequest = toJajananRequest(data);
        set((state) => { state.jajananRequests.unshift(newRequest); });
        return newRequest;
      },

      updateJajananRequestStatus: async (requestId, status) => {
        const { data, error } = await supabase
          .from('snack_requests')
          .update({ status, is_read: true })
          .eq('id', requestId)
          .select()
          .single();

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
          await supabase
            .from('stock_details')
            .insert({
              store_id: storeId,
              product_id: productId,
              quantity: delta,
              unit_cost: unitCost,
            });
        }

        // Update product stock
        await supabase
          .from('products')
          .update({ total_stock: quantity })
          .eq('id', productId);

        await get().fetchProducts();
      },

      fetchReconciliations: async () => {
        const storeId = get().currentStoreId;
        if (!storeId) {
          set({ reconciliations: [], isLoading: false });
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
    })),
    {
      name: 'warung-storage-v2',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        currentStoreId: state.currentStoreId,
      }),
    }
  )
);
