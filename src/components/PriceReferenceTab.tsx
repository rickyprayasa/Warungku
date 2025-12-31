import { useState, useEffect, useMemo } from 'react';
import { useWarungStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tag, TrendingUp, TrendingDown, Hash, Minus, Package, Eye, Search, Filter, FileText } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

interface PurchaseDetail {
    id: string;
    date: number;
    price: number;
    quantity: number;
    totalCost: number;
    packQuantity?: number;
    unitsPerPack?: number;
    notes?: string;
    priceChange?: number | null;
    priceChangePercent?: number | null;
    packPrice?: number;
}

interface PriceHistoryItem {
    productId: string;
    productName: string;
    productImage: string;
    supplierId: string;
    supplierName: string;
    currentPrice: number;
    currentPackPrice?: number;
    currentUnitsPerPack?: number;
    previousPrice?: number | null;
    previousPackPrice?: number | null;
    previousUnitsPerPack?: number | null;
    priceChange: number | null;
    priceChangePercent: number | null;
    lastPurchaseDate: string;
    purchaseCount: number;
    totalQuantity: number;
    minPrice: number;
    avgPrice: number;
    maxPrice: number;
    minPackPrice?: number;
    avgPackPrice?: number;
    maxPackPrice?: number;
    commonUnitsPerPack?: number;
    purchaseHistory: PurchaseDetail[];
}

