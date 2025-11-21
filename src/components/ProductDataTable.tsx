import { useState, useMemo } from 'react';
import { useWarungStore } from '@/lib/store';
import type { Product } from '@shared/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Search, Filter } from 'lucide-react';
import { ProductForm } from './ProductForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { AdminProductDetailDialog } from './AdminProductDetailDialog';

export function ProductDataTable() {
  const products = useWarungStore((state) => state.products);
  const deleteProduct = useWarungStore((state) => state.deleteProduct);
  const updateProduct = useWarungStore((state) => state.updateProduct);
  const [isEditDialogOpen, setEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isDetailDialogOpen, setDetailDialogOpen] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Get unique categories from products
  const categories = useMemo(() => {
    const unique = new Set(products.map(p => p.category).filter(Boolean));
    return ['all', ...Array.from(unique)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    return products.filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  const pageCount = Math.ceil(filteredProducts.length / rowsPerPage);
  const paginatedProducts = useMemo(() => {
    const start = page * rowsPerPage;
    const end = start + rowsPerPage;
    return filteredProducts.slice(start, end);
  }, [filteredProducts, page, rowsPerPage]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const handleEdit = (product: Product) => {
    setSelectedProduct(product);
    setEditDialogOpen(true);
  };

  const handleDelete = (product: Product) => {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  };



  const confirmDelete = async () => {
    if (selectedProduct) {
      const promise = deleteProduct(selectedProduct.id);
      toast.promise(promise, {
        loading: 'Menghapus produk...',
        success: 'Produk berhasil dihapus!',
        error: (err) => err instanceof Error ? err.message : 'Gagal menghapus produk.',
      });
      await promise;
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
    }
  };

  const handleStatusToggle = async (product: Product, isActive: boolean) => {
    try {
      const promise = updateProduct(product.id, { ...product, isActive });
      toast.promise(promise, {
        loading: 'Update status...',
        success: `Produk ${isActive ? 'diaktifkan' : 'dinonaktifkan'}`,
        error: 'Gagal update status',
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Cari produk..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(0);
            }}
            className="pl-9 rounded-none border-2 border-brand-black"
          />
        </div>
        <Select
          value={selectedCategory}
          onValueChange={(value) => {
            setSelectedCategory(value);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px] rounded-none border-2 border-brand-black">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <SelectValue placeholder="Kategori" />
            </div>
          </SelectTrigger>
          <SelectContent className="rounded-none border-2 border-brand-black">
            <SelectItem value="all">Semua Kategori</SelectItem>
            {categories.filter(c => c !== 'all').map((category) => (
              <SelectItem key={category} value={category}>{category}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block border-4 border-brand-black bg-brand-white overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader className="border-b-4 border-brand-black bg-muted/40">
            <TableRow>
              <TableHead className="w-[80px] font-bold text-brand-black">Gambar</TableHead>
              <TableHead className="font-bold text-brand-black">Nama</TableHead>
              <TableHead className="font-bold text-brand-black">Kategori</TableHead>
              <TableHead className="font-bold text-brand-black">Stok</TableHead>
              <TableHead className="font-bold text-brand-black">Harga</TableHead>
              <TableHead className="font-bold text-brand-black">Status</TableHead>
              <TableHead className="w-[120px] font-bold text-brand-black text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedProducts.map((product) => (
              <TableRow
                key={product.id}
                className="border-b-2 border-brand-black last:border-b-0 cursor-pointer hover:bg-brand-orange/10 transition-colors"
                onClick={(e) => {
                  // Only open detail if not clicking on buttons or switch
                  const target = e.target as HTMLElement;
                  if (target.closest('button') || target.closest('[role="switch"]')) {
                    return;
                  }
                  setSelectedProduct(product);
                  setDetailDialogOpen(true);
                }}
              >
                <TableCell onClick={() => {
                  setSelectedProduct(product);
                  setDetailDialogOpen(true);
                }}>
                  <img src={product.imageUrl} alt={product.name} className="w-12 h-12 object-cover border-2 border-brand-black" />
                </TableCell>
                <TableCell className="font-bold" onClick={() => {
                  setSelectedProduct(product);
                  setDetailDialogOpen(true);
                }}>{product.name}</TableCell>
                <TableCell className="font-mono">{product.category}</TableCell>
                <TableCell className="font-mono font-bold">{product.totalStock || 0}</TableCell>
                <TableCell className="font-mono">{formatCurrency(product.price)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Switch
                      checked={product.isActive ?? true}
                      onCheckedChange={(checked) => handleStatusToggle(product, checked)}
                      className="data-[state=checked]:bg-green-500 scale-75 origin-left"
                    />
                    <span className={`text-xs font-mono font-bold ${product.isActive ?? true ? 'text-green-600' : 'text-gray-400'}`}>
                      {product.isActive ?? true ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(product);
                      }}
                      className="h-8 w-8 rounded-none border-2 border-transparent hover:border-brand-black hover:bg-blue-100 text-blue-600"
                    >
                      <Pencil className="h-4 w-4" />
                      <span className="sr-only">Edit</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(product);
                      }}
                      className="h-8 w-8 rounded-none border-2 border-transparent hover:border-brand-black hover:bg-destructive/20 text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">Hapus</span>
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {paginatedProducts.map((product) => (
          <div key={product.id} className="border-4 border-brand-black bg-brand-white p-3 shadow-hard-sm">
            <div className="flex gap-3">
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-20 h-20 object-cover border-2 border-brand-black shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => {
                  setSelectedProduct(product);
                  setDetailDialogOpen(true);
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div
                    className="cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      setSelectedProduct(product);
                      setDetailDialogOpen(true);
                    }}
                  >
                    <h3 className="font-bold text-lg leading-tight truncate">{product.name}</h3>
                    <span className="text-xs font-mono bg-brand-orange/20 px-1 py-0.5 border border-brand-black/20 mt-1 inline-block">
                      {product.category}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" className="h-8 w-8 border-2 border-brand-black rounded-none hover:bg-brand-orange" onClick={() => handleEdit(product)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 border-2 border-brand-black rounded-none text-destructive hover:bg-destructive/10" onClick={() => handleDelete(product)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-3 flex justify-between items-end">
                  <div>
                    <p className="text-xs text-muted-foreground font-mono">Stok</p>
                    <p className="font-bold font-mono text-lg">{product.totalStock || 0}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground font-mono">Harga</p>
                    <p className="font-bold font-mono text-brand-orange text-lg">{formatCurrency(product.price)}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t-2 border-dashed border-brand-black/20 flex justify-between items-center">
              <span className={`text-xs font-mono font-bold ${product.isActive ?? true ? 'text-green-600' : 'text-gray-400'}`}>
                {product.isActive ?? true ? 'STATUS: AKTIF' : 'STATUS: NONAKTIF'}
              </span>
              <Switch
                checked={product.isActive ?? true}
                onCheckedChange={(checked) => handleStatusToggle(product, checked)}
                className="data-[state=checked]:bg-green-500 scale-75 origin-right"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-end space-x-2 py-4 font-mono">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Baris per halaman</p>
          <Select
            value={`${rowsPerPage}`}
            onValueChange={(value) => {
              setRowsPerPage(Number(value))
              setPage(0)
            }}
          >
            <SelectTrigger className="h-8 w-[70px] rounded-none border-2 border-brand-black"><SelectValue placeholder={String(rowsPerPage)} /></SelectTrigger>
            <SelectContent side="top" className="rounded-none border-2 border-brand-black">
              {[5, 10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>{pageSize}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          Halaman {page + 1} dari {pageCount}
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex rounded-none border-2 border-brand-black" onClick={() => setPage(0)} disabled={page === 0}><span className="sr-only">Go to first page</span><ChevronsLeft className="h-4 w-4" /></Button>
          <Button variant="outline" className="h-8 w-8 p-0 rounded-none border-2 border-brand-black" onClick={() => setPage(page - 1)} disabled={page === 0}><span className="sr-only">Go to previous page</span><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="outline" className="h-8 w-8 p-0 rounded-none border-2 border-brand-black" onClick={() => setPage(page + 1)} disabled={page >= pageCount - 1}><span className="sr-only">Go to next page</span><ChevronRight className="h-4 w-4" /></Button>
          <Button variant="outline" className="hidden h-8 w-8 p-0 lg:flex rounded-none border-2 border-brand-black" onClick={() => setPage(pageCount - 1)} disabled={page >= pageCount - 1}><span className="sr-only">Go to last page</span><ChevronsRight className="h-4 w-4" /></Button>
        </div>
      </div>

      <Dialog open={isEditDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto rounded-none border-4 border-brand-black bg-brand-white">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl font-bold">Edit Produk</DialogTitle>
          </DialogHeader>
          <ProductForm product={selectedProduct} onSuccess={() => setEditDialogOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="rounded-none border-4 border-brand-black bg-brand-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display text-2xl font-bold">Apakah Anda yakin?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus produk "{selectedProduct?.name ?? ''}" secara permanen.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-none border-2 border-brand-black">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-none border-2 border-brand-black">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AdminProductDetailDialog
        product={selectedProduct}
        open={isDetailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </>
  );
}