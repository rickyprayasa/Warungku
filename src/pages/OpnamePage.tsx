import { useState, useEffect } from 'react';
import { useWarungStore } from '@/lib/store';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Save, Wallet, TrendingUp, TrendingDown, DollarSign, Plus, Calendar, History as HistoryIcon } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { CashEntry } from '@shared/types';

export function OpnamePage() {
    const navigate = useNavigate();
    const sales = useWarungStore((state) => state.sales);
    const purchases = useWarungStore((state) => state.purchases);
    const initialBalance = useWarungStore((state) => state.initialBalance);
    const fetchSales = useWarungStore((state) => state.fetchSales);
    const fetchPurchases = useWarungStore((state) => state.fetchPurchases);

    const [actualCash, setActualCash] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Cash Entry state
    const [dailyCashAmount, setDailyCashAmount] = useState<string>('');
    const [cashEntries, setCashEntries] = useState<CashEntry[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        fetchSales();
        fetchPurchases();
        loadCashEntries();
    }, [fetchSales, fetchPurchases]);

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
    const hasDifference = Math.abs(difference) > 0.01; // Tolerance for floating point

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

    const handleSubmit = async () => {
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

            // Create adjustment sale
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

            // Refresh data
            await fetchSales();

        } catch (error) {
            console.error(error);
            toast.error('Gagal menyimpan rekonsiliasi.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h3 className="text-2xl font-display font-bold text-brand-black mb-2">Rekonsiliasi Kas</h3>
                <p className="text-muted-foreground font-mono text-sm">
                    Hitung uang di laci dan cocokkan dengan sistem. Selisih akan disesuaikan otomatis.
                </p>
            </div>

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
                                    onClick={handleSubmit}
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
        </div>
    );
}
