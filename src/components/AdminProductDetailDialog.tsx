import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useWarungStore } from '@/lib/store';
import type { Product, StockDetail, Purchase, Sale } from '@shared/types';
import { Package, TrendingUp, TrendingDown, History, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BatchStockInfo } from './BatchStockInfo';

interface AdminProductDetailDialogProps {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AdminProductDetailDialog({ product, open, onOpenChange }: AdminProductDetailDialogProps) {
    const [stockDetails, setStockDetails] = useState<StockDetail[]>([]);
    const [purchaseHistory, setPurchaseHistory] = useState<Purchase[]>([]);
    const [salesHistory, setSalesHistory] = useState<Sale[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const purchases = useWarungStore((state) => state.purchases);
    const sales = useWarungStore((state) => state.sales);

    useEffect(() => {
        if (product && open) {
            loadProductDetails();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product, open]);

    const loadProductDetails = async () => {
        if (!product) return;

        setIsLoading(true);
        try {
            // Fetch stock details (batch info)
            const stockRes = await fetch(`/api/products/${product.id}/stock-details`);
            if (stockRes.ok) {
                const data = await stockRes.json();
                setStockDetails(data.data || []);
            }

            // Filter purchases for this product
            const productPurchases = purchases.filter(p => p.productId === product.id);
            setPurchaseHistory(productPurchases);

            // Filter sales for this product
            const productSales = sales.filter(sale =>
                sale.items.some(item => item.productId === product.id)
            );
            setSalesHistory(productSales);

        } catch (error) {
            console.error('Failed to load product details:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('id-ID', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    if (!product) return null;

    const avgCost = stockDetails.length > 0
        ? stockDetails.reduce((sum, batch) => sum + (batch.unitCost * batch.quantity), 0) /
        stockDetails.reduce((sum, batch) => sum + batch.quantity, 0)
        : product.cost || 0;

    const totalPurchased = purchaseHistory.reduce((sum, p) => sum + p.quantity, 0);
    const totalSold = salesHistory.reduce((sum, sale) => {
        const item = sale.items.find(i => i.productId === product.id);
        return sum + (item?.quantity || 0);
    }, 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto border-4 border-brand-black rounded-none">
                <DialogHeader className="border-b-2 border-brand-black pb-4">
                    <div className="flex items-start gap-4">
                        {product.imageUrl && (
                            <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-24 h-24 object-cover border-2 border-brand-black"
                            />
                        )}
                        <div className="flex-1">
                            <DialogTitle className="text-2xl font-display font-bold">
                                {product.name}
                            </DialogTitle>
                            <div className="flex items-center gap-2 mt-2">
                                <Badge className="rounded-sm font-mono">{product.category}</Badge>
                                <Badge
                                    className={cn(
                                        "rounded-sm font-mono",
                                        product.isActive ? "bg-green-500" : "bg-gray-400"
                                    )}
                                >
                                    {product.isActive ? "AKTIF" : "NONAKTIF"}
                                </Badge>
                                {product.isPromo && (
                                    <Badge className="rounded-sm font-mono bg-brand-orange text-brand-black">
                                        PROMO
                                    </Badge>
                                )}
                            </div>
                            <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                <div>
                                    <p className="text-muted-foreground font-mono text-xs">Harga Jual</p>
                                    <p className="font-bold font-mono text-lg">{formatCurrency(product.price)}</p>
                                </div>
                                {product.isPromo && product.promoPrice && (
                                    <div>
                                        <p className="text-muted-foreground font-mono text-xs">Harga Promo</p>
                                        <p className="font-bold font-mono text-lg text-orange-600">{formatCurrency(product.promoPrice)}</p>
                                    </div>
                                )}
                                <div>
                                    <p className="text-muted-foreground font-mono text-xs">Stok</p>
                                    <p className="font-bold font-mono text-lg">{product.totalStock || 0} unit</p>
                                </div>
                                <div>
                                    <p className="text-muted-foreground font-mono text-xs">Avg Cost</p>
                                    <p className="font-bold font-mono text-lg">{formatCurrency(avgCost)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="batch" className="mt-4">
                    <TabsList className="grid w-full grid-cols-3 border-2 border-brand-black rounded-none">
                        <TabsTrigger value="batch" className="rounded-none data-[state=active]:bg-brand-orange">
                            <Layers className="w-4 h-4 mr-2" />
                            Batch Stock
                        </TabsTrigger>
                        <TabsTrigger value="purchases" className="rounded-none data-[state=active]:bg-brand-orange">
                            <TrendingDown className="w-4 h-4 mr-2" />
                            Pembelian
                        </TabsTrigger>
                        <TabsTrigger value="sales" className="rounded-none data-[state=active]:bg-brand-orange">
                            <TrendingUp className="w-4 h-4 mr-2" />
                            Penjualan
                        </TabsTrigger>
                    </TabsList>

                    {/* Batch Stock Tab */}
                    <TabsContent value="batch" className="mt-4">
                        <BatchStockInfo 
                            productId={product.id}
                            productName={product.name}
                            totalStock={product.totalStock || 0}
                        />
                    </TabsContent>

                    {/* Purchase History Tab */}
                    <TabsContent value="purchases" className="mt-4">
                        <Card className="border-4 border-brand-black shadow-hard">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <History className="w-5 h-5" />
                                        Riwayat Pembelian
                                    </span>
                                    <Badge className="rounded-sm font-mono">
                                        {totalPurchased} unit total
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {purchaseHistory.length === 0 ? (
                                    <p className="text-center text-muted-foreground font-mono py-8">
                                        Belum ada pembelian
                                    </p>
                                ) : (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {purchaseHistory.map((purchase) => (
                                            <div
                                                key={purchase.id}
                                                className="p-3 border-2 border-brand-black hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <p className="font-mono text-xs text-muted-foreground">
                                                            {formatDate(purchase.createdAt)}
                                                        </p>
                                                        {purchase.supplier && (
                                                            <p className="text-sm font-mono mt-1">
                                                                Supplier: <span className="font-bold">{purchase.supplier}</span>
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold font-mono text-lg">{purchase.quantity} unit</p>
                                                        <p className="text-sm text-muted-foreground font-mono">
                                                            @ {formatCurrency(purchase.unitCost)}
                                                        </p>
                                                        <p className="font-bold text-red-600 font-mono">
                                                            {formatCurrency(purchase.totalCost)}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Sales History Tab */}
                    <TabsContent value="sales" className="mt-4">
                        <Card className="border-4 border-brand-black shadow-hard">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <History className="w-5 h-5" />
                                        Riwayat Penjualan
                                    </span>
                                    <Badge className="rounded-sm font-mono">
                                        {totalSold} unit total
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                {salesHistory.length === 0 ? (
                                    <p className="text-center text-muted-foreground font-mono py-8">
                                        Belum ada penjualan
                                    </p>
                                ) : (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {salesHistory.map((sale) => {
                                            const item = sale.items.find(i => i.productId === product.id);
                                            if (!item) return null;

                                            return (
                                                <div
                                                    key={sale.id}
                                                    className="p-3 border-2 border-brand-black hover:bg-gray-50 transition-colors"
                                                >
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <p className="font-mono text-xs text-muted-foreground">
                                                                {formatDate(sale.createdAt)}
                                                            </p>
                                                            {sale.saleType === 'display' && (
                                                                <Badge className="mt-1 text-xs bg-purple-500">Display</Badge>
                                                            )}
                                                        </div>
                                                        <div className="text-right">
                                                            <p className="font-bold font-mono text-lg">{item.quantity} unit</p>
                                                            <p className="text-sm text-muted-foreground font-mono">
                                                                @ {formatCurrency(item.price)}
                                                            </p>
                                                            <p className="font-bold text-green-600 font-mono">
                                                                {formatCurrency(item.price * item.quantity)}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground font-mono mt-1">
                                                                Profit: {formatCurrency((item.price - item.cost) * item.quantity)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
