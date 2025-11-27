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

export function HomePage() {
  const isAuthenticated = useWarungStore((state) => state.isAuthenticated);
  const checkSession = useWarungStore((state) => state.checkSession);
  const fetchProducts = useWarungStore((state) => state.fetchProducts);
  const fetchStoreProfile = useWarungStore((state) => state.fetchStoreProfile);

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

    // Listen for storage events
    window.addEventListener('storage', handleStorageChange);

    // Also check periodically (for same-window changes)
    const interval = setInterval(handleStorageChange, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Fetch store profile and products on mount (for all users, including non-authenticated)
  // Products are fetched immediately to ensure fast loading for visitors
  useEffect(() => {
    fetchStoreProfile();
    fetchProducts(); // Fetch products immediately for visitors
  }, [fetchStoreProfile, fetchProducts]);

  // Check session validity for authenticated users
  useEffect(() => {
    checkSession();
  }, [checkSession]);

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