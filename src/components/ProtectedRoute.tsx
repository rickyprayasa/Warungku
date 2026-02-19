import { useEffect, useRef } from 'react';
import { useWarungStore } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import { useSession } from '@/components/SessionProvider';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

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

  return <>{children}</>;
}