import { useEffect, useState, useMemo } from 'react';
import { useWarungStore } from '@/lib/store';
import { ProductCard } from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Search, PlusCircle, ArrowDown, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ProductDetailDialog } from '@/components/ProductDetailDialog';
import type { Product } from '@shared/types';
import { Input } from '@/components/ui/input';
import { RequestJajananForm } from '@/components/RequestJajananForm';
import { SnackIconBackground } from '@/components/SnackIconBackground';
import { motion } from 'framer-motion';

const MobileProductRow = ({ product }: { product: Product }) => {
  const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  const isActive = product.isActive ?? true;

  return (
    <Dialog>
      <DialogTrigger asChild disabled={!isActive}>
        <TableRow className={cn(
          "border-b-2 border-brand-black last:border-b-0 cursor-pointer hover:bg-brand-orange/10 transition-colors",
          !isActive && "grayscale opacity-60 bg-gray-100 cursor-not-allowed"
        )}>
          <TableCell className="w-[60px] p-2 relative">
            <div className="relative w-12 h-12">
              <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover border-2 border-brand-black" />
              {product.isPromo ? (
                <div className="absolute -top-2 -left-2 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 border-2 border-brand-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] rotate-[-10deg] z-10">
                  PROMO
                </div>
              ) : null}
            </div>
          </TableCell>
          <TableCell className="p-2">
            <p className="font-bold text-sm">{product.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{product.category}</p>
          </TableCell>
          <TableCell className="font-mono text-right p-2">
            {product.isPromo ? (
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-muted-foreground line-through decoration-red-500 decoration-2">{formatCurrency(product.price)}</span>
                <span className="font-bold text-brand-orange">{formatCurrency(product.promoPrice || product.price)}</span>
              </div>
            ) : (
              <span className="font-bold text-brand-orange">{formatCurrency(product.price)}</span>
            )}
          </TableCell>
        </TableRow>
      </DialogTrigger>
      {isActive ? (
        <DialogContent className="sm:max-w-[425px] rounded-none border-4 border-brand-black bg-brand-white p-0">
          <ProductDetailDialog product={product} />
        </DialogContent>
      ) : null}
    </Dialog>
  );
};

export function POSPage() {
  const fetchProducts = useWarungStore((state) => state.fetchProducts);
  const products = useWarungStore((state) => state.products);
  const isLoading = useWarungStore((state) => state.isLoading);
  const error = useWarungStore((state) => state.error);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRequestDialogOpen, setRequestDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const categories = useMemo(() => {
    const allCategories = products.map((p) => p.category);
    return ['All', ...Array.from(new Set(allCategories))];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let filtered = products;
    if (searchTerm) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (selectedCategory !== 'All') {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }
    return filtered;
  }, [products, selectedCategory, searchTerm]);

  return (
    <div className="min-h-screen bg-muted/40 relative overflow-hidden">
      <SnackIconBackground />
      <main className="flex-1 relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 md:py-10 lg:py-12">
            <div className="mb-8 text-center">
              <div className="flex flex-col items-center justify-center mb-4">
                <img src="https://i.imgur.com/Xzv9T8m.png" alt="Jajanan Logo" className="h-20 w-auto mb-4" />
                <h2 className="text-4xl font-display font-bold text-brand-black">Menu Jajanan</h2>
              </div>
              <p className="text-muted-foreground font-mono">Lihat detail jajanan yang tersedia atau ajukan yang baru.</p>
            </div>

            <div className="max-w-2xl mx-auto mb-6 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Cari nama atau kategori jajanan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full rounded-none border-2 border-brand-black h-12 pl-10 font-mono"
                />
              </div>

              {/* View Toggle & Category Filter */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                {/* View Toggle */}
                <div className="flex items-center border-2 border-brand-black bg-brand-white">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className={cn(
                      "rounded-none h-10 px-3 hover:bg-brand-orange/20",
                      viewMode === 'grid' ? "bg-brand-orange text-brand-black" : "text-muted-foreground"
                    )}
                  >
                    <LayoutGrid className="w-5 h-5" />
                  </Button>
                  <div className="w-0.5 h-6 bg-brand-black/10" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className={cn(
                      "rounded-none h-10 px-3 hover:bg-brand-orange/20",
                      viewMode === 'list' ? "bg-brand-orange text-brand-black" : "text-muted-foreground"
                    )}
                  >
                    <List className="w-5 h-5" />
                  </Button>
                </div>

                {/* Categories */}
                <div className="flex items-center flex-wrap gap-2 justify-center sm:justify-end">
                  {categories.map((category) => (
                    <Button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={cn(
                        'font-mono uppercase font-bold text-xs px-3 py-1 border-2 border-brand-black rounded-none transition-all duration-200 h-8',
                        selectedCategory === category
                          ? 'bg-brand-black text-brand-white'
                          : 'bg-brand-white text-brand-black hover:bg-brand-orange hover:text-brand-black hover:shadow-hard-sm'
                      )}
                    >
                      {category === 'All' ? 'Semua' : category}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center justify-center mb-8">
              <motion.div
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="flex items-center gap-2 mb-2"
              >
                <p className="font-mono text-sm font-bold text-brand-orange">Punya ide jajanan?</p>
                <ArrowDown className="w-5 h-5 text-brand-orange" />
              </motion.div>
              <Dialog open={isRequestDialogOpen} onOpenChange={setRequestDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="text-brand-black border-2 border-dashed border-brand-black rounded-none font-bold uppercase text-sm hover:bg-brand-orange hover:border-solid active:translate-x-0.5 active:translate-y-0.5 transition-all h-11">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Request Jajanan
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px] rounded-none border-4 border-brand-black bg-brand-white">
                  <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-bold">Request Jajanan Baru</DialogTitle>
                  </DialogHeader>
                  <RequestJajananForm onSuccess={() => setRequestDialogOpen(false)} />
                </DialogContent>
              </Dialog>
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
              <>
                {viewMode === 'grid' ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
                    {filteredProducts.map((product) => <ProductCard key={product.id} product={product} />)}
                  </div>
                ) : (
                  <div className="border-4 border-brand-black bg-brand-white">
                    <Table>
                      <TableBody>
                        {filteredProducts.map((product) => <MobileProductRow key={product.id} product={product} />)}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </>
            )}

            {!isLoading && !error && filteredProducts.length === 0 && (
              <div className="col-span-full text-center border-2 border-dashed border-brand-black p-12">
                <p className="font-mono text-muted-foreground">Produk tidak ditemukan.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}