import { useWarungStore, type CartItem } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Trash2, X } from 'lucide-react';
import { useMemo } from 'react';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
export function OrderSummary() {
  const cart = useWarungStore((state) => state.cart);
  const updateQuantity = useWarungStore((state) => state.updateQuantity);
  const removeFromCart = useWarungStore((state) => state.removeFromCart);
  const clearCart = useWarungStore((state) => state.clearCart);
  const cartItems = useMemo(() => Array.from(cart.values()), [cart]);
  const total = useMemo(() => {
    return cartItems.reduce((acc, item) => acc + item.product.price * item.quantity, 0);
  }, [cartItems]);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };
  const handleCheckout = async () => {
    if (cartItems.length === 0) {
      toast.error("Keranjang kosong!");
      return;
    }
    const transactionItems = cartItems.map(item => ({
      productId: item.product.id,
      quantity: item.quantity,
      price: item.product.price,
    }));
    try {
      const promise = api('/api/transactions', {
        method: 'POST',
        body: JSON.stringify({ items: transactionItems, total }),
      });
      toast.promise(promise, {
        loading: 'Memproses transaksi...',
        success: () => {
          clearCart();
          return 'Transaksi berhasil!';
        },
        error: 'Gagal memproses transaksi.',
      });
    } catch (error) {
      console.error("Checkout failed:", error);
    }
  };
  return (
    <aside className="w-full lg:w-[380px] bg-brand-white border-l-4 border-brand-black flex flex-col h-full">
      <div className="p-6 border-b-4 border-brand-black">
        <h2 className="text-2xl font-display font-bold text-brand-black">Order Summary</h2>
      </div>
      {cartItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <p className="text-brand-black font-mono">Keranjang belanja Anda kosong.</p>
          <p className="text-muted-foreground text-sm">Tambahkan produk untuk memulai.</p>
        </div>
      ) : (
        <>
          <ScrollArea className="flex-1">
            <div className="p-6 space-y-4">
              {cartItems.map((item) => (
                <div key={item.product.id} className="flex items-start space-x-4">
                  <img src={item.product.imageUrl} alt={item.product.name} className="w-16 h-16 object-cover border-2 border-brand-black" />
                  <div className="flex-1">
                    <p className="font-bold text-brand-black leading-tight">{item.product.name}</p>
                    <p className="text-sm font-mono text-muted-foreground">{formatCurrency(item.product.price)}</p>
                    <div className="flex items-center mt-2">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value, 10) || 0)}
                        className="w-16 h-8 text-center border-2 border-brand-black rounded-none focus-visible:ring-brand-orange"
                        min="1"
                      />
                      <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(item.product.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-6 border-t-4 border-brand-black bg-muted/30">
            <div className="space-y-2">
              <div className="flex justify-between font-mono">
                <span>Subtotal</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between font-mono">
                <span>Pajak</span>
                <span>Rp 0</span>
              </div>
              <Separator className="my-2 bg-brand-black h-0.5" />
              <div className="flex justify-between font-display font-bold text-xl text-brand-black">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
            <Button
              onClick={handleCheckout}
              className="w-full mt-4 bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-base shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12"
            >
              Checkout
            </Button>
          </div>
        </>
      )}
    </aside>
  );
}