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
import { SessionProvider } from '@/components/SessionProvider';
import { OfflineStatusIndicator } from '@/components/OfflineStatusIndicator';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { shouldRetryQuery, getRetryDelay } from '@/lib/query-utils';
import { AnimatedLogo } from '@/components/AnimatedLogo';
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
const AdminAnalyticsPage = lazy(() => import('@/pages/admin/AdminAnalyticsPage').then(m => ({ default: m.AdminAnalyticsPage })));
const AdminTransactionsPage = lazy(() => import('@/pages/admin/AdminTransactionsPage').then(m => ({ default: m.AdminTransactionsPage })));
const AdminDuitkuSettingsPage = lazy(() => import('@/pages/admin/AdminDuitkuSettingsPage').then(m => ({ default: m.AdminDuitkuSettingsPage })));
const AdminSubscriptionPlansPage = lazy(() => import('@/pages/admin/AdminSubscriptionPlansPage').then(m => ({ default: m.AdminSubscriptionPlansPage })));
const AdminAuditLogPage = lazy(() => import('@/pages/admin/AdminAuditLogPage').then(m => ({ default: m.AdminAuditLogPage })));
const AdminTestimonialsPage = lazy(() => import('@/pages/admin/AdminTestimonialsPage').then(m => ({ default: m.AdminTestimonialsPage })));
const AdminStoresPage = lazy(() => import('@/pages/admin/AdminStoresPage').then(m => ({ default: m.AdminStoresPage })));

const UpgradePlanPage = lazy(() => import('@/pages/UpgradePlanPage').then(m => ({ default: m.UpgradePlanPage })));

const AuthCallbackPage = lazy(() => import('@/pages/AuthCallbackPage').then(m => ({ default: m.AuthCallbackPage })));
const ForgotPasswordPage = lazy(() => import('@/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })));
const UpdatePasswordPage = lazy(() => import('@/pages/UpdatePasswordPage').then(m => ({ default: m.UpdatePasswordPage })));
const LandingPage = lazy(() => import('@/pages/LandingPage').then(m => ({ default: m.LandingPage })));
const StoreLoginPage = lazy(() => import('@/pages/StoreLoginPage').then(m => ({ default: m.StoreLoginPage })));

// Loading animation
const PageLoader = () => {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center overflow-hidden z-[9999]">
      {/* OMZETIN Logo */}
      <div className="mb-8 scale-110">
        <AnimatedLogo isActive={true} />
      </div>

      {/* Loading Bar */}
      <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full bg-brand-orange animate-pulse"
          style={{
            animation: 'loadingBar 1.5s ease-in-out infinite',
            width: '50%',
            transformOrigin: 'left'
          }}
        />
      </div>

      {/* Loading text */}
      <div style={{
        marginTop: '20px',
        fontFamily: 'monospace',
        fontSize: '16px',
        fontWeight: 'bold',
        color: '#1A1A1A',
        textTransform: 'uppercase',
        letterSpacing: '1px',
      }}>
        Memuat komponen...
      </div>

      {/* CSS animations */}
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
};
const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <Suspense fallback={<PageLoader />}>
        <LandingPage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
  },
  {
    element: (
      <Suspense fallback={<PageLoader />}>
        <HomePage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "pos",
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
    path: "/forgot-password",
    element: (
      <Suspense fallback={<PageLoader />}>
        <ForgotPasswordPage />
      </Suspense>
    ),
  },
  {
    path: "/update-password",
    element: (
      <Suspense fallback={<PageLoader />}>
        <UpdatePasswordPage />
      </Suspense>
    ),
  },
  {
    path: "/auth/callback",
    element: (
      <Suspense fallback={<PageLoader />}>
        <AuthCallbackPage />
      </Suspense>
    ),
  },
  {
    path: "/:slug",
    element: (
      <Suspense fallback={<PageLoader />}>
        <PublicStorePage />
      </Suspense>
    ),
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        path: "checkout",
        element: (
          <Suspense fallback={<PageLoader />}>
            <CheckoutPage />
          </Suspense>
        ),
      },
      {
        path: "login",
        element: (
          <Suspense fallback={<PageLoader />}>
            <StoreLoginPage />
          </Suspense>
        ),
      },
    ],
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
        path: "stores",
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminStoresPage />
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
      {
        path: "testimonials",
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminTestimonialsPage />
          </Suspense>
        ),
      },
      {
        path: "audit-log",
        element: (
          <Suspense fallback={<PageLoader />}>
            <AdminAuditLogPage />
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
          <SessionProvider>
            <AdminProvider>
              <StoreProvider>
                <PlanProvider>
                  <RouterProvider router={router} />
                  <OfflineStatusIndicator />
                </PlanProvider>
              </StoreProvider>
            </AdminProvider>
          </SessionProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
)