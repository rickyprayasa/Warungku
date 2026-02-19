import { useState, useEffect, useRef } from 'react';
import { useWarungStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Wallet, TrendingUp, TrendingDown, DollarSign, Plus, Calendar, Package, AlertTriangle, Check, Search, Eye, EyeOff, ChevronDown, ChevronUp, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ReconciliationTerpadu } from '@/components/ReconciliationTerpadu';
import { OnboardingTour } from '@/components/OnboardingTour';
import type { CashEntry, Product } from '@shared/types';
import { CardGridSkeleton, FormSkeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type OpnameMode = 'display' | 'retail' | 'terpadu';

export function OpnamePage({ isActive }: { isActive?: boolean }) {
    const sales = useWarungStore((state) => state.sales);
    const purchases = useWarungStore((state) => state.purchases);
    const products = useWarungStore((state) => state.products);
    const initialBalance = useWarungStore((state) => state.initialBalance);
    const isLoading = useWarungStore((state) => state.isLoading);
    const fetchSales = useWarungStore((state) => state.fetchSales);
    const fetchPurchases = useWarungStore((state) => state.fetchPurchases);
    const fetchProducts = useWarungStore((state) => state.fetchProducts);
    const createOpname = useWarungStore((state) => state.createOpname);

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
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [showSystemStock, setShowSystemStock] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showOnlyUncounted, setShowOnlyUncounted] = useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const inputRefs = useRef<Record<string, HTMLInputElement>>({});

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
        });
    };

    // Get unique categories
    const categories = ['all', ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

    // Stock opname helpers
    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.category.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
        const matchesUncounted = !showOnlyUncounted || stockCounts[p.id] === undefined;
        return matchesSearch && matchesCategory && matchesUncounted;
    });

    const getStockDifference = (product: Product) => {
        const counted = stockCounts[product.id];
        if (counted === undefined) return null;
        return counted - product.totalStock;
    };

    const productsWithDifference = products.filter(p => {
        const diff = getStockDifference(p);
        return diff !== null && diff !== 0;
    });

    // Products with stock decrease (likely sold)
    const soldItems = productsWithDifference.filter(p => {
        const diff = getStockDifference(p);
        return diff !== null && diff < 0;
    });

    // Estimated sales value from stock decrease — accounts for bundle pricing
    const totalStockValue = soldItems.reduce((sum, p) => {
        const diff = Math.abs(getStockDifference(p) || 0); // in pieces
        const qtyPerUnit = p.qtyPerUnit || 1;
        const unitsSold = diff / qtyPerUnit;
        return sum + Math.round(unitsSold * p.price);
    }, 0);

    const totalCounted = Object.keys(stockCounts).length;

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const paginatedProducts = filteredProducts.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    const handleStockCountChange = (productId: string, value: string) => {
        const num = parseInt(value) || 0;
        setStockCounts(prev => ({
            ...prev,
            [productId]: num
        }));


    };

    const handleKeyDown = (e: React.KeyboardEvent, productId: string) => {
        if (e.key === 'Enter') {
            const productIndex = paginatedProducts.findIndex(p => p.id === productId);
            if (productIndex < paginatedProducts.length - 1) {
                const nextProduct = paginatedProducts[productIndex + 1];
                if (nextProduct && inputRefs.current[nextProduct.id]) {
                    inputRefs.current[nextProduct.id].focus();
                }
            }
        }
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
        console.log('[OpnamePage] handleStockReconciliation triggered');
        if (productsWithDifference.length === 0) {
            console.log('[OpnamePage] No differences to save');
            toast.info('Tidak ada selisih stok yang perlu disesuaikan.');
            return;
        }

        // Open custom dialog instead of window.confirm
        setIsConfirmOpen(true);
    };

    const confirmStockReconciliation = async () => {
        setIsConfirmOpen(false); // Close dialog

        try {
            console.log('[OpnamePage] Starting submission...');
            setIsSubmitting(true);
            toast.loading('Menyimpan penyesuaian stok...', { id: 'save-opname' });

            const payload = {
                items: productsWithDifference.map(p => ({
                    productId: p.id,
                    quantity: stockCounts[p.id] !== undefined ? stockCounts[p.id] : (p.totalStock || 0)
                }))
            };

            console.log('[OpnamePage] Payload prepared:', payload);

            await createOpname(payload);

            console.log('[OpnamePage] createOpname success');

            toast.dismiss('save-opname');
            toast.success(`${productsWithDifference.length} produk berhasil disesuaikan!`);
            setStockCounts({});
            // fetchProducts is called within createOpname, but we can call it here to be safe or rely on store update
            // await fetchProducts(); // createOpname already refreshes
            // productsWithDifference is derived from stockCounts, so clearing stockCounts clears it.

        } catch (error) {
            toast.dismiss('save-opname');
            console.error('[OpnamePage] Error during stock reconciliation:', error);
            toast.error('Gagal menyimpan penyesuaian stok.');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Show Terpadu mode
    if (opnameMode === 'terpadu') {
        return <ReconciliationTerpadu />;
    }

    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                <CardGridSkeleton cols={2} />
                <FormSkeleton />
            </div>
        );
    }

    const opnameTourSteps = opnameMode === 'display' ? [
        {
            element: '#tour-opname-tabs',
            popover: {
                title: 'Tab Rekonsiliasi',
                description: 'Gunakan tab ini untuk beralih antara input uang, melihat data sistem, dan hasil selisih.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#tour-opname-cash-input',
            popover: {
                title: 'Input Uang',
                description: 'Masukkan jumlah uang tunai yang ada di laci kasir saat ini.',
                side: 'bottom',
                align: 'center'
            }
        }
    ] : [
        {
            element: '#tour-opname-search',
            popover: {
                title: 'Cari Produk',
                description: 'Cari produk yang ingin dihitung stok fisiknya.',
                side: 'bottom',
                align: 'start'
            }
        },
        {
            element: '#tour-opname-system-toggle',
            popover: {
                title: 'Tampil/Sembunyi Sistem',
                description: 'Sembunyikan stok sistem agar perhitungan fisik lebih objektif (blind count).',
                side: 'bottom',
                align: 'center'
            }
        }
    ];

    return (
        <div className="space-y-4 pb-4 md:pb-4">
            {/* Header - Compact */}
            <div className="sticky top-0 bg-white z-10 pb-2 border-b-2 border-brand-black">
                <div className="flex items-center justify-between">
                    <h3 className="text-xl md:text-2xl font-display font-bold text-brand-black">
                        {opnameMode === 'display' ? 'Rekonsiliasi Kas' : 'Hitung Stok Fisik'}
                    </h3>
                    <OnboardingTour tourId={`opname-${opnameMode}-tour`} steps={opnameTourSteps} loading={isLoading} isActive={isActive} />
                </div>
            </div>

            {/* DISPLAY MODE - Cash Reconciliation */}
            {opnameMode === 'display' && (
                <div className="space-y-4">
                    <Tabs defaultValue="input" className="w-full">
                        <TabsList className="grid grid-cols-3 w-full h-10 mb-3" id="tour-opname-tabs">
                            <TabsTrigger value="input" className="font-mono text-xs font-bold">Input Uang</TabsTrigger>
                            <TabsTrigger value="system" className="font-mono text-xs font-bold">Sistem</TabsTrigger>
                            <TabsTrigger value="result" className="font-mono text-xs font-bold">Hasil</TabsTrigger>
                        </TabsList>

                        <TabsContent value="input" className="space-y-3">
                            <Card className="border-2 border-brand-black bg-blue-50">
                                <CardHeader className="pb-2 px-3 pt-3">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Input Uang Harian
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-3 pb-3 space-y-2" id="tour-opname-cash-input">
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            value={dailyCashAmount}
                                            onChange={(e) => setDailyCashAmount(e.target.value)}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            placeholder="0"
                                            className="border-2 border-brand-black rounded-none font-mono text-sm h-9 flex-1"
                                        />
                                        <Button
                                            onClick={saveCashEntry}
                                            className="bg-blue-500 hover:bg-blue-600 text-white border-2 border-brand-black rounded-none font-bold px-3 h-9 text-xs"
                                        >
                                            <Plus className="w-3 h-3 mr-1" />
                                            Simpan
                                        </Button>
                                    </div>

                                    <div className="flex justify-between items-center py-2 bg-blue-100 px-3 border-2 border-brand-black">
                                        <span className="text-xs font-mono font-bold">Total: {formatCurrency(totalCashEntries)}</span>
                                        <Button
                                            onClick={() => setShowHistory(!showHistory)}
                                            variant="ghost"
                                            className="h-6 px-2 text-xs font-mono"
                                        >
                                            {showHistory ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                            {showHistory ? 'Tutup' : 'Riwayat'}
                                        </Button>
                                    </div>

                                    {showHistory && (
                                        <div className="max-h-32 overflow-y-auto border-2 border-brand-black bg-white">
                                            {cashEntries.map((entry) => (
                                                <div key={entry.id} className="flex justify-between items-center p-2 border-b border-brand-black/10">
                                                    <div>
                                                        <p className="font-mono font-bold text-sm">{formatCurrency(entry.amount)}</p>
                                                        <p className="text-xs text-muted-foreground font-mono">{formatDate(entry.createdAt)}</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="system" className="space-y-3">
                            <Card className="border-2 border-brand-black">
                                <CardHeader className="pb-2 px-3 pt-3">
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Wallet className="w-4 h-4" />
                                        Kas Sistem
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="px-3 pb-3 space-y-2">
                                    <div className="flex justify-between items-center py-1.5 border-b border-brand-black/10">
                                        <span className="text-xs font-mono text-muted-foreground">Modal Awal</span>
                                        <span className="text-xs font-mono font-bold">{formatCurrency(initialBalance)}</span>
                                    </div>
                                    <div className="flex justify-between items-center py-1.5 border-b border-brand-black/10">
                                        <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3 text-green-600" />
                                            Penjualan
                                        </span>
                                        <span className="text-xs font-mono font-bold text-green-600">
                                            {formatCurrency(sales.reduce((sum, s) => sum + s.total, 0))}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-1.5 border-b border-brand-black/10">
                                        <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                                            <TrendingDown className="w-3 h-3 text-red-600" />
                                            Pembelian
                                        </span>
                                        <span className="text-xs font-mono font-bold text-red-600">
                                            - {formatCurrency(purchases.reduce((sum, p) => sum + p.totalCost, 0))}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-2 bg-brand-orange/10 px-3 border-2 border-brand-black">
                                        <span className="text-xs font-mono font-bold">Total Seharusnya</span>
                                        <span className="text-base font-display font-bold text-brand-black">
                                            {formatCurrency(expectedCash)}
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="result" className="space-y-3">
                            <Card className={cn(
                                "border-2 border-brand-black",
                                hasDifference && actualCashNum > 0
                                    ? difference > 0 ? "bg-green-50 border-green-600" : "bg-red-50 border-red-600"
                                    : "bg-gray-50"
                            )}>
                                <CardHeader className="pb-2 px-3 pt-3">
                                    <CardTitle className="text-sm font-bold">Uang di Laci</CardTitle>
                                </CardHeader>
                                <CardContent className="px-3 pb-3 space-y-3">
                                    <Input
                                        type="number"
                                        value={actualCash}
                                        onChange={(e) => setActualCash(e.target.value)}
                                        onWheel={(e) => e.currentTarget.blur()}
                                        placeholder="0"
                                        className="border-2 border-brand-black rounded-none font-mono text-base h-10"
                                    />

                                    {actualCashNum > 0 && (
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="p-2 bg-white border-2 border-brand-black">
                                                <p className="text-[10px] font-mono text-muted-foreground uppercase">Sistem</p>
                                                <p className="text-base font-display font-bold text-brand-black">{formatCurrency(expectedCash)}</p>
                                            </div>
                                            <div className="p-2 bg-white border-2 border-brand-black">
                                                <p className="text-[10px] font-mono text-muted-foreground uppercase">Laci</p>
                                                <p className={cn("text-base font-display font-bold", actualCashNum > 0 ? "text-brand-black" : "text-muted-foreground")}>
                                                    {actualCashNum > 0 ? formatCurrency(actualCashNum) : "Rp 0"}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {actualCashNum > 0 && hasDifference && (
                                        <div className={cn("p-3 border-2 border-brand-black text-center", hasDifference ? (difference > 0 ? "bg-green-100" : "bg-red-100") : "bg-gray-100")}>
                                            <p className="text-xs font-mono font-bold mb-1 uppercase">Selisih</p>
                                            <p className={cn("text-xl font-display font-bold", difference > 0 ? "text-green-600" : "text-red-600")}>
                                                {difference > 0 && "+"}{formatCurrency(difference)}
                                            </p>
                                        </div>
                                    )}

                                    {hasDifference && actualCashNum > 0 && (
                                        <Button
                                            onClick={handleCashReconciliation}
                                            disabled={isSubmitting}
                                            className="w-full bg-brand-orange hover:bg-brand-orange/90 text-brand-black font-bold py-3 text-sm border-2 border-brand-black rounded-none"
                                        >
                                            <Save className="w-4 h-4 mr-1" />
                                            {isSubmitting ? 'Menyimpan...' : 'Simpan Penyesuaian'}
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            )}

            {/* RETAIL MODE - Stock Reconciliation */}
            {opnameMode === 'retail' && (
                <div className="space-y-3">
                    {/* Quick Filters - Sticky */}
                    <div className="sticky top-[65px] md:top-[65px] bg-white z-10 space-y-2 pb-2 border-b-2 border-brand-black">
                        <div className="flex gap-2">
                            <div className="flex-1 relative" id="tour-opname-search">
                                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                <Input
                                    type="text"
                                    placeholder="Cari produk..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="border-2 border-brand-black rounded-none font-mono pl-8 h-9 text-sm"
                                />
                            </div>
                            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                                <SelectTrigger className="w-24 h-9 border-2 border-brand-black rounded-none font-mono text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="border-2 border-brand-black rounded-none">
                                    <SelectItem value="all">Semua</SelectItem>
                                    {categories.filter(c => c !== 'all').map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex gap-2">
                                <Button
                                    id="tour-opname-system-toggle"
                                    onClick={() => setShowSystemStock(!showSystemStock)}
                                    variant="ghost"
                                    className="h-7 px-2 text-xs font-mono"
                                >
                                    {showSystemStock ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                                    {showSystemStock ? 'Sembunyi' : 'Tampil'} Sistem
                                </Button>
                                <Button
                                    onClick={() => setShowOnlyUncounted(!showOnlyUncounted)}
                                    variant="ghost"
                                    className={cn("h-7 px-2 text-xs font-mono", showOnlyUncounted ? "bg-blue-100" : "")}
                                >
                                    <Layers className="w-3 h-3 mr-1" />
                                    {showOnlyUncounted ? 'Semua' : 'Belum'}
                                </Button>
                            </div>

                            <div className="flex items-center gap-3">
                                {productsWithDifference.length > 0 && (
                                    <Button
                                        onClick={handleStockReconciliation}
                                        disabled={isSubmitting}
                                        size="sm"
                                        className="h-8 bg-brand-orange hover:bg-brand-orange/90 text-brand-black font-bold text-xs border-2 border-brand-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] transition-all animate-in fade-in zoom-in duration-300"
                                    >
                                        <Save className="w-3 h-3 mr-1" />
                                        Simpan ({productsWithDifference.length})
                                    </Button>
                                )}
                                <span className="text-xs font-mono text-muted-foreground">
                                    {totalCounted}/{products.length}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Compact Product List */}
                    <div className="md:hidden space-y-1">
                        {paginatedProducts.map((product, index) => {
                            const diff = getStockDifference(product);
                            const hasDiff = diff !== null && diff !== 0;

                            return (
                                <div
                                    key={product.id}
                                    className={cn(
                                        "flex items-center gap-2 p-2 border-2 border-brand-black",
                                        hasDiff
                                            ? diff! > 0 ? "bg-green-50 border-green-500" : "bg-red-50 border-red-500"
                                            : stockCounts[product.id] !== undefined ? "bg-blue-50" : "bg-white"
                                    )}
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-xs truncate">{product.name}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono truncate">{product.category}</p>
                                    </div>

                                    {showSystemStock && (
                                        <div className="text-center w-10">
                                            <p className="text-[10px] text-muted-foreground font-mono leading-tight">Sistem</p>
                                            <p className="font-mono font-bold text-xs">{product.totalStock}</p>
                                        </div>
                                    )}

                                    <div className="w-20">
                                        <Input
                                            type="number"
                                            ref={(el) => el ? inputRefs.current[product.id] = el : null}
                                            value={stockCounts[product.id] ?? ''}
                                            onChange={(e) => handleStockCountChange(product.id, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(e, product.id)}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            placeholder="-"
                                            className={cn(
                                                "border-2 rounded-none font-mono text-center h-7 text-xs",
                                                hasDiff
                                                    ? diff! > 0 ? "border-green-500" : "border-red-500"
                                                    : "border-brand-black"
                                            )}
                                        />
                                    </div>

                                    <div className="w-8 text-center">
                                        {diff !== null ? (
                                            <div className={cn("font-mono font-bold text-xs", diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-500")}>
                                                {diff === 0 ? <Check className="w-4 h-4 mx-auto" /> : diff}
                                            </div>
                                        ) : (
                                            <span className="text-muted-foreground text-xs">-</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {filteredProducts.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground font-mono text-sm">
                                Tidak ada produk ditemukan
                            </div>
                        )}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block border-2 border-brand-black bg-white rounded overflow-hidden">
                        <table className="w-full table-fixed">
                            <thead className="bg-brand-orange/20">
                                <tr>
                                    <th className="text-left p-3 font-mono font-bold text-xs uppercase w-[50%]">Produk</th>
                                    {showSystemStock && (
                                        <th className="text-center p-3 font-mono font-bold text-xs uppercase w-[12%]">Sistem</th>
                                    )}
                                    <th className="text-center p-3 font-mono font-bold text-xs uppercase w-[20%]">Fisik</th>
                                    <th className="text-center p-3 font-mono font-bold text-xs uppercase w-[18%]">Selisih</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedProducts.map((product) => {
                                    const diff = getStockDifference(product);
                                    const hasDiff = diff !== null && diff !== 0;

                                    return (
                                        <tr key={product.id} className={cn("border-b border-brand-black/10 hover:bg-brand-orange/5 transition-colors", hasDiff ? (diff! > 0 ? "bg-green-50" : "bg-red-50") : "")}>
                                            <td className="p-3">
                                                <p className="font-mono font-bold text-sm truncate">{product.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{product.category}</p>
                                            </td>
                                            {showSystemStock && (
                                                <td className="p-3 text-center">
                                                    <span className="font-mono font-bold text-sm bg-gray-100 px-3 py-1 rounded border border-gray-300">{product.totalStock}</span>
                                                </td>
                                            )}
                                            <td className="p-3">
                                                <div className="flex justify-center">
                                                    <Input
                                                        type="number"
                                                        ref={(el) => el ? inputRefs.current[product.id] = el : null}
                                                        value={stockCounts[product.id] ?? ''}
                                                        onChange={(e) => handleStockCountChange(product.id, e.target.value)}
                                                        onKeyDown={(e) => handleKeyDown(e, product.id)}
                                                        onWheel={(e) => e.currentTarget.blur()}
                                                        placeholder="0"
                                                        className={cn(
                                                            "border-2 rounded-none font-mono text-center h-9 text-sm w-24",
                                                            hasDiff
                                                                ? diff! > 0 ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
                                                                : stockCounts[product.id] !== undefined ? "border-blue-500 bg-blue-50" : "border-brand-black"
                                                        )}
                                                    />
                                                </div>
                                            </td>
                                            <td className="p-3 text-center">
                                                {diff !== null ? (
                                                    <div className={cn("font-mono font-bold text-sm inline-flex items-center gap-1", diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-500")}>
                                                        {diff === 0 ? <Check className="w-4 h-4" /> : (
                                                            <span className={cn("px-2 py-0.5 rounded", diff > 0 ? "bg-green-100" : "bg-red-100")}>
                                                                {diff > 0 ? '+' : ''}{diff}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">-</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between py-2 border-t-2 border-brand-black">
                            <div className="text-xs font-mono text-muted-foreground">
                                Hal {currentPage} dari {totalPages}
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                    className="h-8 w-8 border-2 border-brand-black rounded-none"
                                >
                                    <ChevronUp className="w-4 h-4" />
                                </Button>
                                <Select
                                    value={`${itemsPerPage}`}
                                    onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}
                                >
                                    <SelectTrigger className="h-8 w-16 border-2 border-brand-black rounded-none font-mono text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="border-2 border-brand-black rounded-none">
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage >= totalPages}
                                    className="h-8 w-8 border-2 border-brand-black rounded-none"
                                >
                                    <ChevronDown className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Estimated Sales from Stock Decrease */}
                    {soldItems.length > 0 && (
                        <div className="space-y-2">
                            <div className="p-4 bg-red-50 border-2 border-red-500">
                                <p className="font-mono font-bold text-sm text-red-800 mb-1">
                                    Estimasi Penjualan dari Stok Berkurang:
                                </p>
                                <p className="text-2xl font-display font-bold text-red-700">
                                    {formatCurrency(totalStockValue)}
                                </p>
                                <p className="font-mono text-xs text-red-600 mt-1">
                                    {soldItems.length} produk × total {Math.round(soldItems.reduce((sum, p) => {
                                        const diff = Math.abs(getStockDifference(p) || 0);
                                        const qtyPerUnit = p.qtyPerUnit || 1;
                                        return sum + (diff / qtyPerUnit);
                                    }, 0) * 100) / 100} unit
                                </p>
                            </div>

                            {/* Per-product breakdown */}
                            <div className="border-2 border-brand-black bg-white">
                                {soldItems.map((p) => {
                                    const diff = Math.abs(getStockDifference(p) || 0);
                                    const qtyPerUnit = p.qtyPerUnit || 1;
                                    const unitsSold = diff / qtyPerUnit;
                                    const value = Math.round(unitsSold * p.price);
                                    return (
                                        <div key={p.id} className="flex justify-between items-center p-2 border-b border-brand-black/10 text-xs font-mono">
                                            <div>
                                                <span className="font-bold">{p.name}</span>
                                                {qtyPerUnit > 1 && (
                                                    <span className="text-muted-foreground ml-1">({qtyPerUnit} pcs/unit)</span>
                                                )}
                                            </div>
                                            <div className="text-right">
                                                <span className="text-red-600 font-bold">
                                                    {qtyPerUnit > 1
                                                        ? `${diff} pcs (${unitsSold.toFixed(1)} unit)`
                                                        : `${diff} unit`
                                                    }
                                                </span>
                                                <span className="text-muted-foreground mx-1">×</span>
                                                <span>{formatCurrency(p.price)}</span>
                                                <span className="text-muted-foreground mx-1">=</span>
                                                <span className="font-bold text-red-700">{formatCurrency(value)}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                </div>
            )}

            {/* Sticky Bottom Action Bar - Mobile Only */}
            <div className="fixed bottom-16 left-0 right-0 bg-white border-t-2 border-brand-black p-3 md:hidden z-20 shadow-lg">
                {opnameMode === 'retail' && productsWithDifference.length > 0 && (
                    <Button
                        onClick={handleStockReconciliation}
                        disabled={isSubmitting}
                        className="w-full bg-brand-orange hover:bg-brand-orange/90 text-brand-black font-bold py-3 text-sm border-2 border-brand-black rounded-none"
                    >
                        <Save className="w-4 h-4 mr-2" />
                        {isSubmitting ? 'Menyimpan...' : `Simpan ${productsWithDifference.length} Penyesuaian`}
                    </Button>
                )}
            </div>
            {/* Add AlertDialog at the end of the component */}
            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent className="border-2 border-brand-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-6 gap-6">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-bold text-xl">Konfirmasi Penyesuaian Stok</AlertDialogTitle>
                        <AlertDialogDescription className="text-base text-gray-700">
                            <span className="font-bold">{productsWithDifference.length} produk</span> akan disesuaikan stoknya.
                            <br />
                            Tindakan ini akan mempengaruhi stok sistem dan mencatat selisih sebagai penjualan/koreksi.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-3 sm:gap-0">
                        <AlertDialogCancel className="border-2 border-brand-black bg-white text-brand-black font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all">
                            Batal
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmStockReconciliation}
                            className="bg-brand-orange text-brand-black font-bold border-2 border-brand-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-brand-orange/90 hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
                        >
                            Ya, Simpan
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
