import { useEffect, useRef } from 'react';
import { useWarungStore } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, loading, store } = useAuth();
  const fetchInitialBalance = useWarungStore((state) => state.fetchInitialBalance);
  const fetchStoreProfile = useWarungStore((state) => state.fetchStoreProfile);
  const fetchOpnameMode = useWarungStore((state) => state.fetchOpnameMode);
  const setCurrentStoreId = useWarungStore((state) => state.setCurrentStoreId);
  const location = useLocation();
  const hasFetched = useRef(false);

  // Set store ID and fetch settings when authenticated
  useEffect(() => {
    if (isAuthenticated && store && !hasFetched.current) {
      hasFetched.current = true;
      setCurrentStoreId(store.id);
      fetchInitialBalance();
      fetchStoreProfile();
      fetchOpnameMode();
    }
  }, [isAuthenticated, store, setCurrentStoreId, fetchInitialBalance, fetchStoreProfile, fetchOpnameMode]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-orange"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}