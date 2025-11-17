import type { Product } from '@shared/types';
interface ProductDetailDialogProps {
  product: Product;
}
export function ProductDetailDialog({ product }: ProductDetailDialogProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };
  return (
    <div>
      <div className="aspect-video w-full overflow-hidden border-b-4 border-brand-black">
        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
      </div>
      <div className="p-6">
        <p className="text-sm font-mono uppercase text-muted-foreground">{product.category}</p>
        <h2 className="text-3xl font-display font-bold text-brand-black my-1">{product.name}</h2>
        <p className="font-mono font-bold text-brand-orange text-2xl my-4">{formatCurrency(product.price)}</p>
        <p className="text-muted-foreground font-sans">
          Deskripsi detail untuk {product.name} akan ditampilkan di sini. Saat ini, kami hanya menampilkan informasi dasar.
        </p>
      </div>
    </div>
  );
}