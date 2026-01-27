import { useCartStore } from '@/lib/cart-store';
import { useWarungStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function FloatingCart() {
  const { openCart, getItemCount, getTotal } = useCartStore();
  const storeProfile = useWarungStore((state) => state.storeProfile);
  const itemCount = getItemCount();
  const total = getTotal();

  const isCartEnabled = storeProfile.cartEnabled ?? true;

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);

  if (!isCartEnabled || itemCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-40"
      >
        <Button
          onClick={openCart}
          aria-label={`Keranjang (${itemCount} item, ${formatCurrency(total)})`}
          className="w-14 h-14 bg-brand-orange text-brand-black border-4 border-brand-black rounded-full font-bold shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center p-0"
        >
          <div className="relative flex items-center justify-center">
            <ShoppingCart className="w-7 h-7" />
            {itemCount > 0 && (
              <span className="absolute -top-2 -right-2 bg-brand-black text-brand-white text-xs font-bold min-w-5 h-5 px-1 rounded-full flex items-center justify-center border-2 border-brand-white">
                {itemCount}
              </span>
            )}
          </div>
        </Button>
      </motion.div>

    </AnimatePresence>
  );
}
