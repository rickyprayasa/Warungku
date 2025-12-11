import { useEffect, useState, useRef } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { AppFooter } from '@/components/AppFooter';
import { Toaster } from '@/components/ui/sonner';
import { Sidebar } from '@/components/Sidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { FloatingNotification } from '@/components/FloatingNotification';
import { FloatingClock } from '@/components/FloatingClock';
import { CartSheet } from '@/components/CartSheet';
import { FloatingCart } from '@/components/FloatingCart';
import { DemoWatermark } from '@/components/DemoWatermark';
import { UsageLimitBanner } from '@/components/UsageLimitBanner';
import { useWarungStore } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import { setupRealtimeSync, cleanupRealtimeSync } from '@/lib/realtime-sync';

// Default store ID for public access (main omzetin store)
const DEFAULT_STORE_ID = '6c65a321-3576-4a38-a834-19afa1c4d83e';

export function HomePage() {
  const { isAuthenticated, store, loading: authLoading } = useAuth();
  const currentStoreId = useWarungStore((state) => state.currentStoreId);
  const hasFetchedRef = useRef(false);

  // Track sidebar collapse state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('sidebar-collapsed') === 'true';
  });

  // Listen for sidebar collapse changes
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sidebar-collapsed') {
        setSidebarCollapsed(e.newValue === 'true');
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Set store ID and fetch data once auth is ready
  useEffect(() => {
    console.log('[HomePage] Auth state changed - authLoading:', authLoading, 'isAuthenticated:', isAuthenticated, 'currentStoreId:', currentStoreId);

    if (authLoading) return;

    // Check if we're on a public store route - even if authenticated, we should let PublicStorePage handle it
    const isPublicStoreRoute = window.location.pathname.startsWith('/store/');
    if (isPublicStoreRoute) {
      console.log('[HomePage] On public store route, not managing storeId here');
      return;
    }

    const storeActions = useWarungStore.getState();
    let targetStoreId: string;

    if (isAuthenticated && store) {
      targetStoreId = store.id;
      console.log('[HomePage] Authenticated user, using store ID:', targetStoreId);
    } else {
      targetStoreId = DEFAULT_STORE_ID;
      console.log('[HomePage] Unauthenticated, using default store ID:', targetStoreId);
    }

    // Only update if different
    if (currentStoreId !== targetStoreId) {
      console.log('[HomePage] Changing store ID from', currentStoreId, 'to', targetStoreId);
      storeActions.setCurrentStoreId(targetStoreId);
      hasFetchedRef.current = false;
    }

    // Fetch data only once per store change
    if (!hasFetchedRef.current && targetStoreId) {
      console.log('[HomePage] Fetching data for store ID:', targetStoreId);
      hasFetchedRef.current = true;
      storeActions.fetchStoreProfile();
      storeActions.fetchProducts();

      // Only fetch admin data if authenticated
      if (isAuthenticated) {
        storeActions.fetchSales();
        storeActions.fetchPurchases();
        storeActions.fetchSuppliers();
        storeActions.fetchJajananRequests();
        storeActions.fetchInitialBalance();
        storeActions.fetchOpnameMode();
      }
    }
  }, [authLoading, isAuthenticated, store, currentStoreId]);

  // Setup realtime sync only for authenticated users
  useEffect(() => {
    if (currentStoreId && isAuthenticated) {
      setupRealtimeSync(currentStoreId);
      return () => cleanupRealtimeSync();
    }
  }, [currentStoreId, isAuthenticated]);

  return (
    <div className="relative min-h-screen bg-brand-white text-brand-black overflow-x-hidden">
      {/* Sidebar for Desktop */}
      {isAuthenticated && <Sidebar />}

      {/* Floating Components - Outside main content flow */}
      {isAuthenticated && <FloatingClock />}
      {isAuthenticated && <FloatingNotification />}
      <FloatingCart />
      <CartSheet />

      <div className={`flex flex-col min-h-screen min-w-0 transition-all duration-300 overflow-x-hidden ${isAuthenticated ? (sidebarCollapsed ? 'md:ml-20' : 'md:ml-64') : ''}`}>
        {/* Header shows on mobile always, and on desktop ONLY if not authenticated */}
        <div className={isAuthenticated ? "md:hidden" : ""}>
          <AppHeader />
        </div>

        {/* Usage limit banner for trial/demo users */}
        <div className="pt-16 md:pt-20">
          {isAuthenticated && <UsageLimitBanner />}
        </div>

        <main>
          <Outlet />
        </main>
        {!isAuthenticated && <AppFooter />}
      </div>

      {/* Demo/Trial watermark */}
      {isAuthenticated && <DemoWatermark />}

      {isAuthenticated && <MobileBottomNav />}
      <Toaster richColors closeButton theme="light" />
      <ScrollRestoration
        getKey={(location) => {
          // Don't restore scroll position for dashboard tab changes
          return location.pathname;
        }}
      />
    </div>
  );
}