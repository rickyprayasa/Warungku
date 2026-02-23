import { useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import { useWarungStore } from '@/lib/store-supabase';
import { Toaster } from '@/components/ui/sonner';
import { CartSheet } from '@/components/CartSheet';
import { FloatingCart } from '@/components/FloatingCart';
import { AppHeader } from '@/components/AppHeader';
import { AppFooter } from '@/components/AppFooter';
import { AlertTriangle } from 'lucide-react';
import { POSPage } from './POSPage';
import { AnimatedLogo } from '@/components/AnimatedLogo';

export function PublicStorePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const hasFetchedRef = useRef(false);
  const lastSlugRef = useRef<string | null>(null);

  // Check if we're on the checkout or login route
  const isCheckoutRoute = location.pathname.endsWith('/checkout');
  const isLoginRoute = location.pathname.endsWith('/login');

  const { refreshStore } = useAuth();
  const { user } = useAuth();
  const {
    publicStore,
    publicStoreLoading,
    publicStoreError,
    loadStoreBySlug,
    clearPublicStore,
    setIsPublicMode,
  } = useStore();

  // Load store by slug (skip for login route — StoreLoginPage handles its own fetching)
  useEffect(() => {
    // Skip all store initialization for the login route
    if (isLoginRoute) return;

    let isMounted = true;

    // Set public mode immediately
    setIsPublicMode(true);

    const initStore = async () => {
      if (slug) {
        hasFetchedRef.current = false;

        console.log('[PublicStorePage] Initializing public store for slug:', slug);

        // Reset store to public mode
        useWarungStore.getState().resetToPublicStoreMode();

        // Load store data
        const loadedStore = await loadStoreBySlug(slug);

        if (isMounted && loadedStore?.id) {
          console.log('[PublicStorePage] Store loaded, fetching details for:', loadedStore.id, loadedStore.name);

          // CRITICAL: Set current store ID BEFORE fetching products
          useWarungStore.getState().setCurrentStoreId(loadedStore.id);

          console.log('[PublicStorePage] Current store ID set to:', useWarungStore.getState().currentStoreId);

          // Fetch details using FRESH state reference
          const storeState = useWarungStore.getState();
          console.log('[PublicStorePage] Fetching products with storeId:', storeState.currentStoreId);

          // OPTIMIZATION: Set store profile directly from loadedStore instead of fetching it again
          // This avoids potential RLS issues when logged in as a different user
          useWarungStore.setState((state) => {
            state.storeProfile = {
              name: loadedStore.name,
              address: loadedStore.address || '',
              phone: loadedStore.phone || '',
              logoUrl: loadedStore.logoUrl || '',
              qrisCode: loadedStore.qrisCode || '',
              cartEnabled: loadedStore.cartEnabled !== false,
              paymentMethods: loadedStore.paymentMethods || [],
              slug: loadedStore.slug,
              bankName: loadedStore.bankName || '',
              accountNumber: loadedStore.accountNumber || '',
              accountName: loadedStore.accountName || '',
              phoneNumber: loadedStore.phoneNumber || '',
              category: loadedStore.category || 'Warung',
            };
          });
          console.log('[PublicStorePage] Profile set from loaded data');

          // Only fetch products
          await storeState.fetchProducts().then(() => console.log('[PublicStorePage] Products fetched, count:', storeState.products.length));

          console.log('[PublicStorePage] All data loaded. Products:', storeState.products.length);
          hasFetchedRef.current = true;
        } else {
          console.error('[PublicStorePage] Failed to load store or store not found');
        }
      }
    };

    initStore();

    return () => {
      isMounted = false;
      // Clear public mode when leaving this page
      clearPublicStore();
      setIsPublicMode(false);
      // Refresh user store to ensure dashboard works correctly when returning
      refreshStore();
    };
  }, [slug, isLoginRoute, loadStoreBySlug, clearPublicStore, setIsPublicMode, refreshStore]);

  // Removed the second useEffect as it's now integrated into the first one to ensure sequential execution

  // If on login route, bypass all public store loading and render StoreLoginPage directly
  // StoreLoginPage handles its own store fetching independently
  if (isLoginRoute) {
    return (
      <>
        <Outlet />
        <Toaster richColors closeButton theme="light" />
      </>
    );
  }

  // Loading state
  if (publicStoreLoading) {
    return (
      <div className="min-h-screen bg-brand-white flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          <div className="mb-8 scale-110">
            <AnimatedLogo isActive={true} />
          </div>

          <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden mb-6">
            <div
              className="h-full bg-brand-orange animate-pulse"
              style={{
                animation: 'loadingBar 1.5s ease-in-out infinite',
                width: '50%',
                transformOrigin: 'left'
              }}
            />
          </div>
          <p className="font-mono text-sm font-bold text-brand-black">Memuat toko...</p>
        </div>

        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes loadingBar {
              0% { transform: translateX(-100%); }
              100% { transform: translateX(200%); }
            }
          `
        }} />
      </div>
    );
  }

  // Error state
  if (publicStoreError) {
    return (
      <div className="min-h-screen bg-brand-white flex flex-col">
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-20 h-20 mx-auto bg-red-100 border-4 border-brand-black flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-500" />
            </div>
            <div>
              <h1 className="text-3xl font-display font-bold text-brand-black mb-2">Toko Tidak Ditemukan</h1>
              <p className="font-mono text-muted-foreground mb-4">
                Toko dengan alamat "<span className="font-bold">{slug}</span>" tidak ditemukan atau sudah tidak aktif.
              </p>
              {user && (
                <p className="font-mono text-sm text-blue-600 mb-4">
                  Login sebagai: <span className="font-bold">{user.email}</span>
                </p>
              )}
            </div>
            <div className="flex gap-3 justify-center">
              {user && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-6 py-3 bg-brand-blue text-white font-bold border-4 border-brand-black shadow-hard hover:shadow-hard-sm active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
                >
                  Ke Profil Toko
                </button>
              )}
              <button
                onClick={() => navigate('/')}
                className="px-6 py-3 bg-brand-orange text-brand-black font-bold border-4 border-brand-black shadow-hard hover:shadow-hard-sm active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
              >
                Kembali ke Beranda
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Store not loaded yet
  if (!publicStore) {
    return null;
  }

  // If on checkout route, render only the outlet (CheckoutPage)
  // This preserves the store initialization/context but lets CheckoutPage control the UI
  // If on checkout route, render only the outlet (CheckoutPage)
  // This preserves the store initialization/context but lets CheckoutPage control the UI
  if (isCheckoutRoute) {
    return (
      <>
        <Outlet />
        <Toaster richColors closeButton theme="light" />
      </>
    );
  }

  const getBackgroundStyle = () => {
    const category = publicStore.category || 'Warung';

    // Background patterns
    const patterns: Record<string, string> = {
      'Warung': `background-color: #ffffff;`,
      'Material/Bangunan': `background-color: #ffffff;`,
      'Listrik': `background-color: #ffffff;`,
      'Elektronik': `background-color: #ffffff;`,
      'Pakaian': `background-color: #ffffff;`,
      'F&B': `background-color: #ffffff;`,
      'Jasa': `background-color: #ffffff;`,
      'Lainnya': `background-color: #ffffff;`
    };

    return patterns[category] || patterns['Warung'];
  };

  return (
    <div className="relative min-h-screen text-brand-black overflow-x-hidden transition-all duration-500" style={{ backgroundColor: '#ffffff' }}>
      {/* Dynamic Background Pattern Layer */}
      <style>{`
        .store-bg-pattern {
          ${getBackgroundStyle()}
        }
      `}</style>
      <div className="fixed inset-0 pointer-events-none store-bg-pattern" />

      <FloatingCart />
      <CartSheet />

      <div className="flex flex-col min-h-screen min-w-0 overflow-x-hidden relative z-10">
        <AppHeader storeName={publicStore.name} logoUrl={publicStore.logoUrl} />

        <main className="pt-16 md:pt-20 flex-1">
          <POSPage />
        </main>

        <AppFooter />
      </div>

      <Toaster richColors closeButton theme="light" />
    </div>
  );
}

export default PublicStorePage;
