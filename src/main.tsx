import '@/lib/errorReporter';
import { enableMapSet } from "immer";
enableMapSet();
import { StrictMode, lazy, Suspense, useState, useEffect } from 'react'
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

// Loading component with cursor-following animation
const PageLoader = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      const x = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
      setPosition({ x, y });
    };

    window.addEventListener('mousemove', handleMove as EventListener);
    window.addEventListener('touchmove', handleMove as EventListener);

    return () => {
      window.removeEventListener('mousemove', handleMove as EventListener);
      window.removeEventListener('touchmove', handleMove as EventListener);
    };
  }, []);

  // Calculate parallax offset (subtle movement)
  const offsetX = typeof window !== 'undefined'
    ? (position.x - window.innerWidth / 2) / 20
    : 0;
  const offsetY = typeof window !== 'undefined'
    ? (position.y - window.innerHeight / 2) / 20
    : 0;

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center overflow-hidden">
      {/* Cursor-following logo with smooth transition */}
      <div
        className="transition-transform duration-300 ease-out"
        style={{
          transform: `translate(${offsetX}px, ${offsetY}px)`
        }}
      >
        <img
          src="/omzetin-logo.svg"
          alt="OMZETIN"
          className="w-16 h-16 animate-pulse"
        />
      </div>

      {/* Loading text */}
      <div className="absolute bottom-10 text-brand-black font-mono text-sm animate-pulse">
        Loading...
      </div>
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