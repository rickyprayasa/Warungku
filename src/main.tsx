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
const CheckoutPage = lazy(() => import('@/pages/CheckoutPage').then(m => ({ default: m.CheckoutPage })));
const ProtectedRoute = lazy(() => import('@/components/ProtectedRoute').then(m => ({ default: m.ProtectedRoute })));

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
        path: "checkout",
        element: (
          <Suspense fallback={<PageLoader />}>
            <CheckoutPage />
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