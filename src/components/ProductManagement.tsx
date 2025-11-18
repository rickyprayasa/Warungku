import { useEffect, useState } from 'react';
import { useWarungStore } from '@/lib/store';
import { ProductDataTable } from '@/components/ProductDataTable';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProductForm } from '@/components/ProductForm';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from '@/lib/i18n';
export function ProductManagement() {
  const fetchProducts = useWarungStore((state) => state.fetchProducts);
  const isLoading = useWarungStore((state) => state.isLoading);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const { t } = useTranslation();
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div className="mb-4 sm:mb-0">
            <h3 className="text-2xl font-display font-bold text-brand-black">
                {t('productManagement.title')}
            </h3>
            <p className="font-mono text-sm text-muted-foreground">{t('productManagement.subtitle')}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-sm shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-11">
              <PlusCircle className="w-4 h-4 mr-2" />
              {t('productManagement.newProduct')}
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] rounded-none border-4 border-brand-black bg-brand-white">
            <DialogHeader>
              <DialogTitle className="font-display text-2xl font-bold">{t('forms.product.addTitle')}</DialogTitle>
            </DialogHeader>
            <ProductForm onSuccess={() => setCreateDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <div className="border-4 border-brand-black">
            <div className="space-y-2 p-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        </div>
      ) : (
        <ProductDataTable />
      )}
    </div>
  );
}