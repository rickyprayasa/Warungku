import { useState, useMemo } from 'react';
import { useWarungStore } from '@/lib/store';
import { OnboardingTour } from '@/components/OnboardingTour';
import { Button } from '@/components/ui/button';
import { Download, PlusCircle, Lock } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { SalesDataTable } from './SalesDataTable';
import { POSSaleForm } from './POSSaleForm';
import { exportToCSV } from '@/lib/csv-export';
import { DateRangePicker } from './ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays } from 'date-fns';
import { usePlan } from '@/contexts/PlanContext';
import { UpgradeDialog } from './UpgradeDialog';
export function SalesDashboard({ isActive }: { isActive?: boolean }) {
  const sales = useWarungStore((state) => state.sales);
  const fetchSales = useWarungStore((state) => state.fetchSales);
  const isLoading = useWarungStore((state) => state.isLoading);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: subDays(new Date(), 29),
    to: new Date(),
  });

  const { limits } = usePlan();
  // Sales are preloaded by DashboardPage.preloadDashboardData

  const filteredSales = useMemo(() => {
    if (!dateRange?.from) return sales;
    const from = dateRange.from;
    const to = dateRange.to || from; // If only 'from' is selected, treat it as a single day
    return sales.filter(sale => {
      const saleDate = new Date(sale.createdAt);
      return saleDate >= from && saleDate <= new Date(to.getTime() + 86400000 - 1); // include the whole 'to' day
    });
  }, [sales, dateRange]);

  const salesTourSteps = [
    {
      element: '#tour-sales-add',
      popover: {
        title: 'Catat Penjualan',
        description: 'Catat transaksi baru di sini jika tidak menggunakan mesin kasir (POS).',
        side: 'bottom',
        align: 'end'
      }
    },
    {
      element: '#tour-sales-export',
      popover: {
        title: 'Ekspor Laporan',
        description: 'Unduh laporan penjualan dalam format CSV untuk analisis lebih lanjut.',
        side: 'bottom',
        align: 'end'
      }
    },
    {
      element: '#tour-sales-filter',
      popover: {
        title: 'Ikon Filter Tanggal',
        description: 'Filter riwayat penjualan berdasarkan periode waktu tertentu.',
        side: 'bottom',
        align: 'end'
      }
    },
    {
      element: '#tour-sales-list',
      popover: {
        title: 'Daftar Penjualan',
        description: 'Lihat riwayat lengkap transaksi penjualan Anda di sini. Klik baris untuk melihat detail.',
        side: 'top',
        align: 'center'
      },
      onHighlightStarted: (element: Element) => {
        if (element instanceof HTMLElement) {
          element.style.pointerEvents = 'none';
        }
      },
      onDeselected: (element: Element) => {
        if (element instanceof HTMLElement) {
          element.style.pointerEvents = 'auto';
        }
      }
    }
  ];

  const handleExport = () => {
    // Check if export is allowed
    if (!limits.canExport) {
      setUpgradeDialogOpen(true);
      return;
    }

    const flattenedSales = filteredSales.flatMap(sale =>
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
          <h3 className="text-2xl font-display font-bold text-brand-black">Riwayat Penjualan</h3>
          <p className="font-mono text-sm text-muted-foreground">Lacak semua transaksi penjualan yang telah terjadi.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <div id="tour-sales-filter">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          </div>
          <OnboardingTour tourId="sales-page-tour" steps={salesTourSteps} loading={isLoading} isActive={isActive} />
          <Button id="tour-sales-export" onClick={handleExport} variant="outline" className="text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-sm shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-11">
            {limits.canExport ? (
              <Download className="w-4 h-4 mr-2" />
            ) : (
              <Lock className="w-4 h-4 mr-2" />
            )}
            Ekspor
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button id="tour-sales-add" className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-sm shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-11">
                <PlusCircle className="w-4 h-4 mr-2" />
                Catat Penjualan
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[95vw] md:max-w-[1200px] h-[90vh] p-0 overflow-hidden rounded-none border-4 border-brand-black bg-brand-white flex flex-col">
              <DialogHeader className="px-6 py-4 border-b-2 border-brand-black bg-gray-50 flex-shrink-0">
                <DialogTitle className="font-display text-2xl font-bold">Catat Penjualan Baru</DialogTitle>
              </DialogHeader>
              <div className="p-6 flex-1 overflow-hidden h-full">
                <POSSaleForm onSuccess={() => {
                  setCreateDialogOpen(false);
                  fetchSales();
                }} />
              </div>
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
        <div id="tour-sales-list">
          <SalesDataTable sales={filteredSales} />
        </div>
      )}

      <UpgradeDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        trigger="export"
      />
    </div>
  );
}