import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';

interface AdminProtectedRouteProps {
    children: React.ReactNode;
}

export function AdminProtectedRoute({ children }: AdminProtectedRouteProps) {
    const { isAuthenticated, loading: authLoading } = useAuth();
    const { isAdmin, isCheckingAdmin } = useAdmin();
    const location = useLocation();

    // Show loading while checking auth or admin status
    if (authLoading || isCheckingAdmin) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-brand-orange mx-auto"></div>
                    <p className="mt-4 font-mono text-sm text-muted-foreground">Memverifikasi akses admin...</p>
                </div>
            </div>
        );
    }

    // Redirect to login if not authenticated
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Redirect to homepage if not an admin
    if (!isAdmin) {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
}
