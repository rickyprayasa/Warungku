import { useEffect, useState, useMemo } from 'react';
import { useWarungStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Tag, TrendingUp, TrendingDown, Minus, Eye, Search, Filter, Package, Calendar, Hash, FileText } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
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
    packPrice?: number;
    notes?: string;
    priceChange?: number | null;
    priceChangePercent?: number | null;
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
    previousPrice: number | null;
    previousPackPrice?: number | null;
    previousUnitsPerPack?: number | null;
    priceChange: number | null;
    priceChangePercent: number | null;
    packPriceChange?: number | null;
    packPriceChangePercent?: number | null;
    lastPurchaseDate: string;
    purchaseCount: number;
    purchaseHistory: PurchaseDetail[];
    avgPrice: number;
    avgPackPrice?: number;
    minPrice: number;
    minPackPrice?: number;
    maxPrice: number;
    maxPackPrice?: number;
    commonUnitsPerPack?: number;
    totalQuantity: number;
}

export function PriceReferenceTab() {
    const products = useWarungStore((state) => state.products);
    const purchases = useWarungStore((state) => state.purchases);
    const suppliers = useWarungStore((state) => state.suppliers);
    const fetchProducts = useWarungStore((state) => state.fetchProducts);
    const fetchPurchases = useWarungStore((state) => state.fetchPurchases);
    const fetchSuppliers = useWarungStore((state) => state.fetchSuppliers);
    const isLoading = useWarungStore((state) => state.isLoading);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSupplier, setSelectedSupplier] = useState<string>('all');
    const [selectedProduct, setSelectedProduct] = useState<PriceHistoryItem | null>(null);
    const [isHistoryDialogOpen, setHistoryDialogOpen] = useState(false);

    useEffect(() => {
        fetchProducts();
        fetchPurchases();
        fetchSuppliers();
    }, [fetchProducts, fetchPurchases, fetchSuppliers]);

    // Calculate price history data
    const priceHistoryData = useMemo(() => {
        // Group all purchases by product-supplier combination
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

        // Collect all purchases
        purchases.forEach(purchase => {
            // Use 'no-supplier' if supplierId is missing
            const supplierId = purchase.supplierId || 'no-supplier';
            // Use unique separator to avoid conflicts with UUIDs that contain hyphens
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

        // Calculate price history for each product-supplier
        const historyData: PriceHistoryItem[] = [];

        purchasesByProductSupplier.forEach((purchaseList, key) => {
            // Split using the unique separator
            const [productId, supplierIdStr] = key.split('|||');

            const product = products.find(p => p.id === productId);
            if (!product) return;

            const supplier = suppliers.find(s => s.id === supplierIdStr);

            // Sort by date descending (newest first)
            const sortedPurchases = purchaseList.sort((a, b) =>
                b.date - a.date
            );

            const currentPrice = sortedPurchases[0].price;
            const previousPrice = sortedPurchases.length > 1 ? sortedPurchases[1].price : null;
            const priceChange = previousPrice ? currentPrice - previousPrice : null;
            const priceChangePercent = previousPrice ? ((priceChange! / previousPrice) * 100) : null;

            // Calculate statistics
            const prices = sortedPurchases.map(p => p.price);
            const totalQuantity = sortedPurchases.reduce((sum, p) => sum + p.quantity, 0);
            const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
            const minPrice = Math.min(...prices);
            const maxPrice = Math.max(...prices);

            // Calculate pack price statistics (only for purchases with pack info)
            const purchasesWithPack = sortedPurchases.filter(p => p.unitsPerPack);
            const packPrices = purchasesWithPack.map(p => p.price * p.unitsPerPack!);
            const commonUnitsPerPack = purchasesWithPack.length > 0 ? purchasesWithPack[0].unitsPerPack : undefined;
            const avgPackPrice = packPrices.length > 0 ? packPrices.reduce((sum, p) => sum + p, 0) / packPrices.length : undefined;
            const minPackPrice = packPrices.length > 0 ? Math.min(...packPrices) : undefined;
            const maxPackPrice = packPrices.length > 0 ? Math.max(...packPrices) : undefined;

            // Build purchase history with price changes
            const purchaseHistory: PurchaseDetail[] = sortedPurchases.map((p, idx) => {
                const prevPurchase = sortedPurchases[idx + 1];
                let itemPriceChange: number | null = null;
                let itemPriceChangePercent: number | null = null;
                
                if (prevPurchase) {
                    itemPriceChange = p.price - prevPurchase.price;
                    itemPriceChangePercent = (itemPriceChange / prevPurchase.price) * 100;
                }

                // Calculate pack price if pack info available
                const packPrice = p.unitsPerPack ? p.price * p.unitsPerPack : undefined;

                return {
                    id: p.id,
                    date: p.date,
                    price: p.price,
                    quantity: p.quantity,
                    totalCost: p.totalCost,
                    packQuantity: p.packQuantity,
                    unitsPerPack: p.unitsPerPack,
                    packPrice,
                    notes: p.notes,
                    priceChange: itemPriceChange,
                    priceChangePercent: itemPriceChangePercent,
                };
            });

            // Get current pack info from latest purchase
            const latestPurchase = sortedPurchases[0];
            const currentPackPrice = latestPurchase.unitsPerPack ? currentPrice * latestPurchase.unitsPerPack : undefined;
            const currentUnitsPerPack = latestPurchase.unitsPerPack;

            // Get previous pack info
            const prevPurchase = sortedPurchases.length > 1 ? sortedPurchases[1] : null;
            const previousPackPrice = prevPurchase?.unitsPerPack ? previousPrice! * prevPurchase.unitsPerPack : null;
            const previousUnitsPerPack = prevPurchase?.unitsPerPack || null;

            // Calculate pack price change (if both have pack info)
            let packPriceChange: number | null = null;
            let packPriceChangePercent: number | null = null;
            if (currentPackPrice && previousPackPrice) {
                packPriceChange = currentPackPrice - previousPackPrice;
                packPriceChangePercent = (packPriceChange / previousPackPrice) * 100;
            }

            historyData.push({
                productId,
                productName: product.name,
                productImage: product.imageUrl || '/placeholder-product.png',
                supplierId: supplierIdStr,
                supplierName: supplier?.name || (supplierIdStr === 'no-supplier' ? 'Tanpa Supplier' : 'Unknown'),
                currentPrice,
                currentPackPrice,
                currentUnitsPerPack,
                previousPrice,
                previousPackPrice,
                previousUnitsPerPack,
                priceChange,
                priceChangePercent,
                packPriceChange,
                packPriceChangePercent,
                lastPurchaseDate: new Date(sortedPurchases[0].date).toISOString(),
                purchaseCount: sortedPurchases.length,
                purchaseHistory,
                avgPrice,
                avgPackPrice,
                minPrice,
                minPackPrice,
                maxPrice,
                maxPackPrice,
                commonUnitsPerPack,
                totalQuantity,
            });
        });

        return historyData.sort((a, b) =>
            new Date(b.lastPurchaseDate).getTime() - new Date(a.lastPurchaseDate).getTime()
        );
    }, [products, purchases, suppliers]);

    // Filter data
    const filteredData = useMemo(() => {
        return priceHistoryData.filter(item => {
            const matchesSearch = item.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSupplier = selectedSupplier === 'all' ||
                (selectedSupplier === 'no-supplier' && item.supplierId === 'no-supplier') ||
                item.supplierId === selectedSupplier;
            return matchesSearch && matchesSupplier;
        });
    }, [priceHistoryData, searchQuery, selectedSupplier]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(value);
    };

    const PriceChangeIndicator = ({ change, changePercent }: { change: number | null; changePercent: number | null }) => {
        if (change === null || changePercent === null) {
            return (
                <div className="flex items-center gap-1 text-gray-500">
                    <Minus className="w-4 h-4" />
                    <span className="text-sm font-mono">First Purchase</span>
                </div>
            );
        }

        if (change > 0) {
            return (
                <div className="flex items-center gap-1 text-red-600">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-mono font-bold">+{changePercent.toFixed(1)}%</span>
                </div>
            );
        } else if (change < 0) {
            return (
                <div className="flex items-center gap-1 text-green-600">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-sm font-mono font-bold">{changePercent.toFixed(1)}%</span>
                </div>
            );
        } else {
            return (
                <div className="flex items-center gap-1 text-gray-500">
                    <Minus className="w-4 h-4" />
                    <span className="text-sm font-mono">0%</span>
                </div>
            );
        }
    };

    const StatCard = ({ title, value, icon: Icon, color, bgColor }: any) => (
        <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all duration-200 bg-white group relative overflow-hidden">
            <div className={`absolute top-0 right-0 p-1.5 md:p-2 ${bgColor} border-l-2 border-b-2 border-brand-black rounded-bl-lg rounded-tr-lg`}>
                <Icon className={`w-4 h-4 md:w-6 md:h-6 ${color}`} />
            </div>
            <CardContent className="p-3 pt-5 md:p-6 md:pt-8">
                <p className="text-[10px] md:text-sm font-mono font-bold text-muted-foreground uppercase tracking-wider mb-0.5 md:mb-1 truncate">{title}</p>
                <p className="text-2xl md:text-4xl font-display font-black text-brand-black">{value}</p>
            </CardContent>
        </Card>
    );

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 bg-brand-white border-2 border-brand-black rounded-lg p-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <div className="space-y-2">
                    <h3 className="text-4xl font-display font-black text-brand-black uppercase tracking-tight">
                        Referensi Harga
                    </h3>
                    <p className="font-mono text-base text-muted-foreground max-w-xl">
                        Pantau history harga pembelian dari berbagai supplier untuk membantu keputusan purchasing Anda.
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
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

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari produk atau supplier..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10 border-2 border-brand-black rounded-lg font-mono"
                    />
                </div>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                    <SelectTrigger className="w-full sm:w-[200px] border-2 border-brand-black rounded-lg font-mono font-bold">
                        <div className="flex items-center gap-2">
                            <Filter className="w-4 h-4" />
                            <SelectValue placeholder="Semua Supplier" />
                        </div>
                    </SelectTrigger>
                    <SelectContent className="border-2 border-brand-black rounded-lg font-mono">
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

            {/* Table */}
            {isLoading ? (
                <div className="border-2 border-brand-black rounded-lg bg-white p-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                    <div className="space-y-4">
                        <Skeleton className="h-12 w-full bg-brand-black/5" />
                        <Skeleton className="h-12 w-full bg-brand-black/5" />
                        <Skeleton className="h-12 w-full bg-brand-black/5" />
                    </div>
                </div>
            ) : filteredData.length === 0 ? (
                <div className="border-2 border-brand-black rounded-lg bg-white p-12 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] text-center">
                    <Tag className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="font-mono text-muted-foreground">Belum ada data pembelian</p>
                </div>
            ) : (
                <div className="border-2 border-brand-black rounded-lg bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-brand-orange/20 border-b-2 border-brand-black">
                                <tr>
                                    <th className="text-left p-4 font-mono font-bold text-sm uppercase">Produk</th>
                                    <th className="text-left p-4 font-mono font-bold text-sm uppercase">Supplier</th>
                                    <th className="text-right p-4 font-mono font-bold text-sm uppercase">Harga Sekarang</th>
                                    <th className="text-right p-4 font-mono font-bold text-sm uppercase">Harga Sebelum</th>
                                    <th className="text-center p-4 font-mono font-bold text-sm uppercase">Perubahan</th>
                                    <th className="text-left p-4 font-mono font-bold text-sm uppercase">Tgl Pembelian</th>
                                    <th className="text-center p-4 font-mono font-bold text-sm uppercase">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredData.map((item, index) => (
                                    <tr key={`${item.productId}-${item.supplierId}`} className={`border-b border-gray-200 hover:bg-yellow-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <img
                                                    src={item.productImage}
                                                    alt={item.productName}
                                                    className="w-10 h-10 object-cover rounded border-2 border-brand-black"
                                                    onError={(e) => {
                                                        const target = e.target as HTMLImageElement;
                                                        target.src = '/placeholder-product.png';
                                                    }}
                                                />
                                                <span className="font-mono font-bold">{item.productName}</span>
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-mono text-sm">{item.supplierName}</span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {item.currentPackPrice && item.currentUnitsPerPack ? (
                                                <>
                                                    <div>
                                                        <span className="font-mono font-bold text-brand-orange text-lg">{formatCurrency(item.currentPackPrice)}</span>
                                                        <span className="text-xs text-muted-foreground"> /pak</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground font-mono">
                                                        {formatCurrency(item.currentPrice)} /unit ({item.currentUnitsPerPack} unit)
                                                    </div>
                                                </>
                                            ) : (
                                                <div>
                                                    <span className="font-mono font-bold text-brand-orange">{formatCurrency(item.currentPrice)}</span>
                                                    <span className="text-xs text-muted-foreground"> /unit</span>
                                                </div>
                                            )}
                                        </td>
                                        <td className="p-4 text-right">
                                            {item.previousPackPrice && item.previousUnitsPerPack ? (
                                                <>
                                                    <div>
                                                        <span className="font-mono text-sm">{formatCurrency(item.previousPackPrice)}</span>
                                                        <span className="text-xs text-muted-foreground"> /pak</span>
                                                    </div>
                                                    <div className="text-xs text-muted-foreground font-mono">
                                                        {formatCurrency(item.previousPrice!)} /unit
                                                    </div>
                                                </>
                                            ) : item.previousPrice ? (
                                                <span className="font-mono text-sm text-muted-foreground">
                                                    {formatCurrency(item.previousPrice)} /unit
                                                </span>
                                            ) : (
                                                <span className="font-mono text-sm text-muted-foreground">-</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center">
                                                <PriceChangeIndicator change={item.priceChange} changePercent={item.priceChangePercent} />
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <span className="font-mono text-sm">
                                                {format(new Date(item.lastPurchaseDate), 'dd MMM yyyy', { locale: idLocale })}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex justify-center">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSelectedProduct(item);
                                                        setHistoryDialogOpen(true);
                                                    }}
                                                    className="border-2 border-brand-black rounded-lg font-mono font-bold hover:bg-brand-orange hover:text-brand-black"
                                                >
                                                    <Eye className="w-4 h-4 mr-1" />
                                                    Lihat
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Price History Dialog */}
            <Dialog open={isHistoryDialogOpen} onOpenChange={setHistoryDialogOpen}>
                <DialogContent className="sm:max-w-4xl border-2 border-brand-black rounded-lg bg-brand-white max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="flex-shrink-0">
                        <DialogTitle className="font-display text-2xl font-bold flex items-center gap-3">
                            <img
                                src={selectedProduct?.productImage}
                                alt={selectedProduct?.productName}
                                className="w-12 h-12 object-cover rounded border-2 border-brand-black"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.src = '/placeholder-product.png';
                                }}
                            />
                            <div>
                                <span>{selectedProduct?.productName}</span>
                                <p className="font-mono text-sm text-muted-foreground font-normal">
                                    Supplier: {selectedProduct?.supplierName}
                                </p>
                            </div>
                        </DialogTitle>
                    </DialogHeader>
                    
                    {selectedProduct && (
                        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                            {/* Statistics Cards */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="bg-blue-50 border-2 border-brand-black rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Hash className="w-4 h-4 text-blue-600" />
                                        <span className="text-xs font-mono text-muted-foreground uppercase">Total Pembelian</span>
                                    </div>
                                    <p className="text-xl font-bold font-mono">{selectedProduct.purchaseCount}x</p>
                                </div>
                                <div className="bg-green-50 border-2 border-brand-black rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Package className="w-4 h-4 text-green-600" />
                                        <span className="text-xs font-mono text-muted-foreground uppercase">Total Unit</span>
                                    </div>
                                    <p className="text-xl font-bold font-mono">{selectedProduct.totalQuantity}</p>
                                </div>
                                <div className="bg-yellow-50 border-2 border-brand-black rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingDown className="w-4 h-4 text-yellow-600" />
                                        <span className="text-xs font-mono text-muted-foreground uppercase">Harga Terendah</span>
                                    </div>
                                    {selectedProduct.minPackPrice && selectedProduct.commonUnitsPerPack ? (
                                        <>
                                            <p className="text-lg font-bold font-mono text-green-600">{formatCurrency(selectedProduct.minPackPrice)}/pak</p>
                                            <p className="text-xs font-mono text-muted-foreground">{formatCurrency(selectedProduct.minPrice)}/unit</p>
                                        </>
                                    ) : (
                                        <p className="text-lg font-bold font-mono text-green-600">{formatCurrency(selectedProduct.minPrice)}/unit</p>
                                    )}
                                </div>
                                <div className="bg-red-50 border-2 border-brand-black rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <TrendingUp className="w-4 h-4 text-red-600" />
                                        <span className="text-xs font-mono text-muted-foreground uppercase">Harga Tertinggi</span>
                                    </div>
                                    {selectedProduct.maxPackPrice && selectedProduct.commonUnitsPerPack ? (
                                        <>
                                            <p className="text-lg font-bold font-mono text-red-600">{formatCurrency(selectedProduct.maxPackPrice)}/pak</p>
                                            <p className="text-xs font-mono text-muted-foreground">{formatCurrency(selectedProduct.maxPrice)}/unit</p>
                                        </>
                                    ) : (
                                        <p className="text-lg font-bold font-mono text-red-600">{formatCurrency(selectedProduct.maxPrice)}/unit</p>
                                    )}
                                </div>
                            </div>

                            {/* Average Price */}
                            <div className="bg-brand-orange/10 border-2 border-brand-black rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-mono text-muted-foreground uppercase">Rata-rata Harga</p>
                                        {selectedProduct.avgPackPrice && selectedProduct.commonUnitsPerPack ? (
                                            <>
                                                <p className="text-2xl font-bold font-mono text-brand-orange">{formatCurrency(selectedProduct.avgPackPrice)}/pak</p>
                                                <p className="text-sm font-mono text-muted-foreground">{formatCurrency(selectedProduct.avgPrice)}/unit ({selectedProduct.commonUnitsPerPack} unit/pak)</p>
                                            </>
                                        ) : (
                                            <p className="text-2xl font-bold font-mono text-brand-orange">{formatCurrency(selectedProduct.avgPrice)}/unit</p>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-mono text-muted-foreground uppercase">Harga Sekarang</p>
                                        {selectedProduct.currentPackPrice && selectedProduct.currentUnitsPerPack ? (
                                            <>
                                                <p className="text-2xl font-bold font-mono">{formatCurrency(selectedProduct.currentPackPrice)}/pak</p>
                                                <p className="text-sm font-mono text-muted-foreground">{formatCurrency(selectedProduct.currentPrice)}/unit</p>
                                            </>
                                        ) : (
                                            <p className="text-2xl font-bold font-mono">{formatCurrency(selectedProduct.currentPrice)}/unit</p>
                                        )}
                                        {selectedProduct.packPriceChangePercent !== null && selectedProduct.currentPackPrice ? (
                                            <Badge 
                                                variant={selectedProduct.packPriceChange! > 0 ? "destructive" : selectedProduct.packPriceChange! < 0 ? "default" : "secondary"}
                                                className="mt-1"
                                            >
                                                {selectedProduct.packPriceChange! > 0 ? '+' : ''}{selectedProduct.packPriceChangePercent.toFixed(1)}% dari sebelumnya
                                            </Badge>
                                        ) : selectedProduct.priceChangePercent !== null && (
                                            <Badge 
                                                variant={selectedProduct.priceChange! > 0 ? "destructive" : selectedProduct.priceChange! < 0 ? "default" : "secondary"}
                                                className="mt-1"
                                            >
                                                {selectedProduct.priceChange! > 0 ? '+' : ''}{selectedProduct.priceChangePercent.toFixed(1)}% dari sebelumnya
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Purchase History List */}
                            <div>
                                <h4 className="font-display font-bold text-lg mb-3 flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Riwayat Pembelian
                                </h4>
                                <div className="space-y-3">
                                    {selectedProduct.purchaseHistory.map((purchase, index) => (
                                        <div 
                                            key={purchase.id} 
                                            className={`border-2 border-brand-black rounded-lg p-4 ${index === 0 ? 'bg-brand-orange/5 border-brand-orange' : 'bg-white'}`}
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${index === 0 ? 'bg-brand-orange text-white' : 'bg-gray-200 text-gray-600'}`}>
                                                        {selectedProduct.purchaseHistory.length - index}
                                                    </div>
                                                    <div>
                                                        <p className="font-mono text-sm text-muted-foreground">
                                                            {format(new Date(purchase.date), 'EEEE, dd MMMM yyyy - HH:mm', { locale: idLocale })}
                                                        </p>
                                                        {purchase.packPrice && purchase.unitsPerPack ? (
                                                            <>
                                                                <p className="font-mono font-bold text-lg text-brand-orange">
                                                                    {formatCurrency(purchase.packPrice)}
                                                                    <span className="text-sm font-normal text-muted-foreground"> /pak</span>
                                                                </p>
                                                                <p className="font-mono text-sm text-muted-foreground">
                                                                    {formatCurrency(purchase.price)} /unit ({purchase.unitsPerPack} unit/pak)
                                                                </p>
                                                                {purchase.packQuantity && (
                                                                    <p className="font-mono text-xs text-muted-foreground mt-1">
                                                                        Beli {purchase.packQuantity} pak x {purchase.unitsPerPack} unit = {purchase.quantity} unit
                                                                    </p>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <p className="font-mono font-bold text-lg">
                                                                {formatCurrency(purchase.price)}
                                                                <span className="text-sm font-normal text-muted-foreground"> /unit</span>
                                                            </p>
                                                        )}
                                                        {purchase.notes && (
                                                            <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                                                                <FileText className="w-3 h-3" />
                                                                <span className="font-mono">{purchase.notes}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 sm:text-right pl-11 sm:pl-0">
                                                    <div>
                                                        <p className="text-xs font-mono text-muted-foreground uppercase">Qty</p>
                                                        <p className="font-mono font-bold">{purchase.quantity}</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-mono text-muted-foreground uppercase">Total</p>
                                                        <p className="font-mono font-bold">{formatCurrency(purchase.totalCost)}</p>
                                                    </div>
                                                    <div className="min-w-[80px]">
                                                        {purchase.priceChange !== null && purchase.priceChangePercent !== null ? (
                                                            <div className={`flex items-center gap-1 ${purchase.priceChange > 0 ? 'text-red-600' : purchase.priceChange < 0 ? 'text-green-600' : 'text-gray-500'}`}>
                                                                {purchase.priceChange > 0 ? (
                                                                    <TrendingUp className="w-4 h-4" />
                                                                ) : purchase.priceChange < 0 ? (
                                                                    <TrendingDown className="w-4 h-4" />
                                                                ) : (
                                                                    <Minus className="w-4 h-4" />
                                                                )}
                                                                <span className="text-sm font-mono font-bold">
                                                                    {purchase.priceChange > 0 ? '+' : ''}{purchase.priceChangePercent.toFixed(1)}%
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <Badge variant="outline" className="text-xs">Pertama</Badge>
                                                        )}
                                                    </div>
                                                </div>
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
