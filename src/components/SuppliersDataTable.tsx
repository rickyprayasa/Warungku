import { useState, useMemo } from 'react';
import { useWarungStore } from '@/lib/store';
import type { Supplier } from '@shared/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { SupplierForm } from './SupplierForm';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export function SuppliersDataTable() {
  const suppliers = useWarungStore((state) => state.suppliers);
  const deleteSupplier = useWarungStore((state) => state.deleteSupplier);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const pageCount = Math.ceil(suppliers.length / rowsPerPage);
  const paginatedSuppliers = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return suppliers.slice(start, end);
  }, [suppliers, page, rowsPerPage]);

  const handleEdit = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setEditDialogOpen(true);
  };

  const handleDelete = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (selectedSupplier) {
      const promise = deleteSupplier(selectedSupplier.id);
      toast.promise(promise, {
        loading: 'Deleting supplier...',
        success: 'Supplier deleted successfully!',
        error: 'Failed to delete supplier.',
      });
      await promise;
      setDeleteDialogOpen(false);
      setSelectedSupplier(null);
    }
  };

  if (suppliers.length === 0) {
    return (
      <div className="border-2 border-brand-black rounded-lg bg-white p-12 text-center">
        <p className="font-mono text-muted-foreground">Belum ada data supplier</p>
      </div>
    );
  }

  return (
    <>
      <div className="md:hidden space-y-3">
        {paginatedSuppliers.map((supplier) => (
          <div key={supplier.id} className="border-2 border-brand-black bg-white p-3 rounded-lg">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 border-2 border-brand-black rounded-lg flex items-center justify-center text-xl">
                  🏭
                </div>
                <div>
                  <h3 className="font-bold text-sm">{supplier.name}</h3>
                  {supplier.contactPerson && (
                    <span className="text-xs font-mono text-muted-foreground flex items-center gap-1">
                      👤 {supplier.contactPerson}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(supplier)}
                  className="h-8 w-8 rounded-none border-2 border-transparent hover:border-brand-black hover:bg-brand-orange/20"
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(supplier)}
                  className="h-8 w-8 rounded-none border-2 border-transparent hover:border-brand-black hover:bg-destructive/20 text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5 text-xs font-mono text-muted-foreground">
              {supplier.phone && (
                <div className="flex items-center gap-2">
                  📞 {supplier.phone}
                </div>
              )}
              {supplier.address && (
                <div className="flex items-start gap-2">
                  📍 {supplier.address}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden md:block border-4 border-brand-black bg-brand-white">
        <Table>
          <TableHeader className="border-b-4 border-brand-black bg-muted/40">
            <TableRow>
              <TableHead className="font-bold text-brand-black">Nama</TableHead>
              <TableHead className="font-bold text-brand-black">Narahubung</TableHead>
              <TableHead className="font-bold text-brand-black">Telepon</TableHead>
              <TableHead className="font-bold text-brand-black">Alamat</TableHead>
              <TableHead className="w-[50px] font-bold text-brand-black text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSuppliers.map((supplier) => (
              <TableRow key={supplier.id} className="border-b-2 border-brand-black last:border-b-0">
                <TableCell className="font-bold">{supplier.name}</TableCell>
                <TableCell className="font-mono">{supplier.contactPerson}</TableCell>
                <TableCell className="font-mono">{supplier.phone}</TableCell>
                <TableCell className="font-mono">{supplier.address}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(supplier)}
                      className="h-8 w-8 rounded-none border-2 border-transparent hover:border-brand-black hover:bg-brand-orange/20"
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(supplier)}
                      className="h-8 w-8 rounded-none border-2 border-transparent hover:border-brand-black hover:bg-destructive/20 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Hapus</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-end space-x-2 py-4 font-mono">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Baris per halaman</p>
          <Select
            value={`${rowsPerPage}`}
            onValueChange={(value) => {
              setRowsPerPage(Number(value));
              setPage(0);
            }}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue placeholder={rowsPerPage} />
            </SelectTrigger>
            <SelectContent side="top">
              {[5, 10, 20].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-x-2">
          <Button
            variant="outline"
            className="h-8 w-8 p-0 rounded-none border-2 border-brand-black"
            onClick={() => setPage(0)}
            disabled={page === 0}
          >
            <span className="sr-only">First page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 rounded-none border-2 border-brand-black"
            onClick={() => setPage(page - 1)}
            disabled={page === 0}
          >
            <span className="sr-only">Previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 rounded-none border-2 border-brand-black"
            onClick={() => setPage(page + 1)}
            disabled={page >= pageCount - 1}
          >
            <span className="sr-only">Next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="h-8 w-8 p-0 rounded-none border-2 border-brand-black"
            onClick={() => setPage(pageCount - 1)}
            disabled={page >= pageCount - 1}
          >
            <span className="sr-only">Last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-none border-2 border-brand-black">
          <DialogHeader>
            <DialogTitle className="font-display font-bold text-brand-black">Edit Supplier</DialogTitle>
          </DialogHeader>
          {selectedSupplier && (
            <SupplierForm
              supplier={selectedSupplier}
              onSuccess={() => setEditDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-none border-2 border-brand-black">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display font-bold text-brand-black">Hapus Supplier?</AlertDialogTitle>
            <AlertDialogDescription className="font-mono">
              Apakah Anda yakin ingin menghapus supplier "{selectedSupplier?.name}"? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none border-2 border-brand-black">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="rounded-none border-2 border-brand-black bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
