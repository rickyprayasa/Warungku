import { useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStore } from '@/contexts/StoreContext';
import { useWarungStore } from '@/lib/store-supabase';
import { Toaster } from '@/components/ui/sonner';
import { CartSheet } from '@/components/CartSheet';
import { FloatingCart } from '@/components/FloatingCart';
import { AppHeader } from '@/components/AppHeader';
import { AppFooter } from '@/components/AppFooter';
import { AlertTriangle } from 'lucide-react';
import { POSPage } from './POSPage';

export function PublicStorePage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const hasFetchedRef = useRef(false);
  const lastSlugRef = useRef<string | null>(null);

  const {
    publicStore,
    publicStoreLoading,
    publicStoreError,
    loadStoreBySlug,
    clearPublicStore,
    setIsPublicMode,
  } = useStore();

  // Load store by slug
  useEffect(() => {
    let isMounted = true;

    // Set public mode immediately
    setIsPublicMode(true);

    const initStore = async () => {
      if (slug && slug !== lastSlugRef.current) {
        lastSlugRef.current = slug;
        hasFetchedRef.current = false;

        console.log('[PublicStorePage] Initializing public store for slug:', slug);

        // Reset store to public mode
        const store = useWarungStore.getState();
        store.resetToPublicStoreMode();

        // Load store data
        const loadedStore = await loadStoreBySlug(slug);

        if (isMounted && loadedStore?.id) {
          console.log('[PublicStorePage] Store loaded, fetching details for:', loadedStore.id);
          // Explicitly set current store ID again to be sure
          store.setCurrentStoreId(loadedStore.id);

          // Fetch details
          await Promise.all([
            store.fetchStoreProfile(),
            store.fetchProducts()
          ]);

          hasFetchedRef.current = true;
        }
      }
    };

    initStore();

    return () => {
      isMounted = false;
      // Clear public mode when leaving this page
      clearPublicStore();
      setIsPublicMode(false);
    };
  }, [slug, loadStoreBySlug, clearPublicStore, setIsPublicMode]);

  // Removed the second useEffect as it's now integrated into the first one to ensure sequential execution

  // Loading state
  if (publicStoreLoading) {
    return (
      <div className="min-h-screen bg-brand-white flex flex-col">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="relative mx-auto" style={{ animation: 'bounce 1.2s ease-in-out infinite' }}>
              <div style={{
                width: '80px',
                height: '80px',
                backgroundColor: '#F38020',
                border: '4px solid #1A1A1A',
                position: 'relative',
                animation: 'rotate 3s linear infinite',
                margin: '0 auto'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#FEFEFE',
                  border: '3px solid #1A1A1A',
                }} />
              </div>
            </div>
            <p className="font-mono text-lg font-bold text-brand-black">Memuat toko...</p>
          </div>
        </div>
        <style dangerouslySetInnerHTML={{
          __html: `
            @keyframes rotate {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            @keyframes bounce {
              0%, 100% { transform: translateY(0) scale(1); }
              50% { transform: translateY(-15px) scale(1.1); }
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
              <p className="font-mono text-muted-foreground">
                Toko dengan alamat "<span className="font-bold">{slug}</span>" tidak ditemukan atau sudah tidak aktif.
              </p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-brand-orange text-brand-black font-bold border-4 border-brand-black shadow-hard hover:shadow-hard-sm active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
            >
              Kembali ke Beranda
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Store not loaded yet
  if (!publicStore) {
    return null;
  }

  return (
    <div className="relative min-h-screen bg-brand-white text-brand-black overflow-x-hidden">
      <FloatingCart />
      <CartSheet />

      <div className="flex flex-col min-h-screen min-w-0 overflow-x-hidden">
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
