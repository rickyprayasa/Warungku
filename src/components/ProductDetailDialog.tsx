import { useState } from 'react';
import type { Product } from '@shared/types';
import { Button } from '@/components/ui/button';
import { MessageSquare, PackagePlus } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { CustomerFeedbackDialog } from './CustomerFeedbackDialog';

interface ProductDetailDialogProps {
  product: Product;
}

export function ProductDetailDialog({ product }: ProductDetailDialogProps) {
  const [feedbackType, setFeedbackType] = useState<'stock_request' | 'feedback' | null>(null);

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

        {product.isPromo && product.promoPrice ? (
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

        {/* Customer Actions */}
        <div className="flex gap-2 mt-4">
          <Dialog open={feedbackType === 'stock_request'} onOpenChange={(open) => !open && setFeedbackType(null)}>
            <DialogTrigger asChild>
              <Button
                onClick={() => setFeedbackType('stock_request')}
                variant="outline"
                className="flex-1 border-2 border-brand-black rounded-none font-mono font-bold hover:bg-brand-orange hover:text-brand-black"
              >
                <PackagePlus className="w-4 h-4 mr-2" />
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
                className="flex-1 border-2 border-brand-black rounded-none font-mono font-bold hover:bg-brand-orange hover:text-brand-black"
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Kirim Feedback
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

        <p className="text-xs text-muted-foreground font-mono mt-4 text-center">
          💬 Ada pertanyaan? Kirim feedback kepada kami!
        </p>
      </div>
    </div>
  );
}