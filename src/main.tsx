import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import {
  createBrowserRouter,
  RouterProvider,
  ScrollRestoration,
} from "react-router-dom";
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary';
import '@/index.css'

// Lazy load all page components for code splitting
const HomePage = lazy(() => import('@/pages/HomePage').then(m => ({ default: m.HomePage })));
const POSPage = lazy(() => import('@/pages/POSPage').then(m => ({ default: m.POSPage })));
const DashboardPage = lazy(() => import('@/pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })));
const OpnamePage = lazy(() => import('@/pages/OpnamePage').then(m => ({ default: m.OpnamePage })));
const ProtectedRoute = lazy(() => import('@/components/ProtectedRoute').then(m => ({ default: m.ProtectedRoute })));

// Loading component with OMZETIN logo animation
const PageLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-4 bg-white">
    {/* Logo dengan animasi pulse dan rotate */}
    <div className="relative">
      <img
        src="/omzetin-logo.svg"
        alt="OMZETIN"
        className="w-16 h-16 animate-pulse"
        style={{
          animation: 'pulse 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite, spin 3s linear infinite'
        }}
      />
    </div>
    {/* Loading text */}
    <div className="text-brand-black font-mono text-sm animate-pulse">
      Loading...
    </div>
    {/* CSS animation definitions */}
    <style dangerouslySetInnerHTML={{
      __html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `
    }} />
  </div>
);
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
    ]
  },
]);
// Do not touch this code
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <RouterProvider router={router} />
    </ErrorBoundary>
  </StrictMode>,
)