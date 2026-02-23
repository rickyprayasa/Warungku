import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useWarungStore } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin } from '@/contexts/AdminContext';
import { usePlan } from '@/contexts/PlanContext';
import { Button } from './ui/button';
import { toast } from 'sonner';
import { Store, LayoutDashboard, ClipboardCheck, LogOut, Settings, BarChart3, Package, DollarSign, ShoppingCart, Truck, Inbox, ArrowRightLeft, Banknote, ChevronLeft, ChevronRight, Tag, QrCode, RefreshCw, ExternalLink, Shield, MessageCircle } from 'lucide-react';
import { AnimatedLogo } from './AnimatedLogo';
import { StoreProfileDialog } from './StoreProfileDialog';
import { QRISSetupDialog } from './QRISSetupDialog';
import { SettingsDialog } from './SettingsDialog';
import { useState, useEffect, useMemo } from 'react';
import { useDemoMode } from '@/hooks/useDemoMode';
import { Clock, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import rsquareLogo from '@/assets/rsquare-logo-80.png';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

export function Sidebar() {
    const { isAuthenticated, signOut, store, user: authUser } = useAuth();
    const { isAdmin } = useAdmin();
    const { isFreePlan, isTrialActive, daysRemainingInTrial, plan, effectivePlan } = usePlan();
    const storeProfile = useWarungStore((state) => state.storeProfile);
    const { isDemo } = useDemoMode();
    const navigate = useNavigate();
    const location = useLocation();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    // Fetch current user details when store changes
    const currentStoreId = useWarungStore((state) => state.currentStoreId);
    const fetchCurrentUser = useWarungStore((state) => state.fetchCurrentUser);
    const currentUser = useWarungStore((state) => state.currentUser);

    useEffect(() => {
        if (currentStoreId) {
            fetchCurrentUser(authUser);

            // Failsafe: If no user after 2 seconds, retry
            const retryTimer = setTimeout(() => {
                const current = useWarungStore.getState().currentUser;
                if (!current) {
                    console.warn('[Sidebar] User still null after 2s, retrying fetch...');
                    fetchCurrentUser(authUser);
                }
            }, 2000);
            return () => clearTimeout(retryTimer);
        }
    }, [currentStoreId, fetchCurrentUser]);



    const sidebarCollapsed = useWarungStore((state) => state.sidebarCollapsed);
    const setSidebarCollapsed = useWarungStore((state) => state.setSidebarCollapsed);

    // Initialize from localStorage
    useEffect(() => {
        const stored = localStorage.getItem('sidebar-collapsed');
        if (stored === 'true') {
            setSidebarCollapsed(true);
        }
    }, []);

    const toggleCollapsed = () => {
        const newState = !sidebarCollapsed;
        setSidebarCollapsed(newState);
        localStorage.setItem('sidebar-collapsed', String(newState));
    };

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
            sidebarCollapsed ? "w-20" : "w-64"
        )}>
            <div className={cn(
                "border-b-4 border-brand-black bg-brand-orange/10 relative overflow-visible flex flex-col",
                sidebarCollapsed ? "p-2" : "p-4"
            )}>
                {!sidebarCollapsed ? (
                    <>
                        <div className="flex items-center gap-3 mb-2">
                            {/* OMZETIN Logo */}
                            <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                                <div className="scale-90">
                                    <AnimatedLogo showText={false} />
                                </div>
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

                        {/* Clock & Date Widget - Compact */}
                        <div className="flex items-center justify-between bg-brand-black/5 border border-brand-black/10 rounded px-2 py-1.5">
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-brand-orange" />
                                <span className="font-mono font-bold text-xs text-brand-black">
                                    {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <div className="w-px h-3 bg-brand-black/20" />
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-brand-orange" />
                                <span className="font-mono font-bold text-[10px] text-brand-black uppercase">
                                    {currentTime.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}
                                </span>
                            </div>
                        </div>

                        {/* Trial Status Badge */}
                        {isTrialActive && daysRemainingInTrial !== null && (
                            <div className="mt-2 bg-green-50 border-2 border-green-600 rounded px-2 py-1.5">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1">
                                        <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse"></div>
                                        <span className="font-mono text-[10px] font-bold text-green-700 uppercase">Trial Pro</span>
                                    </div>
                                    <span className="font-mono text-[10px] font-bold text-green-800">
                                        {daysRemainingInTrial} hari
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* User Profile Badge */}
                        <div className="mt-2 bg-brand-orange/10 border-2 border-brand-orange rounded px-2 py-1.5">
                            <div className="flex items-center gap-2">
                                <div className="min-w-0 flex-1">
                                    <p className="font-mono text-xs font-bold text-brand-black truncate">
                                        {currentUser ? (
                                            isDemo ? "Pemilik Toko (Demo)" : (currentUser.name || currentUser.email?.split('@')[0])
                                        ) : (
                                            <span className="opacity-50">Loading...</span>
                                        )}
                                    </p>
                                    <p className="font-mono text-[10px] text-muted-foreground uppercase truncate">
                                        {currentUser ? (
                                            currentUser.role === 'owner' ? '👑 Pemilik Toko' : currentUser.role === 'admin' ? '🛡️ Admin' : '👤 Staff'
                                        ) : (
                                            <span className="opacity-0">...</span>
                                        )}
                                    </p>
                                    {currentUser?.email && (
                                        <p className="font-mono text-[9px] text-muted-foreground truncate mt-0.5" title={isDemo ? 'demo@omzetin.web.id' : currentUser.email}>
                                            {isDemo ? 'demo@omzetin.web.id' : currentUser.email}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 flex items-center justify-center flex-shrink-0">
                            <div className="scale-75">
                                <AnimatedLogo showText={false} />
                            </div>
                        </div>
                        <div className="text-[10px] font-mono font-bold text-brand-black bg-white px-1 border border-brand-black">
                            {currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                    </div>
                )}
            </div>

            {/* Toggle Button positioned relative to sidebar */}
            <button
                onClick={toggleCollapsed}
                className={cn(
                    "fixed top-4 w-6 h-6 rounded-full bg-brand-orange border-2 border-brand-black flex items-center justify-center hover:bg-brand-black hover:text-brand-white transition-all duration-300 z-50",
                    sidebarCollapsed ? "left-[68px]" : "left-[244px]"
                )}
            >
                {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
            </button>

            {/* Navigation */}
            <nav className="flex-1 py-3 overflow-y-auto">

                {/* Helper: is this user an owner or admin? */}
                {(() => {
                    const isOwnerOrAdmin = currentUser?.role === 'owner' || currentUser?.role === 'admin';

                    // Helper to check if user has permission
                    const hasPermission = (perm: string) => {
                        // If owner or admin, always true
                        if (isOwnerOrAdmin) return true;

                        // If user has specific permissions array set, use it
                        // CRITICAL FIX: null/undefined check only. Empty array [] is valid "no access".
                        if (currentUser?.permissions) {
                            return currentUser.permissions.includes(perm);
                        }

                        // Fallback to role-based defaults for staff ONLY if permissions is undefined
                        // Staff default: pos, products, sales
                        if (perm === 'pos' || perm === 'products' || perm === 'sales') return true;

                        return false;
                    };

                    return (
                        <>
                            {/* UTAMA */}
                            {!sidebarCollapsed && (
                                <div className="pt-2 pb-1 px-4">
                                    <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Utama</p>
                                </div>
                            )}
                            {hasPermission('pos') && (
                                <NavItem id="tour-pos" to="/pos" icon={Store} label="Kasir (POS)" collapsed={sidebarCollapsed} />
                            )}
                            {(isOwnerOrAdmin || hasPermission('settings')) && (
                                <NavItem
                                    id="tour-dashboard"
                                    to="/dashboard"
                                    tab="analytics"
                                    icon={BarChart3}
                                    label="Dasbor"
                                    collapsed={sidebarCollapsed}
                                />
                            )}

                            {/* Link to Public Store - owner/admin only */}
                            {isOwnerOrAdmin && store?.slug && (
                                <ExternalNavItem
                                    href={`/${store.slug}`}
                                    icon={ExternalLink}
                                    label="Lihat Toko"
                                    collapsed={sidebarCollapsed}
                                />
                            )}

                            {/* INVENTARIS */}
                            {!sidebarCollapsed && (hasPermission('products') || hasPermission('suppliers')) && (
                                <div className="pt-3 pb-1 px-4">
                                    <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Inventaris</p>
                                </div>
                            )}
                            {hasPermission('products') && (
                                <NavItem id="tour-products" to="/dashboard" tab="products" icon={Package} label="Produk" collapsed={sidebarCollapsed} />
                            )}
                            {hasPermission('suppliers') && (
                                <NavItem to="/dashboard" tab="suppliers" icon={Truck} label="Pemasok" collapsed={sidebarCollapsed} />
                            )}
                            {isOwnerOrAdmin && (
                                <NavItem to="/dashboard" tab="price-reference" icon={Tag} label="Ref. Harga" collapsed={sidebarCollapsed} />
                            )}

                            {/* TRANSAKSI */}
                            {!sidebarCollapsed && (hasPermission('sales') || hasPermission('purchases') || hasPermission('requests')) && (
                                <div className="pt-3 pb-1 px-4">
                                    <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Transaksi</p>
                                </div>
                            )}
                            {hasPermission('sales') && (
                                <NavItemWithBadge to="/dashboard" tab="sales" icon={DollarSign} label="Penjualan" collapsed={sidebarCollapsed} />
                            )}
                            {hasPermission('purchases') && (
                                <NavItem to="/dashboard" tab="purchases" icon={ShoppingCart} label="Pembelian" collapsed={sidebarCollapsed} />
                            )}
                            {hasPermission('requests') && (
                                <NavItem to="/dashboard" tab="requests" icon={Inbox} label="Request" collapsed={sidebarCollapsed} />
                            )}

                            {/* KEUANGAN & REKON - owner/admin only or specific finance permission */}
                            {(isOwnerOrAdmin || hasPermission('finance')) && (
                                <>
                                    {!sidebarCollapsed && (
                                        <div className="pt-3 pb-1 px-4">
                                            <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Keuangan</p>
                                        </div>
                                    )}
                                    <NavItem to="/dashboard" tab="cashflow" icon={ArrowRightLeft} label="Arus Kas" collapsed={sidebarCollapsed} />
                                    <NavItem to="/dashboard" tab="finance" icon={Banknote} label="Keuangan" collapsed={sidebarCollapsed} />
                                    {isOwnerOrAdmin && <RekonNavItem collapsed={sidebarCollapsed} />}
                                </>
                            )}
                        </>
                    );
                })()}

                {/* ADMIN CMS LINK */}
                {isAdmin && (
                    <>
                        {!sidebarCollapsed && (
                            <div className="pt-3 pb-1 px-4">
                                <p className="font-mono text-[10px] font-bold text-brand-orange uppercase tracking-wider">Platform</p>
                            </div>
                        )}
                        <NavItem
                            to="/admin"
                            icon={Shield}
                            label="CMS Admin"
                            collapsed={sidebarCollapsed}
                            className="text-brand-orange hover:text-brand-orange hover:bg-brand-orange/10"
                        />
                    </>
                )}

            </nav>

            {/* Footer Actions */}
            <div className="p-3 border-t-4 border-brand-black bg-gray-50 space-y-2">
                {!sidebarCollapsed ? (
                    <>
                        <TooltipProvider delayDuration={500}>
                            <div className="flex gap-1">
                                {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
                                    <>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <div className="flex-1" id="tour-store-profile">
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
                                    </>
                                )}

                                {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
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
                                )}

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

                            {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
                                <>
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
                                </>
                            )}

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

// Hook to count pending orders
function usePendingOrders() {
    const sales = useWarungStore((state) => state.sales);
    const currentStoreId = useWarungStore((state) => state.currentStoreId);
    const [pendingCount, setPendingCount] = useState(0);

    // Calculate pending orders from store sales
    useEffect(() => {
        const pending = sales.filter(s => s.status?.toLowerCase() === 'pending').length;
        setPendingCount(pending);
    }, [sales]);

    // Realtime subscription for new orders
    useEffect(() => {
        if (!currentStoreId) return;

        const channel = supabase
            .channel('pending-orders')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'sales',
                    filter: `store_id=eq.${currentStoreId}`
                },
                (payload) => {
                    if ((payload.new as any).status === 'pending') {
                        setPendingCount(prev => prev + 1);
                        // Refresh sales data
                        useWarungStore.getState().fetchSales();
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'sales',
                    filter: `store_id=eq.${currentStoreId}`
                },
                (payload) => {
                    // Refresh when status changes
                    useWarungStore.getState().fetchSales();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentStoreId]);

    return pendingCount;
}

// NavItem with badge indicator for pending orders
function NavItemWithBadge({ to, icon: Icon, label, tab, collapsed, className, id }: { to: string; icon: any; label: string; tab?: string; collapsed: boolean; className?: string; id?: string }) {
    const location = useLocation();
    const pendingCount = usePendingOrders();

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
            id={id}
            preventScrollReset
            className={cn(
                'flex items-center gap-3 font-mono uppercase font-bold text-xs px-4 py-2.5 border-l-4 border-transparent transition-all duration-200 w-full text-left hover:bg-brand-orange/10 relative',
                active
                    ? 'border-brand-orange bg-brand-orange/20 text-brand-black'
                    : 'text-muted-foreground hover:text-brand-black',
                collapsed && 'justify-center',
                className
            )}
        >
            <div className="relative">
                <Icon className="w-4 h-4 flex-shrink-0" />
                {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
            </div>
            {!collapsed && (
                <>
                    {label}
                    {pendingCount > 0 && (
                        <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                            {pendingCount}
                        </span>
                    )}
                </>
            )}
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
                        {label} {pendingCount > 0 && `(${pendingCount} pending)`}
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        );
    }

    return content;
}

function NavItem({ to, icon: Icon, label, tab, collapsed, className, id }: { to: string; icon: any; label: string; tab?: string; collapsed: boolean; className?: string; id?: string }) {
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
            id={id}
            preventScrollReset
            className={cn(
                'flex items-center gap-3 font-mono uppercase font-bold text-xs px-4 py-2.5 border-l-4 border-transparent transition-all duration-200 w-full text-left hover:bg-brand-orange/10',
                active
                    ? 'border-brand-orange bg-brand-orange/20 text-brand-black'
                    : 'text-muted-foreground hover:text-brand-black',
                collapsed && 'justify-center',
                className
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
    const handleOpenStore = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        // Open in new browser window - use original approach that worked
        const width = window.screen.width - 100; // Almost full screen
        const height = window.screen.height - 100;
        const left = 50;
        const top = 50;

        // Use timestamp to ensure new window each time
        const windowName = `store_window_${Date.now()}`;

        window.open(href, windowName,
            `width=${width},height=${height},left=${left},top=${top}`
        );
    };

    const content = (
        <a
            href={href}
            onClick={handleOpenStore}
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
