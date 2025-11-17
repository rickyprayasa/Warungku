import { useEffect } from 'react';
import { useWarungStore } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';
import { JajananRequestsDataTable } from './JajananRequestsDataTable';
export function JajananRequestsDashboard() {
  const fetchJajananRequests = useWarungStore((state) => state.fetchJajananRequests);
  const isLoading = useWarungStore((state) => state.isLoading);
  useEffect(() => {
    fetchJajananRequests();
  }, [fetchJajananRequests]);
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div className="mb-4 sm:mb-0">
            <h3 className="text-2xl font-display font-bold text-brand-black">
                Request Jajanan Masuk
            </h3>
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