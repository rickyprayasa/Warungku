import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Product, ProductFormValues } from '@shared/types';
import { api } from './api-client';
export interface CartItem {
  product: Product;
  quantity: number;
}
interface WarungState {
  products: Product[];
  cart: Map<string, CartItem>;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
}
interface WarungActions {
  fetchProducts: () => Promise<void>;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  login: () => void;
  logout: () => void;
  addProduct: (productData: ProductFormValues) => Promise<Product>;
  updateProduct: (productId: string, productData: ProductFormValues) => Promise<Product>;
  deleteProduct: (productId: string) => Promise<void>;
}
export const useWarungStore = create<WarungState & WarungActions>()(
  immer((set, get) => ({
    products: [],
    cart: new Map(),
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
    addToCart: (product) => {
      set((state) => {
        const existingItem = state.cart.get(product.id);
        if (existingItem) {
          existingItem.quantity += 1;
        } else {
          state.cart.set(product.id, { product, quantity: 1 });
        }
      });
    },
    removeFromCart: (productId) => {
      set((state) => {
        state.cart.delete(productId);
      });
    },
    updateQuantity: (productId, quantity) => {
      set((state) => {
        const item = state.cart.get(productId);
        if (item) {
          if (quantity > 0) {
            item.quantity = quantity;
          } else {
            state.cart.delete(productId);
          }
        }
      });
    },
    clearCart: () => {
      set({ cart: new Map() });
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
  }))
);