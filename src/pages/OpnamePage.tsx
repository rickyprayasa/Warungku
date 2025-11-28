import { useState, useEffect } from 'react';
import { useWarungStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Wallet, TrendingUp, TrendingDown, DollarSign, Plus, Calendar, History as HistoryIcon, Package, AlertTriangle, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReconciliationTerpadu } from '@/components/ReconciliationTerpadu';
import type { CashEntry, Product } from '@shared/types';

type OpnameMode = 'display' | 'retail' | 'terpadu';

export function OpnamePage() {
    const sales = useWarungStore((state) => state.sales);
    const purchases = useWarungStore((state) => state.purchases);
    const products = useWarungStore((state) => state.products);
    const initialBalance = useWarungStore((state) => state.initialBalance);
    const fetchSales = useWarungStore((state) => state.fetchSales);
    const fetchPurchases = useWarungStore((state) => state.fetchPurchases);
    const fetchProducts = useWarungStore((state) => state.fetchProducts);

    const [actualCash, setActualCash] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const opnameMode = useWarungStore((state) => state.opnameMode);

    // Cash Entry state (for Display mode)
    const [dailyCashAmount, setDailyCashAmount] = useState<string>('');
    const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    // Stock Opname state (for Retail mode)
    const [stockCounts, setStockCounts] = useState<Record<string, number>>({});
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchSales();
        fetchPurchases();
        fetchProducts();
        loadCashEntries();
    }, [fetchSales, fetchPurchases, fetchProducts]);

    const loadCashEntries = () => {
        const stored = localStorage.getItem('cashEntries');
        if (stored) {
            setCashEntries(JSON.parse(stored));
        }
    };

    const saveCashEntry = () => {
        const amount = parseFloat(dailyCashAmount);
        if (!amount || amount <= 0) {
            toast.error('Masukkan jumlah uang yang valid.');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const newEntry: CashEntry = {
            id: crypto.randomUUID(),
            amount,
            date: today,
            createdAt: Date.now(),
        };

        const updated = [newEntry, ...cashEntries];
        setCashEntries(updated);
        localStorage.setItem('cashEntries', JSON.stringify(updated));

        setDailyCashAmount('');
        toast.success(`Cash entry Rp ${amount.toLocaleString('id-ID')} tersimpan!`);
    };

    // Calculate expected cash from transactions
    const expectedCash = initialBalance +
        sales.reduce((sum, sale) => sum + sale.total, 0) -
        purchases.reduce((sum, purchase) => sum + purchase.totalCost, 0);

    const actualCashNum = parseFloat(actualCash) || 0;
    const difference = actualCashNum - expectedCash;
    const hasDifference = Math.abs(difference) > 0.01;

    // Calculate total from cash entries
    const totalCashEntries = cashEntries.reduce((sum, entry) => sum + entry.amount, 0);

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

    // Stock opname helpers
    const filteredProducts = products.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getStockDifference = (product: Product) => {
        const counted = stockCounts[product.id];
        if (counted === undefined) return null;
        return counted - product.totalStock;
    };

    const productsWithDifference = products.filter(p => {
        const diff = getStockDifference(p);
        return diff !== null && diff !== 0;
    });

    const handleStockCountChange = (productId: string, value: string) => {
        const num = parseInt(value) || 0;
        setStockCounts(prev => ({
            ...prev,
            [productId]: num
        }));
    };

    const handleCashReconciliation = async () => {
        if (!actualCash || actualCashNum <= 0) {
            toast.error('Masukkan jumlah uang yang valid.');
            return;
        }

        if (!hasDifference) {
            toast.success('Uang sudah sesuai! Tidak perlu penyesuaian.');
            return;
        }

        try {
            setIsSubmitting(true);

            const adjustmentSale = {
                items: [{
                    productId: 'ADJUSTMENT',
                    productName: 'Penyesuaian Kas',
                    quantity: 1,
                    price: difference,
                }],
            };

            await fetch('/api/sales', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...adjustmentSale,
                    saleType: 'adjustment'
                }),
            });

            toast.success('Rekonsiliasi kas berhasil!');
            setActualCash('');
            await fetchSales();

        } catch (error) {
            console.error(error);
            toast.error('Gagal menyimpan rekonsiliasi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStockReconciliation = async () => {
        if (productsWithDifference.length === 0) {
            toast.info('Tidak ada selisih stok yang perlu disesuaikan.');
            return;
        }

        const confirmed = window.confirm(
            `KONFIRMASI PENYESUAIAN STOK\n\n` +
            `${productsWithDifference.length} produk akan disesuaikan.\n\n` +
            `Lanjutkan?`
        );

        if (!confirmed) return;

        try {
            setIsSubmitting(true);

            for (const product of productsWithDifference) {
                const newStock = stockCounts[product.id];
                if (newStock === undefined) continue;

                // Adjust stock to the counted value
                await fetch(`/api/products/${product.id}/adjust-stock`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        quantity: newStock,
                        unitCost: product.price * 0.7, // Estimate cost as 70% of price
                        isFromProductForm: false
                    }),
                });
            }

            toast.success(`${productsWithDifference.length} produk berhasil disesuaikan!`);
            setStockCounts({});
            await fetchProducts();

        } catch (error) {
            console.error(error);
            toast.error('Gagal menyimpan penyesuaian stok.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show Terpadu mode
    if (opnameMode === 'terpadu') {
        return <ReconciliationTerpadu />;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-2xl font-display font-bold text-brand-black mb-2">
                    {opnameMode === 'display' ? 'Rekonsiliasi Kas' : 'Rekonsiliasi Stok'}
                </h3>
                <p className="text-muted-foreground font-mono text-sm">
                    {opnameMode === 'display'
                        ? 'Hitung uang di laci dan cocokkan dengan sistem.'
                        : 'Hitung stok fisik dan cocokkan dengan sistem.'}
                </p>
            </div>

            {/* Mode Description Alert */}
            <Alert className={cn(
                "border-2",
                opnameMode === 'display' ? "border-purple-500 bg-purple-50" : "border-blue-500 bg-blue-50"
            )}>
                <AlertDescription className="font-mono text-sm">
                    {opnameMode === 'display' ? (
                        <>
                            <strong>Mode Display:</strong> Stok sudah dikurangi di awal saat dipajang.
                            Profit dihitung dari selisih uang kas.
                            Masukkan total uang hasil penjualan hari ini.
                        </>
                    ) : (
                        <>
                            <strong>Mode Retail:</strong> Stok dikurangi saat terjadi penjualan.
                            Lakukan penghitungan stok fisik dan bandingkan dengan sistem.
                        </>
                    )}
                </AlertDescription>
            </Alert>

            {/* Reminder for manual sales in Retail mode */}
            {opnameMode === 'retail' && (
                <Alert className="border-2 border-orange-500 bg-orange-50">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <AlertDescription className="font-mono text-sm text-orange-800">
                        <strong>Penting:</strong> Jika ada penjualan manual (cash langsung tanpa keranjang/QRIS),
                        pastikan sudah dicatat melalui tombol <strong>"Catat Penjualan Manual"</strong> di halaman Menu.
                        Selisih stok bisa terjadi jika ada penjualan yang belum tercatat.
                    </AlertDescription>
                </Alert>
            )}

            {/* DISPLAY MODE - Cash Reconciliation */}
            {opnameMode === 'display' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Left Column: Input and System Cash */}
                    <div className="space-y-6">
                        {/* Daily Cash Entry Card */}
                        <Card className="border-4 border-brand-black shadow-hard bg-blue-50">
                            <CardHeader>
                                <CardTitle className="font-display text-xl flex items-center gap-2">
                                    <Calendar className="w-5 h-5" />
                                    Input Uang Penjualan Harian
                                </CardTitle>
                                <CardDescription>Catat uang cash yang Anda terima hari ini</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-mono font-bold mb-2 block">Jumlah Cash (Rp)</label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            value={dailyCashAmount}
                                            onChange={(e) => setDailyCashAmount(e.target.value)}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            placeholder="0"
                                            className="border-2 border-brand-black rounded-none font-mono text-lg"
                                        />
                                        <Button
                                            onClick={saveCashEntry}
                                            className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-brand-black rounded-none font-bold whitespace-nowrap"
                                        >
                                            <Plus className="w-4 h-4 mr-1" />
                                            Simpan
                                        </Button>
                                    </div>
                                </div>

                                {cashEntries.length > 0 && (
                                    <>
                                        <div className="flex justify-between items-center py-2 bg-blue-100 px-3 border-2 border-brand-black">
                                            <span className="font-mono font-bold">Total Terakumulasi</span>
                                            <span className="text-xl font-display font-bold text-blue-600">
                                                {formatCurrency(totalCashEntries)}
                                            </span>
                                        </div>

                                        <Button
                                            onClick={() => setShowHistory(!showHistory)}
                                            variant="outline"
                                            className="w-full border-2 border-brand-black rounded-none font-bold"
                                        >
                                            <HistoryIcon className="w-4 h-4 mr-2" />
                                            {showHistory ? 'Sembunyikan' : 'Lihat'} Riwayat ({cashEntries.length})
                                        </Button>

                                        {showHistory && (
                                            <div className="max-h-60 overflow-y-auto border-2 border-brand-black bg-white">
                                                {cashEntries.map((entry) => (
                                                    <div key={entry.id} className="flex justify-between items-center p-2 border-b last:border-b-0 hover:bg-gray-50">
                                                        <div>
                                                            <p className="font-mono font-bold">{formatCurrency(entry.amount)}</p>
                                                            <p className="text-xs text-muted-foreground font-mono">{formatDate(entry.createdAt)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </CardContent>
                        </Card>

                        {/* System Cash Card */}
                        <Card className="border-4 border-brand-black shadow-hard">
                            <CardHeader>
                                <CardTitle className="font-display text-xl flex items-center gap-2">
                                    <Wallet className="w-5 h-5" />
                                    Kas Menurut Sistem
                                </CardTitle>
                                <CardDescription>Berdasarkan pencatatan penjualan & pembelian</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center py-2 border-b border-brand-black/10">
                                        <span className="text-sm font-mono text-muted-foreground">Modal Awal</span>
                                        <span className="font-mono font-bold">{formatCurrency(initialBalance)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-brand-black/10">
                                        <span className="text-sm font-mono text-muted-foreground flex items-center gap-1">
                                            <TrendingUp className="w-4 h-4 text-green-600" />
                                            Penjualan
                                        </span>
                                        <span className="font-mono font-bold text-green-600">
                                            {formatCurrency(sales.reduce((sum, s) => sum + s.total, 0))}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 border-b border-brand-black/10">
                                        <span className="text-sm font-mono text-muted-foreground flex items-center gap-1">
                                            <TrendingDown className="w-4 h-4 text-red-600" />
                                            Pembelian
                                        </span>
                                        <span className="font-mono font-bold text-red-600">
                                            - {formatCurrency(purchases.reduce((sum, p) => sum + p.totalCost, 0))}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-3 bg-brand-orange/10 px-4 -mx-4 border-t-2 border-brand-black">
                                        <span className="font-mono font-bold">Total Seharusnya</span>
                                        <span className="text-xl font-display font-bold text-brand-black">
                                            {formatCurrency(expectedCash)}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right Column: Physical Cash and Comparison */}
                    <div className="space-y-6">
                        {/* Physical Cash Card */}
                        <Card className="border-4 border-brand-black shadow-hard">
                            <CardHeader>
                                <CardTitle className="font-display text-xl flex items-center gap-2">
                                    <DollarSign className="w-5 h-5" />
                                    Uang Fisik di Laci
                                </CardTitle>
                                <CardDescription>Hitung uang yang benar-benar ada</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <label className="text-sm font-mono font-bold mb-2 block">Total Uang di Laci (Rp)</label>
                                    <Input
                                        type="number"
                                        value={actualCash}
                                        onChange={(e) => setActualCash(e.target.value)}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        placeholder="0"
                                        className="border-2 border-brand-black rounded-none font-mono text-lg"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* Comparison Result Card */}
                        <Card className={cn(
                            "border-4 border-brand-black shadow-hard transition-all",
                            hasDifference && actualCashNum > 0
                                ? difference > 0
                                    ? "bg-green-50 border-green-600"
                                    : "bg-red-50 border-red-600"
                                : "bg-gray-50"
                        )}>
                            <CardHeader>
                                <CardTitle className="font-display text-2xl">Hasil Perbandingan</CardTitle>
                                <CardDescription>
                                    {!actualCashNum && "Masukkan uang di laci untuk melihat hasil"}
                                    {actualCashNum > 0 && !hasDifference && "Uang sudah sesuai!"}
                                    {hasDifference && difference > 0 && "Ada kelebihan uang"}
                                    {hasDifference && difference < 0 && "Ada kekurangan uang"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 p-4 bg-white border-2 border-brand-black">
                                        <p className="text-xs font-mono text-muted-foreground uppercase">Uang di Sistem</p>
                                        <p className="text-xl font-display font-bold text-brand-black">
                                            {formatCurrency(expectedCash)}
                                        </p>
                                    </div>
                                    <div className="space-y-2 p-4 bg-white border-2 border-brand-black">
                                        <p className="text-xs font-mono text-muted-foreground uppercase">Uang di Laci</p>
                                        <p className={cn(
                                            "text-xl font-display font-bold",
                                            actualCashNum > 0 ? "text-brand-black" : "text-muted-foreground"
                                        )}>
                                            {actualCashNum > 0 ? formatCurrency(actualCashNum) : "Rp 0"}
                                        </p>
                                    </div>
                                </div>

                                {actualCashNum > 0 && (
                                    <div className={cn(
                                        "p-6 border-4 border-brand-black",
                                        hasDifference
                                            ? difference > 0
                                                ? "bg-green-100"
                                                : "bg-red-100"
                                            : "bg-gray-100"
                                    )}>
                                        <p className="text-sm font-mono font-bold mb-2 uppercase">Selisih</p>
                                        <p className={cn(
                                            "text-4xl font-display font-bold",
                                            difference > 0 ? "text-green-600" : difference < 0 ? "text-red-600" : "text-gray-600"
                                        )}>
                                            {difference > 0 && "+"}{formatCurrency(difference)}
                                        </p>
                                    </div>
                                )}

                                {hasDifference && actualCashNum > 0 && (
                                    <Button
                                        onClick={handleCashReconciliation}
                                        disabled={isSubmitting}
                                        className="w-full bg-brand-orange hover:bg-brand-orange/90 text-brand-black font-bold py-6 text-lg border-4 border-brand-black rounded-none shadow-hard-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                                    >
                                        <Save className="w-5 h-5 mr-2" />
                                        {isSubmitting ? 'Menyimpan...' : 'Simpan Penyesuaian'}
                                    </Button>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* RETAIL MODE - Stock Reconciliation */}
            {opnameMode === 'retail' && (
                <div className="space-y-6">
                    {/* Search and Summary */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <Input
                                type="text"
                                placeholder="Cari produk..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="border-2 border-brand-black rounded-none font-mono"
                            />
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-sm font-mono">
                                <span className="text-muted-foreground">Sudah dihitung: </span>
                                <span className="font-bold">{Object.keys(stockCounts).length}/{products.length}</span>
                            </div>
                            {productsWithDifference.length > 0 && (
                                <div className="text-sm font-mono text-red-600 font-bold">
                                    <AlertTriangle className="w-4 h-4 inline mr-1" />
                                    {productsWithDifference.length} selisih
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Products List */}
                    <Card className="border-4 border-brand-black shadow-hard">
                        <CardHeader>
                            <CardTitle className="font-display text-xl flex items-center gap-2">
                                <Package className="w-5 h-5" />
                                Hitung Stok Fisik
                            </CardTitle>
                            <CardDescription>Masukkan jumlah stok fisik untuk setiap produk</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                {filteredProducts.map((product) => {
                                    const diff = getStockDifference(product);
                                    const hasDiff = diff !== null && diff !== 0;

                                    return (
                                        <div
                                            key={product.id}
                                            className={cn(
                                                "flex items-center gap-4 p-3 border-2 border-brand-black",
                                                hasDiff
                                                    ? diff! > 0
                                                        ? "bg-green-50 border-green-500"
                                                        : "bg-red-50 border-red-500"
                                                    : stockCounts[product.id] !== undefined
                                                        ? "bg-blue-50"
                                                        : "bg-white"
                                            )}
                                        >
                                            {/* Product Info */}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-mono font-bold truncate">{product.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{product.category}</p>
                                            </div>

                                            {/* System Stock */}
                                            <div className="text-center w-20">
                                                <p className="text-xs text-muted-foreground font-mono">Sistem</p>
                                                <p className="font-mono font-bold">{product.totalStock}</p>
                                            </div>

                                            {/* Physical Count Input */}
                                            <div className="w-24">
                                                <Input
                                                    type="number"
                                                    value={stockCounts[product.id] ?? ''}
                                                    onChange={(e) => handleStockCountChange(product.id, e.target.value)}
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                    placeholder="Fisik"
                                                    className={cn(
                                                        "border-2 rounded-none font-mono text-center h-10",
                                                        hasDiff
                                                            ? diff! > 0
                                                                ? "border-green-500"
                                                                : "border-red-500"
                                                            : "border-brand-black"
                                                    )}
                                                />
                                            </div>

                                            {/* Difference */}
                                            <div className="w-20 text-center">
                                                {diff !== null ? (
                                                    <div className={cn(
                                                        "font-mono font-bold",
                                                        diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-500"
                                                    )}>
                                                        {diff === 0 ? (
                                                            <Check className="w-5 h-5 mx-auto text-green-600" />
                                                        ) : (
                                                            <span>{diff > 0 ? '+' : ''}{diff}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs font-mono">-</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}

                                {filteredProducts.length === 0 && (
                                    <div className="text-center py-8 text-muted-foreground font-mono">
                                        Tidak ada produk ditemukan
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Summary and Action */}
                    {productsWithDifference.length > 0 && (
                        <Card className="border-4 border-red-500 shadow-hard bg-red-50">
                            <CardHeader>
                                <CardTitle className="font-display text-xl flex items-center gap-2 text-red-700">
                                    <AlertTriangle className="w-5 h-5" />
                                    Ringkasan Selisih Stok
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="max-h-40 overflow-y-auto space-y-2">
                                    {productsWithDifference.map((product) => {
                                        const diff = getStockDifference(product)!;
                                        return (
                                            <div key={product.id} className="flex justify-between items-center p-2 bg-white border border-brand-black">
                                                <span className="font-mono text-sm">{product.name}</span>
                                                <span className={cn(
                                                    "font-mono font-bold",
                                                    diff > 0 ? "text-green-600" : "text-red-600"
                                                )}>
                                                    {diff > 0 ? '+' : ''}{diff}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </div>

                                <Button
                                    onClick={handleStockReconciliation}
                                    disabled={isSubmitting}
                                    className="w-full bg-brand-orange hover:bg-brand-orange/90 text-brand-black font-bold py-6 text-lg border-4 border-brand-black rounded-none shadow-hard-sm hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all"
                                >
                                    <Save className="w-5 h-5 mr-2" />
                                    {isSubmitting ? 'Menyimpan...' : `Simpan Penyesuaian (${productsWithDifference.length} produk)`}
                                </Button>
                            </CardContent>
                        </Card>
                    )}

                    {Object.keys(stockCounts).length > 0 && productsWithDifference.length === 0 && (
                        <Alert className="border-2 border-green-500 bg-green-50">
                            <Check className="w-4 h-4 text-green-600" />
                            <AlertDescription className="font-mono text-sm text-green-800">
                                Semua stok yang dihitung sudah sesuai dengan sistem!
                            </AlertDescription>
                        </Alert>
                    )}
                </div>
            )}
        </div>
    );
}
