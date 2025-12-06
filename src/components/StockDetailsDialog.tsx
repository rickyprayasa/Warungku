import { useEffect } from 'react';
import { useWarungStore } from '@/lib/store';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Calendar, DollarSign } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface StockDetailsDialogProps {
    productId: string;
    productName: string;
}

export function StockDetailsDialog({ productId, productName }: StockDetailsDialogProps) {
    const fetchStockDetails = useWarungStore((state) => state.fetchStockDetails);
    const stockDetails = useWarungStore((state) => state.stockDetails);
    const isLoading = useWarungStore((state) => state.isLoading);

    useEffect(() => {
        fetchStockDetails(productId);
    }, [productId, fetchStockDetails]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
        }).format(value);
    };

    const formatDate = (timestamp: number) => {
        return new Date(timestamp).toLocaleDateString('id-ID', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const totalStock = stockDetails.reduce((sum, s) => sum + s.quantity, 0);
    const avgCost = stockDetails.length > 0
        ? stockDetails.reduce((sum, s) => sum + s.unitCost * s.quantity, 0) / totalStock
        : 0;

    return (
        <div className="p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-display font-bold text-brand-black mb-2">Detail Stok</h2>
                <p className="font-mono text-muted-foreground">{productName}</p>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="border-2 border-brand-black p-4 bg-brand-white">
                    <div className="flex items-center gap-2 mb-2">
                        <Package className="w-5 h-5 text-brand-orange" />
                        <p className="text-xs font-mono uppercase text-muted-foreground">Total Stok</p>
                    </div>
                    <p className="text-2xl font-bold font-mono">{totalStock}</p>
                </div>
                <div className="border-2 border-brand-black p-4 bg-brand-white">
                    <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="w-5 h-5 text-brand-orange" />
                        <p className="text-xs font-mono uppercase text-muted-foreground">Avg. Cost</p>
                    </div>
                    <p className="text-2xl font-bold font-mono">{formatCurrency(avgCost)}</p>
                </div>
            </div>

            {/* Stock Batches Table */}
            <div className="border-2 border-brand-black">
                <div className="bg-brand-black text-brand-white p-3">
                    <h3 className="font-bold font-mono uppercase text-sm">Batch Stok (FIFO Order)</h3>
                </div>

                {isLoading ? (
                    <div className="p-4 space-y-2">
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                        <Skeleton className="h-8 w-full" />
                    </div>
                ) : stockDetails.length === 0 ? (
                    <div className="p-8 text-center">
                        <Package className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                        <p className="font-mono text-muted-foreground">Tidak ada stok tersedia</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="border-b-2 border-brand-black">
                                <TableHead className="font-mono font-bold">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-4 h-4" />
                                        Tanggal
                                    </div>
                                </TableHead>
                                <TableHead className="font-mono font-bold text-right">Qty</TableHead>
                                <TableHead className="font-mono font-bold text-right">Unit Cost</TableHead>
                                <TableHead className="font-mono font-bold text-right">Total</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {stockDetails.map((stock, index) => (
                                <TableRow key={stock.id} className="border-b-2 border-brand-black last:border-b-0">
                                    <TableCell className="font-mono text-sm">
                                        <div>
                                            <p className="font-bold">Batch #{index + 1}</p>
                                            <p className="text-xs text-muted-foreground">{formatDate(stock.createdAt)}</p>
                                        </div>
                                    </TableCell>
                                    <TableCell className="font-mono text-right font-bold">{stock.quantity}</TableCell>
                                    <TableCell className="font-mono text-right">{formatCurrency(stock.unitCost)}</TableCell>
                                    <TableCell className="font-mono text-right font-bold text-brand-orange">
                                        {formatCurrency(stock.unitCost * stock.quantity)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </div>

            <div className="mt-4 p-3 bg-muted/50 border-2 border-dashed border-brand-black">
                <p className="text-xs font-mono text-muted-foreground">
                    <span className="font-bold">Info:</span> Stok menggunakan metode FIFO (First In, First Out).
                    Batch yang masuk pertama akan keluar pertama saat penjualan.
                </p>
            </div>
        </div>
    );
}
