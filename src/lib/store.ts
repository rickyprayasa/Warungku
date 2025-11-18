import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Product, ProductFormValues, Sale, SaleFormValues, Purchase, PurchaseFormValues, Supplier, SupplierFormValues } from '@shared/types';
import { api } from './api-client';
import { persist, createJSONStorage } from 'zustand/middleware'
type Language = 'id' | 'en';
interface WarungState {
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  suppliers: Supplier[];
  initialBalance: number;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  language: Language;
}
interface WarungActions {
  fetchProducts: () => Promise<void>;
  fetchSales: () => Promise<void>;
  fetchPurchases: () => Promise<void>;
  fetchSuppliers: () => Promise<void>;
  setInitialBalance: (balance: number) => void;
  login: () => void;
  logout: () => void;
  setLanguage: (lang: Language) => void;
  addProduct: (productData: ProductFormValues) => Promise<Product>;
  updateProduct: (productId: string, productData: ProductFormValues) => Promise<Product>;
  deleteProduct: (productId: string) => Promise<void>;
  addSale: (saleData: SaleFormValues) => Promise<Sale>;
  addPurchase: (purchaseData: PurchaseFormValues) => Promise<Purchase>;
  addSupplier: (supplierData: SupplierFormValues) => Promise<Supplier>;
  updateSupplier: (supplierId: string, supplierData: SupplierFormValues) => Promise<Supplier>;
  deleteSupplier: (supplierId: string) => Promise<void>;
}
export const useWarungStore = create<WarungState & WarungActions>()(
  persist(
    immer((set) => ({
      products: [],
      sales: [],
      purchases: [],
      suppliers: [],
      initialBalance: 0,
      isLoading: true,
      error: null,
      isAuthenticated: false,
      language: 'id',
      fetchProducts: async () => {
        try {
          set({ isLoading: true, error: null });
          const products = await api<Product[]>('/api/products');
          set({ products, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch products';
          set({ isLoading: false, error: errorMessage });
        }
      },
      fetchSales: async () => {
        try {
          set({ isLoading: true, error: null });
          const sales = await api<Sale[]>('/api/sales');
          set({ sales, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch sales';
          set({ isLoading: false, error: errorMessage });
        }
      },
      fetchPurchases: async () => {
        try {
          set({ isLoading: true, error: null });
          const purchases = await api<Purchase[]>('/api/purchases');
          set({ purchases, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch purchases';
          set({ isLoading: false, error: errorMessage });
        }
      },
      fetchSuppliers: async () => {
        try {
          set({ isLoading: true, error: null });
          const suppliers = await api<Supplier[]>('/api/suppliers');
          set({ suppliers, isLoading: false });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Failed to fetch suppliers';
          set({ isLoading: false, error: errorMessage });
        }
      },
      setInitialBalance: (balance) => set({ initialBalance: balance }),
      login: () => set({ isAuthenticated: true }),
      logout: () => set({ isAuthenticated: false }),
      setLanguage: (lang) => set({ language: lang }),
      addProduct: async (productData) => {
        const newProduct = await api<Product>('/api/products', { method: 'POST', body: JSON.stringify(productData) });
        set((state) => { state.products.push(newProduct); });
        return newProduct;
      },
      updateProduct: async (productId, productData) => {
        const updatedProduct = await api<Product>(`/api/products/${productId}`, { method: 'PUT', body: JSON.stringify(productData) });
        set((state) => {
          const index = state.products.findIndex((p) => p.id === productId);
          if (index !== -1) state.products[index] = updatedProduct;
        });
        return updatedProduct;
      },
      deleteProduct: async (productId) => {
        await api(`/api/products/${productId}`, { method: 'DELETE' });
        set((state) => { state.products = state.products.filter((p) => p.id !== productId); });
      },
      addSale: async (saleData) => {
        const newSale = await api<Sale>('/api/sales', { method: 'POST', body: JSON.stringify(saleData) });
        set((state) => { state.sales.unshift(newSale); });
        return newSale;
      },
      addPurchase: async (purchaseData) => {
        const newPurchase = await api<Purchase>('/api/purchases', { method: 'POST', body: JSON.stringify(purchaseData) });
        set((state) => { state.purchases.unshift(newPurchase); });
        return newPurchase;
      },
      addSupplier: async (supplierData) => {
        const newSupplier = await api<Supplier>('/api/suppliers', { method: 'POST', body: JSON.stringify(supplierData) });
        set((state) => { state.suppliers.push(newSupplier); });
        return newSupplier;
      },
      updateSupplier: async (supplierId, supplierData) => {
        const updatedSupplier = await api<Supplier>(`/api/suppliers/${supplierId}`, { method: 'PUT', body: JSON.stringify(supplierData) });
        set((state) => {
          const index = state.suppliers.findIndex((s) => s.id === supplierId);
          if (index !== -1) state.suppliers[index] = updatedSupplier;
        });
        return updatedSupplier;
      },
      deleteSupplier: async (supplierId) => {
        await api(`/api/suppliers/${supplierId}`, { method: 'DELETE' });
        set((state) => { state.suppliers = state.suppliers.filter((s) => s.id !== supplierId); });
      },
    })),
    {
      name: 'warung-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        initialBalance: state.initialBalance,
        isAuthenticated: state.isAuthenticated,
        language: state.language,
      }),
    }
  )
);