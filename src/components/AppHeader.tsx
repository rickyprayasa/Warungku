import { NavLink, useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useWarungStore } from '@/lib/store';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { LogOut, Menu, X } from 'lucide-react';
import { AnimatedLogo } from './AnimatedLogo';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
export function AppHeader() {
  const isAuthenticated = useWarungStore((state) => state.isAuthenticated);
  const logout = useWarungStore((state) => state.logout);
  const navigate = useNavigate();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const handleLogout = () => {
    logout();
    navigate('/login');
  };
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'font-mono uppercase font-bold text-sm px-4 py-2 border-2 border-transparent rounded-none transition-all duration-200 w-full text-left',
      isActive
        ? 'bg-brand-black text-brand-white'
        : 'text-brand-black hover:bg-brand-black/10'
    );
  const navLinks = (
    <>
      <NavLink to="/" className={navLinkClass} onClick={() => setMenuOpen(false)}>
        Menu
      </NavLink>
      <NavLink to="/dashboard" className={navLinkClass} onClick={() => setMenuOpen(false)}>
        Dasbor
      </NavLink>
    </>
  );
  return (
    <Collapsible open={isMenuOpen} onOpenChange={setMenuOpen} asChild>
      <>
        <header className="bg-brand-orange border-b-4 border-brand-black sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-20">
              <Link to="/" className="flex items-center gap-2">
                <AnimatedLogo />
              </Link>
              {/* Desktop Navigation */}
              <nav className="hidden md:flex items-center space-x-2 bg-brand-white/30 border-2 border-brand-black p-1">
                {navLinks}
              </nav>
              <div className="flex items-center gap-4">
                {isAuthenticated && (
                  <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="hidden md:flex font-mono uppercase font-bold text-sm px-4 py-2 border-2 border-brand-black rounded-none transition-all duration-200 bg-brand-white text-brand-black hover:bg-destructive hover:text-destructive-foreground hover:shadow-hard-sm"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Keluar
                  </Button>
                )}
              </div>
              {/* Mobile Navigation Trigger */}
              <div className="md:hidden">
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="icon" className="border-2 border-brand-black rounded-none">
                    {isMenuOpen ? <X className="h-6 w-6 text-brand-black" /> : <Menu className="h-6 w-6 text-brand-black" />}
                  </Button>
                </CollapsibleTrigger>
              </div>
            </div>
          </div>
          {/* Mobile Navigation Content */}
          <AnimatePresence>
            {isMenuOpen && (
              <CollapsibleContent asChild forceMount>
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden md:hidden border-t-2 border-brand-black bg-brand-orange/80 backdrop-blur-sm"
                >
                  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex flex-col space-y-2">
                      {navLinks}
                      {isAuthenticated && (
                        <Button
                          onClick={() => {
                            handleLogout();
                            setMenuOpen(false);
                          }}
                          variant="ghost"
                          className="font-mono uppercase font-bold text-sm px-4 py-2 border-2 border-brand-black rounded-none transition-all duration-200 bg-brand-white text-brand-black hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Keluar
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              </CollapsibleContent>
            )}
          </AnimatePresence>
        </header>
      </>
    </Collapsible>
  );
}