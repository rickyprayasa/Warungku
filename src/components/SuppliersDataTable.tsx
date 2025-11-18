import { useState } from 'react';
import { useWarungStore } from '@/lib/store';
import type { Supplier } from '@shared/types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { SupplierForm } from './SupplierForm';
import { useTranslation } from '@/lib/i18n';
export function SuppliersDataTable() {
  const suppliers = useWarungStore((state) => state.suppliers);
  const deleteSupplier = useWarungStore((state) => state.deleteSupplier);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const { t } = useTranslation();
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
              <TableHead className="font-bold text-brand-black">{t('tables.name')}</TableHead>
              <TableHead className="font-bold text-brand-black">{t('tables.contactPerson')}</TableHead>
              <TableHead className="font-bold text-brand-black">{t('tables.phone')}</TableHead>
              <TableHead className="w-[50px] font-bold text-brand-black text-right">{t('tables.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
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
                        <span>{t('dialogs.edit')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(supplier)} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>{t('dialogs.delete')}</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-none border-4 border-brand-black bg-brand-white">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold">{t('forms.supplier.editTitle')}</DialogTitle>
          </DialogHeader>
          <SupplierForm supplier={selectedSupplier} onSuccess={() => setEditDialogOpen(false)} />
        </DialogContent>
      </Dialog>
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-none border-4 border-brand-black bg-brand-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-bold">{t('dialogs.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialogs.deleteSupplier', { supplierName: selectedSupplier?.name ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none border-2 border-brand-black">{t('dialogs.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-none border-2 border-brand-black">
              {t('dialogs.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}