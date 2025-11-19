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
  FormDescription,
} from '@/components/ui/form';
import { useWarungStore } from '@/lib/store';
import { toast } from 'sonner';
import { Info, Upload, X } from 'lucide-react';
import { useState, useRef } from 'react';
interface ProductFormProps {
  product?: Product | null;
  onSuccess: () => void;
}
export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const addProduct = useWarungStore((state) => state.addProduct);
  const updateProduct = useWarungStore((state) => state.updateProduct);
  const [imagePreview, setImagePreview] = useState<string>(product?.imageUrl || '');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('File harus berupa gambar');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Ukuran gambar maksimal 2MB');
      return;
    }

    setIsUploadingImage(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImagePreview(base64String);
        form.setValue('imageUrl', base64String);
        toast.success('Gambar berhasil diupload');
        setIsUploadingImage(false);
      };
      reader.onerror = () => {
        toast.error('Gagal membaca file');
        setIsUploadingImage(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Gagal upload gambar');
      setIsUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setImagePreview('');
    form.setValue('imageUrl', '');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const onSubmit = async (values: ProductFormValues) => {
    try {
      if (isEditing && product) {
        const promise = updateProduct(product.id, values);
        toast.promise(promise, {
          loading: 'Menyimpan...',
          success: 'Produk berhasil diupdate!',
          error: 'Gagal update produk.',
        });
        await promise;
      } else {
        const promise = addProduct(values);
        toast.promise(promise, {
          loading: 'Menyimpan...',
          success: 'Produk berhasil ditambahkan!',
          error: 'Gagal menambahkan produk.',
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
        {/* Info Alert */}
        <div className="flex items-start gap-3 border-2 border-dashed border-blue-500 bg-blue-50 p-4">
          <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="font-mono font-bold text-blue-900 mb-1">💡 Harga Beli Otomatis</p>
            <p className="text-blue-700 font-mono text-xs">
              Harga beli akan tercatat otomatis dari data pembelian. Setelah produk dibuat,
              lakukan pembelian untuk menambah stok dan mencatat harga belinya.
            </p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">Nama Produk</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Indomie Goreng" {...field} className="rounded-none border-2 border-brand-black focus-visible:ring-brand-orange" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">Kategori</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Makanan, Minuman, Snack" {...field} className="rounded-none border-2 border-brand-black focus-visible:ring-brand-orange" />
              </FormControl>
              <FormDescription className="text-xs">
                Kategori memudahkan filter produk
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="price"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">Harga Jual (Default)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g., 3000"
                  {...field}
                  onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                  className="rounded-none border-2 border-brand-black focus-visible:ring-brand-orange"
                />
              </FormControl>
              <FormDescription className="text-xs">
                ⭐ Harga normal/standar yang akan otomatis terisi di penjualan.
                Kasir bisa edit untuk diskon/promo.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Image Upload Section */}
        <FormField
          control={form.control}
          name="imageUrl"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">Gambar Produk</FormLabel>
              <FormControl>
                <div className="space-y-3">
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="relative border-2 border-brand-black p-2 bg-muted/20">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="w-full h-48 object-contain"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        onClick={handleRemoveImage}
                        className="absolute top-4 right-4 rounded-none border-2 border-brand-black"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  )}

                  {/* Upload Button */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="flex-1 border-2 border-brand-black rounded-none font-mono font-bold hover:bg-brand-orange hover:text-brand-black"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {isUploadingImage ? 'Uploading...' : imagePreview ? 'Ganti Gambar' : 'Upload Gambar'}
                    </Button>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />

                  {/* Hidden field for form validation */}
                  <Input
                    type="hidden"
                    {...field}
                  />
                </div>
              </FormControl>
              <FormDescription className="text-xs">
                Upload gambar produk (Max: 2MB, Format: JPG, PNG, WebP)
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button
          type="submit"
          disabled={isSubmitting || isUploadingImage}
          className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-base shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12"
        >
          {isSubmitting ? 'Menyimpan...' : isEditing ? 'Update Produk' : 'Tambah Produk'}
        </Button>
      </form>
    </Form>
  );
}