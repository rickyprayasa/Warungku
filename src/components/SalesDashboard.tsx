import { useEffect, useState } from 'react';
import { useWarungStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { SalesDataTable } from './SalesDataTable';
import { SaleForm } from './SaleForm';
import { exportToCSV } from '@/lib/csv-export';
import { useTranslation } from '@/lib/i18n';
export function SalesDashboard() {
  const sales = useWarungStore((state) => state.sales);
  const fetchSales = useWarungStore((state) => state.fetchSales);
  const isLoading = useWarungStore((state) => state.isLoading);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const { t } = useTranslation();
  useEffect(() => {
    fetchSales();
  }, [fetchSales]);
  const handleExport = () => {
    const flattenedSales = sales.flatMap(sale =>
      sale.items.map(item => ({
        saleId: sale.id,
        date: new Date(sale.createdAt).toISOString(),
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        cost: item.cost,
        subtotal: item.price * item.quantity,
      }))
    );
    exportToCSV(flattenedSales, 'sales_report');
  };
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div className="mb-4 sm:mb-0">
          <h3 className="text-2xl font-display font-bold text-brand-black">{t('salesDashboard.title')}</h3>
          <p className="font-mono text-sm text-muted-foreground">{t('salesDashboard.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" className="text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-sm shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-11">
            <Download className="w-4 h-4 mr-2" />
            {t('salesDashboard.export')}
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-sm shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-11">
                <PlusCircle className="w-4 h-4 mr-2" />
                {t('salesDashboard.recordSale')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl rounded-none border-4 border-brand-black bg-brand-white">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl font-bold">{t('forms.sale.title')}</DialogTitle>
              </DialogHeader>
              <SaleForm onSuccess={() => setCreateDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
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
        <SalesDataTable />
      )}
    </div>
  );
}