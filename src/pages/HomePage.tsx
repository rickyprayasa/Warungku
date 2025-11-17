import { Outlet } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { Toaster } from '@/components/ui/sonner';
export function HomePage() {
  return (
    <div className="min-h-screen bg-brand-white text-brand-black">
      <AppHeader />
      <main>
        <Outlet />
      </main>
      <Toaster richColors closeButton theme="light" />
    </div>
  );
}