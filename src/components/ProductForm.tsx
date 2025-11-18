import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormValues, type Product } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useWarungStore } from '@/lib/store';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
interface ProductFormProps {
  product?: Product | null;
  onSuccess: () => void;
}
export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const addProduct = useWarungStore((state) => state.addProduct);
  const updateProduct = useWarungStore((state) => state.updateProduct);
  const { t } = useTranslation();
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      price: product?.price || 0,
      cost: product?.cost || 0,
      category: product?.category || '',
      imageUrl: product?.imageUrl || '',
    },
  });
  const isSubmitting = form.formState.isSubmitting;
  const isEditing = !!product;
  const onSubmit = async (values: ProductFormValues) => {
    try {
      if (isEditing && product) {
        const promise = updateProduct(product.id, values);
        toast.promise(promise, {
          loading: t('forms.saving'),
          success: 'Product updated successfully!',
          error: 'Failed to update product.',
        });
        await promise;
      } else {
        const promise = addProduct(values);
        toast.promise(promise, {
          loading: t('forms.saving'),
          success: 'Product created successfully!',
          error: 'Failed to create product.',
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
              <FormLabel className="font-mono font-bold">{t('forms.product.name')}</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Indomie Goreng" {...field} className="rounded-none border-2 border-brand-black focus-visible:ring-brand-orange" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-mono font-bold">{t('forms.product.sellPrice')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 3000"
                    {...field}
                    onChange={e => field.onChange(e.target.value === '' ? '' : +e.target.value)}
                    className="rounded-none border-2 border-brand-black focus-visible:ring-brand-orange"
                  />
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
                <FormLabel className="font-mono font-bold">{t('forms.product.buyPrice')}</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="e.g., 2500"
                    {...field}
                    onChange={e => field.onChange(e.target.value === '' ? '' : +e.target.value)}
                    className="rounded-none border-2 border-brand-black focus-visible:ring-brand-orange"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">{t('forms.product.category')}</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Makanan" {...field} className="rounded-none border-2 border-brand-black focus-visible:ring-brand-orange" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">{t('forms.product.imageUrl')}</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} className="rounded-none border-2 border-brand-black focus-visible:ring-brand-orange" />
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
          {isSubmitting ? t('forms.saving') : t('forms.save')}
        </Button>
      </form>
    </Form>
  );
}