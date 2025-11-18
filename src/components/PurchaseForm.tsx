import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { purchaseSchema, type PurchaseFormValues } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWarungStore } from '@/lib/store';
import { toast } from 'sonner';
import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
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
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      productId: '',
      quantity: 1,
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
      success: 'Purchase recorded successfully!',
      error: 'Failed to record purchase.',
    });
    await promise;
    onSuccess();
  };
  const { quantity, unitCost } = form.watch();
  const totalCost = (quantity || 0) * (unitCost || 0);
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
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-mono font-bold">Jumlah</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : +e.target.value)} className="rounded-none border-2 border-brand-black" />
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
                <FormLabel className="font-mono font-bold">Harga Beli Satuan</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g., 2500" {...field} onChange={e => field.onChange(e.target.value === '' ? '' : +e.target.value)} className="rounded-none border-2 border-brand-black" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
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