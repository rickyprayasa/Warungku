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
import { Info, Camera, Lock } from 'lucide-react';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductImageCapture } from './ImageCapture';
import { usePlan } from '@/contexts/PlanContext';
import { UpgradeDialog } from './UpgradeDialog';
import { cn, getPackageLabel } from '@/lib/utils';

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

const UNIT_OPTIONS = {
  'Warung': ['pcs', 'pack', 'dus', 'renceng', 'bundle', 'ltr', 'kg'],
  'Material/Bangunan': ['pcs', 'sak', 'batang', 'meter', 'm2', 'm3', 'kg', 'kaleng', 'lembar', 'dos', 'unit'],
  'Listrik': ['pcs', 'unit', 'set', 'roll', 'batang', 'dus'],
  'Elektronik': ['unit', 'pcs', 'set', 'box'],
  'Pakaian': ['pcs', 'pasang', 'lusin', 'kodi', 'potong'],
  'F&B': ['porsi', 'bungkus', 'cup', 'mangkok', 'gelas', 'box', 'paket', 'pcs'],
  'Jasa': ['jam', 'sesi', 'kali', 'hari', 'bulan', 'tahun', 'paket'],
  'Pertanian': ['kg', 'liter', 'karung', 'botol', 'sachet', 'zak'],
  'Lainnya': ['pcs', 'unit', 'set', 'box', 'kg', 'liter']
};

interface ProductFormProps {
  product?: Product | null;
  onSuccess: () => void;
}

