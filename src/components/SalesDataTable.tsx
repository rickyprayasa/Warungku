import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from './ui/button';
import { ChevronDown, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Trash2, MessageSquare } from 'lucide-react';
import type { Sale } from '@shared/types';
import { motion } from 'framer-motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { useWarungStore } from '@/lib/store';
import { toast } from 'sonner';
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

interface SalesDataTableProps {
  sales: Sale[];
}

export function SalesDataTable({ sales }: SalesDataTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const deleteSale = useWarungStore((state) => state.deleteSale);

  const pageCount = Math.ceil(sales.length / rowsPerPage);
  const paginatedSales = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return sales.slice(start, end);
  }, [sales, page, rowsPerPage]);

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
      {/* Desktop Table View */}
      <div className="hidden md:block border-4 border-brand-black bg-brand-white overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader className="border-b-4 border-brand-black bg-muted/40">
            <TableRow>
              <TableHead className="w-[50px]"></TableHead>
              <TableHead className="font-bold text-brand-black">Tanggal</TableHead>
              <TableHead className="font-bold text-brand-black">Item</TableHead>
              <TableHead className="font-bold text-brand-black text-right">Total Penjualan</TableHead>
              <TableHead className="font-bold text-brand-black text-right">Profit</TableHead>
              <TableHead className="font-bold text-brand-black">Catatan</TableHead>
              <TableHead className="font-bold text-brand-black text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSales.map((sale) => (
              <Collapsible key={sale.id} asChild>
                <>
                  <TableRow className="border-b-2 border-brand-black last:border-b-0">
                    <TableCell>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="w-9 p-0 data-[state=open]:rotate-180 transition-transform">
                          <ChevronDown className="h-4 w-4" />
                          <span className="sr-only">Toggle</span>
                        </Button>
                      </CollapsibleTrigger>
                    </TableCell>
                    <TableCell className="font-mono">{formatDate(sale.createdAt)}</TableCell>
                    <TableCell className="font-mono">
                      <div className="flex items-center gap-2">
                        <span>{sale.items.length}</span>
                        {sale.saleType === 'display' && (
                          <Badge className="bg-purple-500 text-white text-xs">
                            📦 Display
                          </Badge>
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
                    <TableCell className="text-center">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-none border-4 border-brand-black">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Hapus Penjualan?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tindakan ini akan menghapus data penjualan dan <strong>mengembalikan stok barang</strong> ke gudang.
                              Tindakan ini tidak dapat dibatalkan.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-none border-2 border-brand-black">Batal</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleDelete(sale.id)} className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                  <CollapsibleContent asChild>
                    <motion.tr
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="bg-muted/40"
                    >
                      <td colSpan={7} className="p-0">
                        <div className="p-4">
                          <h4 className="font-bold mb-2">Detail Penjualan:</h4>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="font-bold text-brand-black">Produk</TableHead>
                                <TableHead className="font-bold text-brand-black">Jml</TableHead>
                                <TableHead className="font-bold text-brand-black">Harga</TableHead>
                                <TableHead className="font-bold text-brand-black">Biaya</TableHead>
                                <TableHead className="font-bold text-brand-black text-right">Subtotal</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {sale.items.map((item, index) => (
                                <TableRow key={index} className="border-0">
                                  <TableCell>{item.productName}</TableCell>
                                  <TableCell>{item.quantity}</TableCell>
                                  <TableCell>{formatCurrency(item.price)}</TableCell>
                                  <TableCell>{formatCurrency(item.cost)}</TableCell>
                                  <TableCell className="text-right">{formatCurrency(item.price * item.quantity)}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </td>
                    </motion.tr>
                  </CollapsibleContent>
                </>
              </Collapsible>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {paginatedSales.map((sale) => (
          <Collapsible key={sale.id}>
            <div className="border-4 border-brand-black bg-brand-white shadow-hard-sm">
              <div className="p-3">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground font-mono">{formatDate(sale.createdAt)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-bold text-lg font-mono">{sale.items.length} Item</span>
                      {sale.saleType === 'display' && (
                        <Badge className="bg-purple-500 text-white text-xs">📦 Display</Badge>
                      )}
                    </div>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 border-2 border-brand-black rounded-none text-destructive hover:bg-destructive/10">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-none border-4 border-brand-black">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus Penjualan?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tindakan ini akan menghapus data penjualan dan <strong>mengembalikan stok barang</strong> ke gudang.
                          Tindakan ini tidak dapat dibatalkan.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-none border-2 border-brand-black">Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(sale.id)} className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
                      <p className="text-xs italic text-muted-foreground font-mono leading-relaxed">{sale.notes}</p>
                    </div>
                  </div>
                )}

                <CollapsibleTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full mt-3 border-2 border-brand-black rounded-none font-mono font-bold hover:bg-brand-orange group">
                    <ChevronDown className="h-4 w-4 mr-1 group-data-[state=open]:rotate-180 transition-transform" />
                    Lihat Detail
                  </Button>
                </CollapsibleTrigger>
              </div>

              <CollapsibleContent>
                <div className="border-t-2 border-dashed border-brand-black/20 p-3 bg-muted/20">
                  <h4 className="font-bold mb-2 text-sm">Detail Penjualan:</h4>
                  <div className="space-y-2">
                    {sale.items.map((item, index) => (
                      <div key={index} className="bg-white p-2 border-2 border-brand-black/10">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-sm">{item.productName}</span>
                          <span className="font-mono text-xs">×{item.quantity}</span>
                        </div>
                        <div className="flex justify-between text-xs font-mono">
                          <span>@ {formatCurrency(item.price)}</span>
                          <span className="font-bold">{formatCurrency(item.price * item.quantity)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        ))}
      </div>
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