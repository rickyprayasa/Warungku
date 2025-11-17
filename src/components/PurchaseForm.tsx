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
interface PurchaseFormProps {
  onSuccess: () => void;
}
export function PurchaseForm({ onSuccess }: PurchaseFormProps) {
  const products = useWarungStore((state) => state.products);
  const fetchProducts = useWarungStore((state) => state.fetchProducts);
  const addPurchase = useWarungStore((state) => state.addPurchase);
  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      productId: '',
      quantity: 1,
      cost: 0,
      supplier: '',
    },
  });
  useEffect(() => {
    if (products.length === 0) {
      fetchProducts();
    }
  }, [products, fetchProducts]);
  const onSubmit = async (values: PurchaseFormValues) => {
    const promise = addPurchase(values);
    toast.promise(promise, {
      loading: 'Recording purchase...',
      success: 'Purchase recorded successfully!',
      error: 'Failed to record purchase.',
    });
    await promise;
    onSuccess();
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">Product</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="rounded-none border-2 border-brand-black">
                    <SelectValue placeholder="Select a product to purchase" />
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
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">Quantity</FormLabel>
              <FormControl>
                <Input type="number" {...field} onChange={event => field.onChange(+event.target.value)} className="rounded-none border-2 border-brand-black" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cost"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">Total Cost</FormLabel>
              <FormControl>
                <Input type="number" placeholder="e.g., 100000" {...field} onChange={event => field.onChange(+event.target.value)} className="rounded-none border-2 border-brand-black" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="supplier"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">Supplier (Optional)</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Indofood" {...field} className="rounded-none border-2 border-brand-black" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-base shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12"
        >
          {form.formState.isSubmitting ? 'Saving...' : 'Save Purchase'}
        </Button>
      </form>
    </Form>
  );
}