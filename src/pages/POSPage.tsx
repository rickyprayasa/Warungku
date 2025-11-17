import { useEffect, useState, useMemo } from 'react';
import { useWarungStore } from '@/lib/store';
import { ProductCard } from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
export function POSPage() {
  const fetchProducts = useWarungStore((state) => state.fetchProducts);
  const products = useWarungStore((state) => state.products);
  const isLoading = useWarungStore((state) => state.isLoading);
  const error = useWarungStore((state) => state.error);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);
  const categories = useMemo(() => {
    const allCategories = products.map((p) => p.category);
    return ['All', ...Array.from(new Set(allCategories))];
  }, [products]);
  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'All') {
      return products;
    }
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);
  return (
    <div className="bg-muted/40">
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 md:py-10 lg:py-12">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-display font-bold text-brand-black">Menu Jajanan</h2>
              <p className="text-muted-foreground font-mono">Lihat detail jajanan yang tersedia.</p>
            </div>
            <div className="flex items-center justify-center flex-wrap gap-2 mb-8">
              {categories.map((category) => (
                <Button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    'font-mono uppercase font-bold text-sm px-4 py-2 border-2 border-brand-black rounded-none transition-all duration-200',
                    selectedCategory === category
                      ? 'bg-brand-black text-brand-white'
                      : 'bg-brand-white text-brand-black hover:bg-brand-orange hover:text-brand-black hover:shadow-hard-sm'
                  )}
                >
                  {category}
                </Button>
              ))}
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
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}
             {!isLoading && !error && filteredProducts.length === 0 && (
                <div className="col-span-full text-center border-2 border-dashed border-brand-black p-12">
                    <p className="font-mono text-muted-foreground">No products found in this category.</p>
                </div>
             )}
          </div>
        </div>
      </main>
    </div>
  );
}