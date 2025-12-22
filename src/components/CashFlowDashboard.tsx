import { useWarungStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Scale, ArrowRight, ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";
import type { Sale, Purchase } from '@shared/types';

interface Transaction {
  id: string;
  type: 'Sale' | 'Purchase';
  date: number; // timestamp
  amount: number;
  description: string;
  details: Sale | Purchase;
}

export function CashFlowDashboard() {
  const sales = useWarungStore((state) => state.sales);
  const purchases = useWarungStore((state) => state.purchases);
  const { cashIn, cashOut, netFlow } = useMemo(() => {
    const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.totalCost, 0);
    return {
      cashIn: totalSales,
      cashOut: totalPurchases,
      netFlow: totalSales - totalPurchases,
    };
  }, [sales, purchases]);

  const combinedTransactions = useMemo(() => {
    const saleTransactions: Transaction[] = sales.map(s => ({
      id: s.id,
      type: 'Sale',
      date: s.createdAt,
      amount: s.total,
      description: `${s.items.length} item terjual`,
      details: s // Include full sale object for details
    }));
    const purchaseTransactions: Transaction[] = purchases.map(p => ({
      id: p.id,
      type: 'Purchase',
      date: p.createdAt,
      amount: p.totalCost,
      description: `${p.productName}`,
      details: p // Include full purchase object for details
    }));
    return [...saleTransactions, ...purchaseTransactions].sort((a, b) => b.date - a.date);
  }, [sales, purchases]);

  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const toggleRow = (id: string) => {
    setExpandedRow(expandedRow === id ? null : id);
  };

  const kpiData = [
    { title: "Total Uang Masuk", value: formatCurrency(cashIn), icon: TrendingUp },
    { title: "Total Uang Keluar", value: formatCurrency(cashOut), icon: TrendingDown },
    { title: "Arus Kas Bersih", value: formatCurrency(netFlow), icon: Scale },
  ];

  return (
    <div>
      <div className="mb-8">
        <h3 className="text-2xl font-display font-bold text-brand-black">Laporan Arus Kas</h3>
        <p className="font-mono text-sm text-muted-foreground">Analisis pergerakan uang masuk dan keluar.</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-8">
        {kpiData.map((kpi, index) => (
          <Card key={index} className="rounded-none border-2 border-brand-black shadow-hard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 p-3 md:p-6">
              <CardTitle className="text-[10px] md:text-sm font-mono font-bold uppercase truncate">{kpi.title}</CardTitle>
              <kpi.icon className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <div className="text-xl md:text-3xl font-bold font-display text-brand-orange">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <h4 className="text-xl font-display font-bold text-brand-black mb-4">Transaksi Terkini</h4>
      <div className="border-4 border-brand-black bg-brand-white">
        <Table>
          <TableHeader className="border-b-4 border-brand-black bg-muted/40">
            <TableRow>
              <TableHead className="w-[50px] font-bold text-brand-black">Aksi</TableHead>
              <TableHead className="w-[100px] font-bold text-brand-black">Tipe</TableHead>
              <TableHead className="font-bold text-brand-black">Tanggal</TableHead>
              <TableHead className="font-bold text-brand-black">Deskripsi</TableHead>
              <TableHead className="font-bold text-brand-black text-right">Jumlah</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {combinedTransactions.slice(0, 10).map((tx, index) => (
              <div key={`${tx.id}-${index}`}>
                <TableRow
                  className="border-b-2 border-brand-black last:border-b-0 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleRow(tx.id)}
                >
                  <TableCell className="align-middle">
                    <button
                      className="p-1 rounded hover:bg-gray-200 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRow(tx.id);
                      }}
                    >
                      {expandedRow === tx.id ? (
                        <ChevronUp className="w-4 h-4 text-brand-black" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-brand-black" />
                      )}
                    </button>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center font-mono text-xs font-bold px-2 py-1 ${tx.type === 'Sale' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {tx.type === 'Sale' ? <ArrowLeft className="w-3 h-3 mr-1" /> : <ArrowRight className="w-3 h-3 mr-1" />}
                      {tx.type === 'Sale' ? "Masuk" : "Keluar"}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{formatDateTime(tx.date)}</TableCell>
                  <TableCell className="font-mono text-sm">{tx.description}</TableCell>
                  <TableCell className={`font-mono text-right font-bold ${tx.type === 'Sale' ? 'text-green-600' : 'text-red-600'}`}>
                    {tx.type === 'Sale' ? '+' : '-'} {formatCurrency(tx.amount)}
                  </TableCell>
                </TableRow>

                {expandedRow === tx.id && (
                  <TableRow className="border-b-2 border-brand-black bg-gray-50">
                    <TableCell colSpan={5} className="p-4">
                      <div className="space-y-3">
                        <h5 className="font-bold font-mono text-brand-black border-b-2 border-brand-black pb-2">
                          Detail Transaksi
                        </h5>

                        {tx.type === 'Sale' ? (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="font-mono text-sm text-muted-foreground">ID Penjualan</p>
                                <p className="font-mono font-bold">{(tx.details as Sale).id}</p>
                              </div>
                              <div>
                                <p className="font-mono text-sm text-muted-foreground">Tanggal</p>
                                <p className="font-mono font-bold">{formatDateTime((tx.details as Sale).createdAt)}</p>
                              </div>
                            </div>

                            <div>
                              <p className="font-mono text-sm text-muted-foreground">Catatan</p>
                              <p className="font-mono font-bold">{(tx.details as Sale).notes || '-'}</p>
                            </div>

                            <div>
                              <p className="font-mono text-sm text-muted-foreground">Jenis Penjualan</p>
                              <p className="font-mono font-bold">{(tx.details as Sale).saleType === 'display' ? 'Display/Etalase' : 'Eceran'}</p>
                            </div>

                            <div className="border-t border-brand-black pt-2">
                              <h6 className="font-bold font-mono text-brand-black mb-2">Item yang Dijual</h6>
                              <div className="space-y-1">
                                {(tx.details as Sale).items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between border-b border-gray-200 pb-1">
                                    <span className="font-mono">{item.productName}</span>
                                    <span className="font-mono">
                                      {item.quantity} x {formatCurrency(item.price)} = {formatCurrency(item.quantity * item.price)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-between font-bold mt-2 pt-2 border-t border-brand-black">
                                <span className="font-mono">Total</span>
                                <span className="font-mono">{formatCurrency((tx.details as Sale).total)}</span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="font-mono text-sm text-muted-foreground">ID Pembelian</p>
                                <p className="font-mono font-bold">{(tx.details as Purchase).id}</p>
                              </div>
                              <div>
                                <p className="font-mono text-sm text-muted-foreground">Tanggal</p>
                                <p className="font-mono font-bold">{formatDateTime((tx.details as Purchase).createdAt)}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="font-mono text-sm text-muted-foreground">Nama Produk</p>
                                <p className="font-mono font-bold">{(tx.details as Purchase).productName}</p>
                              </div>
                              <div>
                                <p className="font-mono text-sm text-muted-foreground">Supplier</p>
                                <p className="font-mono font-bold">{(tx.details as Purchase).supplier || '-'}</p>
                              </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4">
                              <div>
                                <p className="font-mono text-sm text-muted-foreground">Jumlah</p>
                                <p className="font-mono font-bold">{(tx.details as Purchase).quantity}</p>
                              </div>
                              <div>
                                <p className="font-mono text-sm text-muted-foreground">Harga Satuan</p>
                                <p className="font-mono font-bold">{formatCurrency((tx.details as Purchase).unitCost)}</p>
                              </div>
                              <div>
                                <p className="font-mono text-sm text-muted-foreground">Total</p>
                                <p className="font-mono font-bold">{formatCurrency((tx.details as Purchase).totalCost)}</p>
                              </div>
                            </div>

                            <div>
                              <p className="font-mono text-sm text-muted-foreground">Catatan</p>
                              <p className="font-mono font-bold">{(tx.details as Purchase).notes || '-'}</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </div>
            ))}
          </TableBody>
        </Table>
        {combinedTransactions.length === 0 && (
          <div className="text-center p-12">
            <p className="font-mono text-muted-foreground">Belum ada transaksi.</p>
          </div>
        )}
      </div>
    </div>
  );
}