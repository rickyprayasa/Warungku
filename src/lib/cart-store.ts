import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { Product } from '@shared/types';

export interface CartItem {
  product: Product;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isCartOpen: boolean;
}

interface CartActions {
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  toggleCart: () => void;
  getTotal: () => number;
  getItemCount: () => number;
}

export const useCartStore = create<CartState & CartActions>()(
  persist(
    immer((set, get) => ({
      items: [],
      isCartOpen: false,

      addToCart: (product, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find((item) => item.product.id === product.id);
          
          if (existingItem) {
            existingItem.quantity += quantity;
          } else {
            state.items.push({ product, quantity });
          }
        });
      },

      removeFromCart: (productId) => {
        set((state) => {
          state.items = state.items.filter((item) => item.product.id !== productId);
        });
      },

      updateQuantity: (productId, quantity) => {
        set((state) => {
          const item = state.items.find((item) => item.product.id === productId);
          if (item) {
            if (quantity <= 0) {
              state.items = state.items.filter((i) => i.product.id !== productId);
            } else {
              item.quantity = quantity;
            }
          }
        });
      },

      clearCart: () => {
        set((state) => {
          state.items = [];
        });
      },

      openCart: () => {
        set((state) => {
          state.isCartOpen = true;
        });
      },

      closeCart: () => {
        set((state) => {
          state.isCartOpen = false;
        });
      },

      toggleCart: () => {
        set((state) => {
          state.isCartOpen = !state.isCartOpen;
        });
      },

      getTotal: () => {
        const state = get();
        return state.items.reduce((total, item) => {
          const price = item.product.isPromo && item.product.promoPrice 
            ? item.product.promoPrice 
            : item.product.price;
          return total + (price * item.quantity);
        }, 0);
      },

      getItemCount: () => {
        const state = get();
        return state.items.reduce((count, item) => count + item.quantity, 0);
      },
    })),
    {
      name: 'warung-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        items: state.items,
      }),
    }
  )
);
