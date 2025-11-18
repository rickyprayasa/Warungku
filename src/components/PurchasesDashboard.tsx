import { useEffect, useState } from 'react';
import { useWarungStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PurchasesDataTable } from './PurchasesDataTable';
import { PurchaseForm } from './PurchaseForm';
import { exportToCSV } from '@/lib/csv-export';
export function PurchasesDashboard() {
  const purchases = useWarungStore((state) => state.purchases);
  const fetchPurchases = useWarungStore((state) => state.fetchPurchases);
  const isLoading = useWarungStore((state) => state.isLoading);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);
  const handleExport = () => {
    const dataToExport = purchases.map(p => ({
      ...p,
      date: new Date(p.createdAt).toISOString(),
    }));
    exportToCSV(dataToExport, 'purchases_report');
  };
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div className="mb-4 sm:mb-0">
          <h3 className="text-2xl font-display font-bold text-brand-black">Riwayat Pembelian</h3>
          <p className="font-mono text-sm text-muted-foreground">Lacak semua transaksi pembelian stok barang.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" className="text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-sm shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-11">
            <Download className="w-4 h-4 mr-2" />
            Ekspor
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-sm shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-11">
                <PlusCircle className="w-4 h-4 mr-2" />
                Catat Pembelian
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-none border-4 border-brand-black bg-brand-white">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl font-bold">Catat Pembelian Baru</DialogTitle>
              </DialogHeader>
              <PurchaseForm onSuccess={() => setCreateDialogOpen(false)} />
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
        <PurchasesDataTable />
      )}
    </div>
  );
}