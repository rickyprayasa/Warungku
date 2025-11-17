import { useState, useMemo } from 'react';
import { useWarungStore } from '@/lib/store';
import type { Supplier } from '@shared/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
  return (
    <>
      <div className="border-4 border-brand-black bg-brand-white">
        <Table>
          <TableHeader className="border-b-4 border-brand-black bg-muted/40">
            <TableRow>
              <TableHead className="font-bold text-brand-black">Nama</TableHead>
              <TableHead className="font-bold text-brand-black">Narahubung</TableHead>
              <TableHead className="font-bold text-brand-black">Telepon</TableHead>
              <TableHead className="w-[50px] font-bold text-brand-black text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedSuppliers.map((supplier) => (
              <TableRow key={supplier.id} className="border-b-2 border-brand-black last:border-b-0">
                <TableCell className="font-bold">{supplier.name}</TableCell>
                <TableCell className="font-mono">{supplier.contactPerson}</TableCell>
                <TableCell className="font-mono">{supplier.phone}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-none border-2 border-brand-black bg-brand-white">
                      <DropdownMenuItem onClick={() => handleEdit(supplier)} className="cursor-pointer">
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(supplier)} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Hapus</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-none border-4 border-brand-black bg-brand-white">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold">Edit Pemasok</DialogTitle>
          </DialogHeader>
          <SupplierForm supplier={selectedSupplier} onSuccess={() => setEditDialogOpen(false)} />
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-none border-4 border-brand-black bg-brand-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-bold">Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menghapus pemasok "{selectedSupplier?.name ?? ''}" secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none border-2 border-brand-black">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-none border-2 border-brand-black">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}