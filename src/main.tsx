import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import { AuthProvider } from '@/contexts/AuthContext';
import { StoreProvider } from '@/contexts/StoreContext';
import { PlanProvider } from '@/contexts/PlanContext';
import { AdminProvider } from '@/contexts/AdminContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { shouldRetryQuery, getRetryDelay } from '@/lib/query-utils';
import '@/index.css'

// App version check - clear stale cached data when version changes
const APP_VERSION = '2.1.0';
const storedVersion = localStorage.getItem('app-version');

if (storedVersion !== APP_VERSION) {
  console.log('[VERSION CHECK] App version changed from', storedVersion, 'to', APP_VERSION);
  console.log('[VERSION CHECK] Clearing stale cached data...');

  // Clear old store data (keep auth data)
  const keysToRemove = [
    'warung-storage-v2',
    'warung-storage-v3',
    'dismissedNotifications',
  ];

  keysToRemove.forEach(key => {
    if (localStorage.getItem(key)) {
      localStorage.removeItem(key);
      console.log('[VERSION CHECK] Removed:', key);
    }
  });

  localStorage.setItem('app-version', APP_VERSION);
  console.log('[VERSION CHECK] Migration complete!');
}

// Setup Tanstack Query Client with smart retry logic
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes - data stays fresh longer
      gcTime: 1000 * 60 * 10, // 10 minutes (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch when tab regains focus
      refetchOnReconnect: false, // Don't refetch on reconnect
      refetchOnMount: false, // Don't refetch on every mount if data exists
      retry: shouldRetryQuery,
      retryDelay: getRetryDelay,
      // Network mode: online only (don't try to fetch if offline)
      networkMode: 'online',
    },
    mutations: {
      retry: (failureCount, error) => {
        // Only retry mutations on network errors, max 1 retry
        return failureCount < 1 && shouldRetryQuery(failureCount, error);
      },
      retryDelay: getRetryDelay,
      networkMode: 'online',
    },
  },
});

// Lazy load all page components for code splitting
const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const POSPage = lazy(() => import('@/pages/POSPage').then(m => ({ default: m.POSPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const OpnamePage = lazy(() => import('@/pages/OpnamePage').then(m => ({ default: m.OpnamePage })));
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const ProtectedRoute = lazy(() => import('@/components/ProtectedRoute').then(m => ({ default: m.ProtectedRoute })));
const PublicStorePage = lazy(() => import('@/pages/PublicStorePage').then(m => ({ default: m.PublicStorePage })));

// Admin pages
const AdminProtectedRoute = lazy(() => import('@/components/AdminProtectedRoute').then(m => ({ default: m.AdminProtectedRoute })));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminDashboardPage = lazy(() => import('@/pages/admin/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));
const AdminUsersPage = lazy(() => import('@/pages/admin/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminStoresPage = lazy(() => import('@/pages/admin/AdminStoresPage').then(m => ({ default: m.AdminStoresPage })));
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AdminAnalyticsPage').then(m => ({ default: m.AdminAnalyticsPage })));
const AdminTransactionsPage = lazy(() => import('@/pages/admin/AdminTransactionsPage').then(m => ({ default: m.AdminTransactionsPage })));
const AdminDuitkuSettingsPage = lazy(() => import('@/pages/admin/AdminDuitkuSettingsPage').then(m => ({ default: m.AdminDuitkuSettingsPage })));
const AdminSubscriptionPlansPage = lazy(() => import('@/pages/admin/AdminSubscriptionPlansPage').then(m => ({ default: m.AdminSubscriptionPlansPage })));

const UpgradePlanPage = lazy(() => import('@/pages/UpgradePlanPage').then(m => ({ default: m.UpgradePlanPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const UpdatePasswordPage = lazy(() => import('@/pages/UpdatePasswordPage').then(m => ({ default: m.UpdatePasswordPage })));

// Loading animation
const PageLoader = () => {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center overflow-hidden">
      {/* Loading animation */}
      <div className="relative" style={{ animation: 'bounce 1.2s ease-in-out infinite' }}>
        <div style={{
          width: '80px',
          height: '80px',
          backgroundColor: '#F38020',
          border: '4px solid #1A1A1A',
          position: 'relative',
          animation: 'rotate 3s linear infinite'
        }}>
          {/* Inner square */}
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

      {/* Loading text */}
      <div style={{
        marginTop: '40px',
        fontFamily: 'monospace',
        fontSize: '18px',
        fontWeight: 'bold',
        color: '#1A1A1A',
        backgroundColor: '#F38020',
        padding: '12px 24px',
        border: '3px solid #1A1A1A',
        textTransform: 'uppercase',
        letterSpacing: '2px',
        animation: 'pulse 1.5s ease-in-out infinite'
      }}>
        Loading
      </div>

      {/* CSS animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes rotate {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes bounce {
            0%, 100% { 
              transform: translateY(0) scale(1);
            }
            50% { 
              transform: translateY(-15px) scale(1.1);
            }
          }
          
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
          }
        `
      }} />
    </div>
  );
};
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={<PageLoader />}>
        <HomePage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <POSPage />
          </Suspense>
        ),
      },
      {
        path: "dashboard",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: "opname",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <OpnamePage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
      {
        path: "login",
        element: (
          <Suspense fallback={<PageLoader />}>
            <LoginPage />
          </Suspense>
        ),
      },
      {
        path: "forgot-password",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ForgotPasswordPage />
          </Suspense>
        ),
      },
      {
        path: "update-password",
        element: (
          <Suspense fallback={<PageLoader />}>
            <UpdatePasswordPage />
          </Suspense>
        ),
      },
      {
        path: "checkout",
        element: (
          <Suspense fallback={<PageLoader />}>
            <CheckoutPage />
          </Suspense>
        ),
      },
      {
        path: "upgrade",
        element: (
          <Suspense fallback={<PageLoader />}>
            <ProtectedRoute>
              <UpgradePlanPage />
            </ProtectedRoute>
          </Suspense>
        ),
      },
    ]
  },
  {
    path: "/store/:slug",
    element: (
      <Suspense fallback={<PageLoader />}>
        <PublicStorePage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  // Admin CMS Dashboard
  {
    path: "/admin",
    element: (
      <Suspense fallback={<PageLoader />}>
        <AdminProtectedRoute>
          <AdminLayout />
        </AdminProtectedRoute>
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        index: true,
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminDashboardPage />
          </Suspense>
        ),
      },
      {
        path: "users",
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminUsersPage />
          </Suspense>
        ),
      },
      {
        path: "stores",
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminStoresPage />
          </Suspense>
        ),
      },
      {
        path: "analytics",
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminAnalyticsPage />
          </Suspense>
        ),
      },
      {
        path: "transactions",
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminTransactionsPage />
          </Suspense>
        ),
      },
      {
        path: "duitku-settings",
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminDuitkuSettingsPage />
          </Suspense>
        ),
      },
      {
        path: "subscription-plans",
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminSubscriptionPlansPage />
          </Suspense>
        ),
      },
    ]
  },
]);
// Do not touch this code
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AdminProvider>
            <StoreProvider>
              <PlanProvider>
                <RouterProvider router={router} />
              </PlanProvider>
            </StoreProvider>
          </AdminProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)