import { useEffect, useState } from 'react';
import { useWarungStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { SuppliersDataTable } from './SuppliersDataTable';
import { SupplierForm } from './SupplierForm';
import { exportToCSV } from '@/lib/csv-export';
export function SuppliersDashboard() {
  const suppliers = useWarungStore((state) => state.suppliers);
  const fetchSuppliers = useWarungStore((state) => state.fetchSuppliers);
  const isLoading = useWarungStore((state) => state.isLoading);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);
  const handleExport = () => {
    exportToCSV(suppliers, 'suppliers_list');
  };
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div className="mb-4 sm:mb-0">
          <h3 className="text-2xl font-display font-bold text-brand-black">
            Supplier Management
          </h3>
          <p className="font-mono text-sm text-muted-foreground">Add, edit, or delete your suppliers.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExport} variant="outline" className="text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-sm shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-11">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-sm shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-11">
                <PlusCircle className="w-4 h-4 mr-2" />
                New Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-none border-4 border-brand-black bg-brand-white">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl font-bold">Add New Supplier</DialogTitle>
              </DialogHeader>
              <SupplierForm onSuccess={() => setCreateDialogOpen(false)} />
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
          </div>
        </div>
      ) : (
        <SuppliersDataTable />
      )}
    </div>
  );
}