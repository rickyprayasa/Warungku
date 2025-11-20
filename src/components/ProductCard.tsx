import type { Product } from '@shared/types';
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ProductDetailDialog } from './ProductDetailDialog';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Package } from 'lucide-react';
interface ProductCardProps {
  product: Product;
}
export function ProductCard({ product }: ProductCardProps) {
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
  const stockText = stockStatus === 'out' ? 'Habis' : stockStatus === 'low' ? `Sisa ${stock}` : `Stok ${stock}`;

  return (
    <Dialog>
      <DialogTrigger asChild>
        <motion.div
          whileHover={{ y: -5 }}
          transition={{ duration: 0.2 }}
          className="bg-brand-white border-2 border-brand-black rounded-none flex flex-col overflow-hidden transition-shadow duration-200 hover:shadow-hard cursor-pointer group relative">
          <div className="aspect-square w-full overflow-hidden border-b-2 border-brand-black">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
          </div>
          <div className="p-4 flex flex-col flex-1">
            <div className="flex-1">
              <p className="text-xs font-mono uppercase text-muted-foreground">{product.category}</p>
              <h3 className="font-bold text-lg text-brand-black leading-tight">{product.name}</h3>
            </div>
            <p className="font-mono font-bold text-brand-orange text-xl mt-2">{formatCurrency(product.price)}</p>
          </div>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px] rounded-none border-4 border-brand-black bg-brand-white p-0">
        <ProductDetailDialog product={product} />
      </DialogContent>
    </Dialog>
  );
}