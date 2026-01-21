import { useState, useMemo, useEffect } from 'react';
import { useWarungStore } from '@/lib/store';
import { ProductCard } from '@/components/ProductCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertTriangle, Search, PlusCircle, ArrowDown, LayoutGrid, List, ChevronLeft, ChevronRight, ArrowUpDown, ArrowDown01, ArrowUp10, Sparkles } from 'lucide-react';
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
              {product.isPromo && product.promoPrice !== undefined && product.promoPrice > 0 ? (
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
            {product.isPromo && product.promoPrice !== undefined && product.promoPrice > 0 ? (
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-muted-foreground line-through decoration-red-500 decoration-2">{formatCurrency(product.price)}</span>
                <span className="font-bold text-brand-orange">{formatCurrency(product.promoPrice)}</span>
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
  const products = useWarungStore((state) => state.products);
  const isLoading = useWarungStore((state) => state.isLoading);
  const error = useWarungStore((state) => state.error);
  const storeProfile = useWarungStore((state) => state.storeProfile);

  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isRequestDialogOpen, setRequestDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('default'); // default = newest first + out-of-stock last
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const categories = useMemo(() => {
    const allCategories = products.map((p) => p.category);
    return ['All', ...Array.from(new Set(allCategories))];
  }, [products]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchTerm, sortOrder]);

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

    // Apply sorting based on sortOrder
    if (sortOrder === 'default') {
      // Use the store's default order (newest first, out-of-stock last)
      // Don't modify the order
    } else {
      // Apply alphabetical sorting
      filtered = [...filtered].sort((a, b) => {
        if (sortOrder === 'asc') {
          // A-Z
          return a.name.localeCompare(b.name);
        } else {
          // Z-A
          return b.name.localeCompare(a.name);
        }
      });
    }

    return filtered;
  }, [products, selectedCategory, searchTerm, sortOrder]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, endIndex);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, searchTerm, sortOrder]);

  return (
    <div className="bg-muted/40 relative overflow-x-hidden">
      <SnackIconBackground />
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-8 md:py-10 lg:py-12 pb-8">
            <div className="mb-8 text-center">
              <div className="flex flex-col items-center justify-center mb-4">
                {storeProfile.logoUrl ? (
                  <img src={storeProfile.logoUrl} alt={storeProfile.name} className="h-20 w-auto mb-4 object-contain" />
                ) : (
                  <h1 className="text-5xl font-display font-black text-brand-black mb-4">{storeProfile.name}</h1>
                )}
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

              {/* View Toggle & Sort Toggle */}
              <div className="flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex items-center border-2 border-brand-black bg-brand-white">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    aria-label="Tampilan grid"
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
                    aria-label="Tampilan daftar"
                    className={cn(
                      "rounded-none h-10 px-3 hover:bg-brand-orange/20",
                      viewMode === 'list' ? "bg-brand-orange text-brand-black" : "text-muted-foreground"
                    )}
                  >
                    <List className="w-5 h-5" />
                  </Button>
                </div>

                {/* Sort Toggle */}
                <div className="flex items-center border-2 border-brand-black bg-brand-white">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSortOrder('default')}
                    aria-label="Default (Terbaru)"
                    title="Terbaru di atas, Stok habis di bawah"
                    className={cn(
                      "rounded-none h-10 px-3 hover:bg-brand-orange/20",
                      sortOrder === 'default' ? "bg-brand-orange text-brand-black" : "text-muted-foreground"
                    )}
                  >
                    <Sparkles className="w-5 h-5" />
                  </Button>
                  <div className="w-0.5 h-6 bg-brand-black/10" />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (sortOrder === 'default') {
                        setSortOrder('asc');
                      } else if (sortOrder === 'asc') {
                        setSortOrder('desc');
                      } else {
                        setSortOrder('asc');
                      }
                    }}
                    aria-label={sortOrder === 'asc' ? 'A-Z' : sortOrder === 'desc' ? 'Z-A' : 'Abjad'}
                    title={sortOrder === 'asc' ? 'Urut A-Z (Klik untuk Z-A)' : sortOrder === 'desc' ? 'Urut Z-A (Klik untuk A-Z)' : 'Urut Abjad'}
                    className={cn(
                      "rounded-none h-10 px-3 hover:bg-brand-orange/20 transition-all",
                      sortOrder !== 'default' ? "bg-brand-orange text-brand-black" : "text-muted-foreground"
                    )}
                  >
                    <ArrowUpDown
                      className={cn(
                        "w-5 h-5 transition-transform duration-300",
                        sortOrder === 'asc' && "rotate-180",
                        sortOrder === 'desc' && "rotate-0"
                      )}
                    />
                  </Button>
                </div>
              </div>

              {/* Categories */}
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center flex-wrap gap-2 justify-center">
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
                  {paginatedProducts.map((product) => <ProductCard key={product.id} product={product} />)}
                </div>
              ) : (
                <div className="border-4 border-brand-black bg-brand-white">
                  <Table>
                    <TableBody>
                      {paginatedProducts.map((product) => <MobileProductRow key={product.id} product={product} />)}
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

          {/* Pagination Controls */}
          {!isLoading && !error && filteredProducts.length > 0 && totalPages > 1 && (
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 bg-brand-white border-2 border-brand-black p-4">
              <div className="font-mono text-sm text-muted-foreground">
                Menampilkan {startIndex + 1}-{Math.min(endIndex, filteredProducts.length)} dari {filteredProducts.length} produk
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  aria-label="Halaman sebelumnya"
                  className="rounded-none border-2 border-brand-black bg-brand-white text-brand-black hover:bg-brand-orange disabled:opacity-50 disabled:cursor-not-allowed h-10 w-10 p-0"
                >
                  <ChevronLeft className="w-5 h-5" />
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    const showPage = page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1);

                    const showEllipsis = (page === currentPage - 2 && currentPage > 3) ||
                      (page === currentPage + 2 && currentPage < totalPages - 2);

                    if (!showPage && !showEllipsis) return null;

                    if (showEllipsis) {
                      return (
                        <span key={page} className="px-2 font-mono text-muted-foreground">
                          ...
                        </span>
                      );
                    }

                    return (
                      <Button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={cn(
                          "rounded-none border-2 border-brand-black h-10 min-w-10 px-3 font-mono font-bold",
                          currentPage === page
                            ? "bg-brand-black text-brand-white"
                            : "bg-brand-white text-brand-black hover:bg-brand-orange"
                        )}
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  aria-label="Halaman selanjutnya"
                  className="rounded-none border-2 border-brand-black bg-brand-white text-brand-black hover:bg-brand-orange disabled:opacity-50 disabled:cursor-not-allowed h-10 w-10 p-0"
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}