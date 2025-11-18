import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { saleSchema, type SaleFormValues } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useWarungStore } from '@/lib/store';
import { toast } from 'sonner';
import { PlusCircle, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
interface SaleFormProps {
  onSuccess: () => void;
}
export function SaleForm({ onSuccess }: SaleFormProps) {
  const products = useWarungStore((state) => state.products);
  const fetchProducts = useWarungStore((state) => state.fetchProducts);
  const addSale = useWarungStore((state) => state.addSale);
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
    const promise = addSale(values);
    toast.promise(promise, {
      loading: 'Menyimpan...',
      success: 'Sale recorded successfully!',
      error: 'Failed to record sale.',
    });
    await promise;
    onSuccess();
  };
  const handleProductChange = (productId: string, index: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      update(index, {
        ...fields[index],
        productId: product.id,
        productName: product.name,
        price: product.price
      });
    }
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
          {fields.map((field, index) => (
            <div key={field.id} className="flex items-end gap-2 p-3 border-2 border-dashed border-brand-black">
              <FormField
                control={form.control}
                name={`items.${index}.productId`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="font-mono font-bold text-xs">Produk</FormLabel>
                    <Select onValueChange={(value) => handleProductChange(value, index)} defaultValue={field.value}>
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
              <FormField
                control={form.control}
                name={`items.${index}.quantity`}
                render={({ field }) => (
                  <FormItem className="w-24">
                    <FormLabel className="font-mono font-bold text-xs">Jml</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} className="rounded-none border-2 border-brand-black" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="rounded-none border-2 border-brand-black h-10 w-10">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => append({ productId: '', productName: '', quantity: 1, price: 0 })}
          className="w-full rounded-none border-2 border-dashed border-brand-black"
        >
          <PlusCircle className="w-4 h-4 mr-2" /> Tambah Item
        </Button>
        <div className="text-right font-mono text-xl font-bold border-t-4 border-brand-black pt-4">
          Total: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(total)}
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