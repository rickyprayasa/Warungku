import type { Product } from '@shared/types';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useWarungStore } from '@/lib/store';
interface ProductCardProps {
  product: Product;
}
export function ProductCard({ product }: ProductCardProps) {
  const addToCart = useWarungStore((state) => state.addToCart);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };
  return (
    <div className="bg-brand-white border-2 border-brand-black rounded-none flex flex-col overflow-hidden transition-all duration-200 hover:shadow-hard">
      <div className="aspect-square w-full overflow-hidden border-b-2 border-brand-black">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-300 hover:scale-110"
        />
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex-1">
          <p className="text-xs font-mono uppercase text-muted-foreground">{product.category}</p>
          <h3 className="font-bold text-lg text-brand-black leading-tight">{product.name}</h3>
          <p className="font-mono font-bold text-brand-orange text-xl my-2">{formatCurrency(product.price)}</p>
        </div>
        <Button
          onClick={() => addToCart(product)}
          className="w-full bg-brand-white text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-sm shadow-hard-sm hover:bg-brand-orange hover:shadow-hard active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
        >
          <PlusCircle className="w-4 h-4 mr-2" />
          Add to Cart
        </Button>
      </div>
    </div>
  );
}