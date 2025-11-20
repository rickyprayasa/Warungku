import { useState } from 'react';
import { Package, Warehouse, DollarSign, ShoppingCart, Truck, Inbox, ArrowRightLeft, Banknote } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomNavProps {
    activeTab: string;
    onTabChange: (value: string) => void;
}

const tabs = [
    { value: "products", label: "Produk", icon: Package },
    { value: "inventory", label: "Stok", icon: Warehouse },
    { value: "sales", label: "Jual", icon: DollarSign },
    { value: "purchases", label: "Beli", icon: ShoppingCart },
];

const moreTabs = [
    { value: "suppliers", label: "Pemasok", icon: Truck },
    { value: "requests", label: "Request", icon: Inbox },
    { value: "cashflow", label: "Kas", icon: ArrowRightLeft },
    { value: "finance", label: "Finance", icon: Banknote },
];

export function MobileBottomNav({ activeTab, onTabChange }: BottomNavProps) {
    const [showMore, setShowMore] = useState(false);

    const allTabs = [...tabs, ...moreTabs];
    const displayTabs = tabs;

    return (
        <>
            {/* More Menu Overlay */}
            {showMore && (
                <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={() => setShowMore(false)}
                >
                    <div
                        className="absolute bottom-16 left-0 right-0 bg-brand-white border-t-4 border-brand-black p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="font-bold text-sm mb-3 font-mono uppercase">Menu Lainnya</h3>
                        <div className="grid grid-cols-4 gap-2">
                            {moreTabs.map((tab) => (
                                <button
                                    key={tab.value}
                                    onClick={() => {
                                        onTabChange(tab.value);
                                        setShowMore(false);
                                    }}
                                    className={cn(
                                        "flex flex-col items-center justify-center p-3 rounded-none border-2 transition-colors",
                                        activeTab === tab.value
                                            ? "bg-brand-orange border-brand-black text-brand-black"
                                            : "bg-white border-brand-black text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    <tab.icon className="w-5 h-5 mb-1" />
                                    <span className="text-xs font-mono font-bold">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation Bar */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-brand-white border-t-4 border-brand-black z-30">
                <div className="grid grid-cols-5 h-16">
                    {displayTabs.map((tab) => (
                        <button
                            key={tab.value}
                            onClick={() => onTabChange(tab.value)}
                            className={cn(
                                "flex flex-col items-center justify-center transition-colors border-r-2 border-brand-black last:border-r-0",
                                activeTab === tab.value
                                    ? "bg-brand-orange text-brand-black"
                                    : "text-muted-foreground hover:bg-muted"
                            )}
                        >
                            <tab.icon className="w-5 h-5 mb-1" />
                            <span className="text-xs font-mono font-bold">{tab.label}</span>
                        </button>
                    ))}

                    {/* More Button */}
                    <button
                        onClick={() => setShowMore(!showMore)}
                        className={cn(
                            "flex flex-col items-center justify-center transition-colors",
                            showMore ? "bg-brand-orange text-brand-black" : "text-muted-foreground hover:bg-muted"
                        )}
                    >
                        <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                        <span className="text-xs font-mono font-bold">Lainnya</span>
                    </button>
                </div>
            </div>
        </>
    );
}
