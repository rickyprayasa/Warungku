import { useEffect, useState } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { AppFooter } from '@/components/AppFooter';
import { Toaster } from '@/components/ui/sonner';
import { Sidebar } from '@/components/Sidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useWarungStore } from '@/lib/store';

export function HomePage() {
  const isAuthenticated = useWarungStore((state) => state.isAuthenticated);
  const checkSession = useWarungStore((state) => state.checkSession);
  const fetchProducts = useWarungStore((state) => state.fetchProducts);
  const fetchSales = useWarungStore((state) => state.fetchSales);
  const fetchPurchases = useWarungStore((state) => state.fetchPurchases);
  const fetchSuppliers = useWarungStore((state) => state.fetchSuppliers);

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

  // Check session validity and fetch data when authenticated
  useEffect(() => {
    // Validate session on mount
    const isSessionValid = checkSession();

    if (isSessionValid && isAuthenticated) {
      // Load critical data immediately (fast initial render)
      const loadCriticalData = async () => {
        await Promise.all([
          fetchProducts(),
          fetchSales(),
        ]);
      };

      // Defer heavy data loading (prevent blocking)
      const loadDeferredData = async () => {
        await new Promise(resolve => setTimeout(resolve, 500));
        await Promise.all([
          fetchPurchases(),
          fetchSuppliers(),
        ]);
      };

      loadCriticalData();
      loadDeferredData();
    }
  }, [isAuthenticated, checkSession, fetchProducts, fetchSales, fetchPurchases, fetchSuppliers]);

  return (
    <div className="relative min-h-screen bg-brand-white text-brand-black overflow-x-hidden max-w-screen">
      {/* Sidebar for Desktop */}
      <Sidebar />

      <div className={`flex flex-col min-w-0 transition-all duration-300 overflow-x-hidden ${isAuthenticated ? (sidebarCollapsed ? 'md:ml-20' : 'md:ml-64') : ''}`}>
        {/* Header shows on mobile always, and on desktop ONLY if not authenticated */}
        <div className={isAuthenticated ? "md:hidden" : ""}>
          <AppHeader />
        </div>

        <main className="flex-grow pt-16 md:pt-20">
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