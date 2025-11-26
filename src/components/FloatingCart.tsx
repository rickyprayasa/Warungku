import { useCartStore } from '@/lib/cart-store';
import { Button } from '@/components/ui/button';
import { ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export function FloatingCart() {
  const { openCart, getItemCount, getTotal } = useCartStore();
  const itemCount = getItemCount();
  const total = getTotal();

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);

  if (itemCount === 0) return null;

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
          className="w-full md:w-auto h-14 bg-brand-orange text-brand-black border-4 border-brand-black rounded-none font-bold text-base shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-between gap-4 px-4"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <ShoppingCart className="w-6 h-6" />
              <span className="absolute -top-2 -right-2 bg-brand-black text-brand-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {itemCount}
              </span>
            </div>
            <span className="hidden md:inline font-mono uppercase">Keranjang</span>
          </div>
          <div className="font-display text-lg">
            {formatCurrency(total)}
          </div>
        </Button>
      </motion.div>
    </AnimatePresence>
  );
}
