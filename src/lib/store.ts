import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Product, ProductFormValues, Sale, SaleFormValues, Purchase, PurchaseFormValues } from '@shared/types';
import { api } from './api-client';
interface WarungState {
  products: Product[];
  sales: Sale[];
  purchases: Purchase[];
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}
interface WarungActions {
  fetchProducts: () => Promise<void>;
  fetchSales: () => Promise<void>;
  fetchPurchases: () => Promise<void>;
  login: () => void;
  logout: () => void;
  addProduct: (productData: ProductFormValues) => Promise<Product>;
  updateProduct: (productId: string, productData: ProductFormValues) => Promise<Product>;
  deleteProduct: (productId: string) => Promise<void>;
  addSale: (saleData: SaleFormValues) => Promise<Sale>;
  addPurchase: (purchaseData: PurchaseFormValues) => Promise<Purchase>;
}
export const useWarungStore = create<WarungState & WarungActions>()(
  immer((set) => ({
    products: [],
    sales: [],
    purchases: [],
    isLoading: true,
    error: null,
    isAuthenticated: false,
    fetchProducts: async () => {
      try {
        set({ isLoading: true, error: null });
        const products = await api<Product[]>('/api/products');
        set({ products, isLoading: false });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch products';
        set({ isLoading: false, error: errorMessage });
        console.error(errorMessage);
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
    login: () => {
      set({ isAuthenticated: true });
    },
    logout: () => {
      set({ isAuthenticated: false });
    },
    addProduct: async (productData) => {
      const newProduct = await api<Product>('/api/products', {
        method: 'POST',
        body: JSON.stringify(productData),
      });
      set((state) => {
        state.products.push(newProduct);
      });
      return newProduct;
    },
    updateProduct: async (productId, productData) => {
      const updatedProduct = await api<Product>(`/api/products/${productId}`, {
        method: 'PUT',
        body: JSON.stringify(productData),
      });
      set((state) => {
        const index = state.products.findIndex((p) => p.id === productId);
        if (index !== -1) {
          state.products[index] = updatedProduct;
        }
      });
      return updatedProduct;
    },
    deleteProduct: async (productId) => {
      await api(`/api/products/${productId}`, { method: 'DELETE' });
      set((state) => {
        state.products = state.products.filter((p) => p.id !== productId);
      });
    },
    addSale: async (saleData) => {
      const newSale = await api<Sale>('/api/sales', {
        method: 'POST',
        body: JSON.stringify(saleData),
      });
      set((state) => {
        state.sales.unshift(newSale);
      });
      return newSale;
    },
    addPurchase: async (purchaseData) => {
      const newPurchase = await api<Purchase>('/api/purchases', {
        method: 'POST',
        body: JSON.stringify(purchaseData),
      });
      set((state) => {
        state.purchases.unshift(newPurchase);
      });
      return newPurchase;
    },
  }))
);