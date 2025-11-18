import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { supplierSchema, type SupplierFormValues, type Supplier } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useWarungStore } from '@/lib/store';
import { toast } from 'sonner';
interface SupplierFormProps {
  supplier?: Supplier | null;
  onSuccess: () => void;
}
export function SupplierForm({ supplier, onSuccess }: SupplierFormProps) {
  const addSupplier = useWarungStore((state) => state.addSupplier);
  const updateSupplier = useWarungStore((state) => state.updateSupplier);
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name || '',
      contactPerson: supplier?.contactPerson || '',
      phone: supplier?.phone || '',
    },
  });
  const isSubmitting = form.formState.isSubmitting;
  const isEditing = !!supplier;
  const onSubmit = async (values: SupplierFormValues) => {
    try {
      if (isEditing && supplier) {
        const promise = updateSupplier(supplier.id, values);
        toast.promise(promise, {
          loading: 'Menyimpan...',
          success: 'Supplier updated successfully!',
          error: 'Failed to update supplier.',
        });
        await promise;
      } else {
        const promise = addSupplier(values);
        toast.promise(promise, {
          loading: 'Menyimpan...',
          success: 'Supplier created successfully!',
          error: 'Failed to create supplier.',
        });
        await promise;
      }
      onSuccess();
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">Nama Pemasok</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Indofood" {...field} className="rounded-none border-2 border-brand-black" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="contactPerson"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">Narahubung</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Budi Santoso" {...field} className="rounded-none border-2 border-brand-black" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">Telepon</FormLabel>
              <FormControl>
                <Input placeholder="e.g., 081234567890" {...field} className="rounded-none border-2 border-brand-black" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-base shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12"
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan'}
        </Button>
      </form>
    </Form>
  );
}