import { useEffect, useRef, useState } from 'react';
import { useWarungStore } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/components/SessionProvider';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const LOADING_TIMEOUT_MS = 15000; // 15 seconds

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, store, refreshStore, user } = useAuth();
  const { isModalOpen } = useSession(); // Access session expiration modal state
  const fetchInitialBalance = useWarungStore((state) => state.fetchInitialBalance);
  const fetchStoreProfile = useWarungStore((state) => state.fetchStoreProfile);
  const fetchOpnameMode = useWarungStore((state) => state.fetchOpnameMode);
  const fetchCurrentUser = useWarungStore((state) => state.fetchCurrentUser);
  const setCurrentStoreId = useWarungStore((state) => state.setCurrentStoreId);
  const location = useLocation();
  const hasFetched = useRef(false);
  const isRefreshing = useRef(false);
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);

  // Loading timeout safety net — if loading takes > 15s, show fallback UI
  useEffect(() => {
    if (!loading) {
      setLoadingTimedOut(false);
      return;
    }

    const timer = setTimeout(() => {
      setLoadingTimedOut(true);
    }, LOADING_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [loading]);

  // Set store ID and fetch settings when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (!store && !isRefreshing.current && !hasFetched.current) {
        // If authenticated but no store (e.g. came from public mode), try refresh ONCE
        console.log('[ProtectedRoute] Authenticated but no store, attempting refresh...');
        isRefreshing.current = true;
        refreshStore()
          .then(() => {
            console.log('[ProtectedRoute] Refresh complete');
          })
          .catch((err) => {
            console.error('[ProtectedRoute] Refresh failed:', err);
          })
          .finally(() => {
            isRefreshing.current = false;
            // Mark as fetched even if failed, to prevent loop
            hasFetched.current = true;
          });
      } else if (store && !hasFetched.current) {
        hasFetched.current = true;
        setCurrentStoreId(store.id);
        fetchInitialBalance();
        fetchStoreProfile();
        fetchOpnameMode();
      }
    }
  }, [isAuthenticated, store, refreshStore, setCurrentStoreId, fetchInitialBalance, fetchStoreProfile, fetchOpnameMode]);

  // Always fetch current user when authenticated with a store
  // This runs independently to avoid race conditions with setCurrentStoreId
  useEffect(() => {
    if (isAuthenticated && store) {
      console.log('[ProtectedRoute] Fetching current user for store:', store.id);
      // Ensure storeId is set in zustand first
      const currentId = useWarungStore.getState().currentStoreId;
      if (!currentId) {
        useWarungStore.getState().setCurrentStoreId(store.id);
      }
      fetchCurrentUser(user);
    }
  }, [isAuthenticated, store, fetchCurrentUser, user]);

  if (loading) {
    if (loadingTimedOut) {
      // Safety net: loading took too long, show retry options
      return (
        <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50 p-4">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 border-2 border-yellow-400 flex items-center justify-center">
              <span className="text-2xl">⚠️</span>
            </div>
            <p className="font-display font-bold text-lg text-brand-black mb-2">
              Memuat data terlalu lama
            </p>
            <p className="font-mono text-sm text-muted-foreground mb-6">
              Koneksi mungkin bermasalah atau sesi Anda perlu diperbarui.
            </p>
            <div className="space-y-3">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-3 px-6 bg-brand-orange text-brand-black border-2 border-brand-black font-bold font-mono shadow-hard hover:bg-brand-black hover:text-white transition-all"
              >
                🔄 Coba Lagi
              </button>
              <button
                onClick={() => {
                  // Clear corrupt tokens and redirect to login
                  try {
                    for (let i = localStorage.length - 1; i >= 0; i--) {
                      const key = localStorage.key(i);
                      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                        localStorage.removeItem(key);
                      }
                    }
                  } catch (e) { /* ignore */ }
                  window.location.href = '/login';
                }}
                className="w-full py-3 px-6 bg-white text-brand-black border-2 border-brand-black font-bold font-mono hover:bg-gray-100 transition-all"
              >
                🔑 Login Ulang
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-brand-orange"></div>
        <p className="mt-4 font-mono font-bold text-brand-black animate-pulse">Memuat data...</p>
      </div>
    );
  }

  // If session expired (modal open), keep showing children (behind modal) instead of redirecting
  if (!isAuthenticated && !isModalOpen) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  // Intercept users who haven't completed onboarding yet
  if (isAuthenticated && store && !loading) {
    // Only redirect to onboarding if settings.onboarded is EXPLICITLY false.
    // Old/existing stores won't have this flag (it'll be undefined/null) — they are treated as already onboarded.
    // New stores created via Admin CMS will have onboarded: false set during creation.
    const settings = store.settings as Record<string, any> | null;
    const needsOnboarding = settings?.onboarded === false;

    // Only redirect if they are not already on the onboarding page
    if (needsOnboarding && location.pathname !== '/onboarding') {
      console.log('[ProtectedRoute] User not onboarded (onboarded === false), redirecting to /onboarding');
      return <Navigate to="/onboarding" replace />;
    }
  }

  return <>{children}</>;
}