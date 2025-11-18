import { NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useWarungStore } from '@/lib/store';
import { Button } from './ui/button';
import { LogOut } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { LanguageSwitcher } from './LanguageSwitcher';
export function AppHeader() {
  const isAuthenticated = useWarungStore((state) => state.isAuthenticated);
  const logout = useWarungStore((state) => state.logout);
  const navigate = useNavigate();
  const { t } = useTranslation();
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
          <nav className="hidden md:flex items-center space-x-4">
            <NavLink to="/" className={navLinkClass}>
              {t('header.menu')}
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClass}>
              {t('header.dashboard')}
            </NavLink>
          </nav>
          <div className="flex items-center gap-4">
            <LanguageSwitcher />
            {isAuthenticated && (
              <Button
                onClick={handleLogout}
                variant="ghost"
                className="font-mono uppercase font-bold text-sm px-4 py-2 border-2 border-brand-black rounded-none transition-all duration-200 bg-brand-white text-brand-black hover:bg-destructive hover:text-destructive-foreground hover:shadow-hard-sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {t('header.logout')}
              </Button>
            )}
          </div>
        </div>
        <nav className="md:hidden flex items-center space-x-2 pb-4">
            <NavLink to="/" className={navLinkClass}>
              {t('header.menu')}
            </NavLink>
            <NavLink to="/dashboard" className={navLinkClass}>
              {t('header.dashboard')}
            </NavLink>
        </nav>
      </div>
    </header>
  );
}