export function ProductForm({ product, onSuccess }: ProductFormProps) {
  const addProduct = useWarungStore((state) => state.addProduct);
  const updateProduct = useWarungStore((state) => state.updateProduct);
  const fetchProducts = useWarungStore((state) => state.fetchProducts);
  const adjustStock = useWarungStore((state) => state.adjustStock);
  const storeProfile = useWarungStore((state) => state.storeProfile);

  const { canAddProduct, productLimitReached, limits } = usePlan();
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);

  const [imagePreview, setImagePreview] = useState<string>(product?.imageUrl || '');
  const [description, setDescription] = useState(product?.description || '');
  const [isPromo, setIsPromo] = useState(product?.isPromo || false);
  const [promoPrice, setPromoPrice] = useState(product?.promoPrice || 0);
  const [isActive, setIsActive] = useState(product?.isActive ?? true);
  const [isImageCaptureOpen, setIsImageCaptureOpen] = useState(false);
  const [mobileStep, setMobileStep] = useState(1);

  const handleNextStep = async () => {
    if (mobileStep === 1) {
      const isValid = await form.trigger(['name', 'category', 'unit', 'minStockLevel']);
      if (isValid) setMobileStep(2);
    } else if (mobileStep === 2) {
      const isValid = await form.trigger(['price']);
      if (isValid) setMobileStep(3);
    }
  };

  const isEditing = !!product;

  // Check if can add new product (editing is always allowed)
  const canSubmit = isEditing || canAddProduct;

  // Initial Stock States (Only for new products)
  const [initialStock, setInitialStock] = useState(product?.totalStock || 0);
  const [initialCost, setInitialCost] = useState(product?.cost || 0);

  // Cost Input Mode: 'perUnit' or 'perPackage'
  const [costInputMode, setCostInputMode] = useState<'perUnit' | 'perPackage'>('perUnit');
  const [packagePrice, setPackagePrice] = useState(0);
  const [packageQuantity, setPackageQuantity] = useState(0);

  // Auto-calculate unit cost when in package mode
  const calculatedUnitCost = costInputMode === 'perPackage' && packageQuantity > 0
    ? Math.round(packagePrice / packageQuantity)
    : initialCost;

  // Qty per unit for package selling
  const [qtyPerUnit, setQtyPerUnit] = useState(product?.qtyPerUnit || 1);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      price: product?.price || 0,
      category: product?.category || '',
      imageUrl: product?.imageUrl || '',
      minStockLevel: product?.minStockLevel || 10,
      qtyPerUnit: product?.qtyPerUnit || 1,
      unit: product?.unit || 'pcs',
    },
  });
  const isSubmitting = form.formState.isSubmitting;

  const onSubmit = async (values: ProductFormValues) => {
    // Check product limit for new products
    if (!isEditing && !canAddProduct) {
      setUpgradeDialogOpen(true);
      return;
    }

    try {
      const productData = {
        ...values,
        description,
        isPromo,
        promoPrice: isPromo ? promoPrice : 0,
        isActive,
        qtyPerUnit: qtyPerUnit || 1,
      };

      if (isEditing && product) {
        // Include cost in update
        const updateData: any = {
          ...productData,
          cost: calculatedUnitCost
        };

        // Only include imageUrl if it has changed to avoid sending large base64 unnecessarily
        if (values.imageUrl === product.imageUrl) {
          delete updateData.imageUrl;
          console.log('[ProductForm] Image unchanged, not sending imageUrl');
        } else if (values.imageUrl) {
          const imageSizeKB = Math.round(values.imageUrl.length / 1024);
          console.log(`[ProductForm] Sending updated image: ${imageSizeKB}KB`);
        }

        // Show loading toast
        const toastId = toast.loading('Menyimpan...');

        try {
          // First, update the product
          await updateProduct(product.id, updateData);

          // Then, handle Stock Update if changed
          if (initialStock !== (product.totalStock || 0)) {
            await adjustStock(product.id, initialStock, calculatedUnitCost, true);
          }

          toast.success('Produk berhasil diupdate!', { id: toastId });
        } catch (updateError) {
          console.error('Update error:', updateError);
          toast.error('Gagal update produk.', { id: toastId });
          throw updateError;
        }
      } else {
        // Create Product
        const newProduct = await addProduct(productData);

        // Add Initial Stock if provided
        if (initialStock > 0) {
          try {
            // Use store action instead of API call
            await adjustStock(newProduct.id, initialStock, calculatedUnitCost, true);
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
        {/* Step Indicator on Mobile */}
        <div className="md:hidden bg-white border-2 border-brand-black p-3 rounded-xl shadow-hard-sm">
          <div className="flex items-center justify-between text-xs font-mono font-bold mb-2">
            <span>LANGKAH {mobileStep} DARI 3</span>
            <span className="text-brand-orange uppercase">
              {mobileStep === 1 && "Informasi Produk"}
              {mobileStep === 2 && "Harga & Stok"}
              {mobileStep === 3 && "Visual & Detail"}
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full h-3 bg-gray-100 border-2 border-brand-black rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-orange border-r-2 border-brand-black transition-all duration-300"
              style={{ width: `${(mobileStep / 3) * 100}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* LEFT COLUMN - MAIN INFO (7/12) */}
          <div className="md:col-span-7 space-y-6">

            {/* Card: Basic Info */}
            <div className={cn("p-6 bg-white border-2 border-brand-black rounded-xl shadow-hard space-y-4 relative overflow-hidden", mobileStep === 1 ? "block" : "hidden md:block")}>
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-black"></div>
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-brand-orange border-2 border-brand-black flex items-center justify-center text-sm">01</span>
                Informasi Produk
              </h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Nama Produk</FormLabel>
                    <FormControl>
                      <Input placeholder="Contoh: Kopi Susu Gula Aren" {...field} className="h-12 rounded-lg border-2 border-brand-black shadow-sm focus:shadow-hard transition-all font-bold text-lg" />
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
                      <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Kategori</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-lg border-2 border-brand-black shadow-sm focus:shadow-hard transition-all font-bold">
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

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="unit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Satuan</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value || 'pcs'}>
                          <FormControl>
                            <SelectTrigger className="h-11 rounded-lg border-2 border-brand-black shadow-sm focus:shadow-hard transition-all font-bold">
                              <SelectValue placeholder="Satuan" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-lg border-2 border-brand-black font-bold max-h-[200px]">
                            {(UNIT_OPTIONS[storeProfile.category as keyof typeof UNIT_OPTIONS] || UNIT_OPTIONS['Warung']).map((unit) => (
                              <SelectItem key={unit} value={unit} className="uppercase">{unit}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="minStockLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Min. Stok</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            {...field}
                            onChange={(e) => field.onChange(Math.max(0, parseInt(e.target.value) || 0))}
                            className="h-11 rounded-lg border-2 border-brand-black shadow-sm focus:shadow-hard transition-all font-bold font-mono text-center"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Card: Inventory & Pricing */}
            <div className={cn("p-6 bg-white border-2 border-brand-black rounded-xl shadow-hard space-y-5 relative overflow-hidden", mobileStep === 2 ? "block" : "hidden md:block")}>
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-black"></div>
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-green-400 border-2 border-brand-black flex items-center justify-center text-sm">02</span>
                Harga & Stok
              </h3>

              {/* Selling Price */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Harga Jual (Customer)</FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground group-focus-within:text-brand-orange transition-colors">Rp</span>
                        <Input
                          type="number"
                          placeholder="0"
                          {...field}
                          onChange={e => field.onChange(Number(e.target.value))}
                          className="h-14 pl-10 rounded-lg border-2 border-brand-black shadow-sm focus:shadow-hard transition-all font-bold font-mono text-2xl text-brand-orange"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Stock & Cost logic */}
              <div className="p-4 bg-gray-50 border-2 border-dashed border-brand-black/30 rounded-lg space-y-4">
                <div className="flex items-center justify-between">
                  <FormLabel className="font-bold font-mono uppercase text-xs text-brand-black">
                    {isEditing ? "Update Stok & Modal" : "Stok Awal & Modal"}
                  </FormLabel>
                  <div className="text-[10px] font-mono font-bold bg-white border border-brand-black px-2 py-0.5 rounded-full">
                    {costInputMode === 'perUnit' ? 'Mode: Per Unit' : `Mode: Per ${getPackageLabel(form.watch('unit'))}`}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormItem>
                    <FormLabel className="font-bold font-mono uppercase text-[10px] text-muted-foreground">Jml Stok</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={initialStock || ''}
                        onChange={(e) => setInitialStock(Math.max(0, parseInt(e.target.value) || 0))}
                        className="h-10 rounded-lg border-2 border-brand-black bg-white focus:shadow-hard transition-all font-bold font-mono"
                      />
                    </FormControl>
                  </FormItem>

                  {costInputMode === 'perUnit' ? (
                    <FormItem>
                      <FormLabel className="font-bold font-mono uppercase text-[10px] text-muted-foreground">Harga Beli / Unit</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground">Rp</span>
                          <Input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={initialCost || ''}
                            onChange={(e) => setInitialCost(Math.max(0, parseInt(e.target.value) || 0))}
                            className="h-10 pl-8 rounded-lg border-2 border-brand-black bg-white focus:shadow-hard transition-all font-bold font-mono"
                          />
                        </div>
                      </FormControl>
                    </FormItem>
                  ) : (
                    <FormItem>
                      <FormLabel className="invisible block font-bold font-mono uppercase text-[10px] text-muted-foreground">Action</FormLabel>
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full h-10 border-2 border-dashed border-brand-black/30 text-muted-foreground hover:text-brand-black hover:border-brand-black hover:bg-brand-black/5 font-bold font-mono text-[10px] rounded-lg transition-all"
                        onClick={() => setCostInputMode('perUnit')}
                      >
                        Gunakan Per Unit
                      </Button>
                    </FormItem>
                  )}
                </div>

                {/* Mode Toggle Button */}
                <button
                  type="button"
                  onClick={() => setCostInputMode(costInputMode === 'perUnit' ? 'perPackage' : 'perUnit')}
                  className="w-full py-1 text-xs font-mono font-bold text-blue-600 hover:underline text-center"
                >
                  {costInputMode === 'perUnit'
                    ? `Beli stok dalam satuan ${getPackageLabel(form.watch('unit'))}?`
                    : 'Kembali ke input per unit'}
                </button>

                {costInputMode === 'perPackage' && (
                  <div className="bg-white border-2 border-brand-black p-3 rounded-lg space-y-3 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold font-mono uppercase">Harga {getPackageLabel(form.watch('unit'))}</label>
                        <Input
                          type="number"
                          value={packagePrice || ''}
                          onChange={(e) => setPackagePrice(Number(e.target.value))}
                          className="h-9 px-2 text-sm border-2 border-brand-black"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold font-mono uppercase">Isi {getPackageLabel(form.watch('unit'))} (Pcs)</label>
                        <Input
                          type="number"
                          value={packageQuantity || ''}
                          onChange={(e) => setPackageQuantity(Number(e.target.value))}
                          className="h-9 px-2 text-sm border-2 border-brand-black"
                        />
                      </div>
                    </div>
                    {packageQuantity > 0 && (
                      <div className="text-center bg-blue-50 py-1 rounded border border-blue-200">
                        <p className="text-[10px] font-mono text-muted-foreground">Jatuhnya per unit:</p>
                        <p className="font-bold text-brand-black font-mono">Rp {calculatedUnitCost.toLocaleString('id-ID')}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - VISUALS & EXTRAS (5/12) */}
          <div className={cn("md:col-span-5 space-y-6", mobileStep === 3 ? "block" : "hidden md:block")}>
            {/* Card: Media */}
            <div className="p-6 bg-white border-2 border-brand-black rounded-xl shadow-hard space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-black"></div>
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-yellow-400 border-2 border-brand-black flex items-center justify-center text-sm">03</span>
                Foto Produk
              </h3>

              <div className="border-2 border-dashed border-brand-black/30 rounded-xl bg-gray-50 p-4 text-center hover:bg-gray-100 transition-colors cursor-pointer group" onClick={() => setIsImageCaptureOpen(true)}>
                {imagePreview ? (
                  <div className="relative w-full aspect-square bg-white border-2 border-brand-black rounded-lg shadow-sm group-hover:shadow-hard transition-all overflow-hidden">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                      <div className="bg-white px-3 py-1 rounded-full text-xs font-bold border border-brand-black shadow-hard transform translate-y-2 group-hover:translate-y-0 transition-transform">
                        GANTI FOTO
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-square flex flex-col items-center justify-center text-muted-foreground border-2 border-transparent">
                    <div className="w-16 h-16 rounded-full bg-brand-orange/10 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                      <Camera className="w-8 h-8 text-brand-orange" />
                    </div>
                    <p className="font-bold font-mono text-sm uppercase">Ambil / Upload</p>
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

            {/* Card: Description */}
            <div className="p-6 bg-white border-2 border-brand-black rounded-xl shadow-hard space-y-4 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-black"></div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Deskripsi (Opsional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Jelaskan detail produk..."
                        className="min-h-[100px] rounded-lg border-2 border-brand-black shadow-sm focus:shadow-hard transition-all font-medium resize-none"
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
            </div>

            {/* Toggles */}
            <div className="p-4 bg-white border-2 border-brand-black rounded-xl shadow-hard space-y-4">
              {/* Promo Toggle */}
              <div className="flex items-center justify-between pb-3 border-b border-dashed border-gray-200">
                <div className="space-y-0.5">
                  <FormLabel className="text-sm font-bold font-display uppercase">Status Promo</FormLabel>
                </div>
                <Switch
                  checked={isPromo}
                  onCheckedChange={setIsPromo}
                  className="data-[state=checked]:bg-brand-orange border-2 border-brand-black"
                />
              </div>
              {isPromo && (
                <div className="animate-in slide-in-from-top-2">
                  <Input
                    type="number"
                    placeholder="Harga Coret (Rp)"
                    value={promoPrice}
                    onChange={(e) => setPromoPrice(Number(e.target.value))}
                    className="h-10 rounded-lg border-2 border-brand-black bg-yellow-50 font-bold font-mono"
                  />
                </div>
              )}

              {/* Bundle Toggle Logic - Inline */}
              <div className="space-y-2 pt-1">
                <div className="flex justify-between items-center">
                  <FormLabel className="text-sm font-bold font-display uppercase">Qty Per Unit</FormLabel>
                  <span className="text-xs font-mono font-bold bg-blue-100 px-2 py-0.5 rounded text-blue-800">{qtyPerUnit} PCS</span>
                </div>
                <Input
                  type="number"
                  min="1"
                  value={qtyPerUnit}
                  onChange={(e) => setQtyPerUnit(Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-10 rounded-lg border-2 border-brand-black font-bold font-mono"
                />
                <p className="text-[10px] text-muted-foreground">
                  *Set {'>'} 1 untuk produk bundle (1 Unit mengurangi {qtyPerUnit} stok)
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* Product limit warning */}
        {!isEditing && productLimitReached && (
          <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-lg animate-pulse">
            <div className="flex items-center gap-3">
              <div className="bg-amber-100 p-2 rounded-full border border-amber-400">
                <Lock className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <span className="font-display font-bold text-amber-900 block">
                  Kuota Habis!
                </span>
                <span className="font-mono text-xs text-amber-700">
                  Upgrade plan untuk menambah produk.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation / Submit Buttons on Mobile */}
        <div className="flex md:hidden gap-3 mt-6">
          {mobileStep > 1 && (
            <Button
              type="button"
              variant="outline"
              className="flex-1 border-2 border-brand-black rounded-xl font-bold uppercase text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-brand-black/5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12"
              disabled={isSubmitting}
              onClick={() => setMobileStep(prev => prev - 1)}
            >
              ← Kembali
            </Button>
          )}
          {mobileStep < 3 ? (
            <Button
              type="button"
              className="flex-1 bg-brand-orange text-brand-black border-2 border-brand-black rounded-xl font-bold uppercase text-sm shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:bg-brand-orange/90 active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12"
              onClick={handleNextStep}
            >
              Lanjut →
            </Button>
          ) : (
            <Button
              type="submit"
              className="flex-1 bg-brand-black text-brand-white hover:bg-brand-orange hover:text-brand-black border-2 border-brand-black rounded-xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12 font-bold text-sm uppercase tracking-wide"
              disabled={isSubmitting || (!isEditing && productLimitReached)}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  Saving...
                </span>
              ) : isEditing ? "Simpan" : "Buat Produk"}
            </Button>
          )}
        </div>

        {/* Submit Button on Desktop */}
        <Button
          type="submit"
          className="hidden md:flex w-full bg-brand-black text-brand-white hover:bg-brand-orange hover:text-brand-black border-2 border-brand-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all h-12 font-bold text-lg uppercase tracking-widest mt-6 justify-center items-center"
          disabled={isSubmitting || (!isEditing && productLimitReached)}
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <div className="w-5 h-5 border-4 border-current border-t-transparent rounded-full animate-spin" />
              Processing...
            </span>
          ) : isEditing ? "Simpan Perubahan" : "Tambah Produk Sekarang"}
        </Button>
      </form>

      <UpgradeDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        trigger="product_limit"
      />
    </Form >
  );
}