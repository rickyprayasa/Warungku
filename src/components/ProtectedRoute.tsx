import { useEffect, useRef } from 'react';
import { useWarungStore } from '@/lib/store';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useWarungStore((state) => state.isAuthenticated);
  const fetchInitialBalance = useWarungStore((state) => state.fetchInitialBalance);
  const fetchStoreProfile = useWarungStore((state) => state.fetchStoreProfile);
  const location = useLocation();
  const hasFetched = useRef(false);

  // Fetch settings data when authenticated (handles page refresh/new browser)
  useEffect(() => {
    if (isAuthenticated && !hasFetched.current) {
      hasFetched.current = true;
      fetchInitialBalance();
      fetchStoreProfile();
    }
  }, [isAuthenticated, fetchInitialBalance, fetchStoreProfile]);

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}