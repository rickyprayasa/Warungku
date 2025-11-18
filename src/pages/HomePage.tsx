import { Outlet } from 'react-router-dom';
import { AppHeader } from '@/components/AppHeader';
import { AppFooter } from '@/components/AppFooter';
import { Toaster } from '@/components/ui/sonner';
export function HomePage() {
  return (
    <div className="min-h-screen bg-brand-white text-brand-black flex flex-col">
      <AppHeader />
      <main className="flex-grow">
        <Outlet />
      </main>
      <AppFooter />
      <Toaster richColors closeButton theme="light" />
    </div>
  );
}