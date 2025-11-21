import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useWarungStore } from '@/lib/store';
import { Button } from './ui/button';
import { Store, LayoutDashboard, ClipboardCheck, LogOut, Settings, BarChart3, Package, DollarSign, ShoppingCart, Truck, Inbox, ArrowRightLeft, Banknote } from 'lucide-react';
import { AnimatedLogo } from './AnimatedLogo';
import { StoreProfileDialog } from './StoreProfileDialog';
import { SettingsDialog } from './SettingsDialog';

export function Sidebar() {
    const isAuthenticated = useWarungStore((state) => state.isAuthenticated);
    const logout = useWarungStore((state) => state.logout);
    const storeProfile = useWarungStore((state) => state.storeProfile);
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const isActiveLink = (path: string, tab?: string) => {
        if (tab) {
            const searchParams = new URLSearchParams(location.search);
            return location.pathname === path && searchParams.get('tab') === tab;
        }
        return location.pathname === path && !location.search;
    };

    const NavItem = ({ to, icon: Icon, label, tab }: { to: string; icon: any; label: string; tab?: string }) => {
        const active = isActiveLink(to, tab);
        return (
            <NavLink
                to={tab ? `${to}?tab=${tab}` : to}
                className={cn(
                    'flex items-center gap-3 font-mono uppercase font-bold text-sm px-4 py-3 border-l-4 border-transparent transition-all duration-200 w-full text-left hover:bg-brand-orange/10',
                    active
                        ? 'border-brand-orange bg-brand-orange/20 text-brand-black'
                        : 'text-muted-foreground hover:text-brand-black'
                )}
            >
                <Icon className="w-5 h-5" />
                {label}
            </NavLink>
        );
    };

    if (!isAuthenticated) return null;

    return (
        <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-brand-white border-r-4 border-brand-black z-40">
            {/* Store Header */}
            <div className="p-6 border-b-4 border-brand-black bg-brand-orange/10">
                <div className="flex flex-col items-center gap-4">
                    {storeProfile.logoUrl ? (
                        <div className="w-20 h-20 rounded-full border-4 border-brand-black overflow-hidden bg-white">
                            <img src={storeProfile.logoUrl} alt={storeProfile.name} className="w-full h-full object-cover" />
                        </div>
                    ) : (
                        <div className="w-20 h-20 rounded-full border-4 border-brand-black bg-brand-orange flex items-center justify-center">
                            <Store className="w-10 h-10 text-brand-black" />
                        </div>
                    )}

                    <div className="text-center">
                        <h2 className="font-display font-black text-xl text-brand-black uppercase leading-tight">
                            {storeProfile.name}
                        </h2>
                        <p className="font-mono text-xs text-muted-foreground mt-1">
                            {storeProfile.address || 'Alamat belum diatur'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 space-y-1 overflow-y-auto">

                {/* UTAMA */}
                <div className="pt-2 pb-2 px-4">
                    <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Utama</p>
                </div>
                <NavItem to="/" icon={Store} label="Kasir (POS)" />
                <NavItem to="/dashboard" tab="analytics" icon={BarChart3} label="Dasbor" />

                {/* INVENTARIS */}
                <div className="pt-4 pb-2 px-4">
                    <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Inventaris</p>
                </div>
                <NavItem to="/dashboard" tab="products" icon={Package} label="Produk & Stok" />
                <NavItem to="/opname" icon={ClipboardCheck} label="Rekon Stok" />
                <NavItem to="/dashboard" tab="suppliers" icon={Truck} label="Pemasok" />

                {/* TRANSAKSI */}
                <div className="pt-4 pb-2 px-4">
                    <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Transaksi</p>
                </div>
                <NavItem to="/dashboard" tab="sales" icon={DollarSign} label="Penjualan" />
                <NavItem to="/dashboard" tab="purchases" icon={ShoppingCart} label="Pembelian" />
                <NavItem to="/dashboard" tab="requests" icon={Inbox} label="Request Masuk" />

                {/* KEUANGAN */}
                <div className="pt-4 pb-2 px-4">
                    <p className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Keuangan</p>
                </div>
                <NavItem to="/dashboard" tab="cashflow" icon={ArrowRightLeft} label="Arus Kas" />
                <NavItem to="/dashboard" tab="finance" icon={Banknote} label="Keuangan" />
                <NavItem to="/dashboard" tab="opname" icon={ClipboardCheck} label="Rekon Kas" />

            </nav>

            {/* Footer Actions */}
            <div className="p-4 border-t-4 border-brand-black bg-gray-50 space-y-2">
                <StoreProfileDialog />

                <SettingsDialog
                    trigger={
                        <Button
                            variant="ghost"
                            className="w-full justify-start font-mono uppercase font-bold text-sm px-4 py-2 hover:bg-brand-orange hover:text-brand-black rounded-none transition-colors text-muted-foreground"
                        >
                            <Settings className="w-4 h-4 mr-2" />
                            Pengaturan
                        </Button>
                    }
                />

                <Button
                    onClick={handleLogout}
                    variant="ghost"
                    className="w-full justify-start font-mono uppercase font-bold text-sm px-4 py-2 hover:bg-destructive/10 hover:text-destructive rounded-none transition-colors text-muted-foreground"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Keluar
                </Button>

                {/* Watermark */}
                <div className="pt-4 mt-2 border-t border-gray-200 text-center">
                    <p className="font-mono text-[10px] text-muted-foreground">
                        Powered by <span className="font-bold text-brand-black">RSQUARE</span>
                    </p>
                    <a href="https://omzetin.web.id" target="_blank" rel="noopener noreferrer" className="font-mono text-[10px] text-brand-orange hover:underline">
                        omzetin.web.id
                    </a>
                </div>
            </div>
        </aside>
    );
}
