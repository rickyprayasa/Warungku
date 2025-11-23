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

// Loading component with OMZETIN logo-style animation
const PageLoader = () => {
  return (
    <div className="fixed inset-0 bg-white flex flex-col items-center justify-center overflow-hidden">
      {/* Logo with continuous rotation and bounce animation */}
      <div
        className="relative"
        style={{
          animation: 'logoBounce 1.5s ease-in-out infinite'
        }}
      >
        <img
          src="/omzetin-logo.svg"
          alt="OMZETIN"
          className="w-20 h-20"
          style={{
            animation: 'logoSpin 2s linear infinite'
          }}
        />
      </div>

      {/* Loading text with pulse */}
      <div className="mt-6 text-brand-black font-mono text-sm animate-pulse">
        Loading...
      </div>

      {/* CSS animations */}
      <style dangerouslySetInnerHTML={{
        __html: `
          @keyframes logoSpin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          
          @keyframes logoBounce {
            0%, 100% { 
              transform: translateY(0) scale(1);
            }
            50% { 
              transform: translateY(-10px) scale(1.05);
            }
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