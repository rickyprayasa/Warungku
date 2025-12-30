import { useEffect, useRef, useState } from 'react';
import { useWarungStore } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, store, refreshStore } = useAuth();
  const fetchInitialBalance = useWarungStore((state) => state.fetchInitialBalance);
  const fetchStoreProfile = useWarungStore((state) => state.fetchStoreProfile);
  const fetchOpnameMode = useWarungStore((state) => state.fetchOpnameMode);
  const setCurrentStoreId = useWarungStore((state) => state.setCurrentStoreId);
  const location = useLocation();
  const hasFetched = useRef(false);
  const isRefreshing = useRef(false);

  // Set store ID and fetch settings when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      if (!store && !isRefreshing.current) {
        // If authenticated but no store (e.g. came from public mode), refresh store
        isRefreshing.current = true;
        refreshStore().finally(() => {
          isRefreshing.current = false;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />;
  }

  return <>{children}</>;
}