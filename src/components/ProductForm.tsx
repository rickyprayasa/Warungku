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
import { Info, Camera } from 'lucide-react';
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
  const [isImageCaptureOpen, setIsImageCaptureOpen] = useState(false);

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Nama Produk</FormLabel>
                  <FormControl>
                    <Input placeholder="Contoh: Kopi Susu Gula Aren" {...field} className="rounded-lg border-2 border-brand-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all font-bold" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Kategori</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="rounded-lg border-2 border-brand-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all font-bold">
                          <SelectValue placeholder="Pilih kategori" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="rounded-lg border-2 border-brand-black font-bold">
                        {CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>{category}</SelectItem>
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
                    <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Harga Jual</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">Rp</span>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={e => field.onChange(Number(e.target.value))}
                          className="pl-9 rounded-lg border-2 border-brand-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all font-bold font-mono"
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
                  <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Minimum Stok Alert</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(Math.max(0, parseInt(e.target.value) || 0))}
                      className="rounded-lg border-2 border-brand-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all font-bold font-mono"
                    />
                  </FormControl>
                  <FormDescription className="text-xs font-mono">
                    Alert jika stok turun dibawah angka ini (default: 10)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Initial Stock Fields (Only for New Products) */}
            {!isEditing && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg border-2 border-dashed border-brand-black/20">
                <FormItem>
                  <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Stok Awal (Opsional)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={initialStock || ''}
                      onChange={(e) => setInitialStock(Math.max(0, parseInt(e.target.value) || 0))}
                      className="rounded-lg border-2 border-brand-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all font-bold font-mono"
                    />
                  </FormControl>
                  <FormDescription className="text-xs font-mono">Kosongkan jika 0</FormDescription>
                </FormItem>

                <FormItem>
                  <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Harga Beli (Per Unit)</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">Rp</span>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={initialCost || ''}
                        onChange={(e) => setInitialCost(Math.max(0, parseInt(e.target.value) || 0))}
                        className="pl-9 rounded-lg border-2 border-brand-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all font-bold font-mono"
                      />
                    </div>
                  </FormControl>
                  <FormDescription className="text-xs font-mono">Untuk hitung profit</FormDescription>
                </FormItem>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Deskripsi</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Deskripsi singkat produk..."
                      className="resize-none min-h-[120px] rounded-lg border-2 border-brand-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all font-bold"
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value);
                        field.onChange(e.target.value);
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Promo Section */}
            <div className="border-2 border-brand-black rounded-lg p-4 bg-brand-orange/10 space-y-4 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <FormLabel className="text-base font-bold font-display uppercase">Status Promo</FormLabel>
                  <FormDescription className="font-mono text-xs">
                    Aktifkan harga coret
                  </FormDescription>
                </div>
                <Switch
                  checked={isPromo}
                  onCheckedChange={setIsPromo}
                  className="data-[state=checked]:bg-brand-orange border-2 border-brand-black"
                />
              </div>

              {isPromo && (
                <div className="space-y-2">
                  <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Harga Promo</FormLabel>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">Rp</span>
                    <Input
                      type="number"
                      placeholder="0"
                      value={promoPrice}
                      onChange={(e) => setPromoPrice(Number(e.target.value))}
                      className="pl-9 rounded-lg border-2 border-brand-black bg-white font-bold font-mono"
                    />
                  </div>
                  <p className="text-xs font-mono text-brand-orange font-bold">
                    Harga asli akan dicoret di menu
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Image Capture */}
        <div className="space-y-2">
          <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Foto Produk</FormLabel>
          <div className="border-2 border-dashed border-brand-black/20 rounded-lg bg-brand-black/5 p-4 text-center hover:bg-brand-black/10 transition-colors cursor-pointer" onClick={() => setIsImageCaptureOpen(true)}>
            {imagePreview ? (
              <div className="relative w-full max-w-md mx-auto aspect-video bg-white border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] group overflow-hidden">
                <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-white font-bold font-mono uppercase tracking-widest">Ganti Foto</p>
                </div>
              </div>
            ) : (
              <div className="py-8 flex flex-col items-center justify-center text-muted-foreground">
                <Camera className="w-12 h-12 mb-2 opacity-50" />
                <p className="font-bold font-mono text-sm">Klik untuk ambil foto</p>
              </div>
            )}
          </div>
          <ProductImageCapture
            open={isImageCaptureOpen}
            onOpenChange={setIsImageCaptureOpen}
            onCapture={(base64) => {
              setImagePreview(base64);
              form.setValue('imageUrl', base64);
            }}
            currentImage={imagePreview}
          />
        </div>

        <Button type="submit" className="w-full bg-brand-black text-brand-white hover:bg-brand-black/90 border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none transition-all h-12 font-bold text-lg uppercase tracking-widest" disabled={isSubmitting}>
          {isSubmitting ? "Menyimpan..." : isEditing ? "Simpan Perubahan" : "Tambah Produk Baru"}
        </Button>
      </form>
    </Form>
  );
}