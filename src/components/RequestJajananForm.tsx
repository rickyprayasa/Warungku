import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { jajananRequestSchema, type JajananRequestFormValues } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
interface RequestJajananFormProps {
  onSuccess: () => void;
}
export function RequestJajananForm({ onSuccess }: RequestJajananFormProps) {
  const addJajananRequest = useWarungStore((state) => state.addJajananRequest);
  const form = useForm<JajananRequestFormValues>({
    resolver: zodResolver(jajananRequestSchema),
    defaultValues: {
      requesterName: '',
      snackName: '',
      quantity: 1,
      notes: '',
    },
  });
  const onSubmit = async (values: JajananRequestFormValues) => {
    const promise = addJajananRequest(values);
    toast.promise(promise, {
      loading: 'Mengirim request...',
      success: 'Request berhasil dikirim!',
      error: 'Gagal mengirim request.',
    });
    await promise;
    onSuccess();
  };
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="requesterName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">Nama Pemohon</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Andi" {...field} className="rounded-none border-2 border-brand-black" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="snackName"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">Nama Jajanan</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Seblak Ceker" {...field} className="rounded-none border-2 border-brand-black" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">Jumlah</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  {...field}
                  onChange={e => field.onChange(e.target.valueAsNumber || 1)}
                  onWheel={(e) => e.currentTarget.blur()}
                  className="rounded-none border-2 border-brand-black"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">Catatan (Opsional)</FormLabel>
              <FormControl>
                <Textarea placeholder="e.g., Pedas level 5, tanpa sayur" {...field} className="rounded-none border-2 border-brand-black" />
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
          {form.formState.isSubmitting ? 'Mengirim...' : 'Kirim Request'}
        </Button>
      </form>
    </Form>
  );
}