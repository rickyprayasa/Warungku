import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Purchase } from '@shared/types';
import { Button } from './ui/button';
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Trash2, MessageSquare } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
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

interface PurchasesDataTableProps {
  purchases: Purchase[];
}

export function PurchasesDataTable({ purchases }: PurchasesDataTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const deletePurchase = useWarungStore((state) => state.deletePurchase);

  const pageCount = Math.ceil(purchases.length / rowsPerPage);
  const paginatedPurchases = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return purchases.slice(start, end);
  }, [purchases, page, rowsPerPage]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('id-ID');
  };

  const handleDelete = async (id: string) => {
    const promise = deletePurchase(id);
    toast.promise(promise, {
      loading: 'Menghapus pembelian...',
      success: 'Pembelian berhasil dihapus! Stok dikurangi.',
      error: (err) => err instanceof Error ? err.message : 'Gagal menghapus pembelian.',
    });
  };

  if (purchases.length === 0) {
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
              <TableHead className="font-bold text-brand-black">Tanggal</TableHead>
              <TableHead className="font-bold text-brand-black">Nama</TableHead>
              <TableHead className="font-bold text-brand-black">Jumlah</TableHead>
              <TableHead className="font-bold text-brand-black">Pemasok</TableHead>
              <TableHead className="font-bold text-brand-black text-right">Total Biaya</TableHead>
              <TableHead className="font-bold text-brand-black">Catatan</TableHead>
              <TableHead className="font-bold text-brand-black text-center">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedPurchases.map((purchase) => (
              <TableRow key={purchase.id} className="border-b-2 border-brand-black last:border-b-0">
                <TableCell className="font-mono">{formatDate(purchase.createdAt)}</TableCell>
                <TableCell className="font-bold">{purchase.productName}</TableCell>
                <TableCell className="font-mono">{purchase.quantity}</TableCell>
                <TableCell className="font-mono">{purchase.supplier}</TableCell>
                <TableCell className="font-mono text-right font-bold text-red-600">{formatCurrency(purchase.totalCost)}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground max-w-[200px]">
                  {purchase.notes ? (
                    <span className="italic truncate block" title={purchase.notes}>
                      {purchase.notes.length > 50 ? `${purchase.notes.substring(0, 50)}...` : purchase.notes}
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
                        <AlertDialogTitle>Hapus Pembelian?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tindakan ini akan menghapus data pembelian dan <strong>mengurangi stok barang</strong>.
                          Tindakan ini tidak dapat dibatalkan.
                          <br /><br />
                          <strong>PENTING:</strong> Pembelian hanya bisa dihapus jika stok dari pembelian ini BELUM terjual.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-none border-2 border-brand-black">Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(purchase.id)} className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {paginatedPurchases.map((purchase) => (
          <div key={purchase.id} className="border-4 border-brand-black bg-brand-white p-3 shadow-hard-sm">
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-mono">{formatDate(purchase.createdAt)}</p>
                <h3 className="font-bold text-lg leading-tight mt-1">{purchase.productName}</h3>
                <p className="text-sm text-muted-foreground font-mono mt-1">Pemasok: {purchase.supplier}</p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 border-2 border-brand-black rounded-none text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-none border-4 border-brand-black">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Hapus Pembelian?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tindakan ini akan menghapus data pembelian dan <strong>mengurangi stok barang</strong>.
                      Tindakan ini tidak dapat dibatalkan.
                      <br /><br />
                      <strong>PENTING:</strong> Pembelian hanya bisa dihapus jika stok dari pembelian ini BELUM terjual.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-none border-2 border-brand-black">Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={() => handleDelete(purchase.id)} className="rounded-none bg-destructive text-destructive-foreground hover:bg-destructive/90">Hapus</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs text-muted-foreground font-mono">Jumlah</p>
                <p className="font-bold font-mono text-lg">{purchase.quantity}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground font-mono">Total Biaya</p>
                <p className="font-bold font-mono text-lg text-red-600">{formatCurrency(purchase.totalCost)}</p>
              </div>
            </div>

            {purchase.notes && (
              <div className="mt-2 p-2 bg-blue-50/50 border-l-4 border-blue-500 rounded-r">
                <div className="flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs italic text-muted-foreground font-mono leading-relaxed">{purchase.notes}</p>
                </div>
              </div>
            )}
          </div>
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