import { NavLink, useNavigate, Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { useStore } from '@/contexts/StoreContext';
import { Button } from './ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { LogOut, Menu, X, Share2, Download, MessageCircle, Facebook, Twitter } from 'lucide-react';
import { AnimatedLogo } from './AnimatedLogo';
import { SettingsDialog } from './SettingsDialog';
import { StoreProfileDialog } from './StoreProfileDialog';
import { QRCodeCanvas } from 'qrcode.react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { NotificationBell } from './NotificationBell';
import { TestimonialDialog } from './TestimonialDialog';

interface AppHeaderProps {
  storeName?: string;
  logoUrl?: string;
}

export function AppHeader({ storeName, logoUrl }: AppHeaderProps = {}) {
  const { isAuthenticated, signOut } = useAuth();
  const { isPublicMode } = useStore();
  const navigate = useNavigate();
  const [isMenuOpen, setMenuOpen] = useState(false);
  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'font-mono uppercase font-bold text-sm px-4 py-2 border-2 border-transparent rounded-none transition-all duration-200 w-full text-left',
      isActive
        ? 'bg-brand-black text-brand-white'
        : 'text-brand-black hover:bg-brand-white/75'
    );
  const navLinks = (
    <>
      <NavLink to="/" className={navLinkClass} onClick={() => setMenuOpen(false)}>
        Menu
      </NavLink>
      <NavLink to="/dashboard?tab=analytics" className={navLinkClass} onClick={() => setMenuOpen(false)}>
        Dasbor
      </NavLink>
    </>
  );
  return (
    <Collapsible open={isMenuOpen} onOpenChange={setMenuOpen} asChild>
      <>
        <header className="bg-brand-orange/90 backdrop-blur-sm border-b-4 border-brand-black fixed top-0 left-0 right-0 z-50 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 md:h-20">
              {/* Logo (Left) */}
              {isAuthenticated && !isPublicMode ? (
                <StoreProfileDialog trigger={
                  <div id="mobile-tour-store-profile" className="flex items-center gap-3 relative z-10 cursor-pointer">
                    {logoUrl ? (
                      <div className="flex items-center gap-2">
                        <img src={logoUrl} alt={storeName || 'Store'} className="h-14 w-auto object-contain" />
                        {storeName && <span className="font-display font-bold text-xl text-brand-black hidden sm:inline">{storeName}</span>}
                      </div>
                    ) : storeName ? (
                      <span className="font-display font-bold text-xl text-brand-black">{storeName}</span>
                    ) : (
                      <AnimatedLogo textColor="text-brand-white" />
                    )}
                  </div>
                } />
              ) : (
                <Link to="/" id="mobile-tour-store-profile" className="flex items-center gap-3 relative z-10">
                  {isPublicMode ? (
                    storeName ? (
                      <AnimatedLogo textColor="text-brand-white" hideTextOnMobile />
                    ) : (
                      <AnimatedLogo textColor="text-brand-white" />
                    )
                  ) : (
                    <AnimatedLogo textColor="text-brand-white" />
                  )}
                </Link>
              )}

              {/* Centered Store Name (Public Mode Only) */}
              {isPublicMode && storeName && (
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center w-full pointer-events-none">
                  <div className="flex items-center gap-4 pointer-events-auto">
                    <div className="bg-white border-3 border-black px-6 py-2 shadow-[4px_4px_0px_0px_#000] transform -rotate-2 hover:rotate-0 transition-all duration-200 cursor-default">
                      <h1 className="text-xl md:text-2xl font-black tracking-wider text-black uppercase">
                        {storeName}
                      </h1>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <button className="p-2 hover:bg-black/5 rounded-full transition-colors">
                          <Share2 className="w-6 h-6 text-black" />
                        </button>
                      </DialogTrigger>
                      <DialogContent className="bg-zinc-950 border-2 border-brand-orange text-white sm:rounded-xl p-0 overflow-hidden max-w-sm">
                        <div className="p-6 flex flex-col items-center text-center relative">
                          <h2 className="text-brand-orange font-bold tracking-widest mb-6 text-lg">SCAN UNTUK MEMBUKA</h2>

                          <div className="bg-white p-3 rounded-xl shadow-[0_0_20px_rgba(243,128,32,0.3)] mb-6">
                            <QRCodeCanvas id="header-qr-code" value={window.location.href} size={180} />
                          </div>

                          <p className="text-zinc-400 text-sm mb-6 max-w-[250px] leading-relaxed">
                            Arahkan kamera HP Anda ke QR Code di atas untuk membuka <span className="text-white font-bold">{storeName}</span>.
                          </p>

                          <Button
                            className="w-full bg-brand-orange hover:bg-brand-orange/90 text-black font-bold mb-6 rounded-lg h-12"
                            onClick={() => {
                              const canvas = document.getElementById('header-qr-code') as HTMLCanvasElement;
                              if (canvas) {
                                const pngUrl = canvas.toDataURL("image/png");
                                const downloadLink = document.createElement("a");
                                downloadLink.href = pngUrl;
                                downloadLink.download = "warungku-qr.png";
                                document.body.appendChild(downloadLink);
                                downloadLink.click();
                                document.body.removeChild(downloadLink);
                              }
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download QR Code
                          </Button>

                          <div className="space-y-3 w-full">
                            <p className="text-[10px] text-zinc-500 font-bold tracking-widest uppercase">BAGIKAN VIA</p>
                            <div className="flex justify-center gap-3">
                              <Button
                                size="icon" variant="outline" className="rounded-full border-zinc-800 bg-zinc-900 text-[#25D366] hover:bg-zinc-800 hover:text-[#25D366] hover:border-zinc-700 w-10 h-10"
                                onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent('Kunjungi ' + (storeName || 'Warungku') + '! ' + window.location.href)}`, '_blank')}
                              >
                                <MessageCircle size={18} />
                              </Button>
                              <Button
                                size="icon" variant="outline" className="rounded-full border-zinc-800 bg-zinc-900 text-[#1877F2] hover:bg-zinc-800 hover:text-[#1877F2] hover:border-zinc-700 w-10 h-10"
                                onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank')}
                              >
                                <Facebook size={18} />
                              </Button>
                              <Button
                                size="icon" variant="outline" className="rounded-full border-zinc-800 bg-zinc-900 text-[#1DA1F2] hover:bg-zinc-800 hover:text-[#1DA1F2] hover:border-zinc-700 w-10 h-10"
                                onClick={() => window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(window.location.href)}&text=${encodeURIComponent('Kunjungi ' + (storeName || 'Warungku') + '!')}`, '_blank')}
                              >
                                <Twitter size={18} />
                              </Button>
                              <Button
                                size="icon" variant="outline" className="rounded-full border-zinc-800 bg-zinc-900 text-brand-orange hover:bg-zinc-800 hover:text-brand-orange hover:border-zinc-700 w-10 h-10"
                                onClick={() => {
                                  if (navigator.share) {
                                    navigator.share({
                                      title: storeName || 'Warungku',
                                      text: 'Kunjungi ' + (storeName || 'Warungku') + '!',
                                      url: window.location.href
                                    });
                                  }
                                }}
                              >
                                <Share2 size={18} />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-6 pt-4 border-t border-zinc-900 w-full">
                            <p className="text-[10px] text-zinc-600">2026 OMZETIN by RSQUARE. All rights reserved.</p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              )}

              {/* Desktop Navigation - HIDDEN (Moved to Sidebar) */}
              <nav className="hidden md:hidden items-center space-x-2 bg-brand-black/10 border-2 border-brand-black/20 p-1">
                {navLinks}
              </nav>

              {/* Desktop Actions - HIDDEN (Moved to Sidebar) */}
              {/* Desktop Actions */}
              <div className="hidden md:flex items-center gap-2">
                {!isAuthenticated || isPublicMode ? (
                  <>
                    <Button
                      onClick={() => navigate('/register')}
                      variant="ghost"
                      className="font-mono uppercase font-bold text-sm px-4 py-2 border-2 border-brand-black rounded-none transition-all duration-200 bg-brand-white text-brand-black hover:bg-brand-orange hover:text-brand-black hover:shadow-hard-sm"
                    >
                      Daftar
                    </Button>
                    <Button
                      onClick={() => navigate('/login')}
                      variant="ghost"
                      className="font-mono uppercase font-bold text-sm px-4 py-2 border-2 border-brand-black rounded-none transition-all duration-200 bg-brand-white text-brand-black hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm"
                    >
                      Masuk
                    </Button>
                  </>
                ) : (
                  <>
                    <TestimonialDialog />
                    <NotificationBell />
                    <SettingsDialog />
                  </>
                )}
              </div>

              {/* Mobile Menu Toggle */}
              <div className="md:hidden flex items-center gap-2">
                {isAuthenticated && !isPublicMode && (
                  <>
                    <TestimonialDialog />
                    <NotificationBell />
                    <SettingsDialog />
                  </>
                )}
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
                  className="overflow-hidden md:hidden border-t-2 border-brand-black bg-brand-orange/95 backdrop-blur-sm"
                >
                  <div className="max-w-7xl mx-auto px-4 py-4">
                    <div className="flex flex-col space-y-2">
                      {navLinks}

                      {isAuthenticated && !isPublicMode && (
                        <>
                          {/* Logout Button */}
                          <Button
                            onClick={() => {
                              handleLogout();
                              setMenuOpen(false);
                            }}
                            variant="ghost"
                            className="font-mono uppercase font-bold text-sm px-4 py-2 border-2 border-brand-black rounded-none transition-all duration-200 bg-brand-white text-brand-black hover:bg-destructive hover:text-destructive-foreground justify-start"
                          >
                            <LogOut className="w-4 h-4 mr-2" />
                            Keluar
                          </Button>
                        </>
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
