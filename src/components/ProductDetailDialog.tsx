import { useState } from 'react';
import type { Product } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Package } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { StockDetailsDialog } from './StockDetailsDialog';
import { Badge } from '@/components/ui/badge';

interface ProductDetailDialogProps {
  product: Product;
}
export function ProductDetailDialog({ product }: ProductDetailDialogProps) {
  const [stockDialogOpen, setStockDialogOpen] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const stock = product.totalStock ?? 0;
  const stockStatus = stock === 0 ? 'out' : stock <= 5 ? 'low' : 'available';
  const stockColor = stockStatus === 'out' ? 'bg-red-500' : stockStatus === 'low' ? 'bg-yellow-500' : 'bg-green-500';

  return (
    <div>
      <div className="aspect-video w-full overflow-hidden border-b-4 border-brand-black">
        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
      </div>
      <div className="p-6">
        <p className="text-sm font-mono uppercase text-muted-foreground">{product.category}</p>
        <h2 className="text-3xl font-display font-bold text-brand-black my-1">{product.name}</h2>
        <p className="font-mono font-bold text-brand-orange text-2xl my-4">{formatCurrency(product.price)}</p>

        {/* Stock Information */}
        <div className="border-2 border-brand-black p-4 mb-4 bg-muted/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-brand-orange" />
              <p className="font-mono font-bold">Stok Tersedia</p>
            </div>
            <Badge className={`${stockColor} text-white border-2 border-brand-black rounded-none font-mono font-bold`}>
              {stock} Unit
            </Badge>
          </div>

          <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="w-full mt-2 border-2 border-brand-black rounded-none font-mono font-bold hover:bg-brand-orange hover:text-brand-black">
                <Package className="w-4 h-4 mr-2" />
                Lihat Detail Batch Stok
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl rounded-none border-4 border-brand-black bg-brand-white p-0">
              <StockDetailsDialog productId={product.id} productName={product.name} />
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-muted-foreground font-sans">
          Deskripsi detail untuk {product.name} akan ditampilkan di sini.
        </p>
      </div>
    </div>
  );
}