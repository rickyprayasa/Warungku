import { useEffect } from 'react';
import { Outlet, ScrollRestoration } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { AppFooter } from '@/components/AppFooter';
import { Toaster } from '@/components/ui/sonner';
import { Sidebar } from '@/components/Sidebar';
import { MobileBottomNav } from '@/components/MobileBottomNav';
import { useWarungStore } from '@/lib/store';

export function HomePage() {
  const isAuthenticated = useWarungStore((state) => state.isAuthenticated);
  const fetchProducts = useWarungStore((state) => state.fetchProducts);
  const fetchSales = useWarungStore((state) => state.fetchSales);
  const fetchPurchases = useWarungStore((state) => state.fetchPurchases);
  const fetchSuppliers = useWarungStore((state) => state.fetchSuppliers);

  // Fetch all data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchProducts();
      fetchSales();
      fetchPurchases();
      fetchSuppliers();
    }
  }, [isAuthenticated, fetchProducts, fetchSales, fetchPurchases, fetchSuppliers]);

  return (
    <div className="relative min-h-screen bg-brand-white text-brand-black flex">
      {/* Sidebar for Desktop */}
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
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