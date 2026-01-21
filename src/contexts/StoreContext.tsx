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

    // Special handling for demo mode - /omzetin
    if (slug === 'omzetin') {
      console.log('[StoreContext] Demo mode detected, loading ricky.yusar store...');

      try {
        // For demo mode, try multiple methods to find ricky.yusar's store
        let demoStore = null;

        // Method 1: Try environment variable
        const demoStoreId = import.meta.env.VITE_DEMO_STORE_ID || '';
        const demoStoreSlug = import.meta.env.VITE_DEMO_STORE_SLUG || '';

        if (demoStoreId) {
          const { data: storeById } = await supabase
            .from('stores')
            .select('id, name, slug, address, phone, logo_url, qris_code, cart_enabled')
            .eq('id', demoStoreId)
            .maybeSingle();
          if (storeById) {
            console.log('[StoreContext] Found demo store by ID:', storeById);
            demoStore = storeById;
          }
        }

        if (!demoStore && demoStoreSlug) {
          const { data: storeBySlug } = await supabase
            .from('stores')
            .select('id, name, slug, address, phone, logo_url, qris_code, cart_enabled')
            .eq('slug', demoStoreSlug)
            .maybeSingle();
          if (storeBySlug) {
            console.log('[StoreContext] Found demo store by slug:', storeBySlug);
            demoStore = storeBySlug;
          }
        }

        // Method 2: Try to find store with "ricky", "rsquare", or "yusar" in name/slug
        if (!demoStore) {
          const { data: storesByKeywords } = await supabase
            .from('stores')
            .select('id, name, slug, address, phone, logo_url, qris_code, cart_enabled')
            .or('slug.ilike.%ricky%,slug.ilike.%rsquare%,slug.ilike.%yusar%,name.ilike.%ricky%,name.ilike.%rsquare%,name.ilike.%yusar%')
            .limit(1)
            .maybeSingle();
          if (storesByKeywords) {
            console.log('[StoreContext] Found demo store by keywords:', storesByKeywords);
            demoStore = storesByKeywords;
          }
        }

        // Method 3: Try to find store with "omzetin" in name/slug
        if (!demoStore) {
          const { data: omzetinStore } = await supabase
            .from('stores')
            .select('id, name, slug, address, phone, logo_url, qris_code, cart_enabled')
            .or('slug.eq.omzetin,name.ilike.%omzetin%')
            .limit(1)
            .maybeSingle();
          if (omzetinStore) {
            console.log('[StoreContext] Found demo store by omzetin search:', omzetinStore);
            demoStore = omzetinStore;
          }
        }

        // Method 4: Get first available store as fallback
        if (!demoStore) {
          const { data: firstStore } = await supabase
            .from('stores')
            .select('id, name, slug, address, phone, logo_url, qris_code, cart_enabled')
            .limit(1)
            .maybeSingle();
          if (firstStore) {
            console.log('[StoreContext] Using first available store as demo:', firstStore);
            demoStore = firstStore;
          }
        }

        if (demoStore) {
          const store: PublicStore = {
            id: demoStore.id,
            name: demoStore.name,
            slug: demoStore.slug,
            address: demoStore.address || '',
            phone: demoStore.phone || '',
            logoUrl: demoStore.logo_url || '',
            qrisCode: demoStore.qris_code || '',
            cartEnabled: demoStore.cart_enabled !== false,
          };
          setPublicStore(store);
          setCurrentStoreId(store.id);
          setPublicStoreLoading(false);
          return store;
        } else {
          console.error('[StoreContext] Demo mode: No stores found in database!');
          setPublicStoreError('Demo toko tidak tersedia. Belum ada toko di sistem.');
          setPublicStoreLoading(false);
          return null;
        }
      } catch (err) {
        console.error('[StoreContext] Demo mode error:', err);
        setPublicStoreError('Gagal memuat demo toko: ' + (err as Error).message);
        setPublicStoreLoading(false);
        return null;
      }
    }

    // Normal store loading (non-demo mode)
    try {
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Koneksi timeout, silakan coba lagi')), 15000);
      });

      // Race between fetch and timeout
      const { data, error } = await Promise.race([
        supabase
          .from('stores')
          .select('id, name, slug, address, phone, logo_url, qris_code, cart_enabled')
          .eq('slug', slug)
          .single(),
        timeoutPromise
      ]) as any;

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
  // Check if current path is NOT an internal route
  const internalRoutes = ['/', '/pos', '/dashboard', '/opname', '/login', '/register', '/checkout', '/upgrade', '/forgot-password', '/update-password', '/auth/callback', '/omzetin'];
  const isInternalRoute = internalRoutes.some(route => window.location.pathname.startsWith(route)) || window.location.pathname.startsWith('/admin');
  const isPublicMode = manualIsPublicMode || !isInternalRoute;
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
