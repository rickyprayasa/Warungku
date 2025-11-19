import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { purchaseSchema, type PurchaseFormValues } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useWarungStore } from '@/lib/store';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Package } from 'lucide-react';
interface PurchaseFormProps {
  onSuccess: () => void;
}
export function PurchaseForm({ onSuccess }: PurchaseFormProps) {
  const { products, suppliers, fetchProducts, fetchSuppliers, addPurchase } = useWarungStore(
    useShallow((state) => ({
      products: state.products,
      suppliers: state.suppliers,
      fetchProducts: state.fetchProducts,
      fetchSuppliers: state.fetchSuppliers,
      addPurchase: state.addPurchase,
    }))
  );
  const [isPackPurchase, setIsPackPurchase] = useState(false);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      productId: '',
      quantity: 1,
      packQuantity: 1,
      unitsPerPack: 1,
      unitCost: 0,
      supplier: '',
    },
  });
  useEffect(() => {
    if (products.length === 0) fetchProducts();
    if (suppliers.length === 0) fetchSuppliers();
  }, [products.length, suppliers.length, fetchProducts, fetchSuppliers]);

  const onSubmit = async (values: PurchaseFormValues) => {
    const promise = addPurchase(values);
    toast.promise(promise, {
      loading: 'Menyimpan...',
      success: 'Pembelian berhasil dicatat!',
      error: 'Gagal mencatat pembelian.',
    });
    await promise;
    onSuccess();
  };

  const { quantity, unitCost, packQuantity, unitsPerPack } = form.watch();

  // Calculate based on mode
  const actualQuantity = isPackPurchase && packQuantity && unitsPerPack
    ? packQuantity * unitsPerPack
    : (quantity || 0);
  const actualUnitCost = isPackPurchase && unitsPerPack && unitCost
    ? unitCost / unitsPerPack
    : (unitCost || 0);
  const totalCost = actualQuantity * actualUnitCost;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">Produk</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="rounded-none border-2 border-brand-black">
                    <SelectValue placeholder="Pilih produk" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-none border-2 border-brand-black bg-brand-white">
                  {products.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Toggle Pack Purchase Mode */}
        <div className="flex items-center justify-between border-2 border-dashed border-brand-black p-4 bg-muted/20">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-orange" />
            <div>
              <p className="font-mono font-bold text-sm">Pembelian Per Dus/Paket</p>
              <p className="text-xs text-muted-foreground font-mono">
                {isPackPurchase ? 'Mode: Dus/Paket' : 'Mode: Unit Satuan'}
              </p>
            </div>
          </div>
          <Switch
            checked={isPackPurchase}
            onCheckedChange={setIsPackPurchase}
            className="data-[state=checked]:bg-brand-orange"
          />
        </div>

        {isPackPurchase ? (
          // Pack/Box Purchase Mode
          <div className="space-y-4 border-2 border-brand-black p-4 bg-brand-white">
            <p className="font-mono font-bold text-sm text-brand-orange mb-3">📦 Pembelian Dus/Paket</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="packQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono font-bold">Jumlah Dus/Paket</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => {
                          const val = e.target.value;
                          field.onChange(val === '' ? '' : parseInt(val, 10) || 0);
                        }}
                        className="rounded-none border-2 border-brand-black"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">Contoh: 2 dus</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unitsPerPack"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono font-bold">Isi Per Dus/Paket</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => {
                          const val = e.target.value;
                          field.onChange(val === '' ? '' : parseInt(val, 10) || 0);
                        }}
                        className="rounded-none border-2 border-brand-black"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">Contoh: 40 unit/dus</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="unitCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono font-bold">Harga Per Dus/Paket</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 100000"
                      {...field}
                      onChange={e => {
                        const val = e.target.value;
                        field.onChange(val === '' ? '' : parseFloat(val) || 0);
                      }}
                      className="rounded-none border-2 border-brand-black"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">Harga total per dus/paket</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="border-t-2 border-dashed border-brand-black pt-3 mt-3">
              <p className="text-sm font-mono text-muted-foreground mb-2">💡 Perhitungan Otomatis:</p>
              <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                <p>Total Unit: <span className="font-bold text-brand-orange">{actualQuantity}</span></p>
                <p>Harga per Unit: <span className="font-bold text-brand-orange">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(actualUnitCost)}
                </span></p>
              </div>
            </div>
          </div>
        ) : (
          // Regular Unit Purchase Mode
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono font-bold">Jumlah Unit</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={e => {
                        const val = e.target.value;
                        field.onChange(val === '' ? '' : parseInt(val, 10) || 0);
                      }}
                      className="rounded-none border-2 border-brand-black"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="unitCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono font-bold">Harga Beli Per Unit</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 2500"
                      {...field}
                      onChange={e => {
                        const val = e.target.value;
                        field.onChange(val === '' ? '' : parseFloat(val) || 0);
                      }}
                      className="rounded-none border-2 border-brand-black"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="supplier"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">Pemasok</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="rounded-none border-2 border-brand-black">
                    <SelectValue placeholder="Pilih pemasok" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-none border-2 border-brand-black bg-brand-white">
                  {suppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="text-right font-mono text-xl font-bold border-t-4 border-brand-black pt-4">
          Total Biaya: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalCost)}
        </div>
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-base shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12"
        >
          {form.formState.isSubmitting ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </form>
    </Form>
  );
}