import { useState } from 'react';
import type { Product } from '@shared/types';
import { Button } from '@/components/ui/button';
import { MessageSquare, PackagePlus, ShoppingCart, Minus, Plus, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { CustomerFeedbackDialog } from './CustomerFeedbackDialog';
import { useCartStore } from '@/lib/cart-store';
import { useWarungStore } from '@/lib/store';
import { toast } from 'sonner';

interface ProductDetailDialogProps {
  product: Product;
}

export function ProductDetailDialog({ product }: ProductDetailDialogProps) {
  const [feedbackType, setFeedbackType] = useState<'stock_request' | 'feedback' | null>(null);
  const [quantity, setQuantity] = useState(1);
  const addToCart = useCartStore((state) => state.addToCart);
  const openCart = useCartStore((state) => state.openCart);
  const storeProfile = useWarungStore((state) => state.storeProfile);
  
  const isCartEnabled = storeProfile.cartEnabled ?? true;
  const availableStock = product.totalStock ?? 0;
  const isOutOfStock = availableStock <= 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const qtyPerUnit = product.qtyPerUnit || 1;
  
  const handleAddToCart = () => {
    // Check if stock is enough (considering qtyPerUnit)
    const stockNeeded = quantity * qtyPerUnit;
    if (stockNeeded > availableStock) {
      toast.error(`Stok tidak mencukupi. Tersedia: ${availableStock} pcs (${Math.floor(availableStock / qtyPerUnit)} unit)`);
      return;
    }
    addToCart(product, quantity);
    toast.success(`${product.name} ditambahkan ke keranjang`, {
      action: {
        label: 'Lihat Keranjang',
        onClick: () => openCart(),
      },
    });
    setQuantity(1);
  };

  const price = product.isPromo && product.promoPrice ? product.promoPrice : product.price;
  const subtotal = price * quantity;
  // Max quantity based on available stock / qtyPerUnit
  const maxQuantity = Math.max(1, Math.floor(availableStock / qtyPerUnit));

  return (
    <div>
      <div className="aspect-video w-full overflow-hidden border-b-4 border-brand-black">
        <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
      </div>
      <div className="p-6">
        <p className="text-sm font-mono uppercase text-muted-foreground">{product.category}</p>
        <h2 className="text-3xl font-display font-bold text-brand-black my-1">{product.name}</h2>
        


        {product.isPromo && product.promoPrice !== undefined && product.promoPrice > 0 ? (
          <div className="my-4">
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono text-muted-foreground line-through decoration-2 decoration-red-500">
                {formatCurrency(product.price)}
              </span>
              <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full border border-red-200">
                PROMO
              </span>
            </div>
            <p className="font-mono font-bold text-red-600 text-3xl">
              {formatCurrency(product.promoPrice)}
            </p>
          </div>
        ) : (
          <p className="font-mono font-bold text-brand-orange text-2xl my-4">{formatCurrency(product.price)}</p>
        )}

        {/* Description */}
        {product.description && (
          <div className="border-2 border-brand-black p-4 mb-4 bg-muted/20">
            <p className="font-sans text-muted-foreground">{product.description}</p>
          </div>
        )}

        {/* Add to Cart Section - Only show if cart is enabled */}
        {isCartEnabled && (
          <div className="border-2 border-brand-black p-4 mb-4 bg-brand-orange/10">
            {isOutOfStock ? (
              <div className="flex items-center justify-center gap-2 py-4">
                <AlertCircle className="w-5 h-5 text-gray-500" />
                <span className="font-mono text-gray-500 font-bold">Stok Habis</span>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-sm font-bold">Jumlah:</span>
                  <div className="flex items-center border-2 border-brand-black bg-white">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="h-8 w-8 rounded-none hover:bg-brand-orange/20"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-12 text-center font-mono font-bold">{quantity}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                      className="h-8 w-8 rounded-none hover:bg-brand-orange/20"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-sm">Subtotal:</span>
                  <span className="font-display font-bold text-lg text-brand-orange">
                    {formatCurrency(subtotal)}
                  </span>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground mb-3">
                  Stok tersedia: {availableStock}
                </p>
                <Button
                  onClick={handleAddToCart}
                  className="w-full h-12 bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-base shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
                >
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Tambah ke Keranjang
                </Button>
              </>
            )}
          </div>
        )}

        {/* Customer Actions */}
        <div className="flex gap-2">
          <Dialog open={feedbackType === 'stock_request'} onOpenChange={(open) => !open && setFeedbackType(null)}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setFeedbackType('stock_request')}
                variant="outline"
                className="flex-1 border-2 border-brand-black rounded-none font-mono font-bold text-xs hover:bg-brand-orange hover:text-brand-black"
              >
                <PackagePlus className="w-4 h-4 mr-1" />
                Request Stok
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-none border-4 border-brand-black bg-brand-white p-0">
              <CustomerFeedbackDialog
                product={product}
                type="stock_request"
                onClose={() => setFeedbackType(null)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={feedbackType === 'feedback'} onOpenChange={(open) => !open && setFeedbackType(null)}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setFeedbackType('feedback')}
                variant="outline"
                className="flex-1 border-2 border-brand-black rounded-none font-mono font-bold text-xs hover:bg-brand-orange hover:text-brand-black"
              >
                <MessageSquare className="w-4 h-4 mr-1" />
                Feedback
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-none border-4 border-brand-black bg-brand-white p-0">
              <CustomerFeedbackDialog
                product={product}
                type="feedback"
                onClose={() => setFeedbackType(null)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}