export function PriceReferenceTab() {
    const products = useWarungStore((state) => state.products);
    const purchases = useWarungStore((state) => state.purchases);
    const suppliers = useWarungStore((state) => state.suppliers);
    const fetchProducts = useWarungStore((state) => state.fetchProducts);
    const fetchPurchases = useWarungStore((state) => state.fetchPurchases);
    const fetchSuppliers = useWarungStore((state) => state.fetchSuppliers);
    const isLoading = useWarungStore((state) => state.isLoading);
    const [selectedProduct, setSelectedProduct] = useState<PriceHistoryItem | null>(null);
    const [isHistoryDialogOpen, setHistoryDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState<string>('all');

    useEffect(() => {
        fetchProducts();
        fetchPurchases();
        fetchSuppliers();
    }, [fetchProducts, fetchPurchases, fetchSuppliers]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(value);
    };

    const StatCard = ({ title, value, icon: Icon, color, bgColor }: any) => (
        <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white relative overflow-hidden">
            <div className={`absolute top-0 right-0 p-2 ${bgColor} border-l-2 border-b-2 border-brand-black`}>
                <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <CardContent className="p-4 pt-8">
                <p className="text-xs font-mono font-bold text-muted-foreground uppercase">{title}</p>
                <p className="text-2xl font-bold text-brand-black">{value}</p>
            </CardContent>
        </Card>
    );

    const PriceChangeIndicator = ({ change, changePercent }: { change: number | null; changePercent: number | null }) => {
        if (change === null || changePercent === null) {
            return <span className="text-gray-500 font-mono text-xs">-</span>;
        }
        if (change > 0) {
            return (
                <div className="flex items-center gap-1">
                    <TrendingUp className="w-3 h-3 text-red-600" />
                    <span className="text-red-600 font-mono text-xs font-bold">+{changePercent.toFixed(1)}%</span>
                </div>
            );
        }
        if (change < 0) {
            return (
                <div className="flex items-center gap-1">
                    <TrendingDown className="w-3 h-3 text-green-600" />
                    <span className="text-green-600 font-mono text-xs font-bold">{changePercent.toFixed(1)}%</span>
                </div>
            );
        }
        return (
            <div className="flex items-center gap-1">
                <Minus className="w-3 h-3 text-gray-500" />
                <span className="text-gray-500 font-mono text-xs">0%</span>
            </div>
        );
    };

    const priceHistoryData = useMemo(() => {
        const purchasesByProductSupplier = new Map<string, Array<{
            id: string;
            date: number;
            price: number;
            quantity: number;
            totalCost: number;
            packQuantity?: number;
            unitsPerPack?: number;
            notes?: string;
        }>>();

        purchases.forEach(purchase => {
            const supplierId = purchase.supplierId || 'no-supplier';
            const key = `${purchase.productId}|||${supplierId}`;
            if (!purchasesByProductSupplier.has(key)) {
                purchasesByProductSupplier.set(key, []);
            }
            purchasesByProductSupplier.get(key)!.push({
                id: purchase.id,
                date: purchase.createdAt,
                price: purchase.unitCost,
                quantity: purchase.quantity,
                totalCost: purchase.totalCost,
                packQuantity: purchase.packQuantity,
                unitsPerPack: purchase.unitsPerPack,
                notes: purchase.notes,
            });
        });

        const historyData: PriceHistoryItem[] = [];

        purchasesByProductSupplier.forEach((purchaseList, key) => {
            const [productId, supplierIdStr] = key.split('|||');
            const product = products.find(p => p.id === productId);
            if (!product) return;

            const supplier = suppliers.find(s => s.id === supplierIdStr);
            const supplierName = supplier ? supplier.name : (supplierIdStr === 'no-supplier' ? 'Tanpa Supplier' : 'Unknown');

            const sortedPurchases = purchaseList.sort((a, b) => b.date - a.date);
            const currentPrice = sortedPurchases[0].price;
            const previousPrice = sortedPurchases.length > 1 ? sortedPurchases[1].price : null;
            const priceChange = previousPrice ? currentPrice - previousPrice : null;
            const priceChangePercent = previousPrice ? ((priceChange! / previousPrice) * 100) : null;

            const prices = sortedPurchases.map(p => p.price);
            const totalQuantity = sortedPurchases.reduce((sum, p) => sum + p.quantity, 0);
            const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);

            const purchasesWithPack = sortedPurchases.filter(p => p.unitsPerPack);
            const packPrices = purchasesWithPack.map(p => p.price * p.unitsPerPack!);
            const commonUnitsPerPack = purchasesWithPack.length > 0 ? purchasesWithPack[0].unitsPerPack : undefined;
            const avgPackPrice = packPrices.length > 0 ? packPrices.reduce((sum, p) => sum + p, 0) / packPrices.length : undefined;
            const minPackPrice = packPrices.length > 0 ? Math.min(...packPrices) : undefined;
            const maxPackPrice = packPrices.length > 0 ? Math.max(...packPrices) : undefined;

            const latestPurchase = sortedPurchases[0];
            const currentPackPrice = latestPurchase.unitsPerPack ? currentPrice * latestPurchase.unitsPerPack : undefined;
            const currentUnitsPerPack = latestPurchase.unitsPerPack;
            const prevPurchase = sortedPurchases[1];
            const previousPackPrice = prevPurchase?.unitsPerPack ? prevPurchase.price * prevPurchase.unitsPerPack : undefined;
            const previousUnitsPerPack = prevPurchase?.unitsPerPack;

            const purchaseHistory: PurchaseDetail[] = sortedPurchases.map((p, idx) => {
                let itemPriceChange: number | null = null;
                let itemPriceChangePercent: number | null = null;
                if (idx > 0) {
                    const prev = sortedPurchases[idx - 1];
                    itemPriceChange = p.price - prev.price;
                    itemPriceChangePercent = (itemPriceChange / prev.price) * 100;
                }
                return {
                    id: p.id,
                    date: p.date,
                    price: p.price,
                    quantity: p.quantity,
                    totalCost: p.totalCost,
                    packQuantity: p.packQuantity,
                    unitsPerPack: p.unitsPerPack,
                    packPrice: p.unitsPerPack ? p.price * p.unitsPerPack : undefined,
                    notes: p.notes,
                    priceChange: itemPriceChange,
                    priceChangePercent: itemPriceChangePercent,
                };
            });

            historyData.push({
                productId,
                productName: product.name,
                productImage: product.imageUrl || '/placeholder-product.png',
                supplierId: supplierIdStr,
                supplierName,
                currentPrice,
                currentPackPrice,
                currentUnitsPerPack,
                previousPrice,
                previousPackPrice,
                previousUnitsPerPack,
                priceChange,
                priceChangePercent,
                lastPurchaseDate: new Date(sortedPurchases[0].date).toISOString(),
                purchaseCount: sortedPurchases.length,
                totalQuantity,
                avgPrice,
                minPrice,
                maxPrice,
                minPackPrice,
                avgPackPrice,
                maxPackPrice,
                commonUnitsPerPack,
                purchaseHistory,
            });
        });

        return historyData;
    }, [products, purchases, suppliers]);

    const filteredData = useMemo(() => {
        return priceHistoryData.filter(item => {
            const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSupplier = selectedSupplier === 'all' || item.supplierId === selectedSupplier;
            return matchesSearch && matchesSupplier;
        });
    }, [priceHistoryData, searchQuery, selectedSupplier]);

    return (
        <div className="space-y-6">
            <div className="bg-white border-2 border-brand-black rounded-lg p-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <h3 className="text-2xl font-bold text-brand-black uppercase tracking-tight mb-2">
                    Referensi Harga
                </h3>
                <p className="font-mono text-sm text-muted-foreground">
                    Pantau history harga pembelian dari berbagai supplier.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title="Total Produk"
                    value={priceHistoryData.length}
                    icon={Tag}
                    color="text-yellow-600"
                    bgColor="bg-yellow-100"
                />
                <StatCard
                    title="Harga Naik"
                    value={priceHistoryData.filter(item => item.priceChange && item.priceChange > 0).length}
                    icon={TrendingUp}
                    color="text-red-600"
                    bgColor="bg-red-100"
                />
                <StatCard
                    title="Harga Turun"
                    value={priceHistoryData.filter(item => item.priceChange && item.priceChange < 0).length}
                    icon={TrendingDown}
                    color="text-green-600"
                    bgColor="bg-green-100"
                />
            </div>

            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari produk atau supplier..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 border-2 border-brand-black font-mono"
                    />
                </div>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger className="w-full sm:w-[200px] border-2 border-brand-black font-mono">
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4" />
                            <SelectValue placeholder="Semua Supplier" />
                        </div>
                    </SelectTrigger>
                    <SelectContent className="border-2 border-brand-black font-mono">
                        <SelectItem value="all">Semua Supplier</SelectItem>
                        <SelectItem value="no-supplier">Tanpa Supplier</SelectItem>
                        {suppliers.map(supplier => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                                {supplier.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {isLoading ? (
                <div className="border-2 border-brand-black rounded-lg bg-white p-6">
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                        <Skeleton className="h-12 w-full" />
                    </div>
                </div>
            ) : filteredData.length === 0 ? (
                <div className="border-2 border-brand-black rounded-lg bg-white p-12 text-center">
                    <Tag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-mono text-muted-foreground">Belum ada data pembelian</p>
                </div>
            ) : (
                <>
                    <div className="md:hidden space-y-3">
                        {filteredData.map((item) => (
                            <div key={`${item.productId}-${item.supplierId}`} className="border-2 border-brand-black bg-white p-3 rounded-lg">
                                <div className="flex gap-3">
                                    <img
                                        src={item.productImage}
                                        alt={item.productName}
                                        className="w-16 h-16 object-cover border-2 border-brand-black rounded shrink-0"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.src = '/placeholder-product.png';
                                        }}
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start gap-2 mb-2">
                                            <div>
                                                <h3 className="font-bold text-sm truncate">{item.productName}</h3>
                                                <span className="text-xs font-mono text-muted-foreground">{item.supplierName}</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedProduct(item);
                                                    setHistoryDialogOpen(true);
                                                }}
                                                className="h-7 px-2 text-xs border-2 border-brand-black font-mono font-bold"
                                            >
                                                Detail
                                            </Button>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">Sekarang:</span>
                                                <span className="font-mono font-bold text-brand-orange">
                                                    {item.currentPackPrice ? formatCurrency(item.currentPackPrice) : formatCurrency(item.currentPrice)}
                                                </span>
                                            </div>
                                            {item.previousPrice && (
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">Sebelum:</span>
                                                    <span className="font-mono">
                                                        {item.previousPackPrice ? formatCurrency(item.previousPackPrice) : formatCurrency(item.previousPrice)}
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex justify-center pt-1">
                                                <PriceChangeIndicator change={item.priceChange} changePercent={item.priceChangePercent} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="hidden md:block border-2 border-brand-black rounded-lg bg-white overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-orange-100 border-b-2 border-brand-black">
                                <tr>
                                    <th className="text-left p-3 font-mono font-bold text-xs uppercase">Produk</th>
                                    <th className="text-left p-3 font-mono font-bold text-xs uppercase">Supplier</th>
                                    <th className="text-right p-3 font-mono font-bold text-xs uppercase">Harga Sekarang</th>
                                    <th className="text-right p-3 font-mono font-bold text-xs uppercase">Harga Sebelum</th>
                                    <th className="text-center p-3 font-mono font-bold text-xs uppercase">Perubahan</th>
                                    <th className="text-left p-3 font-mono font-bold text-xs uppercase">Tgl Pembelian</th>
                                    <th className="text-center p-3 font-mono font-bold text-xs uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item) => (
                                    <tr key={`${item.productId}-${item.supplierId}`} className="border-b border-gray-200 hover:bg-orange-50">
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <img
                                                    src={item.productImage}
                                                    alt={item.productName}
                                                    className="w-8 h-8 object-cover rounded border border-brand-black"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = '/placeholder-product.png';
                                                    }}
                                                />
                                                <span className="font-mono font-bold text-xs">{item.productName}</span>
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className="font-mono text-xs">{item.supplierName}</span>
                                        </td>
                                        <td className="p-3 text-right">
                                            {item.currentPackPrice && item.currentUnitsPerPack ? (
                                                <>
                                                    <div className="font-mono font-bold text-brand-orange text-sm">{formatCurrency(item.currentPackPrice)}/pak</div>
                                                    <div className="text-xs text-muted-foreground font-mono">{formatCurrency(item.currentPrice)}/unit</div>
                                                </>
                                            ) : (
                                                <span className="font-mono font-bold text-brand-orange text-sm">{formatCurrency(item.currentPrice)}/unit</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            {item.previousPackPrice ? (
                                                <>
                                                    <div className="font-mono text-xs">{formatCurrency(item.previousPackPrice)}/pak</div>
                                                    <div className="text-xs text-muted-foreground font-mono">{formatCurrency(item.previousPrice)}/unit</div>
                                                </>
                                            ) : item.previousPrice ? (
                                                <span className="font-mono text-xs text-muted-foreground">{formatCurrency(item.previousPrice)}/unit</span>
                                            ) : (
                                                <span className="font-mono text-xs text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="p-3 text-center">
                                            <PriceChangeIndicator change={item.priceChange} changePercent={item.priceChangePercent} />
                                        </td>
                                        <td className="p-3">
                                            <span className="font-mono text-xs">
                                                {format(new Date(item.lastPurchaseDate), 'dd MMM yyyy', { locale: idLocale })}
                                            </span>
                                        </td>
                                        <td className="p-3 text-center">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedProduct(item);
                                                    setHistoryDialogOpen(true);
                                                }}
                                                className="border-2 border-brand-black font-mono font-bold text-xs h-8 px-3"
                                            >
                                                <Eye className="w-3 h-3 mr-1" />
                                                Lihat
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </>
            )}

            <Dialog open={isHistoryDialogOpen} onOpenChange={setHistoryDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto border-2 border-brand-black rounded-lg">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">
                            {selectedProduct?.productName}
                            <span className="text-sm font-mono text-muted-foreground ml-2">
                                ({selectedProduct?.supplierName})
                            </span>
                        </DialogTitle>
                    </DialogHeader>
                    {selectedProduct && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-blue-50 border border-brand-black rounded p-3">
                                    <div className="flex items-center gap-1 mb-1">
                                        <Hash className="w-4 h-4 text-blue-600" />
                                        <span className="text-xs font-mono text-muted-foreground uppercase">Total Pembelian</span>
                                    </div>
                                    <p className="text-lg font-bold font-mono">{selectedProduct.purchaseCount}x</p>
                                </div>
                                <div className="bg-green-50 border border-brand-black rounded p-3">
                                    <div className="flex items-center gap-1 mb-1">
                                        <Package className="w-4 h-4 text-green-600" />
                                        <span className="text-xs font-mono text-muted-foreground uppercase">Total Unit</span>
                                    </div>
                                    <p className="text-lg font-bold font-mono">{selectedProduct.totalQuantity}</p>
                                </div>
                                <div className="bg-yellow-50 border border-brand-black rounded p-3">
                                    <div className="flex items-center gap-1 mb-1">
                                        <TrendingDown className="w-4 h-4 text-green-600" />
                                        <span className="text-xs font-mono text-muted-foreground uppercase">Harga Terendah</span>
                                    </div>
                                    {selectedProduct.minPackPrice ? (
                                        <p className="text-sm font-bold font-mono text-green-600">{formatCurrency(selectedProduct.minPackPrice)}/pak</p>
                                    ) : (
                                        <p className="text-sm font-bold font-mono text-green-600">{formatCurrency(selectedProduct.minPrice)}/unit</p>
                                    )}
                                </div>
                                <div className="bg-red-50 border border-brand-black rounded p-3">
                                    <div className="flex items-center gap-1 mb-1">
                                        <TrendingUp className="w-4 h-4 text-red-600" />
                                        <span className="text-xs font-mono text-muted-foreground uppercase">Harga Tertinggi</span>
                                    </div>
                                    {selectedProduct.maxPackPrice ? (
                                        <p className="text-sm font-bold font-mono text-red-600">{formatCurrency(selectedProduct.maxPackPrice)}/pak</p>
                                    ) : (
                                        <p className="text-sm font-bold font-mono text-red-600">{formatCurrency(selectedProduct.maxPrice)}/unit</p>
                                    )}
                                </div>
                            </div>

                            <div className="bg-orange-50 border border-brand-black rounded p-4">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <p className="text-xs font-mono text-muted-foreground uppercase">Rata-rata Harga</p>
                                        {selectedProduct.avgPackPrice ? (
                                            <p className="text-xl font-bold font-mono text-brand-orange">{formatCurrency(selectedProduct.avgPackPrice)}/pak</p>
                                        ) : (
                                            <p className="text-xl font-bold font-mono text-brand-orange">{formatCurrency(selectedProduct.avgPrice)}/unit</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-mono text-muted-foreground uppercase">Harga Sekarang</p>
                                        {selectedProduct.currentPackPrice ? (
                                            <p className="text-xl font-bold font-mono text-brand-orange">{formatCurrency(selectedProduct.currentPackPrice)}/pak</p>
                                        ) : (
                                            <p className="text-xl font-bold font-mono text-brand-orange">{formatCurrency(selectedProduct.currentPrice)}/unit</p>
                                        )}
                                        {selectedProduct.priceChangePercent !== null && (
                                            <Badge variant={selectedProduct.priceChange > 0 ? 'destructive' : 'default'} className="mt-1">
                                                {selectedProduct.priceChange > 0 ? '+' : ''}{selectedProduct.priceChangePercent.toFixed(1)}%
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div>
                                <h4 className="text-lg font-bold mb-3 flex items-center gap-2">
                                    <Package className="w-5 h-5" />
                                    Riwayat Pembelian
                                </h4>
                                <div className="space-y-2">
                                    {selectedProduct.purchaseHistory.map((item) => (
                                        <div key={item.id} className="border border-brand-black bg-white p-3 rounded">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-xs font-mono text-muted-foreground">
                                                            {format(new Date(item.date), 'dd MMM yyyy', { locale: idLocale })}
                                                        </span>
                                                        {item.priceChangePercent !== null && (
                                                            <Badge variant={item.priceChange > 0 ? 'destructive' : 'default'} className="text-xs">
                                                                {item.priceChange > 0 ? '+' : ''}{item.priceChangePercent.toFixed(1)}%
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex gap-4 text-xs font-mono">
                                                        <span>Qty: {item.quantity}</span>
                                                        <span>Total: {formatCurrency(item.totalCost)}</span>
                                                        {item.packPrice && (
                                                            <span>Pak: {formatCurrency(item.packPrice)}</span>
                                                        )}
                                                    </div>
                                                    {item.unitsPerPack && (
                                                        <div className="text-xs text-muted-foreground font-mono">
                                                            {formatCurrency(item.price)}/unit ({item.unitsPerPack} unit/pak)
                                                        </div>
                                                    )}
                                                </div>
                                                {item.notes && (
                                                    <div className="text-xs text-muted-foreground font-mono text-right max-w-[150px]">
                                                        {item.notes}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
