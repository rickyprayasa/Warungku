import { useState, useEffect } from 'react';
import { useWarungStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Wallet, Package, AlertTriangle, Check, History, Eye, Plus, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import type { Product, Reconciliation } from '@shared/types';

type RekonTab = 'kas' | 'stok';

export function ReconciliationTerpadu() {
    const products = useWarungStore((state) => state.products);
    const reconciliations = useWarungStore((state) => state.reconciliations);
    const fetchProducts = useWarungStore((state) => state.fetchProducts);
    const fetchReconciliations = useWarungStore((state) => state.fetchReconciliations);
    const createReconciliation = useWarungStore((state) => state.createReconciliation);

    const [activeTab, setActiveTab] = useState<RekonTab>('kas');
    const [actualCash, setActualCash] = useState<string>('');
    const [stockCounts, setStockCounts] = useState<Record<string, number>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [selectedRecon, setSelectedRecon] = useState<Reconciliation | null>(null);

    // Date filter states
    const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'all' | 'custom'>('all');
    const [customStartDate, setCustomStartDate] = useState<string>('');
    const [customEndDate, setCustomEndDate] = useState<string>('');

    useEffect(() => {
        fetchProducts();
        fetchReconciliations();
    }, [fetchProducts, fetchReconciliations]);

    // Filter reconciliations by date
    const getFilteredReconciliations = () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        return reconciliations.filter(recon => {
            const reconDate = new Date(recon.createdAt);
            const reconDay = new Date(reconDate.getFullYear(), reconDate.getMonth(), reconDate.getDate());

            switch (dateFilter) {
                case 'today':
                    return reconDay.getTime() === today.getTime();
                case '7days':
                    const sevenDaysAgo = new Date(today);
                    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                    return reconDay >= sevenDaysAgo;
                case '30days':
                    const thirtyDaysAgo = new Date(today);
                    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                    return reconDay >= thirtyDaysAgo;
                case 'custom':
                    if (!customStartDate && !customEndDate) return true;
                    const start = customStartDate ? new Date(customStartDate) : null;
                    const end = customEndDate ? new Date(customEndDate) : null;
                    if (start && end) {
                        return reconDay >= start && reconDay <= end;
                    } else if (start) {
                        return reconDay >= start;
                    } else if (end) {
                        return reconDay <= end;
                    }
                    return true;
                case 'all':
                default:
                    return true;
            }
        });
    };

    const filteredReconciliations = getFilteredReconciliations();

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

    // Cash calculation
    const actualCashNum = parseFloat(actualCash) || 0;

    // Stock calculation
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStockDifference = (product: Product) => {
        const counted = stockCounts[product.id];
        if (counted === undefined) return null;
        return counted - (product.totalStock || 0);
    };

    const productsWithDifference = products.filter(p => {
        const diff = getStockDifference(p);
        return diff !== null && diff !== 0;
    });

    const soldItems = productsWithDifference.filter(p => {
        const diff = getStockDifference(p);
        return diff !== null && diff < 0;
    });

    const totalStockValue = soldItems.reduce((sum, p) => {
        const diff = Math.abs(getStockDifference(p) || 0);
        return sum + (diff * p.price);
    }, 0);

    const handleStockCountChange = (productId: string, value: string) => {
        const num = parseInt(value);
        if (isNaN(num) || num < 0) {
            const newCounts = { ...stockCounts };
            delete newCounts[productId];
            setStockCounts(newCounts);
        } else {
            setStockCounts(prev => ({
                ...prev,
                [productId]: num
            }));
        }
    };

    // Submit Kas Only
    const handleSubmitKas = async () => {
        if (actualCashNum <= 0) {
            toast.error('Masukkan jumlah kas yang valid.');
            return;
        }

        try {
            setIsSubmitting(true);

            await createReconciliation({
                actualCash: actualCashNum,
                stockItems: [],
                notes: `Rekon Kas Harian - ${new Date().toLocaleDateString('id-ID')}`
            });

            toast.success('Kas harian berhasil dicatat!');
            setActualCash('');

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Gagal menyimpan.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Submit Stok (with optional kas)
    const handleSubmitStok = async () => {
        if (Object.keys(stockCounts).length === 0) {
            toast.error('Hitung minimal satu produk.');
            return;
        }

        try {
            setIsSubmitting(true);

            const stockItems = Object.entries(stockCounts).map(([productId, physicalStock]) => ({
                productId,
                physicalStock
            }));

            await createReconciliation({
                actualCash: actualCashNum, // Include kas if filled
                stockItems,
                notes: `Rekon Stok - ${new Date().toLocaleDateString('id-ID')}`
            });

            toast.success('Rekonsiliasi stok berhasil!');
            setActualCash('');
            setStockCounts({});

        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Gagal menyimpan.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Calculate totals for today
    const today = new Date().toISOString().split('T')[0];
    const todayReconciliations = reconciliations.filter(r => r.date === today);
    const todayTotalCash = todayReconciliations.reduce((sum, r) => sum + r.actualCash, 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h3 className="text-2xl font-display font-bold text-brand-black mb-2">
                        Rekonsiliasi Terpadu
                    </h3>
                    <p className="text-muted-foreground font-mono text-sm">
                        Catat kas harian & rekon stok untuk warung self-service
                    </p>
                </div>
                <Button
                    variant="outline"
                    onClick={() => setShowHistory(!showHistory)}
                    className="border-2 border-brand-black rounded-none font-mono"
                >
                    <History className="w-4 h-4 mr-2" />
                    Riwayat ({reconciliations.length})
                </Button>
            </div>

            {/* Today's Summary */}
            {todayReconciliations.length > 0 && (
                <Card className="border-2 border-green-500 bg-green-50">
                    <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-mono text-sm text-green-700">Total Kas Hari Ini</p>
                                <p className="text-2xl font-display font-bold text-green-800">
                                    {formatCurrency(todayTotalCash)}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-mono text-xs text-green-600">{todayReconciliations.length} catatan</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Mode Description */}
            <Alert className="border-2 border-green-500 bg-green-50">
                <Banknote className="w-4 h-4 text-green-600" />
                <AlertDescription className="font-mono text-sm text-green-800">
                    <strong>Tips:</strong> Catat kas harian setiap hari untuk tracking pendapatan cash.
                    Rekon stok bisa dilakukan mingguan/bulanan untuk menyesuaikan data penjualan.
                </AlertDescription>
            </Alert>

            {/* History Section */}
            {showHistory && reconciliations.length > 0 && (
                <Card className="border-4 border-brand-black shadow-hard">
                    <CardHeader>
                        <CardTitle className="font-display text-xl flex items-center gap-2">
                            <History className="w-5 h-5" />
                            Riwayat Rekonsiliasi
                        </CardTitle>
                        <CardDescription className="font-mono text-xs">
                            Filter riwayat berdasarkan tanggal
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Quick Filters */}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant={dateFilter === 'today' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setDateFilter('today')}
                                className="rounded-none border-2 border-brand-black font-mono text-xs"
                            >
                                Hari Ini
                            </Button>
                            <Button
                                variant={dateFilter === '7days' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setDateFilter('7days')}
                                className="rounded-none border-2 border-brand-black font-mono text-xs"
                            >
                                7 Hari Terakhir
                            </Button>
                            <Button
                                variant={dateFilter === '30days' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setDateFilter('30days')}
                                className="rounded-none border-2 border-brand-black font-mono text-xs"
                            >
                                30 Hari
                            </Button>
                            <Button
                                variant={dateFilter === 'all' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setDateFilter('all')}
                                className="rounded-none border-2 border-brand-black font-mono text-xs"
                            >
                                Semua
                            </Button>
                            <Button
                                variant={dateFilter === 'custom' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setDateFilter('custom')}
                                className="rounded-none border-2 border-brand-black font-mono text-xs"
                            >
                                Custom
                            </Button>
                        </div>

                        {/* Custom Date Range */}
                        {dateFilter === 'custom' && (
                            <div className="flex gap-2 items-center border-2 border-brand-black p-3 bg-gray-50">
                                <div className="flex-1">
                                    <label className="text-xs font-mono font-bold block mb-1">Dari Tanggal</label>
                                    <Input
                                        type="date"
                                        value={customStartDate}
                                        onChange={(e) => setCustomStartDate(e.target.value)}
                                        className="border-2 border-brand-black rounded-none font-mono text-sm"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="text-xs font-mono font-bold block mb-1">Sampai Tanggal</label>
                                    <Input
                                        type="date"
                                        value={customEndDate}
                                        onChange={(e) => setCustomEndDate(e.target.value)}
                                        className="border-2 border-brand-black rounded-none font-mono text-sm"
                                    />
                                </div>
                            </div>
                        )}

                        {/* Filter Summary */}
                        <div className="flex justify-between items-center text-xs font-mono p-2 bg-blue-50 border-2 border-blue-300">
                            <span>Menampilkan: <strong>{filteredReconciliations.length}</strong> dari {reconciliations.length} catatan</span>
                            {filteredReconciliations.length > 0 && (
                                <span className="font-bold text-blue-700">
                                    Total Kas: {formatCurrency(filteredReconciliations.reduce((sum, r) => sum + r.actualCash, 0))}
                                </span>
                            )}
                        </div>

                        {/* Reconciliation List */}
                        {filteredReconciliations.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground font-mono text-sm">
                                Tidak ada data untuk periode yang dipilih
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto">
                                {filteredReconciliations.map((recon) => (
                                    <div
                                        key={recon.id}
                                        className={cn(
                                            "flex justify-between items-center p-3 border-2",
                                            recon.stockItems.length > 0
                                                ? "border-blue-500 bg-blue-50"
                                                : "border-green-500 bg-green-50"
                                        )}
                                    >
                                        <div>
                                            <p className="font-mono font-bold">{formatDate(recon.createdAt)}</p>
                                            <p className="text-xs text-muted-foreground font-mono">
                                                {recon.stockItems.length > 0 ? (
                                                    <>Rekon Stok: {recon.stockItems.filter(i => i.difference < 0).length} terjual | </>
                                                ) : null}
                                                Kas: {formatCurrency(recon.actualCash)}
                                            </p>
                                        </div>
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setSelectedRecon(recon)}
                                                    className="border-2 border-brand-black rounded-none"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </Button>
                                            </DialogTrigger>
                                            <DialogContent className="max-w-lg rounded-none border-4 border-brand-black">
                                                <DialogHeader>
                                                    <DialogTitle className="font-display">Detail Rekonsiliasi</DialogTitle>
                                                </DialogHeader>
                                                {selectedRecon && (
                                                    <div className="space-y-4 font-mono text-sm">
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div>Tanggal:</div>
                                                            <div className="font-bold">{formatDate(selectedRecon.createdAt)}</div>
                                                            <div>Kas Dicatat:</div>
                                                            <div className="font-bold text-green-600">{formatCurrency(selectedRecon.actualCash)}</div>
                                                            {selectedRecon.stockItems.length > 0 && (
                                                                <>
                                                                    <div>Est. Penjualan (Stok):</div>
                                                                    <div className="font-bold text-blue-600">{formatCurrency(selectedRecon.totalStockValue)}</div>
                                                                    <div>Selisih:</div>
                                                                    <div className={cn("font-bold", selectedRecon.unidentifiedAmount > 0 ? "text-yellow-600" : selectedRecon.unidentifiedAmount < 0 ? "text-red-600" : "text-gray-600")}>
                                                                        {formatCurrency(selectedRecon.unidentifiedAmount)}
                                                                    </div>
                                                                </>
                                                            )}
                                                        </div>
                                                        {selectedRecon.stockItems.length > 0 && (
                                                            <div>
                                                                <p className="font-bold mb-2">Produk Terjual:</p>
                                                                <div className="max-h-40 overflow-y-auto space-y-1">
                                                                    {selectedRecon.stockItems.filter(i => i.difference < 0).map((item, idx) => (
                                                                        <div key={idx} className="flex justify-between text-xs bg-gray-50 p-2">
                                                                            <span>{item.productName}</span>
                                                                            <span>{Math.abs(item.difference)} × {formatCurrency(item.unitPrice)}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </DialogContent>
                                        </Dialog>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as RekonTab)} className="w-full">
                <TabsList className="grid w-full grid-cols-2 rounded-none border-4 border-brand-black h-auto p-0">
                    <TabsTrigger
                        value="kas"
                        className="rounded-none font-mono font-bold py-3 data-[state=active]:bg-brand-orange data-[state=active]:text-brand-black"
                    >
                        <Wallet className="w-4 h-4 mr-2" />
                        Catat Kas Harian
                    </TabsTrigger>
                    <TabsTrigger
                        value="stok"
                        className="rounded-none font-mono font-bold py-3 data-[state=active]:bg-brand-orange data-[state=active]:text-brand-black"
                    >
                        <Package className="w-4 h-4 mr-2" />
                        Rekon Stok
                    </TabsTrigger>
                </TabsList>

                {/* Tab: Kas Harian */}
                <TabsContent value="kas" className="mt-4">
                    <Card className="border-4 border-brand-black shadow-hard">
                        <CardHeader className="bg-green-50 border-b-4 border-brand-black">
                            <CardTitle className="font-display text-xl flex items-center gap-2">
                                <Wallet className="w-5 h-5" />
                                Catat Uang Cash Harian
                            </CardTitle>
                            <CardDescription>
                                Catat total uang cash yang ada di kotak/laci. Bisa dicatat beberapa kali sehari.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            <div>
                                <label className="text-sm font-mono font-bold mb-2 block">Jumlah Uang Cash (Rp)</label>
                                <Input
                                    type="number"
                                    value={actualCash}
                                    onChange={(e) => setActualCash(e.target.value)}
                                    onWheel={(e) => e.currentTarget.blur()}
                                    placeholder="Contoh: 150000"
                                    className="border-2 border-brand-black rounded-none font-mono text-2xl h-14"
                                />
                            </div>

                            {actualCashNum > 0 && (
                                <div className="p-4 bg-green-50 border-2 border-green-500">
                                    <p className="font-mono text-lg text-green-800 font-bold">
                                        {formatCurrency(actualCashNum)}
                                    </p>
                                    <p className="font-mono text-xs text-green-700 mt-1">
                                        Uang ini akan dicatat sebagai pendapatan cash hari ini.
                                    </p>
                                </div>
                            )}

                            <Alert className="border-2 border-blue-300 bg-blue-50">
                                <AlertDescription className="font-mono text-xs text-blue-800">
                                    <strong>Catatan:</strong> Jika ada penjualan via QRIS, uang masuk ke rekening secara otomatis
                                    dan sudah tercatat di sistem. Yang perlu dicatat di sini hanya uang tunai (cash).
                                </AlertDescription>
                            </Alert>

                            <Button
                                onClick={handleSubmitKas}
                                disabled={isSubmitting || actualCashNum <= 0}
                                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 text-lg border-4 border-brand-black rounded-none shadow-hard-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                            >
                                <Plus className="w-5 h-5 mr-2" />
                                {isSubmitting ? 'Menyimpan...' : 'Simpan Kas Harian'}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab: Rekon Stok */}
                <TabsContent value="stok" className="mt-4 space-y-4">
                    {/* Optional Kas Input for Stok Rekon */}
                    <Card className="border-2 border-gray-300">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                                <div className="flex-1">
                                    <label className="text-xs font-mono font-bold mb-1 block text-muted-foreground">
                                        Kas saat ini (opsional)
                                    </label>
                                    <Input
                                        type="number"
                                        value={actualCash}
                                        onChange={(e) => setActualCash(e.target.value)}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        placeholder="0"
                                        className="border-2 border-brand-black rounded-none font-mono"
                                    />
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-mono text-muted-foreground">Untuk cross-check</p>
                                    <p className="font-mono font-bold">{formatCurrency(actualCashNum)}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-4 border-brand-black shadow-hard">
                        <CardHeader className="bg-blue-50 border-b-4 border-brand-black">
                            <CardTitle className="font-display text-xl flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                Hitung Stok Fisik
                            </CardTitle>
                            <CardDescription>
                                Lakukan mingguan/bulanan. Selisih stok akan otomatis tercatat sebagai penjualan.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-6 space-y-4">
                            {/* Search */}
                            <Input
                                type="text"
                                placeholder="Cari produk..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="border-2 border-brand-black rounded-none font-mono"
                            />

                            {/* Progress */}
                            <div className="flex items-center justify-between text-sm font-mono">
                                <span>Sudah dihitung: <strong>{Object.keys(stockCounts).length}/{products.length}</strong></span>
                                {soldItems.length > 0 && (
                                    <span className="text-red-600 font-bold">
                                        <AlertTriangle className="w-4 h-4 inline mr-1" />
                                        {soldItems.length} berkurang
                                    </span>
                                )}
                            </div>

                            {/* Products List */}
                            <div className="space-y-2 max-h-[350px] overflow-y-auto">
                                {filteredProducts.map((product) => {
                                    const diff = getStockDifference(product);
                                    const hasDiff = diff !== null && diff !== 0;

                                    return (
                                        <div
                                            key={product.id}
                                            className={cn(
                                                "flex items-center gap-3 p-2 border-2 border-brand-black",
                                                hasDiff
                                                    ? diff! > 0
                                                        ? "bg-green-50 border-green-500"
                                                        : "bg-red-50 border-red-500"
                                                    : stockCounts[product.id] !== undefined
                                                        ? "bg-blue-50"
                                                        : "bg-white"
                                            )}
                                        >
                                            <div className="flex-1 min-w-0">
                                                <p className="font-mono font-bold text-sm truncate">{product.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono">
                                                    {formatCurrency(product.price)}
                                                </p>
                                            </div>

                                            <div className="text-center w-14">
                                                <p className="text-[10px] text-muted-foreground font-mono">Sistem</p>
                                                <p className="font-mono font-bold text-sm">{product.totalStock || 0}</p>
                                            </div>

                                            <div className="w-16">
                                                <Input
                                                    type="number"
                                                    value={stockCounts[product.id] ?? ''}
                                                    onChange={(e) => handleStockCountChange(product.id, e.target.value)}
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                    placeholder="-"
                                                    className={cn(
                                                        "border-2 rounded-none font-mono text-center h-9 text-sm",
                                                        hasDiff
                                                            ? diff! > 0 ? "border-green-500" : "border-red-500"
                                                            : "border-brand-black"
                                                    )}
                                                />
                                            </div>

                                            <div className="w-12 text-center">
                                                {diff !== null ? (
                                                    <div className={cn(
                                                        "font-mono font-bold text-sm",
                                                        diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-500"
                                                    )}>
                                                        {diff === 0 ? (
                                                            <Check className="w-4 h-4 mx-auto text-green-600" />
                                                        ) : (
                                                            <span>{diff > 0 ? '+' : ''}{diff}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">-</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Summary */}
                            {soldItems.length > 0 && (
                                <div className="p-4 bg-red-50 border-2 border-red-500 space-y-2">
                                    <p className="font-mono font-bold text-red-800">
                                        Estimasi Penjualan dari Stok Berkurang:
                                    </p>
                                    <p className="text-2xl font-display font-bold text-red-700">
                                        {formatCurrency(totalStockValue)}
                                    </p>
                                    <p className="font-mono text-xs text-red-600">
                                        {soldItems.length} produk × total {soldItems.reduce((sum, p) => sum + Math.abs(getStockDifference(p) || 0), 0)} unit
                                    </p>
                                </div>
                            )}

                            {/* Cross-check with Kas */}
                            {actualCashNum > 0 && soldItems.length > 0 && (
                                <Alert className={cn(
                                    "border-2",
                                    Math.abs(actualCashNum - totalStockValue) < 5000
                                        ? "border-green-500 bg-green-50"
                                        : "border-yellow-500 bg-yellow-50"
                                )}>
                                    <AlertDescription className="font-mono text-sm">
                                        <strong>Cross-check:</strong> Kas ({formatCurrency(actualCashNum)}) vs Est. Penjualan ({formatCurrency(totalStockValue)})
                                        {' = '}
                                        <span className={cn(
                                            "font-bold",
                                            actualCashNum - totalStockValue > 0 ? "text-green-600" : actualCashNum - totalStockValue < 0 ? "text-red-600" : ""
                                        )}>
                                            {actualCashNum - totalStockValue > 0 ? '+' : ''}{formatCurrency(actualCashNum - totalStockValue)}
                                        </span>
                                    </AlertDescription>
                                </Alert>
                            )}

                            <Button
                                onClick={handleSubmitStok}
                                disabled={isSubmitting || Object.keys(stockCounts).length === 0}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 text-lg border-4 border-brand-black rounded-none shadow-hard-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                            >
                                <Save className="w-5 h-5 mr-2" />
                                {isSubmitting ? 'Menyimpan...' : `Simpan Rekon Stok (${Object.keys(stockCounts).length} produk)`}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
