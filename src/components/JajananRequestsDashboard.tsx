import { useEffect } from 'react';
import { useWarungStore } from '@/lib/store';
import { OnboardingTour } from '@/components/OnboardingTour';
import { Skeleton } from '@/components/ui/skeleton';
import { JajananRequestsDataTable } from './JajananRequestsDataTable';
export function JajananRequestsDashboard({ isActive }: { isActive?: boolean }) {
  const fetchJajananRequests = useWarungStore((state) => state.fetchJajananRequests);
  const isLoading = useWarungStore((state) => state.isLoading);
  useEffect(() => {
    fetchJajananRequests();
  }, [fetchJajananRequests]);
  const requestTourSteps = [
    {
      element: '#tour-requests-title',
      popover: {
        title: 'Request Pelanggan',
        description: 'Daftar barang yang diminta pelanggan namun belum tersedia di warung.',
        side: 'bottom',
        align: 'start'
      }
    }
  ];

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div className="mb-4 sm:mb-0" id="tour-requests-title">
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-display font-bold text-brand-black">
              Request Jajanan Masuk
            </h3>
            <OnboardingTour tourId="requests-page-tour" steps={requestTourSteps} loading={isLoading} isActive={isActive} />
          </div>
          <p className="font-mono text-sm text-muted-foreground">Lihat semua jajanan yang di-request oleh pelanggan.</p>
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
        <JajananRequestsDataTable />
      )}
    </div>
  );
}