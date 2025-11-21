import { useEffect, useState } from 'react';
import { useWarungStore } from '@/lib/store';
import { ProductDataTable } from '@/components/ProductDataTable';
import { Button } from '@/components/ui/button';
import { PlusCircle, Package, AlertTriangle, XCircle, Layers, ArrowUpDown, Settings2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProductForm } from '@/components/ProductForm';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner';

export type StockMethod = 'FIFO' | 'LIFO';

export function ProductManagement() {
  const products = useWarungStore((state) => state.products);
  const fetchProducts = useWarungStore((state) => state.fetchProducts);
  const isLoading = useWarungStore((state) => state.isLoading);
  const [isCreateDialogOpen, setCreateDialogOpen] = useState(false);
  const [stockMethod, setStockMethod] = useState<StockMethod>(() => {
    return (localStorage.getItem('stockMethod') as StockMethod) || 'FIFO';
  });

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleStockMethodChange = (value: StockMethod) => {
    setStockMethod(value);
    localStorage.setItem('stockMethod', value);
    toast.success(`Metode stok diubah ke ${value}`);
  };

  // Calculate stats
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, p) => sum + (p.totalStock || 0), 0);
  const outOfStock = products.filter(p => (p.totalStock || 0) === 0).length;
  const lowStock = products.filter(p => {
    const stock = p.totalStock || 0;
    return stock > 0 && stock <= 5;
  }).length;

  const StatCard = ({ title, value, icon: Icon, color, bgColor }: any) => (
    <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all duration-200 bg-white group relative overflow-hidden">
      <div className={`absolute top-0 right-0 p-2 ${bgColor} border-l-2 border-b-2 border-brand-black rounded-bl-lg rounded-tr-lg`}>
        <Icon className={`w-6 h-6 ${color}`} />
      </div>
      <CardContent className="p-6 pt-8">
        <p className="text-sm font-mono font-bold text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
        <p className="text-4xl font-display font-black text-brand-black">{value}</p>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 bg-brand-white border-2 border-brand-black rounded-lg p-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <div className="space-y-2">
          <h3 className="text-4xl font-display font-black text-brand-black uppercase tracking-tight">
            Produk & Stok
          </h3>
          <p className="font-mono text-base text-muted-foreground max-w-xl">
            Pusat kendali inventori. Kelola produk, pantau stok, dan atur strategi distribusi barang Anda.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 w-full xl:w-auto">
          <div className="flex items-center gap-2 bg-brand-black/5 p-1 pr-2 border-2 border-brand-black rounded-lg w-full sm:w-auto">
            <div className="bg-brand-black text-brand-white p-2 rounded-md">
              <Settings2 className="w-4 h-4" />
            </div>
            <div className="flex-1 sm:flex-none">
              <span className="text-xs font-mono font-bold text-muted-foreground block px-2">Metode Stok</span>
              <Select value={stockMethod} onValueChange={(v) => handleStockMethodChange(v as StockMethod)}>
                <SelectTrigger className="h-8 border-0 bg-transparent focus:ring-0 font-bold font-mono w-full sm:w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-2 border-brand-black rounded-lg font-mono font-bold">
                  <SelectItem value="FIFO">FIFO</SelectItem>
                  <SelectItem value="LIFO">LIFO</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Dialog open={isCreateDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-lg font-bold uppercase text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-brand-black hover:text-brand-white hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-full min-h-[3.5rem] w-full sm:w-auto px-6">
                <PlusCircle className="w-5 h-5 mr-2" />
                Produk Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto rounded-lg border-2 border-brand-black bg-brand-white">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl font-bold">Tambah Produk Baru</DialogTitle>
              </DialogHeader>
              <ProductForm onSuccess={() => setCreateDialogOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Produk"
          value={totalProducts}
          icon={Package}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <StatCard
          title="Total Stok"
          value={totalStock}
          icon={Layers}
          color="text-brand-orange"
          bgColor="bg-orange-100"
        />
        <StatCard
          title="Stok Rendah"
          value={lowStock}
          icon={AlertTriangle}
          color="text-yellow-600"
          bgColor="bg-yellow-100"
        />
        <StatCard
          title="Stok Habis"
          value={outOfStock}
          icon={XCircle}
          color="text-red-600"
          bgColor="bg-red-100"
        />
      </div>

      {isLoading ? (
        <div className="border-2 border-brand-black rounded-lg bg-white p-6 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <div className="space-y-4">
            <Skeleton className="h-12 w-full bg-brand-black/5" />
            <Skeleton className="h-12 w-full bg-brand-black/5" />
            <Skeleton className="h-12 w-full bg-brand-black/5" />
            <Skeleton className="h-12 w-full bg-brand-black/5" />
          </div>
        </div>
      ) : (
        <div className="border-2 border-brand-black rounded-lg bg-white p-1 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
          <ProductDataTable stockMethod={stockMethod} />
        </div>
      )}
    </div>
  );
}