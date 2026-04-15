import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase, supabasePublic } from '@/lib/supabase';
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
  paymentMethods?: string[];
  bankName?: string;
  accountNumber?: string;
  phoneNumber?: string; // E-wallet phone number
  category?: string;
  settings?: any;
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

  const fetchStoreSettings = async (storeId: string) => {
    try {
      console.log('[StoreContext] Fetching settings for store:', storeId);

      // Try RPC first (for public access bypassing RLS)
      const { data: rpcData, error: rpcError } = await (supabasePublic
        .rpc('get_public_store_settings', { p_store_id: storeId } as any) as any);

      let settingsData = rpcData;

      if (rpcError) {
        console.warn('[StoreContext] RPC get_public_store_settings failed, falling back to direct query:', rpcError);
        // Fallback to direct query (might fail due to RLS if not authenticated)
        const { data: directData, error: directError } = await (supabasePublic
          .from('settings')
          .select('key, value')
          .eq('store_id', storeId) as any);

        if (directError) {
          console.error('[StoreContext] Error fetching settings (direct):', directError);
        }
        settingsData = directData;
      } else {
        // RPC succeeded but may not return all keys (e.g. store_category).
        // Supplement with direct query to fill in any missing keys.
        try {
          const { data: directData } = await (supabasePublic
            .from('settings')
            .select('key, value')
            .eq('store_id', storeId) as any);

          if (directData && Array.isArray(directData)) {
            const rpcKeys = new Set((settingsData || []).map((r: any) => r.key));
            const missing = directData.filter((d: any) => !rpcKeys.has(d.key));
            if (missing.length > 0) {
              console.log('[StoreContext] Supplementing RPC with direct query keys:', missing.map((m: any) => m.key));
              settingsData = [...(settingsData || []), ...missing];
            }
          }
        } catch (e) {
          // Direct query might fail due to RLS for unauthenticated users, that's ok
          console.warn('[StoreContext] Direct query supplement failed (RLS):', e);
        }
      }

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

      const result = {
        paymentMethods,
        bankName: settingsMap.bank_name || '',
        accountName: settingsMap.account_name || '',
        phoneNumber: settingsMap.phone_number || '',
        category: settingsMap.store_category || 'Warung',
        settings: settingsMap,
      };

      return result;
    } catch (error) {
      console.error('Failed to fetch store settings:', error);
      return {
        paymentMethods: [],
        bankName: '',
        accountName: '',
        phoneNumber: '',
        category: 'Warung',
        settings: {},
      };
    }
  };

  const loadStoreBySlug = useCallback(async (slug: string): Promise<PublicStore | null> => {
    console.log('[StoreContext] Loading store by slug:', slug);
    setPublicStoreLoading(true);
    setPublicStoreError(null);

    // Special handling for demo mode - /warungku
    if (slug === 'warungku') {
      console.log('[StoreContext] Demo mode detected, finding best available store');
      try {
        let demoStore = null;

        // Method 1: Try environment variable IDs first
        const demoStoreId = import.meta.env.VITE_DEMO_STORE_ID || '';
        const demoStoreSlug = import.meta.env.VITE_DEMO_STORE_SLUG || '';

        if (demoStoreId) {
          const { data: storeById } = await supabasePublic
            .from('stores')
            .select('id, name, slug, address, phone, logo_url, qris_code, cart_enabled, settings')
            .eq('id', demoStoreId)
            .maybeSingle();
          if (storeById) {
            console.log('[StoreContext] Found demo store by ID:', storeById);
            demoStore = storeById;
          }
        }

        if (!demoStore && demoStoreSlug) {
          const { data: storeBySlug } = await supabasePublic
            .from('stores')
            .select('id, name, slug, address, phone, logo_url, qris_code, cart_enabled, settings')
            .eq('slug', demoStoreSlug)
            .maybeSingle();
          if (storeBySlug) {
            console.log('[StoreContext] Found demo store by slug:', storeBySlug);
            demoStore = storeBySlug;
          }
        }

        // Method 2: Try to find store with "ricky", "rsquare", or "yusar" in name/slug
        if (!demoStore) {
          const { data: storesByKeywords } = await supabasePublic
            .from('stores')
            .select('id, name, slug, address, phone, logo_url, qris_code, cart_enabled, settings')
            .or('slug.ilike.%ricky%,slug.ilike.%rsquare%,slug.ilike.%yusar%,name.ilike.%ricky%,name.ilike.%rsquare%,name.ilike.%yusar%')
            .limit(1)
            .maybeSingle();
          if (storesByKeywords) {
            console.log('[StoreContext] Found demo store by keywords:', storesByKeywords);
            demoStore = storesByKeywords;
          }
        }

        // Method 3: Try to find store with "warungku" in name/slug
        if (!demoStore) {
          const { data: warungkuStore } = await supabasePublic
            .from('stores')
            .select('id, name, slug, address, phone, logo_url, qris_code, cart_enabled, settings')
            .or('slug.eq.warungku,name.ilike.%warungku%')
            .limit(1)
            .maybeSingle();
          if (warungkuStore) {
            console.log('[StoreContext] Found demo store by warungku search:', warungkuStore);
            demoStore = warungkuStore;
          }
        }

        // Method 4: Get first available store as fallback
        if (!demoStore) {
          const { data: firstStore } = await supabasePublic
            .from('stores')
            .select('id, name, slug, address, phone, logo_url, qris_code, cart_enabled, settings')
            .limit(1)
            .maybeSingle();
          if (firstStore) {
            console.log('[StoreContext] Using first available store as demo:', firstStore);
            demoStore = firstStore;
          }
        }

        if (demoStore) {
          const settings = await fetchStoreSettings(demoStore.id);
          const store: PublicStore = {
            id: demoStore.id,
            name: demoStore.name,
            slug: demoStore.slug,
            address: demoStore.address || '',
            phone: demoStore.phone || '',
            logoUrl: demoStore.logo_url || '',
            qrisCode: demoStore.qris_code || '',
            cartEnabled: demoStore.cart_enabled !== false,
            ...settings,
            settings: demoStore.settings || {},
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
      console.log('[StoreContext] Starting normal store lookup for slug:', slug);

      // Helper to prevent infinite hangs when Supabase Auth LockManager deadlocks across tabs
      const withTimeout = (promise: Promise<any>, ms: number) => {
        return Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error('Koneksi timeout, silakan refresh halaman')), ms))
        ]);
      };

      // Use the same approach as demo mode - simpler and proven to work
      const { data, error } = await withTimeout(
        supabasePublic
          .from('stores')
          .select('id, name, slug, address, phone, logo_url, qris_code, cart_enabled, settings')
          .eq('slug', slug)
          .maybeSingle() as any,
        10000 // 10s timeout
      );

      console.log('[StoreContext] Query result - data:', data, 'error:', error);

      // If exact match failed, try case-insensitive
      if (!data && !error) {
        console.log('[StoreContext] Exact match failed, trying case-insensitive for:', slug);
        const { data: ilikData, error: ilikError } = await withTimeout(
          supabasePublic
            .from('stores')
            .select('id, name, slug, address, phone, logo_url, qris_code, cart_enabled')
            .ilike('slug', slug)
            .maybeSingle() as any,
          10000 // 10s timeout
        );

        console.log('[StoreContext] Case-insensitive result - data:', ilikData, 'error:', ilikError);

        if (ilikData) {
          const settings = await fetchStoreSettings(ilikData.id);
          const store: PublicStore = {
            id: ilikData.id,
            name: ilikData.name,
            slug: ilikData.slug,
            address: ilikData.address || '',
            phone: ilikData.phone || '',
            logoUrl: ilikData.logo_url || '',
            qrisCode: ilikData.qris_code || '',
            cartEnabled: ilikData.cart_enabled !== false,
            ...settings,
            settings: ilikData.settings || {},
          };
          setPublicStore(store);
          setCurrentStoreId(store.id);
          setPublicStoreLoading(false);
          return store;
        }

        if (ilikError) {
          console.error('[StoreContext] Case-insensitive lookup error:', ilikError);
        }
      }

      if (error) {
        console.error('[StoreContext] Error loading store:', error);
        setPublicStoreError(error.message);
        setPublicStoreLoading(false);
        return null;
      }

      if (!data) {
        console.warn('[StoreContext] Store not found for slug:', slug);
        setPublicStoreError('Toko tidak ditemukan');
        return null;
      }

      console.log('[StoreContext] Store loaded successfully:', data);

      const settings = await fetchStoreSettings(data.id);

      const store: PublicStore = {
        id: data.id,
        name: data.name,
        slug: data.slug,
        address: data.address || '',
        phone: data.phone || '',
        logoUrl: data.logo_url || '',
        qrisCode: data.qris_code || '',
        cartEnabled: data.cart_enabled !== false,
        ...settings,
        settings: data.settings || {},
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
  // Note: /checkout is internal, but /:slug/checkout is public (handled by PublicStorePage)
  const internalRoutes = ['/', '/pos', '/dashboard', '/opname', '/login', '/checkout', '/upgrade', '/forgot-password', '/update-password', '/auth/callback'];

  // Check if path matches /:slug/checkout pattern (public store checkout)
  // eslint-disable-next-line no-useless-escape
  const isPublicCheckout = /^\/[^\/]+\/checkout$/.test(window.location.pathname);

  const isInternalRoute = !isPublicCheckout && (
    internalRoutes.some(route => window.location.pathname === route ||
      (route !== '/' && window.location.pathname.startsWith(route + '/'))) ||
    window.location.pathname.startsWith('/admin')
  );
  const isPublicMode = manualIsPublicMode || isPublicCheckout || !isInternalRoute;
  console.log('[StoreContext] isPublicMode:', isPublicMode, 'isPublicCheckout:', isPublicCheckout, 'isAuthenticated:', isAuthenticated, 'publicStore:', publicStore, 'current path:', window.location.pathname);

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

// eslint-disable-next-line react-refresh/only-export-components
export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
