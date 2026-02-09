import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from './ui/button';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Trash2, MessageSquare, CheckCircle, Clock, User, Eye, X, Printer, MessageCircle } from 'lucide-react';
import type { Sale } from '@shared/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { useWarungStore } from '@/lib/store';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { ReceiptTemplate, handleWhatsAppShare, handlePrintReceipt } from './ReceiptTemplate';

interface SalesDataTableProps {
  sales: Sale[];
}

export function SalesDataTable({ sales }: SalesDataTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const deleteSale = useWarungStore((state) => state.deleteSale);
  const confirmSale = useWarungStore((state) => state.confirmSale);
  const storeProfile = useWarungStore((state) => state.storeProfile);

  const pageCount = Math.ceil(sales.length / rowsPerPage);

  // Sort sales: pending first, then by date descending
  const sortedSales = useMemo(() => {
    return [...sales].sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return b.createdAt - a.createdAt;
    });
  }, [sales]);

  const paginatedSales = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return sortedSales.slice(start, end);
  }, [sortedSales, page, rowsPerPage]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('id-ID');
  };

  const calculateProfit = (sale: Sale) => {
    const totalCost = sale.items.reduce((sum, item) => sum + (item.cost * item.quantity), 0);
    return sale.total - totalCost;
  };

  const handleDelete = async (id: string) => {
    const promise = deleteSale(id);
    toast.promise(promise, {
      loading: 'Menghapus penjualan...',
      success: 'Penjualan berhasil dihapus! Stok dikembalikan.',
      error: (err) => err instanceof Error ? err.message : 'Gagal menghapus penjualan.',
    });
    setSelectedSale(null);
  };

  const handleConfirm = async (id: string) => {
    const promise = confirmSale(id);
    toast.promise(promise, {
      loading: 'Mengkonfirmasi pesanan...',
      success: 'Pesanan berhasil dikonfirmasi!',
      error: (err) => err instanceof Error ? err.message : 'Gagal mengkonfirmasi pesanan.',
    });
    await promise;
    setSelectedSale(null);
  };

  if (sales.length === 0) {
    return (
      <div className="text-center border-2 border-dashed border-brand-black p-12">
        <p className="font-mono text-muted-foreground">Belum ada transaksi pada rentang tanggal ini.</p>
      </div>
    );
  }

  return (
    <>
      {/* Sale Detail Modal */}
      <Dialog open={!!selectedSale} onOpenChange={(open) => !open && setSelectedSale(null)}>
        <DialogContent className="max-w-lg rounded-none border-4 border-brand-black p-0 max-h-[90vh] overflow-y-auto">
          {selectedSale && (
            <>
              <DialogHeader className="p-4 bg-brand-orange border-b-4 border-brand-black">
                <DialogTitle className="font-display font-bold text-xl flex items-center gap-2">
                  📋 Detail Penjualan
                </DialogTitle>
                <p className="font-mono text-sm">{formatDate(selectedSale.createdAt)}</p>
              </DialogHeader>
              <div className="p-4 space-y-4">
                {/* Status & Total */}
                <div className="flex justify-between items-center">
                  <div>
                    {selectedSale.status === 'pending' ? (
                      <Badge className="bg-amber-500 text-white text-sm flex items-center gap-1 w-fit">
                        <Clock className="w-4 h-4" />
                        Pending
                      </Badge>
                    ) : (
                      <Badge className="bg-green-500 text-white text-sm flex items-center gap-1 w-fit">
                        <CheckCircle className="w-4 h-4" />
                        Selesai
                      </Badge>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-mono">Total</p>
                    <p className="font-bold text-xl font-mono">{formatCurrency(selectedSale.total)}</p>
                    <p className="text-sm text-green-600 font-mono">Profit: {formatCurrency(calculateProfit(selectedSale))}</p>
                  </div>
                </div>

                {/* Customer Details */}
                {(selectedSale.customerName || selectedSale.customerPhone || selectedSale.customerAddress) && (
                  <div className="p-3 bg-blue-50 border-l-4 border-blue-500">
                    <h4 className="font-bold mb-2 flex items-center gap-1 text-sm">
                      <User className="w-4 h-4" />
                      Detail Pembeli
                    </h4>
                    <div className="space-y-1 text-sm font-mono">
                      <p><span className="text-muted-foreground">Nama:</span> <strong>{selectedSale.customerName || '-'}</strong></p>
                      <p><span className="text-muted-foreground">No. HP:</span> <strong>{selectedSale.customerPhone || '-'}</strong></p>
                      <p><span className="text-muted-foreground">Alamat:</span> <strong>{selectedSale.customerAddress || '-'}</strong></p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedSale.notes && (
                  <div className="p-3 bg-purple-50 border-l-4 border-purple-500">
                    <h4 className="font-bold mb-1 flex items-center gap-1 text-sm">
                      <MessageSquare className="w-4 h-4" />
                      Catatan
                    </h4>
                    <p className="text-sm font-mono italic">{selectedSale.notes}</p>
                  </div>
                )}

                {/* Payment Proof */}
                {selectedSale.paymentProofUrl && (
                  <div className="p-3 bg-green-50 border-l-4 border-green-500">
                    <h4 className="font-bold mb-2 text-sm">📸 Bukti Transfer</h4>
                    <a
                      href={selectedSale.paymentProofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <img
                        src={selectedSale.paymentProofUrl}
                        alt="Bukti Transfer"
                        className="max-w-full max-h-48 object-contain border-2 border-brand-black hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    </a>
                    <p className="text-xs text-muted-foreground mt-1">Klik untuk memperbesar</p>
                  </div>
                )}

                {/* Items */}
                <div>
                  <h4 className="font-bold mb-2 text-sm">🛒 Item Penjualan</h4>
                  <div className="border-2 border-brand-black">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow>
                          <TableHead className="font-bold text-xs">Produk</TableHead>
                          <TableHead className="font-bold text-xs text-center">Jml</TableHead>
                          <TableHead className="font-bold text-xs text-right">Harga</TableHead>
                          <TableHead className="font-bold text-xs text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedSale.items.map((item, index) => (
                          <TableRow key={index} className="border-t border-brand-black/20">
                            <TableCell className="font-mono text-sm py-2">{item.productName}</TableCell>
                            <TableCell className="font-mono text-sm text-center py-2">{item.quantity}</TableCell>
                            <TableCell className="font-mono text-sm text-right py-2">{formatCurrency(item.price)}</TableCell>
                            <TableCell className="font-mono text-sm text-right font-bold py-2">{formatCurrency(item.price * item.quantity)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Receipt Section - Shown when showReceipt is true */}
                {showReceipt && (
                  <div className="border-t-2 border-brand-black/20 pt-4">
                    <ReceiptTemplate
                      sale={selectedSale}
                      storeName={storeProfile.name || 'Toko'}
                      storeAddress={storeProfile.address}
                      storePhone={storeProfile.phone}
                      storeLogo={storeProfile.logoUrl}
                    />
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col gap-2 pt-2 border-t-2 border-brand-black/20">
                  {/* Print & Share Row */}
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setShowReceipt(true);
                        // Small delay to ensure receipt is rendered
                        setTimeout(() => handlePrintReceipt(), 100);
                      }}
                      className="flex-1 bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold hover:bg-orange-400"
                    >
                      <Printer className="w-4 h-4 mr-2" />
                      Cetak Struk
                    </Button>
                    <Button
                      onClick={async () => {
                        await handleWhatsAppShare(
                          selectedSale,
                          storeProfile.name || 'Toko',
                          storeProfile.address,
                          storeProfile.phone
                        );
                      }}
                      className="flex-1 bg-green-500 text-white border-2 border-brand-black rounded-none font-bold hover:bg-green-600"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                  </div>

                  {/* Confirm & Delete Row */}
                  <div className="flex gap-2">
                    {selectedSale.status === 'pending' && (
                      <Button
                        onClick={() => handleConfirm(selectedSale.id)}
                        className="flex-1 bg-blue-500 text-white rounded-none font-bold hover:bg-blue-600"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Konfirmasi
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="flex-1 rounded-none border-2 border-destructive text-destructive hover:bg-destructive/10">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Hapus
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent className="rounded-none border-4 border-brand-black">
                        <AlertDialogHeader>
                          <AlertDialogTitle>Hapus Penjualan?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tindakan ini akan menghapus data penjualan dan <strong>mengembalikan stok barang</strong> ke gudang.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="rounded-none border-2 border-brand-black">Batal</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(selectedSale.id)} className="rounded-none bg-destructive">Hapus</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Desktop Table View */}
      <div className="hidden md:block border-4 border-brand-black bg-brand-white overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader className="border-b-4 border-brand-black bg-muted/40">
            <TableRow>
              <TableHead className="font-bold text-brand-black">Tanggal</TableHead>
              <TableHead className="font-bold text-brand-black">Pembeli</TableHead>
              <TableHead className="font-bold text-brand-black">Status</TableHead>
              <TableHead className="font-bold text-brand-black">Item</TableHead>
              <TableHead className="font-bold text-brand-black text-right">Total Penjualan</TableHead>
              <TableHead className="font-bold text-brand-black text-right">Profit</TableHead>
              <TableHead className="font-bold text-brand-black">Catatan</TableHead>
              <TableHead className="font-bold text-brand-black text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSales.map((sale) => (
              <TableRow
                key={sale.id}
                className={`border-b-2 border-brand-black last:border-b-0 cursor-pointer hover:bg-muted/40 transition-colors ${sale.status === 'pending' ? 'bg-amber-50' : ''}`}
                onClick={() => setSelectedSale(sale)}
              >
                <TableCell className="font-mono">{formatDate(sale.createdAt)}</TableCell>
                <TableCell className="font-mono">
                  {sale.customerName ? (
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3 text-muted-foreground" />
                      <span className="truncate max-w-[120px]" title={`${sale.customerName}${sale.customerPhone ? ` - ${sale.customerPhone}` : ''}`}>
                        {sale.customerName}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {sale.status === 'pending' ? (
                    <Badge className="bg-amber-500 text-white text-xs flex items-center gap-1 w-fit">
                      <Clock className="w-3 h-3" />
                      Pending
                    </Badge>
                  ) : (
                    <Badge className="bg-green-500 text-white text-xs flex items-center gap-1 w-fit">
                      <CheckCircle className="w-3 h-3" />
                      Selesai
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="font-mono">
                  <div className="flex items-center gap-2">
                    <span>{sale.items.length}</span>
                    {sale.saleType === 'display' && (
                      <Badge className="bg-purple-500 text-white text-xs">📦 Display</Badge>
                    )}
                    {sale.paymentProofUrl && (
                      <Badge className="bg-green-100 text-green-700 text-xs">📸</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-right font-bold">{formatCurrency(sale.total)}</TableCell>
                <TableCell className="font-mono text-right font-bold text-green-600">{formatCurrency(calculateProfit(sale))}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground max-w-[200px]">
                  {sale.notes ? (
                    <span className="italic truncate block" title={sale.notes}>
                      {sale.notes.length > 50 ? `${sale.notes.substring(0, 50)}...` : sale.notes}
                    </span>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-center gap-1">
                    {sale.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={() => handleConfirm(sale.id)}
                        title="Konfirmasi Pesanan"
                      >
                        <CheckCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                      onClick={() => setSelectedSale(sale)}
                      title="Lihat Detail"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {paginatedSales.map((sale) => (
          <div
            key={sale.id}
            className={`border-4 border-brand-black bg-brand-white shadow-hard-sm p-3 cursor-pointer hover:shadow-hard transition-shadow ${sale.status === 'pending' ? 'bg-amber-50' : ''}`}
            onClick={() => setSelectedSale(sale)}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-mono">{formatDate(sale.createdAt)}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-bold text-lg font-mono">{sale.items.length} Item</span>
                  {sale.saleType === 'display' && (
                    <Badge className="bg-purple-500 text-white text-xs">📦</Badge>
                  )}
                  {sale.paymentProofUrl && (
                    <Badge className="bg-green-100 text-green-700 text-xs">📸</Badge>
                  )}
                </div>
                {sale.customerName && (
                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {sale.customerName}
                  </p>
                )}
              </div>
              <div>
                {sale.status === 'pending' ? (
                  <Badge className="bg-amber-500 text-white text-xs">Pending</Badge>
                ) : (
                  <Badge className="bg-green-500 text-white text-xs">Selesai</Badge>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground font-mono">Total</p>
                <p className="font-bold font-mono text-lg">{formatCurrency(sale.total)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-mono">Profit</p>
                <p className="font-bold font-mono text-lg text-green-600">{formatCurrency(calculateProfit(sale))}</p>
              </div>
            </div>

            {sale.notes && (
              <div className="mt-2 p-2 bg-blue-50/50 border-l-4 border-blue-500 rounded-r">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs italic text-muted-foreground font-mono leading-relaxed line-clamp-2">{sale.notes}</p>
                </div>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full mt-3 border-2 border-brand-black rounded-none font-mono font-bold hover:bg-brand-orange"
            >
              <Eye className="h-4 w-4 mr-1" />
              Lihat Detail
            </Button>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-end space-x-2 py-4 font-mono">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Baris per halaman</p>
          <Select
            value={`${rowsPerPage}`}
            onValueChange={(value) => {
              setRowsPerPage(Number(value))
              setPage(0)
            }}
          >
            <SelectTrigger className="h-8 w-[70px] rounded-none border-2 border-brand-black"><SelectValue placeholder={String(rowsPerPage)} /></SelectTrigger>
            <SelectContent side="top" className="rounded-none border-2 border-brand-black">
              {[5, 10, 20].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>{pageSize}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Halaman {page + 1} dari {pageCount}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex rounded-none border-2 border-brand-black" onClick={() => setPage(0)} disabled={page === 0}><span className="sr-only">Go to first page</span><ChevronsLeft className="h-4 w-4" /></Button>
          <Button variant="outline" className="h-8 w-8 p-0 rounded-none border-2 border-brand-black" onClick={() => setPage(page - 1)} disabled={page === 0}><span className="sr-only">Go to previous page</span><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" className="h-8 w-8 p-0 rounded-none border-2 border-brand-black" onClick={() => setPage(page + 1)} disabled={page >= pageCount - 1}><span className="sr-only">Go to next page</span><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex rounded-none border-2 border-brand-black" onClick={() => setPage(pageCount - 1)} disabled={page >= pageCount - 1}><span className="sr-only">Go to last page</span><ChevronsRight className="h-4 w-4" /></Button>
        </div>
      </div>
    </>
  );
}