import { Bell, X, PackageX, AlertTriangle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useWarungStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLowStockAlerts } from '@/hooks/useLowStockAlerts';

export function NotificationBell() {
    const navigate = useNavigate();
    const requests = useWarungStore((state) => state.jajananRequests);
    const fetchRequests = useWarungStore((state) => state.fetchJajananRequests);
    const { lowStockProducts, outOfStockProducts, hasCritical } = useLowStockAlerts();

    const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        fetchRequests();
        // Load dismissed notifications from localStorage
        const stored = localStorage.getItem('dismissedNotifications');
        if (stored) {
            setDismissedNotifications(new Set(JSON.parse(stored)));
        }
    }, [fetchRequests]);

    // Filter out dismissed notifications
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
        // Dismiss notification
        const notificationId = type === 'inventory' ? `stock-${id}` : `req-${id}`;
        const newDismissed = new Set(dismissedNotifications);
        newDismissed.add(notificationId);
        setDismissedNotifications(newDismissed);
        localStorage.setItem('dismissedNotifications', JSON.stringify([...newDismissed]));

        // Close popover
        setIsOpen(false);

        // Navigate to relevant tab
        if (type === 'inventory') {
            navigate('/dashboard#inventory');
            // Trigger tab change if on dashboard
            setTimeout(() => {
                const event = new CustomEvent('changeTab', { detail: 'inventory' });
                window.dispatchEvent(event);
            }, 100);
        } else {
            navigate('/dashboard#requests');
            setTimeout(() => {
                const event = new CustomEvent('changeTab', { detail: 'requests' });
                window.dispatchEvent(event);
            }, 100);
        }
    };

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="relative rounded-none hover:bg-brand-orange/20">
                    <Bell className="h-5 w-5" />
                    {totalNotifications > 0 && (
                        <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 p-0 text-[10px] text-white border border-white">
                            {totalNotifications}
                        </Badge>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 rounded-none border-2 border-brand-black bg-brand-white shadow-hard" align="end">
                <div className="p-4 border-b-2 border-brand-black bg-brand-orange/10">
                    <h4 className="font-bold font-display text-lg">Notifikasi</h4>
                </div>
                <ScrollArea className="h-[300px]">
                    {totalNotifications === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm font-mono">
                            Tidak ada notifikasi baru.
                            <br />
                            Semua aman! 👍
                        </div>
                    ) : (
                        <div className="divide-y-2 divide-brand-black/10">
                            {activeOutOfStock.map(product => (
                                <div
                                    key={`stock-${product.id}`}
                                    className="p-3 hover:bg-red-50 transition-colors cursor-pointer relative group"
                                    onClick={() => handleNotificationClick('inventory', product.id)}
                                >
                                    <div className="flex items-start gap-2">
                                        <PackageX className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-red-600 font-mono">Stok Habis!</p>
                                            <p className="text-sm font-bold text-brand-black">{product.name}</p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                Stok: 0 • Perlu segera restock!
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => dismissNotification(`stock-${product.id}`, e)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
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
                                    className="p-3 hover:bg-yellow-50 transition-colors cursor-pointer relative group"
                                    onClick={() => handleNotificationClick('inventory', product.id)}
                                >
                                    <div className="flex items-start gap-2">
                                        <AlertTriangle className="w-4 h-4 text-yellow-600 mt-1 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-yellow-600 font-mono">Stok Menipis!</p>
                                            <p className="text-sm font-bold text-brand-black">{product.name}</p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                Stok: {product.totalStock} • Min: {product.minStockLevel || 10}
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => dismissNotification(`stock-${product.id}`, e)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-yellow-100 rounded"
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
                                    className="p-3 hover:bg-blue-50 transition-colors cursor-pointer relative group"
                                    onClick={() => handleNotificationClick('requests', request.id)}
                                >
                                    <div className="flex items-start gap-2">
                                        <div className="h-2 w-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-sm font-bold text-blue-600 font-mono">Request Baru!</p>
                                            <p className="text-sm font-bold text-brand-black">{request.snackName}</p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                Dari pelanggan • Klik untuk lihat detail
                                            </p>
                                        </div>
                                        <button
                                            onClick={(e) => dismissNotification(`req-${request.id}`, e)}
                                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-blue-100 rounded"
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
    );
}
