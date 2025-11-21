import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, Warehouse, DollarSign, ShoppingCart, Truck, Inbox, ArrowRightLeft, Banknote, ClipboardCheck, Store, Plus, List, BarChart3, Menu as MenuIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
    {
        value: "pos",
        label: "Kasir",
        icon: Store,
        path: "/",
        submenu: [
            { label: "Buka Kasir", action: "open-pos", path: "/" },
            { label: "Lihat Riwayat", action: "view-sales-history", path: "/dashboard?tab=sales" },
        ]
    },
    {
        value: "products",
        label: "Produk",
        icon: Package,
        path: "/dashboard?tab=products",
        submenu: [
            { label: "Tambah Produk", action: "add-product", path: "/dashboard?tab=products" },
            { label: "Lihat Semua", action: "view-all-products", path: "/dashboard?tab=products" },
        ]
    },
    {
        value: "inventory",
        label: "Stok",
        icon: Warehouse,
        path: "/dashboard?tab=inventory",
        submenu: [
            { label: "Cek Stok", action: "check-stock", path: "/dashboard?tab=inventory" },
            { label: "Pembelian", action: "purchases", path: "/dashboard?tab=purchases" },
            { label: "Opname", action: "opname", path: "/dashboard?tab=opname" },
        ]
    },
    {
        value: "sales",
        label: "Jual",
        icon: DollarSign,
        path: "/dashboard?tab=sales",
        submenu: [
            { label: "Lihat Penjualan", action: "view-sales", path: "/dashboard?tab=sales" },
            { label: "Laporan", action: "report", path: "/dashboard?tab=finance" },
        ]
    },
];

const moreTabs = [
    { value: "opname", label: "Rekon", icon: ClipboardCheck, path: "/dashboard?tab=opname" },
    { value: "purchases", label: "Beli", icon: ShoppingCart, path: "/dashboard?tab=purchases" },
    { value: "suppliers", label: "Pemasok", icon: Truck, path: "/dashboard?tab=suppliers" },
    { value: "requests", label: "Request", icon: Inbox, path: "/dashboard?tab=requests" },
    { value: "cashflow", label: "Kas", icon: ArrowRightLeft, path: "/dashboard?tab=cashflow" },
    { value: "finance", label: "Finance", icon: Banknote, path: "/dashboard?tab=finance" },
];

export function MobileBottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const [showMore, setShowMore] = useState(false);
    const [activeTab, setActiveTab] = useState("pos");
    const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

    // Long press detection
    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const isLongPress = useRef(false);
    const currentTabRef = useRef<string | null>(null);

    useEffect(() => {
        const path = location.pathname;
        const searchParams = new URLSearchParams(location.search);
        const tabParam = searchParams.get('tab');

        if (path === '/') {
            setActiveTab('pos');
        } else if (path === '/dashboard') {
            if (tabParam) {
                setActiveTab(tabParam);
            } else {
                setActiveTab('products');
            }
        } else if (path === '/opname') {
            setActiveTab('opname');
        }
    }, [location]);

    const handleNavigation = (tab: any) => {
        navigate(tab.path);
        setShowMore(false);
    };

    const handleSubmenuAction = (tabValue: string, actionItem: any) => {
        setActiveSubmenu(null);
        if (actionItem.path) {
            navigate(actionItem.path);
        }
    };

    const handleTabTouchStart = (tabValue: string) => {
        isLongPress.current = false;
        currentTabRef.current = tabValue;
        longPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            setActiveSubmenu(tabValue);
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 500);
    };

    const handleTabTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleTabClick = (tab: any) => {
        if (isLongPress.current) {
            isLongPress.current = false;
            return;
        }
        navigate(tab.path);
    };

    const handleTabDoubleClick = (tabValue: string) => {
        setActiveSubmenu(tabValue);
    };

    const handleMoreTouchStart = () => {
        isLongPress.current = false;
        longPressTimer.current = setTimeout(() => {
            isLongPress.current = true;
            setShowMore(true);
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 500);
    };

    const handleMoreTouchEnd = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    };

    const handleMoreClick = () => {
        if (isLongPress.current) {
            isLongPress.current = false;
            return;
        }
        setShowMore(!showMore);
    };

    const handleMoreDoubleClick = () => {
        setShowMore(true);
    };

    return (
        <>
            {/* More Menu Overlay */}
            {showMore && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={() => setShowMore(false)}
                >
                    <div
                        className="absolute bottom-16 left-0 right-0 bg-brand-white border-t-4 border-brand-black p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="grid grid-cols-3 gap-3">
                            {moreTabs.map((tab) => {
                                const Icon = tab.icon;
                                return (
                                    <button
                                        key={tab.value}
                                        onClick={() => handleNavigation(tab)}
                                        className="flex flex-col items-center gap-2 p-3 rounded-none border-2 border-brand-black hover:bg-brand-orange active:translate-x-0.5 active:translate-y-0.5 transition-all"
                                    >
                                        <Icon className="w-6 h-6" />
                                        <span className="text-xs font-bold font-mono">{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Submenu Popup */}
            {activeSubmenu && (
                <div
                    className="fixed inset-0 bg-black/50 z-50 md:hidden"
                    onClick={() => setActiveSubmenu(null)}
                >
                    <div
                        className="absolute bottom-20 left-4 right-4 bg-brand-white border-4 border-brand-black shadow-hard-sm p-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-3 pb-2 border-b-2 border-dashed border-brand-black/20">
                            <h3 className="font-bold font-display text-lg">
                                {tabs.find(t => t.value === activeSubmenu)?.label}
                            </h3>
                            <button
                                onClick={() => setActiveSubmenu(null)}
                                className="text-muted-foreground hover:text-brand-black"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="space-y-2">
                            {tabs.find(t => t.value === activeSubmenu)?.submenu?.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSubmenuAction(activeSubmenu, item)}
                                    className="w-full text-left p-3 border-2 border-brand-black rounded-none hover:bg-brand-orange hover:translate-x-0.5 hover:translate-y-0.5 active:shadow-none transition-all font-mono font-bold"
                                >
                                    {item.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-brand-white border-t-4 border-brand-black z-30 pb-[env(safe-area-inset-bottom,0px)]">
                <div className="grid grid-cols-5 h-16">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.value;
                        return (
                            <button
                                key={tab.value}
                                onClick={() => handleTabClick(tab)}
                                onDoubleClick={() => handleTabDoubleClick(tab.value)}
                                onTouchStart={() => handleTabTouchStart(tab.value)}
                                onTouchEnd={handleTabTouchEnd}
                                className={cn(
                                    "flex flex-col items-center justify-center transition-colors active:bg-gray-100",
                                    isActive ? "bg-brand-orange text-brand-black" : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <Icon className="w-5 h-5 mb-1" />
                                <span className="text-[10px] font-bold font-mono">{tab.label}</span>
                            </button>
                        );
                    })}

                    {/* More Button */}
                    <button
                        onClick={handleMoreClick}
                        onDoubleClick={handleMoreDoubleClick}
                        onTouchStart={handleMoreTouchStart}
                        onTouchEnd={handleMoreTouchEnd}
                        onContextMenu={(e) => {
                            e.preventDefault();
                        }}
                        className={cn(
                            "flex flex-col items-center justify-center transition-colors active:bg-gray-100",
                            showMore ? "bg-brand-black text-brand-white" : "text-muted-foreground hover:bg-muted"
                        )}
                    >
                        <MenuIcon className="w-5 h-5 mb-1" />
                        <span className="text-[10px] font-bold font-mono">MENU</span>
                    </button>
                </div>
            </div>
        </>
    );
}
