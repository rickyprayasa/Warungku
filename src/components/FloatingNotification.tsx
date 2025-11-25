import { Bell, X, PackageX, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useWarungStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLowStockAlerts } from '@/hooks/useLowStockAlerts';
import { cn } from '@/lib/utils';

export function FloatingNotification() {
    const navigate = useNavigate();
    const requests = useWarungStore((state) => state.jajananRequests);
    const fetchRequests = useWarungStore((state) => state.fetchJajananRequests);
    const { lowStockProducts, outOfStockProducts, hasCritical } = useLowStockAlerts();
    const isAuthenticated = useWarungStore((state) => state.isAuthenticated);

    const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (isAuthenticated) {
            fetchRequests();
            const stored = localStorage.getItem('dismissedNotifications');
            if (stored) {
                setDismissedNotifications(new Set(JSON.parse(stored)));
            }
        }
    }, [fetchRequests, isAuthenticated]);

    if (!isAuthenticated) return null;

    const activeLowStock = lowStockProducts.filter(p =>
        !dismissedNotifications.has(`stock-${p.id}`)
    );

    const activeOutOfStock = outOfStockProducts.filter(p =>
        !dismissedNotifications.has(`stock-${p.id}`)
    );

    const pendingRequests = requests.filter(r =>
        r.status === 'pending' &&
        !dismissedNotifications.has(`req-${r.id}`)
    );

    const totalNotifications = activeLowStock.length + activeOutOfStock.length + pendingRequests.length;

    const dismissNotification = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newDismissed = new Set(dismissedNotifications);
        newDismissed.add(id);
        setDismissedNotifications(newDismissed);
        localStorage.setItem('dismissedNotifications', JSON.stringify([...newDismissed]));
    };

    const handleNotificationClick = (type: 'inventory' | 'requests', id: string) => {
        const notificationId = type === 'inventory' ? `stock-${id}` : `req-${id}`;
        const newDismissed = new Set(dismissedNotifications);
        newDismissed.add(notificationId);
        setDismissedNotifications(newDismissed);
        localStorage.setItem('dismissedNotifications', JSON.stringify([...newDismissed]));

        setIsOpen(false);

        if (type === 'inventory') {
            navigate('/dashboard?tab=products');
        } else {
            navigate('/dashboard?tab=requests');
        }
    };

    return (
        <div className="hidden md:block fixed top-6 right-6 z-[9999] pointer-events-auto">
            <Popover open={isOpen} onOpenChange={setIsOpen}>
                <PopoverTrigger asChild>
                    <button
                        className="relative p-2 hover:opacity-80 transition-opacity"
                    >
                        <Bell className="h-7 w-7 text-brand-black" />
                        {totalNotifications > 0 && (
                            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 p-0 text-xs font-bold text-white border-2 border-white animate-pulse">
                                {totalNotifications}
                            </Badge>
                        )}
                    </button>
                </PopoverTrigger>
                <PopoverContent
                    className="w-80 p-0 rounded-none border-4 border-brand-black bg-brand-white shadow-hard-lg mr-4"
                    align="end"
                    sideOffset={8}
                >
                    <div className="p-4 border-b-4 border-brand-black bg-brand-orange">
                        <h4 className="font-display font-black text-xl text-brand-black uppercase">Notifikasi</h4>
                        <p className="font-mono text-xs text-brand-black/70 mt-1">
                            {totalNotifications > 0 ? `${totalNotifications} notifikasi baru` : 'Tidak ada notifikasi'}
                        </p>
                    </div>
                    <ScrollArea className="h-[400px]">
                        {totalNotifications === 0 ? (
                            <div className="p-8 text-center">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 border-4 border-brand-black mb-4">
                                    <Bell className="w-8 h-8 text-green-600" />
                                </div>
                                <p className="font-mono text-sm text-muted-foreground">
                                    Tidak ada notifikasi baru.
                                </p>
                                <p className="font-display text-2xl font-bold mt-2">
                                    Semua aman! 👍
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y-2 divide-brand-black/10">
                                {activeOutOfStock.map(product => (
                                    <div
                                        key={`stock-${product.id}`}
                                        className="p-4 hover:bg-red-50 transition-colors cursor-pointer relative group border-l-4 border-red-500"
                                        onClick={() => handleNotificationClick('inventory', product.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-none bg-red-100 border-2 border-brand-black">
                                                <PackageX className="w-5 h-5 text-red-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-red-600 font-mono uppercase tracking-wider">Stok Habis!</p>
                                                <p className="text-sm font-bold text-brand-black mt-1">{product.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono mt-1">
                                                    Stok: 0 • Perlu segera restock!
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => dismissNotification(`stock-${product.id}`, e)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-red-100 border-2 border-transparent hover:border-brand-black rounded-none"
                                                title="Tutup notifikasi"
                                            >
                                                <X className="w-4 h-4 text-red-600" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {activeLowStock.map(product => (
                                    <div
                                        key={`stock-${product.id}`}
                                        className="p-4 hover:bg-yellow-50 transition-colors cursor-pointer relative group border-l-4 border-yellow-500"
                                        onClick={() => handleNotificationClick('inventory', product.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-none bg-yellow-100 border-2 border-brand-black">
                                                <AlertTriangle className="w-5 h-5 text-yellow-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-yellow-600 font-mono uppercase tracking-wider">Stok Menipis!</p>
                                                <p className="text-sm font-bold text-brand-black mt-1">{product.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono mt-1">
                                                    Stok: {product.totalStock} • Min: {product.minStockLevel}
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => dismissNotification(`stock-${product.id}`, e)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-yellow-100 border-2 border-transparent hover:border-brand-black rounded-none"
                                                title="Tutup notifikasi"
                                            >
                                                <X className="w-4 h-4 text-yellow-600" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {pendingRequests.map(request => (
                                    <div
                                        key={`req-${request.id}`}
                                        className="p-4 hover:bg-blue-50 transition-colors cursor-pointer relative group border-l-4 border-blue-500"
                                        onClick={() => handleNotificationClick('requests', request.id)}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="p-2 rounded-none bg-blue-100 border-2 border-brand-black">
                                                <Bell className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-xs font-bold text-blue-600 font-mono uppercase tracking-wider">Request Baru!</p>
                                                <p className="text-sm font-bold text-brand-black mt-1">{request.snackName}</p>
                                                <p className="text-xs text-muted-foreground font-mono mt-1">
                                                    Dari pelanggan • Klik untuk lihat detail
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => dismissNotification(`req-${request.id}`, e)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-blue-100 border-2 border-transparent hover:border-brand-black rounded-none"
                                                title="Tutup notifikasi"
                                            >
                                                <X className="w-4 h-4 text-blue-600" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </PopoverContent>
            </Popover>
        </div>
    );
}
