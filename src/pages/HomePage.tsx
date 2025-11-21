import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { AppFooter } from '@/components/AppFooter';
import { Toaster } from '@/components/ui/sonner';
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
    <div className="relative min-h-screen bg-brand-white text-brand-black flex flex-col">
      <AppHeader />
      <main className="flex-grow">
        <Outlet />
      </main>
      <AppFooter />
      {isAuthenticated && <MobileBottomNav />}
      <Toaster richColors closeButton theme="light" />
    </div>
  );
}