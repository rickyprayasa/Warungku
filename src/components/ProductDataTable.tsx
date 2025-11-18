import { useState } from 'react';
import { useWarungStore } from '@/lib/store';
import type { Product } from '@shared/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { ProductForm } from './ProductForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
export function ProductDataTable() {
  const products = useWarungStore((state) => state.products);
  const deleteProduct = useWarungStore((state) => state.deleteProduct);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const { t } = useTranslation();
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };
  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setEditDialogOpen(true);
  };
  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };
  const confirmDelete = async () => {
    if (selectedProduct) {
      const promise = deleteProduct(selectedProduct.id);
      toast.promise(promise, {
        loading: 'Deleting product...',
        success: 'Product deleted successfully!',
        error: 'Failed to delete product.',
      });
      await promise;
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
    }
  };
  return (
    <>
      <div className="border-4 border-brand-black bg-brand-white">
        <Table>
          <TableHeader className="border-b-4 border-brand-black bg-muted/40">
            <TableRow>
              <TableHead className="w-[80px] font-bold text-brand-black">{t('tables.image')}</TableHead>
              <TableHead className="font-bold text-brand-black">{t('tables.name')}</TableHead>
              <TableHead className="font-bold text-brand-black">{t('tables.category')}</TableHead>
              <TableHead className="font-bold text-brand-black">{t('tables.price')}</TableHead>
              <TableHead className="w-[50px] font-bold text-brand-black text-right">{t('tables.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((product) => (
              <TableRow key={product.id} className="border-b-2 border-brand-black last:border-b-0">
                <TableCell>
                  <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover border-2 border-brand-black" />
                </TableCell>
                <TableCell className="font-bold">{product.name}</TableCell>
                <TableCell className="font-mono">{product.category}</TableCell>
                <TableCell className="font-mono">{formatCurrency(product.price)}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="rounded-none border-2 border-brand-black bg-brand-white">
                      <DropdownMenuItem onClick={() => handleEdit(product)} className="cursor-pointer">
                        <Pencil className="mr-2 h-4 w-4" />
                        <span>{t('dialogs.edit')}</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDelete(product)} className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10">
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
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px] rounded-none border-4 border-brand-black bg-brand-white">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold">{t('forms.product.editTitle')}</DialogTitle>
          </DialogHeader>
          <ProductForm product={selectedProduct} onSuccess={() => setEditDialogOpen(false)} />
        </DialogContent>
      </Dialog>
      {/* Delete Alert Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-none border-4 border-brand-black bg-brand-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-bold">{t('dialogs.deleteTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dialogs.deleteProduct', { productName: selectedProduct?.name ?? '' })}
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