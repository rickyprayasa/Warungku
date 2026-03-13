import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Package, Warehouse, DollarSign, ShoppingCart, Truck, Inbox, ArrowRightLeft, Banknote, ClipboardCheck, Store, Plus, List, BarChart3, Menu as MenuIcon, MoreHorizontal, Tags, QrCode, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useWarungStore } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';

// Static more tabs (without store - that will be added dynamically)
const staticMoreTabs = [
    { value: "purchases", label: "Beli", icon: ShoppingCart, path: "/dashboard?tab=purchases" },
    { value: "suppliers", label: "Pemasok", icon: Truck, path: "/dashboard?tab=suppliers" },
    { value: "requests", label: "Request", icon: Inbox, path: "/dashboard?tab=requests" },
    { value: "price-reference", label: "Ref Harga", icon: Tags, path: "/dashboard?tab=price-reference" },
    { value: "cashflow", label: "Kas", icon: ArrowRightLeft, path: "/dashboard?tab=cashflow" },
    { value: "finance", label: "Finance", icon: Banknote, path: "/dashboard?tab=finance" },
    { value: "analytics", label: "Dashboard", icon: BarChart3, path: "/dashboard?tab=analytics" },
    { value: "qris", label: "Setup QRIS", icon: QrCode, path: "/dashboard?tab=qris" },
];

export function MobileBottomNav() {
    const navigate = useNavigate();
    const location = useLocation();
    const opnameMode = useWarungStore((state) => state.opnameMode);
    const currentUser = useWarungStore((state) => state.currentUser);
    const { store } = useAuth();
    const [showMore, setShowMore] = useState(false);
    const [activeTab, setActiveTab] = useState("pos");
    const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

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

    // Generate dynamic moreTabs with permission-based filtering
    const moreTabs = [
        ...staticMoreTabs.filter(tab => {
            // Check permission for each tab
            // Mapping value to permission key if different
            const permKey = tab.value === 'price-reference' ? 'products' : // Ref harga part of products/inventory
                tab.value === 'cashflow' ? 'finance' : // Cashflow part of finance
                    tab.value === 'analytics' ? 'settings' : // Analytics usually for owner/admin
                        tab.value === 'qris' ? 'settings' : // QRIS part of settings
                            tab.value; // others map 1:1

            return hasPermission(permKey);
        }),
        // Add store link only if store has slug and user is owner/admin
        ...(isOwnerOrAdmin && store?.slug ? [{
            value: "store",
            label: "Lihat Toko",
            icon: ExternalLink,
            path: `/${store.slug}`,
            isExternal: true
        }] : [])
    ];

    // Helper function to get rekon label based on current mode
    const getRekonLabel = () => {
        return opnameMode === 'display' ? 'Rekon Kas' : opnameMode === 'terpadu' ? 'Rekonsiliasi' : 'Rekon Stok';
    };

    // Generate tabs with current mode and permissions
    const getTabs = () => {
        const allTabs = [
            {
                value: "pos",
                label: "Kasir",
                icon: Store,
                path: "/pos",
                submenu: [
                    { label: "Buka Kasir", action: "open-pos", path: "/pos" },
                    { label: "Lihat Riwayat", action: "view-sales-history", path: "/dashboard?tab=sales" },
                ],
                isVisible: hasPermission('pos'),
            },
            {
                value: "products",
                label: "Produk",
                icon: Package,
                path: "/dashboard?tab=products",
                submenu: isOwnerOrAdmin ? [
                    { label: "Tambah Produk", action: "add-product", path: "/dashboard?tab=products" },
                    { label: "Lihat Semua", action: "view-all-products", path: "/dashboard?tab=products" },
                    { label: "Pembelian", action: "purchases", path: "/dashboard?tab=purchases" },
                ] : [
                    { label: "Lihat Produk", action: "view-all-products", path: "/dashboard?tab=products" },
                ],
                isVisible: hasPermission('products'),
            },
            {
                value: "opname",
                label: getRekonLabel(),
                icon: ClipboardCheck,
                path: "/dashboard?tab=opname",
                submenu: [
                    { label: `Buka ${getRekonLabel()}`, action: "open-opname", path: "/dashboard?tab=opname" },
                    { label: "Riwayat Kas", action: "cashflow", path: "/dashboard?tab=cashflow" },
                ],
                isVisible: isOwnerOrAdmin, // Opname usually owner/admin only unless specific perm added (not in list yet)
            },
            {
                value: "sales",
                label: "Jual",
                icon: DollarSign,
                path: "/dashboard?tab=sales",
                submenu: isOwnerOrAdmin ? [
                    { label: "Lihat Penjualan", action: "view-sales", path: "/dashboard?tab=sales" },
                    { label: "Laporan", action: "report", path: "/dashboard?tab=finance" },
                ] : [
                    { label: "Lihat Penjualan", action: "view-sales", path: "/dashboard?tab=sales" },
                ],
                isVisible: hasPermission('sales'),
            },
        ];

        // Filter tabs based on visibility
        return allTabs.filter(tab => tab.isVisible);
    };

    const tabs = getTabs();

    useEffect(() => {
        const path = location.pathname;
        const searchParams = new URLSearchParams(location.search);
        const tabParam = searchParams.get('tab');

        if (path === '/pos') {
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
        // If it's an external link (like store URL), open in new browser window
        if (tab.isExternal) {
            // Open in new browser window - use original approach that worked
            const width = window.screen.width - 100; // Almost full screen
            const height = window.screen.height - 100;
            const left = 50;
            const top = 50;

            // Use timestamp to ensure new window each time
            const windowName = `store_window_${Date.now()}`;

            window.open(tab.path, windowName,
                `width=${width},height=${height},left=${left},top=${top}`
            );
        } else {
            navigate(tab.path);
        }
        setShowMore(false);
    };

    const handleSubmenuAction = (tabValue: string, actionItem: any) => {
        setActiveSubmenu(null);
        if (actionItem.path) {
            navigate(actionItem.path);
        }
    };



    const handleTabClick = (tab: any) => {
        navigate(tab.path);
    };

    const handleTabDoubleClick = (tabValue: string) => {
        setActiveSubmenu(tabValue);
    };



    const handleMoreClick = () => {
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
                                        id={tab.value === 'analytics' ? 'mobile-tour-dashboard' : `mobile-tour-${tab.value}`}
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
                <div
                    className="grid h-16 w-full"
                    style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, 1fr)` }}
                >
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.value;
                        return (
                            <button
                                key={tab.value}
                                id={tab.value === 'analytics' ? 'mobile-tour-dashboard' : `mobile-tour-${tab.value}`}
                                onClick={() => handleTabClick(tab)}
                                onDoubleClick={() => handleTabDoubleClick(tab.value)}
                                className={cn(
                                    "flex flex-col items-center justify-center transition-colors active:bg-gray-100 relative w-full h-full",
                                    isActive ? "bg-brand-orange text-brand-black" : "text-muted-foreground hover:bg-muted"
                                )}
                            >
                                <Icon className="w-5 h-5 mb-1" />
                                <span className="text-[10px] font-bold font-mono">{tab.label}</span>

                                {/* Quick Action Trigger */}
                                {tab.submenu && (
                                    <div
                                        className="absolute top-1 right-1 p-1 rounded-full hover:bg-black/10 active:bg-black/20 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setActiveSubmenu(tab.value);
                                        }}
                                    >
                                        <MoreHorizontal className="w-3 h-3" />
                                    </div>
                                )}
                            </button>
                        );
                    })}

                    {/* More Button */}
                    <button
                        onClick={handleMoreClick}
                        onDoubleClick={handleMoreDoubleClick}
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
