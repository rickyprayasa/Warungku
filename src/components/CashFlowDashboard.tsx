import { useWarungStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, TrendingDown, Scale, ArrowRight, ArrowLeft, MoreVertical, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from "lucide-react";
import { useMemo, useState } from "react";
import type { Sale, Purchase } from '@shared/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CardGridSkeleton, TableRowSkeleton, TableHeaderSkeleton } from '@/components/ui/skeleton';

interface Transaction {
  id: string;
  type: 'Sale' | 'Purchase';
  date: number;
  amount: number;
  description: string;
  details: Sale | Purchase;
}

export function CashFlowDashboard() {
  const sales = useWarungStore((state) => state.sales);
  const purchases = useWarungStore((state) => state.purchases);
  const isLoading = useWarungStore((state) => state.isLoading);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
      details: s
    }));
    const purchaseTransactions: Transaction[] = purchases.map(p => ({
      id: p.id,
      type: 'Purchase',
      date: p.createdAt,
      amount: p.totalCost,
      description: `${p.productName}`,
      details: p
    }));
    return [...saleTransactions, ...purchaseTransactions].sort((a, b) => b.date - a.date);
  }, [sales, purchases]);

  const totalPages = Math.ceil(combinedTransactions.length / itemsPerPage);
  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return combinedTransactions.slice(start, end);
  }, [combinedTransactions, currentPage, itemsPerPage]);

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

  const kpiData = [
    { title: "Total Uang Masuk", value: formatCurrency(cashIn), icon: TrendingUp, color: "text-green-600", bgColor: "bg-green-100" },
    { title: "Total Uang Keluar", value: formatCurrency(cashOut), icon: TrendingDown, color: "text-red-600", bgColor: "bg-red-100" },
    { title: "Arus Kas Bersih", value: formatCurrency(netFlow), icon: Scale, color: "text-blue-600", bgColor: "bg-blue-100" },
  ];

  const TransactionDetailDialog = ({ transaction }: { transaction: Transaction }) => {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <button className="p-1 rounded hover:bg-gray-200 transition-colors">
            <MoreVertical className="w-4 h-4 text-brand-black" />
          </button>
        </DialogTrigger>
        <DialogContent className="rounded-none border-2 border-brand-black max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-brand-black">Detail Transaksi</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {transaction.type === 'Sale' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-mono text-sm text-muted-foreground">ID Penjualan</p>
                    <p className="font-mono font-bold">{(transaction.details as Sale).id}</p>
                  </div>
                  <div>
                    <p className="font-mono text-sm text-muted-foreground">Tanggal</p>
                    <p className="font-mono font-bold">{formatDateTime((transaction.details as Sale).createdAt)}</p>
                  </div>
                </div>
                <div>
                  <p className="font-mono text-sm text-muted-foreground">Catatan</p>
                  <p className="font-mono font-bold">{(transaction.details as Sale).notes || '-'}</p>
                </div>
                <div>
                  <p className="font-mono text-sm text-muted-foreground">Jenis Penjualan</p>
                  <p className="font-mono font-bold">{(transaction.details as Sale).saleType === 'display' ? 'Display/Etalase' : 'Eceran'}</p>
                </div>
                <div className="border-t border-brand-black pt-4">
                  <h6 className="font-bold font-mono text-brand-black mb-3">Item yang Dijual</h6>
                  <div className="space-y-2">
                    {(transaction.details as Sale).items.map((item, idx) => (
                      <div key={idx} className="flex justify-between border-b border-gray-200 pb-2">
                        <div>
                          <p className="font-mono">{item.productName}</p>
                          <p className="font-mono text-sm text-muted-foreground">{item.quantity} x {formatCurrency(item.price)}</p>
                        </div>
                        <p className="font-mono font-bold">{formatCurrency(item.quantity * item.price)}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-bold mt-3 pt-3 border-t border-brand-black text-lg">
                    <span className="font-mono">Total</span>
                    <span className="font-mono">{formatCurrency((transaction.details as Sale).total)}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-mono text-sm text-muted-foreground">ID Pembelian</p>
                    <p className="font-mono font-bold">{(transaction.details as Purchase).id}</p>
                  </div>
                  <div>
                    <p className="font-mono text-sm text-muted-foreground">Tanggal</p>
                    <p className="font-mono font-bold">{formatDateTime((transaction.details as Purchase).createdAt)}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="font-mono text-sm text-muted-foreground">Nama Produk</p>
                    <p className="font-mono font-bold">{(transaction.details as Purchase).productName}</p>
                  </div>
                  <div>
                    <p className="font-mono text-sm text-muted-foreground">Supplier</p>
                    <p className="font-mono font-bold">{(transaction.details as Purchase).supplier || '-'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="font-mono text-sm text-muted-foreground">Jumlah</p>
                    <p className="font-mono font-bold">{(transaction.details as Purchase).quantity}</p>
                  </div>
                  <div>
                    <p className="font-mono text-sm text-muted-foreground">Harga Satuan</p>
                    <p className="font-mono font-bold">{formatCurrency((transaction.details as Purchase).unitCost)}</p>
                  </div>
                  <div>
                    <p className="font-mono text-sm text-muted-foreground">Total</p>
                    <p className="font-mono font-bold">{formatCurrency((transaction.details as Purchase).totalCost)}</p>
                  </div>
                </div>
                <div>
                  <p className="font-mono text-sm text-muted-foreground">Catatan</p>
                  <p className="font-mono font-bold">{(transaction.details as Purchase).notes || '-'}</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        <CardGridSkeleton cols={3} />
        <h4 className="text-xl font-display font-bold text-brand-black mb-4">Transaksi Terkini</h4>
        <TableHeaderSkeleton />
        <TableRowSkeleton rows={5} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h3 className="text-2xl font-display font-bold text-brand-black mb-2">Laporan Arus Kas</h3>
        <p className="font-mono text-sm text-muted-foreground">Analisis pergerakan uang masuk dan keluar.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-6">
        {kpiData.map((kpi, index) => (
          <Card key={index} className="border-2 border-brand-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-white relative overflow-hidden">
            <div className={`absolute top-0 right-0 p-2 ${kpi.bgColor} border-l-2 border-b-2 border-brand-black`}>
              <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
            </div>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 p-4 pt-6">
              <CardTitle className="text-xs font-mono font-bold uppercase">{kpi.title}</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="text-xl md:text-2xl font-bold font-display text-brand-black">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xl font-display font-bold text-brand-black">Transaksi Terkini</h4>
          {combinedTransactions.length > 0 && (
            <div className="flex items-center gap-2 font-mono text-sm">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-bold">{combinedTransactions.length}</span>
            </div>
          )}
        </div>

        {combinedTransactions.length === 0 ? (
          <div className="border-2 border-brand-black rounded-lg bg-white p-12 text-center">
            <p className="font-mono text-muted-foreground">Belum ada transaksi.</p>
          </div>
        ) : (
          <>
            <div className="md:hidden space-y-3">
              {paginatedTransactions.map((tx, index) => (
                <div key={`${tx.id}-${index}`} className="border-2 border-brand-black bg-white p-3 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`inline-flex items-center font-mono text-xs font-bold px-2 py-1 ${tx.type === 'Sale' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {tx.type === 'Sale' ? <ArrowLeft className="w-3 h-3 mr-1" /> : <ArrowRight className="w-3 h-3 mr-1" />}
                      {tx.type === 'Sale' ? "Masuk" : "Keluar"}
                    </span>
                    <TransactionDetailDialog transaction={tx} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-mono text-muted-foreground">📅 {formatDateTime(tx.date)}</span>
                      <span className={`font-mono font-bold text-base ${tx.type === 'Sale' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.type === 'Sale' ? '+' : '-'} {formatCurrency(tx.amount)}
                      </span>
                    </div>
                    <div className="text-sm font-mono text-muted-foreground">
                      {tx.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="hidden md:block border-4 border-brand-black bg-brand-white">
              <Table>
                <TableHeader className="border-b-4 border-brand-black bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[100px] font-bold text-brand-black">Tipe</TableHead>
                    <TableHead className="font-bold text-brand-black">Tanggal</TableHead>
                    <TableHead className="font-bold text-brand-black">Deskripsi</TableHead>
                    <TableHead className="font-bold text-brand-black text-right">Jumlah</TableHead>
                    <TableHead className="w-[50px] font-bold text-brand-black">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedTransactions.map((tx, index) => (
                    <TableRow key={`${tx.id}-${index}`} className="border-b-2 border-brand-black last:border-b-0">
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
                      <TableCell className="align-middle">
                        <TransactionDetailDialog transaction={tx} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 p-4 border-2 border-brand-black bg-white rounded-lg">
                <div className="flex items-center gap-2 font-mono text-sm">
                  <span className="text-muted-foreground">Menampilkan</span>
                  <span className="font-bold">
                    {(currentPage - 1) * itemsPerPage + 1}
                  </span>
                  <span className="text-muted-foreground">-</span>
                  <span className="font-bold">
                    {Math.min(currentPage * itemsPerPage, combinedTransactions.length)}
                  </span>
                  <span className="text-muted-foreground">dari {combinedTransactions.length} transaksi</span>
                </div>

                <div className="flex items-center gap-2">
                  <Select
                    value={`${itemsPerPage}`}
                    onValueChange={(value) => {
                      setItemsPerPage(Number(value));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="h-8 w-[70px] rounded-none border-2 border-brand-black font-mono text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-2 border-brand-black">
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="h-8 w-8 rounded-none border-2 border-brand-black"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="h-8 w-8 rounded-none border-2 border-brand-black"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <div className="flex items-center justify-center w-12 h-8 border-2 border-brand-black bg-brand-orange font-mono font-bold text-sm">
                      {currentPage}
                    </div>

                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage >= totalPages}
                      className="h-8 w-8 rounded-none border-2 border-brand-black"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage >= totalPages}
                      className="h-8 w-8 rounded-none border-2 border-brand-black"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
