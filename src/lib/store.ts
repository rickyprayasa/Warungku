import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { Product } from '@shared/types';
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
}
interface WarungActions {
  fetchProducts: () => Promise<void>;
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
}
export const useWarungStore = create<WarungState & WarungActions>()(
  immer((set) => ({
    products: [],
    cart: new Map(),
    isLoading: true,
    error: null,
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
  }))
);