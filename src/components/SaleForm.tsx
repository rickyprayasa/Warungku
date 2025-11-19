import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { saleSchema, type SaleFormValues } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useWarungStore } from '@/lib/store';
import { toast } from 'sonner';
import { PlusCircle, Trash2, AlertTriangle, Package } from 'lucide-react';
import { useEffect, useState } from 'react';
interface SaleFormProps {
  onSuccess: () => void;
}
export function SaleForm({ onSuccess }: SaleFormProps) {
  const products = useWarungStore((state) => state.products);
  const fetchProducts = useWarungStore((state) => state.fetchProducts);
  const addSale = useWarungStore((state) => state.addSale);
  const [isDisplaySale, setIsDisplaySale] = useState(false);
  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleSchema),
    defaultValues: {
      items: [{ productId: '', productName: '', quantity: 1, price: 0 }],
    },
  });
  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });
  useEffect(() => {
    if (products.length === 0) {
      fetchProducts();
    }
  }, [products, fetchProducts]);

  const total = form.watch('items').reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 0), 0);

  const onSubmit = async (values: SaleFormValues) => {
    const saleData = {
      ...values,
      saleType: isDisplaySale ? 'display' as const : 'retail' as const,
    };

    const promise = addSale(saleData);
    toast.promise(promise, {
      loading: 'Menyimpan...',
      success: isDisplaySale
        ? '📦 Penjualan display berhasil dicatat! Profit telah tercatat.'
        : 'Penjualan berhasil dicatat!',
      error: 'Gagal mencatat penjualan.',
    });
    await promise;
    onSuccess();
  };

  const handleProductChange = (productId: string, index: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      const currentItem = form.getValues(`items.${index}`);

      // Check stock availability
      const availableStock = product.totalStock || 0;
      if (availableStock === 0) {
        toast.error(`${product.name} stok habis!`);
        return;
      }

      update(index, {
        ...currentItem,
        productId: product.id,
        productName: product.name,
        price: product.price // Auto-fill from product
      });

      // Show stock info
      if (availableStock <= 5) {
        toast.warning(`Stok ${product.name} tinggal ${availableStock} unit`);
      }
    }
  };

  const handleQuantityChange = (quantity: number, index: number) => {
    const item = form.getValues(`items.${index}`);
    const product = products.find(p => p.id === item.productId);

    if (product) {
      const availableStock = product.totalStock || 0;

      if (quantity > availableStock) {
        toast.error(
          `Stok ${product.name} hanya ${availableStock} unit`,
          { duration: 3000 }
        );
        // Auto-adjust to max available
        form.setValue(`items.${index}.quantity`, availableStock);
        return;
      }
    }

    form.setValue(`items.${index}.quantity`, quantity);
  };

  const getProductStock = (productId: string): number => {
    const product = products.find(p => p.id === productId);
    return product?.totalStock || 0;
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Habis', color: 'bg-red-500' };
    if (stock <= 5) return { label: `Sisa ${stock}`, color: 'bg-yellow-500' };
    return { label: `${stock} unit`, color: 'bg-green-500' };
  };

  const calculateDiscount = (originalPrice: number, actualPrice: number) => {
    if (actualPrice >= originalPrice) return null;
    const discountPercent = Math.round((1 - actualPrice / originalPrice) * 100);
    return discountPercent;
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        {/* Display Sale Mode Toggle */}
        <div className="border-2 border-dashed border-purple-500 bg-purple-50 p-4 rounded-lg">
          <div className="flex items-start gap-3">
            <Switch
              checked={isDisplaySale}
              onCheckedChange={setIsDisplaySale}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-4 h-4 text-purple-600" />
                <label className="font-mono font-bold text-sm text-purple-900">
                  Mode Jual Display (Bulk)
                </label>
              </div>
              <p className="text-xs text-purple-700 font-mono leading-relaxed">
                Untuk produk yang ditaruh di display/etalase. Profit langsung tercatat
                secara bulk, tidak perlu input tiap penjualan kecil (cocok untuk permen, snack, dll).
              </p>
            </div>
          </div>
        </div>

        {isDisplaySale && (
          <Alert className="border-2 border-purple-500 bg-purple-50">
            <AlertDescription className="text-xs font-mono text-purple-800">
              💡 <strong>Catatan:</strong> Stock akan berkurang sesuai jumlah yang di-display.
              Profit tercatat upfront. Customer beli eceran tidak perlu input lagi.
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {fields.map((field, index) => {
            const item = form.watch(`items.${index}`);
            const product = products.find(p => p.id === item.productId);
            const stock = product ? (product.totalStock || 0) : 0;
            const stockStatus = getStockStatus(stock);
            const discount = product ? calculateDiscount(product.price, item.price) : null;

            return (
              <div key={field.id} className={`p-4 border-2 bg-muted/10 space-y-3 ${isDisplaySale ? 'border-purple-500 bg-purple-50' : 'border-brand-black'
                }`}>
                {/* Product Selection */}
                <div className="grid grid-cols-[1fr,auto] gap-2 items-end">
                  <FormField
                    control={form.control}
                    name={`items.${index}.productId`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono font-bold text-sm">Produk</FormLabel>
                        <Select
                          onValueChange={(value) => handleProductChange(value, index)}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger className="rounded-none border-2 border-brand-black">
                              <SelectValue placeholder="Pilih produk" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-none border-2 border-brand-black bg-brand-white">
                            {products.map(p => {
                              const pStock = p.totalStock || 0;
                              const pStatus = getStockStatus(pStock);
                              return (
                                <SelectItem
                                  key={p.id}
                                  value={p.id}
                                  disabled={pStock === 0}
                                >
                                  <div className="flex items-center gap-2">
                                    <span>{p.name}</span>
                                    <Badge className={`${pStatus.color} text-white text-xs`}>
                                      {pStatus.label}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => remove(index)}
                    className="rounded-none border-2 border-brand-black h-10 w-10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Stock Warning if product selected */}
                {product && stock > 0 && stock <= 5 && (
                  <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 p-2 border-2 border-yellow-500">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-mono">Stok rendah! Tersisa {stock} unit</span>
                  </div>
                )}

                {/* Quantity and Price */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono font-bold text-sm">Jumlah</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={e => handleQuantityChange(parseInt(e.target.value, 10) || 1, index)}
                            className="rounded-none border-2 border-brand-black"
                            max={stock}
                          />
                        </FormControl>
                        {product && (
                          <FormDescription className="text-xs font-mono">
                            Max: {stock} unit
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`items.${index}.price`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-mono font-bold text-sm flex items-center gap-2">
                          Harga Jual
                          {discount && (
                            <Badge className="bg-green-600 text-white text-xs">
                              -{discount}%
                            </Badge>
                          )}
                        </FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            className="rounded-none border-2 border-brand-black"
                            min={0}
                          />
                        </FormControl>
                        {product && item.price !== product.price && (
                          <FormDescription className="text-xs font-mono">
                            Normal: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(product.price)}
                          </FormDescription>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Item Subtotal */}
                <div className="text-right text-sm font-mono">
                  Subtotal: <span className="font-bold text-brand-orange">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format((item.price || 0) * (item.quantity || 0))}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <Button
          type="button"
          variant="outline"
          onClick={() => append({ productId: '', productName: '', quantity: 1, price: 0 })}
          className="w-full rounded-none border-2 border-dashed border-brand-black font-mono font-bold"
        >
          <PlusCircle className="w-4 h-4 mr-2" /> Tambah Item
        </Button>

        <div className="text-right font-mono text-2xl font-bold border-t-4 border-brand-black pt-4 text-brand-orange">
          TOTAL: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(total)}
        </div>
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className={`w-full border-2 border-brand-black rounded-none font-bold uppercase text-base shadow-hard hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12 ${isDisplaySale
              ? 'bg-purple-500 text-white hover:bg-purple-700'
              : 'bg-brand-orange text-brand-black hover:bg-brand-black hover:text-brand-white'
            }`}
        >
          {form.formState.isSubmitting
            ? 'Menyimpan...'
            : isDisplaySale
              ? '📦 Catat Penjualan Display'
              : 'Simpan Penjualan'
          }
        </Button>
      </form>
    </Form>
  );
}