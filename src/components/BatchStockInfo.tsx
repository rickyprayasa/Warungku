import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Layers, Calendar, Package, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import type { StockDetail } from '@shared/types';
import { cn } from '@/lib/utils';

interface BatchStockInfoProps {
  productId: string;
  productName: string;
  totalStock: number;
  stockMethod?: 'FIFO' | 'LIFO';
  className?: string;
}

export function BatchStockInfo({ productId, productName, totalStock, stockMethod = 'FIFO', className }: BatchStockInfoProps) {
  const [stockDetails, setStockDetails] = useState<StockDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadStockDetails();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const loadStockDetails = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/stock-details/${productId}`);
      if (res.ok) {
        const data = await res.json();
        // Assuming API returns sorted by createdAt DESC (newest first)
        setStockDetails(data.data || []);
      } else {
        console.error('Failed to load stock details:', res.status);
        setStockDetails([]);
      }
    } catch (error) {
      console.error('Failed to load stock details:', error);
      setStockDetails([]);
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

  const calculateMetrics = () => {
    if (stockDetails.length === 0) return null;

    const totalValue = stockDetails.reduce((sum, batch) => sum + (batch.unitCost * batch.quantity), 0);
    const avgCost = totalValue / totalStock;
    const oldestBatch = stockDetails[stockDetails.length - 1];
    const newestBatch = stockDetails[0];
    const batchCount = stockDetails.length;

    return {
      totalValue,
      avgCost,
      oldestBatch,
      newestBatch,
      batchCount,
    };
  };

  const metrics = calculateMetrics();

  if (isLoading) {
    return (
      <Card className={cn("border-4 border-brand-black shadow-hard", className)}>
        <CardContent className="p-6">
          <p className="text-center text-muted-foreground font-mono">Loading batch info...</p>
        </CardContent>
      </Card>
    );
  }

  if (stockDetails.length === 0) {
    return (
      <Card className={cn("border-4 border-brand-black shadow-hard", className)}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Batch Stock Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 mx-auto text-yellow-600 mb-3" />
            <p className="text-muted-foreground font-mono">Tidak ada batch stock untuk produk ini</p>
            <p className="text-sm text-muted-foreground font-mono mt-2">
              Batch akan dibuat saat melakukan pembelian stok
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-4 border-brand-black shadow-hard", className)}>
      <CardHeader className="border-b-2 border-brand-black">
        <CardTitle className="flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Batch Stock Information - {productName}
        </CardTitle>
        <p className="text-sm text-muted-foreground font-mono mt-1">
          {stockMethod === 'FIFO'
            ? 'Sistem FIFO (First In First Out) - Stock terlama keluar lebih dulu'
            : 'Sistem LIFO (Last In First Out) - Stock terbaru keluar lebih dulu'
          }
        </p>
      </CardHeader>
      <CardContent className="p-6 space-y-6">
        {/* Metrics Summary */}
        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-3 border-2 border-brand-black bg-blue-50">
              <div className="flex items-center gap-2 mb-1">
                <Layers className="w-4 h-4 text-blue-600" />
                <p className="text-xs font-mono text-muted-foreground">Total Batch</p>
              </div>
              <p className="text-2xl font-bold font-mono">{metrics.batchCount}</p>
            </div>

            <div className="p-3 border-2 border-brand-black bg-green-50">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-green-600" />
                <p className="text-xs font-mono text-muted-foreground">Total Stock</p>
              </div>
              <p className="text-2xl font-bold font-mono">{totalStock}</p>
            </div>

            <div className="p-3 border-2 border-brand-black bg-orange-50">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-orange-600" />
                <p className="text-xs font-mono text-muted-foreground">Avg Cost</p>
              </div>
              <p className="text-lg font-bold font-mono">{formatCurrency(metrics.avgCost)}</p>
            </div>

            <div className="p-3 border-2 border-brand-black bg-purple-50">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-4 h-4 text-purple-600" />
                <p className="text-xs font-mono text-muted-foreground">Total Value</p>
              </div>
              <p className="text-lg font-bold font-mono">{formatCurrency(metrics.totalValue)}</p>
            </div>
          </div>
        )}

        {/* Batch List */}
        <div>
          <h3 className="font-bold text-lg mb-3 flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Detail Batch ({stockMethod} Order)
          </h3>
          <div className="space-y-3">
            {stockDetails.map((batch, index) => {
              const isNewest = index === 0;
              const isOldest = index === stockDetails.length - 1;
              const willSellNext = stockMethod === 'FIFO' ? isOldest : isNewest;

              return (
                <div
                  key={batch.id}
                  className={cn(
                    "p-4 border-2 border-brand-black transition-all",
                    willSellNext && "bg-yellow-50 border-yellow-600 border-3",
                    isNewest && !willSellNext && "bg-green-50",
                    !isNewest && !willSellNext && "bg-gray-50"
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={cn(
                          "rounded-none font-mono font-bold",
                          willSellNext && "bg-yellow-600 text-white",
                          isNewest && !willSellNext && "bg-green-600 text-white"
                        )}>
                          Batch #{stockDetails.length - index}
                        </Badge>
                        {willSellNext && (
                          <Badge className="rounded-none bg-yellow-500 text-brand-black border-2 border-yellow-600">
                            🔥 Akan Keluar Berikutnya
                          </Badge>
                        )}
                        {isNewest && !willSellNext && (
                          <Badge className="rounded-none bg-green-500 text-white">
                            ✨ Batch Terbaru
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground font-mono">
                        <Calendar className="w-4 h-4" />
                        <span>Dibuat: {formatDate(batch.createdAt)}</span>
                      </div>

                      {batch.expiryDate && (
                        <div className="flex items-center gap-2 text-sm text-red-600 font-mono mt-1">
                          <AlertTriangle className="w-4 h-4" />
                          <span>Expired: {formatDate(batch.expiryDate)}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <Package className="w-4 h-4" />
                        <span className="text-2xl font-bold font-mono">{batch.quantity}</span>
                        <span className="text-sm text-muted-foreground font-mono">unit</span>
                      </div>
                      <p className="text-sm text-muted-foreground font-mono mt-1">
                        @ {formatCurrency(batch.unitCost)}
                      </p>
                      <div className="mt-2 pt-2 border-t border-brand-black/20">
                        <p className="text-xs text-muted-foreground font-mono">Nilai Batch</p>
                        <p className="font-bold font-mono text-lg">
                          {formatCurrency(batch.quantity * batch.unitCost)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {batch.notes && (
                    <div className="mt-3 p-2 bg-white border border-brand-black/20">
                      <p className="text-xs font-mono text-muted-foreground">Catatan:</p>
                      <p className="text-sm font-mono">{batch.notes}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary Footer */}
        <div className="p-4 bg-brand-orange/20 border-2 border-brand-black">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-mono font-bold text-sm">TOTAL INVENTORY</p>
              <p className="text-xs text-muted-foreground font-mono mt-1">
                {stockDetails.length} batch • {totalStock} unit
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground font-mono">Nilai Total</p>
              <p className="text-2xl font-bold font-mono">
                {metrics && formatCurrency(metrics.totalValue)}
              </p>
            </div>
          </div>
        </div>

        {/* Method Explanation */}
        <div className="p-3 bg-blue-50 border-2 border-blue-200">
          <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
            <Layers className="w-4 h-4" />
            Tentang Sistem {stockMethod}
          </h4>
          <p className="text-xs text-muted-foreground font-mono leading-relaxed">
            {stockMethod === 'FIFO'
              ? 'Sistem FIFO (First In First Out) memastikan stok yang masuk lebih dulu akan keluar lebih dulu saat terjadi penjualan. Ini membantu mengurangi risiko produk kadaluarsa.'
              : 'Sistem LIFO (Last In First Out) memastikan stok yang masuk paling akhir akan keluar lebih dulu saat terjadi penjualan. Ini sering digunakan saat harga beli cenderung naik untuk menyesuaikan COGS dengan harga pasar terkini.'
            }
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
