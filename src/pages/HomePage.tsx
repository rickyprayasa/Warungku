import { useEffect, useState } from 'react';
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
import { useWarungStore } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import { setupRealtimeSync, setRealtimeQueryClient } from '@/lib/realtime-sync';
import { useQueryClient } from '@tanstack/react-query';

// Default store ID for public access (omzetin store)
const DEFAULT_STORE_ID = '6c65a321-3576-4a38-a834-19afa1c4d83e';

export function HomePage() {
  const { isAuthenticated, store, loading: authLoading } = useAuth();
  const fetchProducts = useWarungStore((state) => state.fetchProducts);
  const fetchStoreProfile = useWarungStore((state) => state.fetchStoreProfile);
  const setCurrentStoreId = useWarungStore((state) => state.setCurrentStoreId);
  const currentStoreId = useWarungStore((state) => state.currentStoreId);
  const queryClient = useQueryClient();

  // Track sidebar collapse state for margin adjustment
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const stored = localStorage.getItem('sidebar-collapsed');
    return stored === 'true';
  });

  // Listen for sidebar collapse changes
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('sidebar-collapsed');
      setSidebarCollapsed(stored === 'true');
    };

    window.addEventListener('storage', handleStorageChange);
    const interval = setInterval(handleStorageChange, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Set store ID based on auth state
  useEffect(() => {
    if (authLoading) return;

    if (isAuthenticated && store) {
      // Authenticated user - use their store
      setCurrentStoreId(store.id);
    } else if (!currentStoreId) {
      // Public visitor - use default store for product viewing
      setCurrentStoreId(DEFAULT_STORE_ID);
    }
  }, [isAuthenticated, store, authLoading, currentStoreId, setCurrentStoreId]);

  // Fetch data when store ID is set
  useEffect(() => {
    if (currentStoreId) {
      fetchStoreProfile();
      fetchProducts();
      // Fetch sales and purchases for dashboard
      useWarungStore.getState().fetchSales();
      useWarungStore.getState().fetchPurchases();
    }
  }, [currentStoreId, fetchStoreProfile, fetchProducts]);

  // Setup query client for realtime sync
  useEffect(() => {
    setRealtimeQueryClient(queryClient);
  }, [queryClient]);

  // Setup realtime sync when store ID is available
  useEffect(() => {
    if (currentStoreId) {
      console.log('[HOMEPAGE] Setting up realtime sync for store:', currentStoreId);
      const cleanup = setupRealtimeSync(currentStoreId);
      
      return () => {
        console.log('[HOMEPAGE] Cleaning up realtime sync');
        cleanup();
      };
    }
  }, [currentStoreId]);

  return (
    <div className="relative min-h-screen bg-brand-white text-brand-black overflow-x-hidden">
      {/* Sidebar for Desktop */}
      <Sidebar />

      {/* Floating Components - Outside main content flow */}
      <FloatingClock />
      <FloatingNotification />
      <FloatingCart />
      <CartSheet />

      <div className={`flex flex-col min-h-screen min-w-0 transition-all duration-300 overflow-x-hidden ${isAuthenticated ? (sidebarCollapsed ? 'md:ml-20' : 'md:ml-64') : ''}`}>
        {/* Header shows on mobile always, and on desktop ONLY if not authenticated */}
        <div className={isAuthenticated ? "md:hidden" : ""}>
          <AppHeader />
        </div>

        <main className="pt-16 md:pt-20">
          <Outlet />
        </main>
        {!isAuthenticated && <AppFooter />}
      </div>

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