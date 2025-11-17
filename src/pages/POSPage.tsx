import { useEffect } from 'react';
import { useWarungStore } from '@/lib/store';
import { ProductCard } from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
export function POSPage() {
  const fetchProducts = useWarungStore((state) => state.fetchProducts);
  const products = useWarungStore((state) => state.products);
  const isLoading = useWarungStore((state) => state.isLoading);
  const error = useWarungStore((state) => state.error);
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  return (
    <div className="bg-muted/40">
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 md:py-10 lg:py-12">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-display font-bold text-brand-black">Menu Jajanan</h2>
              <p className="text-muted-foreground font-mono">Lihat detail jajanan yang tersedia.</p>
            </div>
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex flex-col space-y-3">
                    <Skeleton className="h-[220px] w-full rounded-none border-2 border-brand-black" />
                    <Skeleton className="h-4 w-[150px]" />
                    <Skeleton className="h-4 w-[100px]" />
                  </div>
                ))}
              </div>
            )}
            {error && (
              <Alert variant="destructive" className="border-2 border-brand-black rounded-none">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle className="font-bold">Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {!isLoading && !error && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}