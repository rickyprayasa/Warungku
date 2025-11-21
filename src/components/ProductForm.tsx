import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productSchema, type ProductFormValues, type Product } from '@shared/types';
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
  FormDescription,
} from '@/components/ui/form';
import { useWarungStore } from '@/lib/store';
import { api } from '@/lib/api-client';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Info } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductImageCapture } from './ImageCapture';

const CATEGORIES = [
  "Makanan",
  "Minuman",
  "Snack",
  "Rokok",
  "Sembako",
  "Alat Tulis",
  "Kebersihan",
  "Lainnya"
];

interface ProductFormProps {
  product?: Product | null;
  onSuccess: () => void;
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const addProduct = useWarungStore((state) => state.addProduct);
  const updateProduct = useWarungStore((state) => state.updateProduct);
  const fetchProducts = useWarungStore((state) => state.fetchProducts);

  const [imagePreview, setImagePreview] = useState<string>(product?.imageUrl || '');
  const [description, setDescription] = useState(product?.description || '');
  const [isPromo, setIsPromo] = useState(product?.isPromo || false);
  const [promoPrice, setPromoPrice] = useState(product?.promoPrice || 0);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);

  // Initial Stock States (Only for new products)
  const [initialStock, setInitialStock] = useState(0);
  const [initialCost, setInitialCost] = useState(0);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      price: product?.price || 0,
      category: product?.category || '',
      imageUrl: product?.imageUrl || '',
    },
  });
  const isSubmitting = form.formState.isSubmitting;
  const isEditing = !!product;

  const onSubmit = async (values: ProductFormValues) => {
    try {
      const productData = {
        ...values,
        description,
        isPromo,
        promoPrice: isPromo ? promoPrice : 0,
        isActive
      };

      if (isEditing && product) {
        const promise = updateProduct(product.id, productData);
        toast.promise(promise, {
          loading: 'Menyimpan...',
          success: 'Produk berhasil diupdate!',
          error: 'Gagal update produk.',
        });
        await promise;
      } else {
        // Create Product
        const newProduct = await addProduct(productData);

        // Add Initial Stock if provided
        if (initialStock > 0) {
          try {
            await api(`/api/products/${newProduct.id}/add-stock`, {
              method: 'POST',
              body: JSON.stringify({ quantity: initialStock, unitCost: initialCost })
            });
            // Refresh products to reflect stock change
            await fetchProducts();
            toast.success(`Stok awal ${initialStock} berhasil ditambahkan!`);
          } catch (stockError) {
            console.error('Failed to add initial stock:', stockError);
            toast.error('Produk dibuat, tapi gagal menambahkan stok awal.');
          }
        } else {
          toast.success('Produk berhasil ditambahkan!');
        }
      }
      onSuccess();
    } catch (error) {
      console.error('Form submission error:', error);
      if (!isEditing) {
        toast.error('Gagal menambahkan produk.');
      }
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Basic Info (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono font-bold uppercase text-xs tracking-wider text-muted-foreground">Nama Produk</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Indomie Goreng" {...field} className="h-12 text-lg font-bold rounded-none border-2 border-brand-black focus-visible:ring-brand-orange" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono font-bold uppercase text-xs tracking-wider text-muted-foreground">Kategori</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-none border-2 border-brand-black focus:ring-brand-orange font-bold">
                          <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-none border-2 border-brand-black bg-brand-white">
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category} className="font-mono focus:bg-brand-orange focus:text-brand-black">
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono font-bold uppercase text-xs tracking-wider text-muted-foreground">Harga Jual</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">Rp</span>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={e => field.onChange(Math.round(e.target.valueAsNumber || 0))}
                          onWheel={(e) => e.currentTarget.blur()}
                          className="h-12 pl-10 text-lg font-bold rounded-none border-2 border-brand-black focus-visible:ring-brand-orange"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="minStockLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono font-bold uppercase text-xs tracking-wider text-muted-foreground">
                    Minimum Stok Alert
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="10"
                      {...field}
                      onChange={(e) => field.onChange(Math.max(0, parseInt(e.target.value) || 0))}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="h-12 font-bold rounded-none border-2 border-brand-black focus-visible:ring-brand-orange"
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormDescription className="text-[10px] font-mono flex items-center gap-1">
                    <Info className="w-3 h-3" />
                    Alert jika stok turun dibawah angka ini (default: 10)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Initial Stock Fields (Only for New Products) */}
            {!isEditing && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-brand-orange/10 border-2 border-dashed border-brand-orange">
                <FormItem>
                  <FormLabel className="font-mono font-bold uppercase text-xs tracking-wider text-brand-orange">Stok Awal (Opsional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={initialStock || ''}
                      onChange={(e) => setInitialStock(Math.max(0, parseInt(e.target.value) || 0))}
                      className="h-12 font-bold rounded-none border-2 border-brand-black focus-visible:ring-brand-orange"
                    />
                  </FormControl>
                  <FormDescription className="text-[10px] font-mono">Kosongkan jika 0</FormDescription>
                </FormItem>

                <FormItem>
                  <FormLabel className="font-mono font-bold uppercase text-xs tracking-wider text-brand-orange">Harga Beli (Per Unit)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">Rp</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={initialCost || ''}
                        onChange={(e) => setInitialCost(Math.max(0, parseInt(e.target.value) || 0))}
                        className="h-12 pl-10 font-bold rounded-none border-2 border-brand-black focus-visible:ring-brand-orange"
                      />
                    </div>
                  </FormControl>
                  <FormDescription className="text-[10px] font-mono">Untuk hitung profit</FormDescription>
                </FormItem>
              </div>
            )}

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono font-bold uppercase text-xs tracking-wider text-muted-foreground">Foto Produk</FormLabel>
                  <FormControl>
                    <ProductImageCapture
                      currentImage={imagePreview}
                      onImageCapture={(base64) => {
                        setImagePreview(base64);
                        field.onChange(base64);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Right Column: Additional Info (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={() => (
                <FormItem>
                  <FormLabel className="font-mono font-bold uppercase text-xs tracking-wider text-muted-foreground">Deskripsi</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Deskripsi singkat produk..."
                      className="min-h-[120px] border-2 border-brand-black rounded-none focus-visible:ring-0 focus-visible:border-brand-orange font-mono resize-none"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Promo Section */}
            <div className="border-2 border-brand-black p-0 bg-white">
              <div className="p-4 bg-brand-yellow/20 border-b-2 border-brand-black flex items-center justify-between">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-bold font-display uppercase">Status Promo</FormLabel>
                  <FormDescription className="font-mono text-xs text-brand-black/70">
                    Aktifkan harga coret
                  </FormDescription>
                </div>
                <Switch
                  checked={isPromo}
                  onCheckedChange={setIsPromo}
                  className="data-[state=checked]:bg-green-500 data-[state=unchecked]:bg-gray-300 border-2 border-brand-black"
                />
              </div>

              {isPromo && (
                <div className="p-4 animate-in slide-in-from-top-2 duration-200 bg-white">
                  <FormLabel className="font-mono font-bold uppercase text-xs tracking-wider text-muted-foreground">Harga Promo</FormLabel>
                  <div className="relative mt-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">Rp</span>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      className="h-12 pl-10 text-lg font-bold border-2 border-brand-black rounded-none focus-visible:ring-0 focus-visible:border-brand-orange font-mono"
                      value={promoPrice}
                      onChange={(e) => setPromoPrice(Number(e.target.value))}
                      onWheel={(e) => e.currentTarget.blur()}
                    />
                  </div>
                  <p className="text-xs text-brand-orange mt-2 flex items-center gap-1 font-bold font-mono">
                    <Info className="w-3 h-3" />
                    Harga asli akan dicoret di menu
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-4 border-t-2 border-dashed border-brand-black/20">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-lg shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-14"
          >
            {isSubmitting ? 'Menyimpan...' : isEditing ? 'Simpan Perubahan' : 'Tambah Produk Baru'}
          </Button>
        </div>
      </form>
    </Form>
  );
}