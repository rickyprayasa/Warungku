import { useCartStore } from '@/lib/cart-store';
import { useWarungStore } from '@/lib/store';
import { useStore } from '@/contexts/StoreContext';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ShoppingCart, Minus, Plus, Trash2, CreditCard, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export function CartSheet() {
  const { items, isCartOpen, closeCart, updateQuantity, removeFromCart, clearCart, getTotal } = useCartStore();
  const storeProfile = useWarungStore((state) => state.storeProfile);
  const { publicStore, isPublicMode } = useStore();
  const navigate = useNavigate();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);

  const handleCheckout = () => {
    closeCart();
    // Use store-specific checkout URL when in public mode to preserve store context
    if (isPublicMode && publicStore?.slug) {
      navigate(`/${publicStore.slug}/checkout`);
    } else {
      navigate('/checkout');
    }
  };

  const total = getTotal();

  return (
    <Sheet open={isCartOpen} onOpenChange={(open) => !open && closeCart()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md p-0 flex flex-col border-l-4 border-brand-black bg-brand-white"
      >
        {/* Header */}
        <div className="bg-brand-orange p-4 border-b-4 border-brand-black">
          <SheetHeader>
            <SheetTitle className="font-display font-black text-2xl text-brand-black uppercase tracking-wider flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" />
              Keranjang
            </SheetTitle>
            <SheetDescription className="font-mono text-brand-black/70 text-sm">
              {storeProfile.name}
            </SheetDescription>
          </SheetHeader>
        </div>

        {/* Cart Items */}
        <ScrollArea className="flex-1 p-4">
          <AnimatePresence mode="popLayout">
            {items.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4 border-2 border-brand-black">
                  <ShoppingCart className="w-10 h-10 text-gray-400" />
                </div>
                <p className="font-mono text-muted-foreground">Keranjang kosong</p>
                <p className="font-mono text-sm text-muted-foreground mt-1">
                  Pilih jajanan dari menu untuk ditambahkan
                </p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {items.map((item) => {
                  const price =
                    item.product.isPromo && item.product.promoPrice
                      ? item.product.promoPrice
                      : item.product.price;
                  const subtotal = price * item.quantity;

                  return (
                    <motion.div
                      key={item.product.id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="relative flex gap-3 p-3 bg-white border-2 border-brand-black group"
                    >
                      {/* Product Image */}
                      <div className="w-16 h-16 flex-shrink-0 border-2 border-brand-black overflow-hidden">
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0 pr-8">
                        <h4 className="font-bold text-sm truncate">{item.product.name}</h4>
                        <p className="font-mono text-xs text-muted-foreground">
                          {formatCurrency(price)}
                          {item.product.qtyPerUnit && item.product.qtyPerUnit > 1
                            ? ` / ${item.product.qtyPerUnit} pcs`
                            : ' /pcs'
                          }
                        </p>
                        <p className="font-mono text-sm font-bold text-brand-orange mt-1">
                          {formatCurrency(subtotal)}
                        </p>
                      </div>

                      {/* Delete Button - Absolute Top Right */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.product.id)}
                        className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </Button>

                      {/* Quantity Controls - Bottom Right */}
                      <div className="flex items-end self-end">
                        <div className="flex items-center border-2 border-brand-black bg-white">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            className="h-7 w-7 rounded-none hover:bg-brand-orange/20"
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center font-mono text-sm font-bold">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            className="h-7 w-7 rounded-none hover:bg-brand-orange/20"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </AnimatePresence>
        </ScrollArea>

        {/* Footer */}
        {/* Footer */}
        {items.length > 0 && (
          <div className="p-4 border-t-4 border-brand-black bg-gray-50 flex flex-col gap-3">
            {/* Clear Cart */}
            <Button
              variant="ghost"
              onClick={clearCart}
              className="w-full text-red-500 hover:text-red-700 hover:bg-red-50 font-mono text-sm h-auto py-2"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Kosongkan Keranjang
            </Button>

            {/* Total */}
            <div className="w-full p-3 bg-brand-black text-brand-white">
              <div className="flex justify-between items-center">
                <span className="font-mono text-sm">Total</span>
                <span className="font-display font-bold text-xl">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            {/* Checkout Button */}
            <Button
              onClick={handleCheckout}
              className="w-full h-12 bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-base shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all"
            >
              <CreditCard className="w-5 h-5 mr-2" />
              Bayar dengan QRIS
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
