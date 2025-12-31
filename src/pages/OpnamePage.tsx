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
import type { CashEntry, Product } from '@shared/types';
import { CardGridSkeleton, FormSkeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type OpnameMode = 'display' | 'retail' | 'terpadu';

export function OpnamePage() {
    const sales = useWarungStore((state) => state.sales);
    const purchases = useWarungStore((state) => state.purchases);
    const products = useWarungStore((state) => state.products);
    const initialBalance = useWarungStore((state) => state.initialBalance);
    const isLoading = useWarungStore((state) => state.isLoading);
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
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);
    const [showSystemStock, setShowSystemStock] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [showOnlyUncounted, setShowOnlyUncounted] = useState(false);
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
        
        // Auto-focus next input
        const productIndex = paginatedProducts.findIndex(p => p.id === productId);
        if (productIndex < paginatedProducts.length - 1) {
            const nextProduct = paginatedProducts[productIndex + 1];
            if (nextProduct && inputRefs.current[nextProduct.id]) {
                inputRefs.current[nextProduct.id].focus();
            }
        }
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
                
                // Adjust stock to counted value
                await fetch(`/api/products/${product.id}/adjust-stock`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        quantity: newStock,
                        unitCost: product.price * 0.7,
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
    
    if (isLoading) {
        return (
            <div className="space-y-4">
                <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
                <CardGridSkeleton cols={2} />
                <FormSkeleton />
            </div>
        );
    }
    
    return (
        <div className="space-y-4 pb-32 md:pb-4">
            {/* Header - Compact */}
            <div className="sticky top-0 bg-white z-10 pb-2 border-b-2 border-brand-black">
                <h3 className="text-xl md:text-2xl font-display font-bold text-brand-black">
                    {opnameMode === 'display' ? 'Rekonsiliasi Kas' : 'Hitung Stok Fisik'}
                </h3>
            </div>
            
            {/* DISPLAY MODE - Cash Reconciliation */}
            {opnameMode === 'display' && (
                <div className="space-y-4">
                    <Tabs defaultValue="input" className="w-full">
                        <TabsList className="grid grid-cols-3 w-full h-10 mb-3">
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
                                <CardContent className="px-3 pb-3 space-y-2">
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
                            <div className="flex-1 relative">
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
                                <span className="text-xs font-mono">
                                    <span className="text-muted-foreground">{totalCounted}/{products.length}</span>
                                </span>
                                {productsWithDifference.length > 0 && (
                                    <div className="flex items-center gap-1 px-2 py-1 bg-red-100 border-2 border-red-500 rounded">
                                        <AlertTriangle className="w-3 h-3 text-red-600" />
                                        <span className="text-xs font-mono font-bold text-red-700">{productsWithDifference.length}</span>
                                    </div>
                                )}
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
                        <table className="w-full">
                            <thead className="bg-brand-orange/20">
                                <tr>
                                    <th className="text-left p-2 font-mono font-bold text-xs">Produk</th>
                                    {showSystemStock && (
                                        <th className="text-center p-2 font-mono font-bold text-xs">Sistem</th>
                                    )}
                                    <th className="text-center p-2 font-mono font-bold text-xs">Fisik</th>
                                    <th className="text-center p-2 font-mono font-bold text-xs">Selisih</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedProducts.map((product) => {
                                    const diff = getStockDifference(product);
                                    const hasDiff = diff !== null && diff !== 0;
                                    
                                    return (
                                        <tr key={product.id} className={cn("border-b border-brand-black/10", hasDiff ? (diff! > 0 ? "bg-green-50" : "bg-red-50") : "")}>
                                            <td className="p-2">
                                                <p className="font-mono font-bold text-sm truncate">{product.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{product.category}</p>
                                            </td>
                                            {showSystemStock && (
                                                <td className="p-2 text-center">
                                                    <span className="font-mono font-bold text-sm">{product.totalStock}</span>
                                                </td>
                                            )}
                                            <td className="p-2">
                                                <Input
                                                    type="number"
                                                    ref={(el) => el ? inputRefs.current[product.id] = el : null}
                                                    value={stockCounts[product.id] ?? ''}
                                                    onChange={(e) => handleStockCountChange(product.id, e.target.value)}
                                                    onKeyDown={(e) => handleKeyDown(e, product.id)}
                                                    onWheel={(e) => e.currentTarget.blur()}
                                                    placeholder="Fisik"
                                                    className={cn(
                                                        "border-2 rounded-none font-mono text-center h-8 text-sm w-20",
                                                        hasDiff
                                                            ? diff! > 0 ? "border-green-500" : "border-red-500"
                                                            : "border-brand-black"
                                                    )}
                                                />
                                            </td>
                                            <td className="p-2 text-center">
                                                {diff !== null ? (
                                                    <div className={cn("font-mono font-bold text-sm", diff > 0 ? "text-green-600" : diff < 0 ? "text-red-600" : "text-gray-500")}>
                                                        {diff === 0 ? <Check className="w-4 h-4 mx-auto" /> : diff}
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
        </div>
    );
}
