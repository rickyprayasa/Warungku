import { useWarungStore } from '@/lib/store';
import { Navigate, useLocation } from 'react-router-dom';
interface ProtectedRouteProps {
  children: React.ReactNode;
}
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useWarungStore((state) => state.isAuthenticated);
  const location = useLocation();
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return <>{children}</>;
}