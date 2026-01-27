import { Bell, X, PackageX, AlertTriangle, CheckCheck, Trash2, Timer, ShoppingBag, Eye } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useWarungStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLowStockAlerts } from '@/hooks/useLowStockAlerts';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sale } from '@/types';
import { supabase } from '@/lib/supabase';

export function NotificationBell() {
    const navigate = useNavigate();
    const requests = useWarungStore((state) => state.jajananRequests);
    const fetchRequests = useWarungStore((state) => state.fetchJajananRequests);
    const sales = useWarungStore((state) => state.sales);
    const fetchSales = useWarungStore((state) => state.fetchSales);
    const currentStoreId = useWarungStore((state) => state.currentStoreId);
    const { lowStockProducts, outOfStockProducts, lowDSLProducts, hasCritical } = useLowStockAlerts();

    const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());
    const [isOpen, setIsOpen] = useState(false);
    const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
    const [saleDetailOpen, setSaleDetailOpen] = useState(false);

    useEffect(() => {
        fetchRequests();
        fetchSales();
        // Load dismissed notifications from localStorage
        const stored = localStorage.getItem('dismissedNotifications');
        if (stored) {
            setDismissedNotifications(new Set(JSON.parse(stored)));
        }
    }, [fetchRequests, fetchSales]);

    // Realtime subscription for new orders
    useEffect(() => {
        if (!currentStoreId) return;

        const channel = supabase
            .channel('new-orders-notification')
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
                        fetchSales();
                        toast.success('🛒 Pesanan baru masuk!', {
                            description: 'Ada pelanggan yang baru saja melakukan pemesanan.',
                            duration: 5000,
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [currentStoreId, fetchSales]);

    // Filter out dismissed notifications
    const activeLowStock = lowStockProducts
        .filter(p => !dismissedNotifications.has(`stock-${p.id}`))
        .sort((a, b) => (a.totalStock || 0) - (b.totalStock || 0));

    const activeOutOfStock = outOfStockProducts
        .filter(p => !dismissedNotifications.has(`stock-${p.id}`))
        .sort((a, b) => (a.totalStock || 0) - (b.totalStock || 0));

    // Filter low DSL products and sort by DSL (ascending - lowest first, with null/undefined at the end)
    const activeLowDSL = lowDSLProducts
        .filter(item => !dismissedNotifications.has(`dsl-${item.product.id}`))
        .sort((a, b) => {
            // Treat null/undefined DSL values as infinity to put them at the end
            const dslA = a.dsl === null || a.dsl === undefined ? Infinity : a.dsl;
            const dslB = b.dsl === null || b.dsl === undefined ? Infinity : b.dsl;
            return dslA - dslB;
        });

    const pendingRequests = requests.filter(r =>
        r.status === 'pending' &&
        !dismissedNotifications.has(`req-${r.id}`)
    );

    // Pending orders (sales with status pending) - case insensitive
    const pendingOrders = sales.filter(s =>
        s.status?.toLowerCase() === 'pending' &&
        !dismissedNotifications.has(`order-${s.id}`)
    ).sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());

    // Debug log
    console.log('[NotificationBell] Sales data:', {
        totalSales: sales.length,
        pendingOrders: pendingOrders.length,
        pendingOrdersData: pendingOrders,
        allSalesStatus: sales.map(s => ({ id: s.id, status: s.status }))
    });

    const totalNotifications = activeLowStock.length + activeOutOfStock.length + activeLowDSL.length + pendingRequests.length + pendingOrders.length;

    const dismissNotification = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const newDismissed = new Set(dismissedNotifications);
        newDismissed.add(id);
        setDismissedNotifications(newDismissed);
        localStorage.setItem('dismissedNotifications', JSON.stringify([...newDismissed]));
    };

    const handleNotificationClick = (type: 'inventory' | 'dsl' | 'requests' | 'order', id: string) => {
        // Dismiss notification
        let notificationId = '';
        if (type === 'inventory') {
            notificationId = `stock-${id}`;
        } else if (type === 'dsl') {
            notificationId = `dsl-${id}`;
        } else if (type === 'order') {
            notificationId = `order-${id}`;
        } else {
            notificationId = `req-${id}`;
        }

        const newDismissed = new Set(dismissedNotifications);
        newDismissed.add(notificationId);
        setDismissedNotifications(newDismissed);
        localStorage.setItem('dismissedNotifications', JSON.stringify([...newDismissed]));

        // For orders, open sale detail dialog instead of navigating
        if (type === 'order') {
            const sale = sales.find(s => s.id === id);
            if (sale) {
                setSelectedSale(sale);
                setSaleDetailOpen(true);
                setIsOpen(false);
            }
            return;
        }

        // Close popover
        setIsOpen(false);

        // Navigate to relevant tab using query params (reliable navigation)
        if (type === 'inventory' || type === 'dsl') {
            navigate('/dashboard?tab=products'); // Products tab now includes inventory
        } else {
            navigate('/dashboard?tab=requests');
        }
    };

    const markAllAsRead = () => {
        const allIds = [
            ...activeLowStock.map(p => `stock-${p.id}`),
            ...activeOutOfStock.map(p => `stock-${p.id}`),
            ...activeLowDSL.map(item => `dsl-${item.product.id}`),
            ...pendingRequests.map(r => `req-${r.id}`),
            ...pendingOrders.map(o => `order-${o.id}`)
        ];
        const newDismissed = new Set([...dismissedNotifications, ...allIds]);
        setDismissedNotifications(newDismissed);
        localStorage.setItem('dismissedNotifications', JSON.stringify([...newDismissed]));
        toast.success('Semua notifikasi ditandai sudah dibaca');
    };

    const deleteAllNotifications = () => {
        const allIds = [
            ...activeLowStock.map(p => `stock-${p.id}`),
            ...activeOutOfStock.map(p => `stock-${p.id}`),
            ...activeLowDSL.map(item => `dsl-${item.product.id}`),
            ...pendingRequests.map(r => `req-${r.id}`),
            ...pendingOrders.map(o => `order-${o.id}`)
        ];
        const newDismissed = new Set([...dismissedNotifications, ...allIds]);
        setDismissedNotifications(newDismissed);
        localStorage.setItem('dismissedNotifications', JSON.stringify([...newDismissed]));
        toast.success('Semua notifikasi berhasil dihapus');
        setIsOpen(false);
    };

    return (
        <>
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
                        <div className="flex items-center justify-between">
                            <h4 className="font-bold font-display text-lg">Notifikasi</h4>
                            {totalNotifications > 0 && (
                                <div className="flex gap-1">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={markAllAsRead}
                                        className="h-7 w-7 rounded-none hover:bg-brand-orange/30"
                                        title="Tandai semua sudah dibaca"
                                    >
                                        <CheckCheck className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={deleteAllNotifications}
                                        className="h-7 w-7 rounded-none hover:bg-red-500/20 text-red-600"
                                        title="Hapus semua notifikasi"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
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
                                {/* Low DSL Products - Highest Priority */}
                                {activeLowDSL.map(item => (
                                    <div
                                        key={`dsl-${item.product.id}`}
                                        className="p-3 hover:bg-red-50 transition-colors cursor-pointer relative group border-l-4 border-red-500 bg-red-50"
                                        onClick={() => handleNotificationClick('dsl', item.product.id)}
                                    >
                                        <div className="flex items-start gap-2">
                                            <Timer className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-red-600 font-mono">Segera Habis!</p>
                                                <p className="text-sm font-bold text-brand-black">{item.product.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono">
                                                    {item.dsl ? item.dsl.toFixed(1) : 'N/A'} hari lagi • Akan habis segera!
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => dismissNotification(`dsl-${item.product.id}`, e)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-red-100 rounded"
                                                title="Tutup notifikasi"
                                            >
                                                <X className="w-4 h-4 text-red-600" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
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
                                                    Stok: {product.totalStock} • Min: {product.minStockLevel}
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
                                {/* Pending Orders */}
                                {pendingOrders.map(order => (
                                    <div
                                        key={`order-${order.id}`}
                                        className="p-3 hover:bg-green-50 transition-colors cursor-pointer relative group border-l-4 border-green-500 bg-green-50"
                                        onClick={() => handleNotificationClick('order', order.id)}
                                    >
                                        <div className="flex items-start gap-2">
                                            <ShoppingBag className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-green-600 font-mono">Pesanan Baru!</p>
                                                <p className="text-sm font-bold text-brand-black">
                                                    {order.customerName || 'Pelanggan'}
                                                </p>
                                                <p className="text-xs text-muted-foreground font-mono">
                                                    Rp {order.total.toLocaleString('id-ID')} • Klik untuk lihat detail
                                                </p>
                                            </div>
                                            <button
                                                onClick={(e) => dismissNotification(`order-${order.id}`, e)}
                                                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-green-100 rounded"
                                                title="Tutup notifikasi"
                                            >
                                                <X className="w-4 h-4 text-green-600" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </PopoverContent>
            </Popover>

            {/* Sale Detail Dialog */}
            <Dialog open={saleDetailOpen} onOpenChange={setSaleDetailOpen}>
                <DialogContent className="max-w-md border-4 border-brand-black rounded-none">
                    <DialogHeader className="border-b-2 border-brand-black pb-4">
                        <DialogTitle className="font-display text-xl flex items-center gap-2">
                            <ShoppingBag className="w-5 h-5 text-green-600" />
                            Detail Pesanan
                        </DialogTitle>
                    </DialogHeader>
                    {selectedSale && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-2 text-sm">
                                <div className="font-mono text-muted-foreground">Nama:</div>
                                <div className="font-bold">{selectedSale.customerName || '-'}</div>

                                <div className="font-mono text-muted-foreground">No. HP:</div>
                                <div className="font-bold">{selectedSale.customerPhone || '-'}</div>

                                <div className="font-mono text-muted-foreground">Alamat:</div>
                                <div className="font-bold">{selectedSale.customerAddress || '-'}</div>

                                <div className="font-mono text-muted-foreground">Tanggal:</div>
                                <div className="font-bold">
                                    {new Date(selectedSale.saleDate).toLocaleDateString('id-ID', {
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                    })}
                                </div>

                                <div className="font-mono text-muted-foreground">Pembayaran:</div>
                                <div className="font-bold uppercase">{selectedSale.paymentMethod}</div>
                            </div>

                            <div className="border-t-2 border-brand-black pt-3">
                                <p className="font-bold mb-2">🛒 Item Pesanan</p>
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {selectedSale.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between text-sm bg-gray-50 p-2 border">
                                            <span>{item.product?.name || item.productId} x{item.quantity}</span>
                                            <span className="font-mono font-bold">
                                                Rp {((item.priceAtSale || 0) * item.quantity).toLocaleString('id-ID')}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="border-t-2 border-brand-black pt-3 flex justify-between items-center">
                                <span className="font-bold">TOTAL</span>
                                <span className="text-xl font-bold text-green-600">
                                    Rp {selectedSale.total.toLocaleString('id-ID')}
                                </span>
                            </div>

                            {selectedSale.notes && (
                                <div className="bg-yellow-50 border-2 border-yellow-200 p-3">
                                    <p className="text-sm font-mono"><strong>Catatan:</strong> {selectedSale.notes}</p>
                                </div>
                            )}

                            <div className="flex gap-2">
                                <Button
                                    onClick={() => {
                                        setSaleDetailOpen(false);
                                        navigate('/dashboard?tab=sales');
                                    }}
                                    className="flex-1 bg-brand-orange text-brand-black hover:bg-brand-black hover:text-white border-2 border-brand-black rounded-none font-mono font-bold"
                                >
                                    <Eye className="w-4 h-4 mr-2" />
                                    Lihat Semua Pesanan
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
