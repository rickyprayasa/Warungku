import { NavLink, useNavigate } from 'react-router-dom';
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
      'font-mono uppercase font-bold text-sm px-4 py-2 border-2 border-brand-black rounded-none transition-all duration-200',
      isActive
        ? 'bg-brand-black text-brand-white'
        : 'bg-brand-white text-brand-black hover:bg-brand-orange hover:text-brand-black hover:shadow-hard-sm'
    );
  return (
    <header className="bg-brand-orange border-b-4 border-brand-black sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-6">
            <h1 className="text-3xl font-display font-extrabold text-brand-black tracking-tighter">
              WARUNGKU
            </h1>
            <nav className="hidden md:flex items-center space-x-4">
              <NavLink to="/" className={navLinkClass}>
                Menu
              </NavLink>
              <NavLink to="/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated && (
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="font-mono uppercase font-bold text-sm px-4 py-2 border-2 border-brand-black rounded-none transition-all duration-200 bg-brand-white text-brand-black hover:bg-destructive hover:text-destructive-foreground hover:shadow-hard-sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            )}
            <a
              href="https://rsquareidea.my.id/"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 group"
            >
              <span className="font-mono text-xs font-bold text-brand-black hidden sm:block">
                Powered by
              </span>
              <img
                src="https://i.imgur.com/MmO4CAn.png"
                alt="RSQUARE Logo"
                className="h-8 w-auto transition-transform duration-300 group-hover:scale-110"
              />
            </a>
          </div>
        </div>
        <nav className="md:hidden flex items-center space-x-2 pb-4">
            <NavLink to="/" className={navLinkClass}>
              Menu
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
        </nav>
      </div>
    </header>
  );
}