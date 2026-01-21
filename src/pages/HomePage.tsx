import { useEffect, useState, useRef } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { AppFooter } from '@/components/AppFooter';
import { Toaster } from '@/components/ui/sonner';
import { Sidebar } from '@/components/Sidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { FloatingNotification } from '@/components/FloatingNotification';
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
  const { isAuthenticated, store, loading: authLoading, user } = useAuth();
  const currentStoreId = useWarungStore((state) => state.currentStoreId);
  const hasFetchedRef = useRef(false);
  const previousUserIdRef = useRef<string | null>(null);
  const previousStoreIdRef = useRef<string | null>(null);

  const sidebarCollapsed = useWarungStore((state) => state.sidebarCollapsed);

  // Set store ID and fetch data once auth is ready
  useEffect(() => {
    console.log('[HomePage] Auth state changed - authLoading:', authLoading, 'isAuthenticated:', isAuthenticated, 'store:', store?.id, 'user:', user?.email);

    if (authLoading) return;

    // Check if we're on a public store route - even if authenticated, we should let PublicStorePage handle it
    const internalRoutes = ['/', '/pos', '/dashboard', '/opname', '/login', '/register', '/checkout', '/upgrade', '/forgot-password', '/update-password', '/auth/callback'];
    const isInternalRoute = internalRoutes.some(route => window.location.pathname.startsWith(route)) || window.location.pathname.startsWith('/admin');
    const isPublicStoreRoute = !isInternalRoute && window.location.pathname !== '/';
    if (isPublicStoreRoute) {
      console.log('[HomePage] On public store route, not managing storeId here');
      return;
    }

    const storeActions = useWarungStore.getState();
    const currentUserId = user?.id ?? null;

    // DETECT USER SWITCH: Clear data immediately when switching users
    if (previousUserIdRef.current !== null && previousUserIdRef.current !== currentUserId) {
      console.warn('[HomePage] USER SWITCH DETECTED - clearing all data to prevent leakage');
      storeActions.setCurrentStoreId(null);
      storeActions.resetStore();
      hasFetchedRef.current = false;
      previousUserIdRef.current = currentUserId;
      previousStoreIdRef.current = null;
      // Exit early and wait for next cycle with new user data
      return;
    }

    // Update previous user ID
    if (currentUserId && previousUserIdRef.current !== currentUserId) {
      previousUserIdRef.current = currentUserId;
    }

    let targetStoreId: string | null = null;

    if (isAuthenticated) {
      if (store) {
        // Authenticated user WITH a store - use their store
        targetStoreId = store.id;
        console.log('[HomePage] Authenticated user with store, using store ID:', targetStoreId);
      } else {
        // Authenticated user WITHOUT a store - CRITICAL SECURITY FIX
        // DO NOT use DEFAULT_STORE_ID as it could belong to another user!
        // Instead, clear the store ID and show no data
        console.warn('[HomePage] Authenticated user has no store - clearing data to prevent cross-user data leakage');
        storeActions.setCurrentStoreId(null);
        storeActions.resetStore();
        hasFetchedRef.current = false;
        previousStoreIdRef.current = null;
        return; // Exit early - don't fetch any data
      }
    } else {
      // Not authenticated - use DEFAULT_STORE_ID for demo/public access
      targetStoreId = DEFAULT_STORE_ID;
      console.log('[HomePage] Unauthenticated, using default store ID:', targetStoreId);
    }

    // DETECT STORE CHANGE: Reset fetch flag when store actually changes
    if (previousStoreIdRef.current !== null && previousStoreIdRef.current !== targetStoreId) {
      console.log('[HomePage] STORE CHANGED - resetting fetch flag');
      hasFetchedRef.current = false;
    }
    previousStoreIdRef.current = targetStoreId;

    // Always sync currentStoreId with targetStoreId from AuthContext
    // CRITICAL FIX: This ensures useWarungStore is always in sync with AuthContext
    storeActions.setCurrentStoreId(targetStoreId);

    // Fetch data only once per store change
    if (!hasFetchedRef.current && targetStoreId) {
      console.log('[HomePage] Fetching data for store ID:', targetStoreId);
      hasFetchedRef.current = true;

      // Fetch core data in parallel
      const corePromises = [
        storeActions.fetchStoreProfile(),
        storeActions.fetchProducts(),
      ];

      // Only fetch admin data if authenticated
      if (isAuthenticated) {
        corePromises.push(
          storeActions.fetchSales(),
          storeActions.fetchPurchases(),
          storeActions.fetchSuppliers(),
          storeActions.fetchJajananRequests(),
          storeActions.fetchInitialBalance(),
          storeActions.fetchOpnameMode()
        );
      }

      // Execute all fetches in parallel with error resilience
      Promise.allSettled(corePromises).then((results) => {
        const failed = results.filter(r => r.status === 'rejected');
        if (failed.length > 0) {
          console.warn('[HomePage] Some fetches failed:', failed);
        }
      });
    }
  }, [authLoading, isAuthenticated, store?.id, user?.id]); // Use IDs instead of objects to prevent infinite loops

  // Setup realtime sync only for authenticated users
  useEffect(() => {
    // CRITICAL FIX: Use store.id from AuthContext directly, not currentStoreId from useWarungStore
    // This prevents timing issues where currentStoreId hasn't been updated yet
    if (store?.id && isAuthenticated) {
      setupRealtimeSync(store.id);
      return () => cleanupRealtimeSync();
    }
  }, [store?.id, isAuthenticated]);

  return (
    <div className="relative min-h-screen bg-brand-white text-brand-black overflow-x-hidden">
      {/* Sidebar for Desktop */}
      {isAuthenticated && <Sidebar />}

      {/* Floating Components - Outside main content flow */}
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