import { NavLink, useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useWarungStore } from '@/lib/store';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';
export function AppHeader() {
  const isAuthenticated = useWarungStore((state) => state.isAuthenticated);
  const logout = useWarungStore((state) => state.logout);
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'font-mono uppercase font-bold text-sm px-4 py-2 border-2 border-transparent rounded-none transition-all duration-200',
      isActive
        ? 'bg-brand-black text-brand-white'
        : 'text-brand-black hover:bg-brand-black/10'
    );
  return (
    <header className="bg-brand-orange border-b-4 border-brand-black sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-brand-black text-brand-orange flex items-center justify-center font-display font-bold text-xl">
              O
            </div>
            <span className="font-display text-2xl font-bold text-brand-black">OMZETIN</span>
          </Link>
          <nav className="hidden md:flex items-center space-x-2 bg-brand-white/30 border-2 border-brand-black p-1">
            <NavLink to="/" className={navLinkClass}>
              Menu
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClass}>
              Dasbor
            </NavLink>
          </nav>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="font-mono uppercase font-bold text-sm px-4 py-2 border-2 border-brand-black rounded-none transition-all duration-200 bg-brand-white text-brand-black hover:bg-destructive hover:text-destructive-foreground hover:shadow-hard-sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Keluar
              </Button>
            ) : (
              <div className="w-[118px]">&nbsp;</div> // Placeholder to maintain layout balance
            )}
          </div>
        </div>
        <nav className="md:hidden flex items-center justify-center space-x-2 pb-4">
            <NavLink to="/" className={cn(navLinkClass, 'bg-brand-white/50 border-brand-black')}>
              Menu
            </NavLink>
            <NavLink to="/dashboard" className={cn(navLinkClass, 'bg-brand-white/50 border-brand-black')}>
              Dasbor
            </NavLink>
        </nav>
      </div>
    </header>
  );
}