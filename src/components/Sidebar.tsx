import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useWarungStore } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Store, LayoutDashboard, ClipboardCheck, LogOut, Settings, BarChart3, Package, DollarSign, ShoppingCart, Truck, Inbox, ArrowRightLeft, Banknote, ChevronLeft, ChevronRight, Tag, QrCode, RefreshCw, ExternalLink } from 'lucide-react';
import { AnimatedLogo } from './AnimatedLogo';
import { StoreProfileDialog } from './StoreProfileDialog';
import { QRISSetupDialog } from './QRISSetupDialog';
import { SettingsDialog } from './SettingsDialog';
import { useState, useEffect } from 'react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function Sidebar() {
    const { isAuthenticated, signOut, store } = useAuth();
    const storeProfile = useWarungStore((state) => state.storeProfile);
    const navigate = useNavigate();
    const location = useLocation();
    


    // Collapsed state with localStorage persistence
    const [collapsed, setCollapsed] = useState(() => {
        const stored = localStorage.getItem('sidebar-collapsed');
        return stored === 'true';
    });

    useEffect(() => {
        localStorage.setItem('sidebar-collapsed', String(collapsed));
    }, [collapsed]);

    const toggleCollapsed = () => setCollapsed(!collapsed);

    const handleLogout = async () => {
        await signOut();
        navigate('/login');
    };

    const handleRefreshData = async () => {
        const store = useWarungStore.getState();
        
        toast.promise(
            Promise.all([
                store.fetchProducts(),
                store.fetchSales(),
                store.fetchPurchases(),
                store.fetchSuppliers(),
                store.fetchJajananRequests(),
                store.fetchReconciliations(),
                store.fetchStoreProfile(),
            ]),
            {
                loading: 'Memuat ulang data...',
                success: 'Data berhasil di-refresh!',
                error: 'Gagal memuat ulang data',
            }
        );
    };

    if (!isAuthenticated) return null;

    return (
        <aside className={cn(
            "hidden md:flex flex-col h-screen fixed top-0 left-0 bg-brand-white border-r-4 border-brand-black z-40 transition-all duration-300 overflow-hidden",
            collapsed ? "w-20" : "w-64"
        )}>
            <div className={cn(
                "border-b-4 border-brand-black bg-brand-orange/10 relative overflow-visible",
                collapsed ? "p-4" : "p-4"
            )}>
                {!collapsed ? (
                    <div className="flex items-center gap-3">
                        {/* RSQUARE Logo */}
                        <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                            <img
                                src="/rsquare-logo-48.png"
                                srcSet="/rsquare-logo-48.png 1x, /rsquare-logo-96.png 2x"
                                alt="RSQUARE Logo"
                                width={48}
                                height={48}
                                className="w-full h-full object-contain"
                            />
                        </div>
                        <div className="min-w-0">
                            <h2 className="font-display font-black text-base text-brand-black uppercase leading-tight truncate">
                                {storeProfile.name}
                            </h2>
                            <p className="font-mono text-[11px] text-muted-foreground truncate">
                                {storeProfile.address || 'Alamat belum diatur'}
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <div className="w-12 h-12 flex items-center justify-center">
                            <img
                                src="/rsquare-logo-48.png"
                                srcSet="/rsquare-logo-48.png 1x, /rsquare-logo-96.png 2x"
                                alt="RSQUARE Logo"
                                width={48}
                                height={48}
                                className="w-full h-full object-contain"
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Toggle Button positioned relative to sidebar */}
            <button
                onClick={toggleCollapsed}
                className={cn(
                    "fixed top-4 w-6 h-6 rounded-full bg-brand-orange border-2 border-brand-black flex items-center justify-center hover:bg-brand-black hover:text-brand-white transition-all duration-300 z-50",
                    collapsed ? "left-[68px]" : "left-[244px]"
                )}
            >
                {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>

            {/* Navigation */}
            <nav className="flex-1 py-3 overflow-y-auto">

                {/* UTAMA */}
                {!collapsed && (
                    <div className="pt-2 pb-1 px-4">
                        <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Utama</p>
                    </div>
                )}
                <NavItem to="/" icon={Store} label="Kasir (POS)" collapsed={collapsed} />
                <NavItem to="/dashboard" tab="analytics" icon={BarChart3} label="Dasbor" collapsed={collapsed} />
                
                {/* Link to Public Store */}
                {store?.slug && (
                    <ExternalNavItem 
                        href={`/store/${store.slug}`} 
                        icon={ExternalLink} 
                        label="Lihat Toko" 
                        collapsed={collapsed} 
                    />
                )}

                {/* INVENTARIS */}
                {!collapsed && (
                    <div className="pt-3 pb-1 px-4">
                        <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Inventaris</p>
                    </div>
                )}
                <NavItem to="/dashboard" tab="products" icon={Package} label="Produk" collapsed={collapsed} />
                <NavItem to="/dashboard" tab="suppliers" icon={Truck} label="Pemasok" collapsed={collapsed} />
                <NavItem to="/dashboard" tab="price-reference" icon={Tag} label="Ref. Harga" collapsed={collapsed} />

                {/* TRANSAKSI */}
                {!collapsed && (
                    <div className="pt-3 pb-1 px-4">
                        <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Transaksi</p>
                    </div>
                )}
                <NavItem to="/dashboard" tab="sales" icon={DollarSign} label="Penjualan" collapsed={collapsed} />
                <NavItem to="/dashboard" tab="purchases" icon={ShoppingCart} label="Pembelian" collapsed={collapsed} />
                <NavItem to="/dashboard" tab="requests" icon={Inbox} label="Request" collapsed={collapsed} />

                {/* KEUANGAN & REKON */}
                {!collapsed && (
                    <div className="pt-3 pb-1 px-4">
                        <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Keuangan</p>
                    </div>
                )}
                <NavItem to="/dashboard" tab="cashflow" icon={ArrowRightLeft} label="Arus Kas" collapsed={collapsed} />
                <NavItem to="/dashboard" tab="finance" icon={Banknote} label="Keuangan" collapsed={collapsed} />
                <RekonNavItem collapsed={collapsed} />

            </nav>

            {/* Footer Actions */}
            <div className="p-3 border-t-4 border-brand-black bg-gray-50 space-y-2">
                {!collapsed ? (
                    <>
                        <TooltipProvider delayDuration={500}>
                            <div className="flex gap-1">
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex-1">
                                            <StoreProfileDialog compact />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="font-mono">Profil Toko</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex-1">
                                            <QRISSetupDialog compact />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="font-mono">Setup QRIS</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="flex-1">
                                            <SettingsDialog
                                                trigger={
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="w-full justify-center font-mono uppercase font-bold text-xs px-2 py-2 hover:bg-brand-orange hover:text-brand-black rounded-none transition-colors text-muted-foreground"
                                                    >
                                                        <Settings className="w-4 h-4" />
                                                    </Button>
                                                }
                                            />
                                        </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="font-mono">Pengaturan</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            onClick={handleLogout}
                                            variant="ghost"
                                            size="sm"
                                            className="flex-1 justify-center font-mono uppercase font-bold text-xs px-2 py-2 hover:bg-destructive/10 hover:text-destructive rounded-none transition-colors text-muted-foreground"
                                        >
                                            <LogOut className="w-4 h-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="font-mono">Keluar</TooltipContent>
                                </Tooltip>
                            </div>
                        </TooltipProvider>

                        {/* Watermark */}
                        <div className="pt-2 text-center">
                            <p className="font-mono text-[10px] text-muted-foreground">
                                <span className="font-bold text-brand-black">RSQUARE</span> | <a href="https://www.rsquareidea.my.id" target="_blank" rel="noopener noreferrer" className="text-brand-orange hover:underline">rsquareidea.my.id</a>
                            </p>
                        </div>
                    </>
                ) : (
                    // Collapsed footer icons
                    <TooltipProvider delayDuration={300}>
                        <div className="flex flex-col items-center gap-2">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={handleRefreshData}
                                        variant="ghost"
                                        size="icon"
                                        className="hover:bg-brand-orange hover:text-brand-black rounded-none transition-colors text-muted-foreground"
                                    >
                                        <RefreshCw className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Refresh Data</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <div className="w-full flex justify-center">
                                        <StoreProfileDialog iconOnly />
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent side="right">Profil Toko</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <QRISSetupDialog
                                        trigger={
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="hover:bg-brand-orange hover:text-brand-black rounded-none transition-colors text-muted-foreground"
                                            >
                                                <QrCode className="w-4 h-4" />
                                            </Button>
                                        }
                                    />
                                </TooltipTrigger>
                                <TooltipContent side="right">Setup QRIS</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <SettingsDialog
                                        trigger={
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="hover:bg-brand-orange hover:text-brand-black rounded-none transition-colors text-muted-foreground"
                                            >
                                                <Settings className="w-4 h-4" />
                                            </Button>
                                        }
                                    />
                                </TooltipTrigger>
                                <TooltipContent side="right">Pengaturan</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        onClick={handleLogout}
                                        variant="ghost"
                                        size="icon"
                                        className="hover:bg-destructive/10 hover:text-destructive rounded-none transition-colors text-muted-foreground"
                                    >
                                        <LogOut className="w-4 h-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">Keluar</TooltipContent>
                            </Tooltip>
                        </div>
                    </TooltipProvider>
                )}
            </div>
        </aside>
    );
}

function NavItem({ to, icon: Icon, label, tab, collapsed }: { to: string; icon: any; label: string; tab?: string; collapsed: boolean }) {
    const location = useLocation();

    const isActive = () => {
        if (tab) {
            const searchParams = new URLSearchParams(location.search);
            return location.pathname === to && searchParams.get('tab') === tab;
        }
        return location.pathname === to && !location.search;
    };

    const active = isActive();

    const content = (
        <NavLink
            to={tab ? `${to}?tab=${tab}` : to}
            preventScrollReset
            className={cn(
                'flex items-center gap-3 font-mono uppercase font-bold text-xs px-4 py-2.5 border-l-4 border-transparent transition-all duration-200 w-full text-left hover:bg-brand-orange/10',
                active
                    ? 'border-brand-orange bg-brand-orange/20 text-brand-black'
                    : 'text-muted-foreground hover:text-brand-black',
                collapsed && 'justify-center'
            )}
        >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && label}
        </NavLink>
    );

    if (collapsed) {
        return (
            <TooltipProvider delayDuration={300}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {content}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-mono">
                        {label}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return content;
}

// External link NavItem (opens in new tab)
function ExternalNavItem({ href, icon: Icon, label, collapsed }: { href: string; icon: any; label: string; collapsed: boolean }) {
    const content = (
        <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
                'flex items-center gap-3 font-mono uppercase font-bold text-xs px-4 py-2.5 border-l-4 border-transparent transition-all duration-200 w-full text-left hover:bg-brand-orange/10 text-muted-foreground hover:text-brand-black',
                collapsed && 'justify-center'
            )}
        >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {!collapsed && label}
        </a>
    );

    if (collapsed) {
        return (
            <TooltipProvider delayDuration={300}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {content}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-mono">
                        {label}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return content;
}

// Dynamic Rekon NavItem that updates based on opnameMode
function RekonNavItem({ collapsed }: { collapsed: boolean }) {
    const location = useLocation();
    const opnameMode = useWarungStore((state) => state.opnameMode);

    const isActive = () => {
        const searchParams = new URLSearchParams(location.search);
        return location.pathname === '/dashboard' && searchParams.get('tab') === 'opname';
    };

    const active = isActive();
    const label = opnameMode === 'display' ? 'Rekon Kas' : opnameMode === 'terpadu' ? 'Rekonsiliasi' : 'Rekon Stok';

    const content = (
        <NavLink
            to="/dashboard?tab=opname"
            preventScrollReset
            className={cn(
                'flex items-center gap-3 font-mono uppercase font-bold text-xs px-4 py-2.5 border-l-4 border-transparent transition-all duration-200 w-full text-left hover:bg-brand-orange/10',
                active
                    ? 'border-brand-orange bg-brand-orange/20 text-brand-black'
                    : 'text-muted-foreground hover:text-brand-black',
                collapsed && 'justify-center'
            )}
        >
            <ClipboardCheck className="w-4 h-4 flex-shrink-0" />
            {!collapsed && label}
        </NavLink>
    );

    if (collapsed) {
        return (
            <TooltipProvider delayDuration={300}>
                <Tooltip>
                    <TooltipTrigger asChild>
                        {content}
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-mono">
                        {label}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return content;
}
