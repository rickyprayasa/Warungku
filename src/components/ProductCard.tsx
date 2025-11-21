import { cn } from '@/lib/utils';
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

  const isActive = product.isActive ?? true;

  return (
    <Dialog>
      <DialogTrigger asChild disabled={!isActive}>
        <motion.div
          whileHover={isActive ? { y: -5 } : {}}
          transition={{ duration: 0.2 }}
          className={cn(
            "bg-brand-white border-2 border-brand-black rounded-none flex flex-col overflow-hidden transition-shadow duration-200 group relative",
            isActive ? "hover:shadow-hard cursor-pointer" : "grayscale opacity-60 cursor-not-allowed"
          )}>


          {/* Inactive Overlay - Just grayscale, no text */}
          {!isActive ? (
            <div className="absolute inset-0 bg-white/30 z-20 pointer-events-none" />
          ) : null}

          {/* Promo Badge */}
          {product.isPromo && isActive ? (
            <div className="absolute top-2 right-2 z-10">
              <Badge className="bg-red-500 text-white border-2 border-brand-black rounded-none font-mono font-bold shadow-hard">
                🏷️ PROMO
              </Badge>
            </div>
          ) : null}

          <div className="aspect-square w-full overflow-hidden border-b-2 border-brand-black">
            <img
              src={product.imageUrl}
              alt={product.name}
              className={cn(
                "w-full h-full object-cover transition-transform duration-300",
                isActive && "group-hover:scale-110"
              )}
            />
          </div>
          <div className="p-4 flex flex-col flex-1">
            <div className="flex-1">
              <p className="text-xs font-mono uppercase text-muted-foreground">{product.category}</p>
              <h3 className="font-bold text-lg text-brand-black leading-tight">{product.name}</h3>
            </div>

            {/* Price Display */}
            {product.isPromo && product.promoPrice && isActive ? (
              <div className="mt-2">
                <p className="font-mono text-sm text-muted-foreground line-through">
                  {formatCurrency(product.price)}
                </p>
                <p className="font-mono font-bold text-red-500 text-xl">
                  {formatCurrency(product.promoPrice)}
                </p>
              </div>
            ) : (
              <p className="font-mono font-bold text-brand-orange text-xl mt-2">
                {formatCurrency(product.price)}
              </p>
            )}
          </div>
        </motion.div>
      </DialogTrigger>
      {isActive ? (
        <DialogContent className="sm:max-w-[425px] rounded-none border-4 border-brand-black bg-brand-white p-0">
          <ProductDetailDialog product={product} />
        </DialogContent>
      ) : null}
    </Dialog>
  );
}