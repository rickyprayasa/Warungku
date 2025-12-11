import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useWarungStore } from '@/lib/store-supabase';
import { useAuth } from './AuthContext';
import { useLocation } from 'react-router-dom';

interface PublicStore {
  id: string;
  name: string;
  slug: string;
  address?: string;
  phone?: string;
  logoUrl?: string;
  qrisCode?: string;
  cartEnabled?: boolean;
}

interface StoreContextType {
  publicStore: PublicStore | null;
  publicStoreLoading: boolean;
  publicStoreError: string | null;
  loadStoreBySlug: (slug: string) => Promise<PublicStore | null>;
  clearPublicStore: () => void;
  isPublicMode: boolean;
  setIsPublicMode: (mode: boolean) => void; // Add setter
  activeStoreId: string | null;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [publicStore, setPublicStore] = useState<PublicStore | null>(null);
  const [publicStoreLoading, setPublicStoreLoading] = useState(false);
  const [publicStoreError, setPublicStoreError] = useState<string | null>(null);
  const [manualIsPublicMode, setManualIsPublicMode] = useState(false); // Renamed to avoid conflict with derived value

  const { storeId: authStoreId, isAuthenticated } = useAuth();
  const setCurrentStoreId = useWarungStore((state) => state.setCurrentStoreId);
  const currentStoreId = useWarungStore((state) => state.currentStoreId);

  // Function to update public mode from outside
  const updatePublicMode = useCallback((mode: boolean) => {
    setManualIsPublicMode(mode);
    console.log('[StoreContext] Public mode updated to:', mode);
  }, []);

  const loadStoreBySlug = useCallback(async (slug: string): Promise<PublicStore | null> => {
    console.log('[StoreContext] Loading store by slug:', slug);
    setPublicStoreLoading(true);
    setPublicStoreError(null);

    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, name, slug, address, phone, logo_url, qris_code, cart_enabled')
        .eq('slug', slug)
        .single();

      if (error) {
        console.error('[StoreContext] Error loading store:', error);
        if (error.code === 'PGRST116') {
          setPublicStoreError('Toko tidak ditemukan');
        } else {
          setPublicStoreError(error.message);
        }
        return null;
      }

      console.log('[StoreContext] Store loaded successfully:', data);

      const store: PublicStore = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        address: data.address || '',
        phone: data.phone || '',
        logoUrl: data.logo_url || '',
        qrisCode: data.qris_code || '',
        cartEnabled: data.cart_enabled !== false,
      };

      setPublicStore(store);
      console.log('[StoreContext] Setting current store ID to:', store.id);
      setCurrentStoreId(store.id);

      return store;
    } catch (err: any) {
      console.error('[StoreContext] Exception loading store:', err);
      setPublicStoreError(err.message || 'Gagal memuat toko');
      return null;
    } finally {
      setPublicStoreLoading(false);
      console.log('[StoreContext] Load store operation completed, loading state set to false');
    }
  }, [setCurrentStoreId]);

  const clearPublicStore = useCallback(() => {
    setPublicStore(null);
    setPublicStoreError(null);
  }, []);

  // For public store routes, we should consider it public mode regardless of authentication status
  // For public store routes, we should consider it public mode regardless of authentication status
  const isPublicMode = manualIsPublicMode || window.location.pathname.startsWith('/store/');
  console.log('[StoreContext] isPublicMode:', isPublicMode, 'isAuthenticated:', isAuthenticated, 'publicStore:', publicStore, 'current path:', window.location.pathname);

  // For public store routes, use the public store ID regardless of authentication status
  const activeStoreId = isPublicMode ? publicStore?.id : (isAuthenticated ? authStoreId : (publicStore?.id || currentStoreId));

  const value: StoreContextType = {
    publicStore,
    publicStoreLoading,
    publicStoreError,
    loadStoreBySlug,
    clearPublicStore,
    isPublicMode,
    setIsPublicMode: updatePublicMode, // Use the callback function
    activeStoreId,
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
