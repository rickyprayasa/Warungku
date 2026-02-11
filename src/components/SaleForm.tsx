import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { saleSchema, type SaleFormValues } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useWarungStore } from '@/lib/store';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { PlusCircle, Trash2, Package, Check, ChevronsUpDown, Info, Printer, MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ReceiptTemplate, handleWhatsAppShare, handlePrintReceipt } from './ReceiptTemplate';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import type { Sale } from '@shared/types';
import { useAuth } from '@/contexts/AuthContext';

interface SaleFormProps {
  onSuccess: () => void;
}

export function SaleForm({ onSuccess }: SaleFormProps) {
  const { products, fetchProducts, addSale } = useWarungStore(
    useShallow((state) => ({
      products: state.products,
      fetchProducts: state.fetchProducts,
      addSale: state.addSale,
    }))
  );
  const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name));
  const { user } = useAuth();

  const [isDisplaySale, setIsDisplaySale] = useState(false);
  const [printAfterSave, setPrintAfterSave] = useState(false);
  const [whatsappAfterSave, setWhatsappAfterSave] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [savedSale, setSavedSale] = useState<Sale | null>(null);
  const [notes, setNotes] = useState('');
  const storeProfile = useWarungStore((state) => state.storeProfile);
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

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

  const onSubmit = async (values: SaleFormValues) => {
    const saleData = {
      ...values,
      saleType: isDisplaySale ? 'display' as const : 'retail' as const,
      notes: notes.trim() || undefined,
    };

    const promise = addSale(saleData);
    toast.promise(promise, {
      loading: 'Menyimpan...',
      success: isDisplaySale
        ? '📦 Penjualan display berhasil dicatat!'
        : 'Penjualan berhasil dicatat!',
      error: 'Gagal mencatat penjualan.',
    });
    await promise;

    form.reset({
      items: [{ productId: '', productName: '', quantity: 1, price: 0 }],
    });
    setNotes('');
    setIsDisplaySale(false);
    onSuccess();
  };

  const handleProductChange = (productId: string, index: number) => {
    const product = sortedProducts.find(p => p.id === productId);
    if (product) {
      const currentItem = form.getValues(`items.${index}`);
      const availableStock = product.totalStock || 0;

      if (availableStock === 0) {
        toast.error(`${product.name} stok habis!`);
        return;
      }

      update(index, {
        ...currentItem,
        productId: product.id,
        productName: product.name,
        price: product.price
      });

      if (availableStock <= 5) {
        toast.warning(`Stok ${product.name} tinggal ${availableStock} unit`);
      }
    }
  };

  const handleQuantityChange = (quantity: number, index: number) => {
    const item = form.getValues(`items.${index}`);
    const product = products.find(p => p.id === item.productId);

    if (product) {
      const availableStock = product.totalStock || 0;
      if (quantity > availableStock) {
        toast.error(`Stok ${product.name} hanya ${availableStock} unit`);
        form.setValue(`items.${index}.quantity`, availableStock);
        return;
      }
    }
    form.setValue(`items.${index}.quantity`, quantity);
  };

  const getStockStatus = (stock: number) => {
    if (stock === 0) return { label: 'Habis', color: 'bg-red-500' };
    if (stock <= 5) return { label: `${stock}`, color: 'bg-yellow-500' };
    return { label: `${stock}`, color: 'bg-green-500' };
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col max-h-[75vh]">
          {/* Header - Display Mode Toggle */}
          <div className={`p-3 mb-3 border-2 rounded-lg transition-colors ${isDisplaySale ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center gap-3">
              <Switch checked={isDisplaySale} onCheckedChange={setIsDisplaySale} />
              <div className="flex items-center gap-2 flex-1">
                <Package className={`w-4 h-4 ${isDisplaySale ? 'text-purple-600' : 'text-gray-400'}`} />
                <span className="font-mono text-sm font-bold">Mode Display (Bulk)</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-purple-600">
                        <Info className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[280px] p-3 bg-purple-900 text-white border-0">
                      <p className="text-xs font-mono leading-relaxed">
                        <strong>📦 Mode Display</strong> cocok untuk produk yang ditaruh di etalase/display seperti permen, snack, atau makanan ringan.
                        <br /><br />
                        • Profit langsung tercatat di awal<br />
                        • Stok berkurang sesuai jumlah display<br />
                        • Tidak perlu input saat customer beli eceran
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            {isDisplaySale && (
              <p className="text-xs text-purple-700 font-mono mt-2 pl-11">
                💡 Stok otomatis berkurang, profit tercatat upfront.
              </p>
            )}
          </div>

          {/* Scrollable Items Container */}
          <div className="flex-1 overflow-y-auto min-h-0 space-y-2 pr-1 mb-3">
            {fields.map((field, index) => {
              const item = form.watch(`items.${index}`);
              const product = products.find(p => p.id === item.productId);
              const stock = product ? (product.totalStock || 0) : 0;
              const subtotal = (item.price || 0) * (item.quantity || 0);

              return (
                <div
                  key={field.id}
                  className={`p-3 border-2 ${isDisplaySale ? 'border-purple-400 bg-purple-50/50' : 'border-brand-black bg-white'}`}
                >
                  {/* Row 1: Product Image + Select + Delete */}
                  <div className="flex gap-2 mb-2">
                    {/* Product Image */}
                    {product?.imageUrl ? (
                      <div className="w-12 h-12 flex-shrink-0 border-2 border-brand-black/20 bg-gray-100 overflow-hidden">
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 flex-shrink-0 border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                        <Package className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1">
                      <ProductSelectField
                        control={form.control}
                        index={index}
                        sortedProducts={sortedProducts}
                        getStockStatus={getStockStatus}
                        handleProductChange={handleProductChange}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => fields.length > 1 && remove(index)}
                      disabled={fields.length <= 1}
                      className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Row 2: Qty + Price + Subtotal - Compact Inline */}
                  <div className="flex items-center gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs text-muted-foreground w-8">Qty:</span>
                      <Input
                        type="number"
                        value={item.quantity || 1}
                        onChange={e => handleQuantityChange(parseInt(e.target.value, 10) || 1, index)}
                        className="w-16 h-8 text-center rounded-none border-2 border-brand-black font-mono text-sm"
                        min={1}
                        max={stock || 999}
                      />
                      {product && (
                        <span className="text-xs text-muted-foreground font-mono">/{stock}</span>
                      )}
                    </div>
                    <span className="text-muted-foreground">×</span>
                    <div className="flex items-center gap-1">
                      <span className="font-mono text-xs text-muted-foreground">Rp</span>
                      <Input
                        type="number"
                        value={item.price || 0}
                        onChange={e => form.setValue(`items.${index}.price`, parseFloat(e.target.value) || 0)}
                        className="w-24 h-8 text-right rounded-none border-2 border-brand-black font-mono text-sm"
                        min={0}
                      />
                    </div>
                    <span className="text-muted-foreground">=</span>
                    <span className="font-mono font-bold text-brand-orange flex-1 text-right">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Item Button */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ productId: '', productName: '', quantity: 1, price: 0 })}
            className="w-full rounded-none border-2 border-dashed border-brand-black font-mono text-sm mb-3"
          >
            <PlusCircle className="w-4 h-4 mr-1" /> Tambah Item
          </Button>

          {/* Notes - Compact */}
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan (opsional)"
            className="h-16 rounded-none border-2 border-brand-black font-mono text-sm resize-none mb-3"
          />

          {/* Receipt Options */}
          <div className="flex gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="print-mode"
                checked={printAfterSave}
                onCheckedChange={setPrintAfterSave}
              />
              <label htmlFor="print-mode" className="text-sm font-medium flex items-center cursor-pointer">
                <Printer className="w-4 h-4 mr-1" /> Cetak
              </label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="wa-mode"
                checked={whatsappAfterSave}
                onCheckedChange={setWhatsappAfterSave}
              />
              <label htmlFor="wa-mode" className="text-sm font-medium flex items-center cursor-pointer">
                <MessageCircle className="w-4 h-4 mr-1" /> WhatsApp
              </label>
            </div>
          </div>

          {/* Footer - Total & Submit */}
          <div className="flex items-center justify-between border-t-4 border-brand-black pt-3">
            <div className="font-mono">
              <span className="text-sm text-muted-foreground">Total:</span>
              <p className="text-2xl font-bold text-brand-orange">{formatCurrency(total)}</p>
            </div>
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
              className={`px-8 h-12 border-2 border-brand-black rounded-none font-bold uppercase shadow-hard hover:shadow-hard-sm transition-all ${isDisplaySale
                ? 'bg-purple-500 text-white hover:bg-purple-600'
                : 'bg-brand-orange text-brand-black hover:bg-brand-black hover:text-white'
                }`}
            >
              {form.formState.isSubmitting ? 'Menyimpan...' : 'Simpan'}
            </Button>
          </div>
        </form>
      </Form>

      {/* Receipt Dialog */}
      <Dialog open={showReceiptDialog} onOpenChange={(open) => {
        setShowReceiptDialog(open);
        if (!open) onSuccess();
      }}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {savedSale && (
            <div className="flex flex-col gap-4">
              <ReceiptTemplate
                sale={savedSale}
                storeName={storeProfile.name || 'Toko'}
                storeAddress={storeProfile.address}
                storePhone={storeProfile.phone}
                storeLogo={storeProfile.logoUrl}
                cashierName={user?.user_metadata?.full_name || user?.email}
              />
              <div className="flex gap-2">
                <Button onClick={() => handlePrintReceipt()} className="flex-1">
                  <Printer className="w-4 h-4 mr-2" /> Cetak
                </Button>
                <Button
                  onClick={() => handleWhatsAppShare(
                    savedSale,
                    storeProfile.name || 'Toko',
                    storeProfile.address,
                    storeProfile.phone
                  )}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white"
                >
                  <MessageCircle className="w-4 h-4 mr-2" /> WhatsApp
                </Button>
              </div>
              <Button variant="outline" onClick={() => {
                setShowReceiptDialog(false);
                onSuccess();
              }}>
                Tutup
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

interface ProductSelectFieldProps {
  control: any;
  index: number;
  sortedProducts: any[];
  getStockStatus: (stock: number) => { label: string; color: string };
  handleProductChange: (productId: string, index: number) => void;
}

function ProductSelectField({ control, index, sortedProducts, getStockStatus, handleProductChange }: ProductSelectFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <FormField
      control={control}
      name={`items.${index}.productId`}
      render={({ field }) => (
        <FormItem>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant="outline"
                  role="combobox"
                  className={cn(
                    "w-full h-9 justify-between rounded-none border-2 border-brand-black bg-white text-sm",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  <span className="truncate">
                    {field.value
                      ? sortedProducts.find(p => p.id === field.value)?.name
                      : "Pilih produk..."}
                  </span>
                  <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-[280px] p-0 rounded-none border-2 border-brand-black" align="start">
              <Command>
                <CommandInput placeholder="Cari produk..." className="text-sm" />
                <CommandList>
                  <CommandEmpty className="py-4 text-center text-sm">Tidak ditemukan</CommandEmpty>
                  <CommandGroup className="max-h-48 overflow-y-auto">
                    {sortedProducts.map(p => {
                      const pStock = p.totalStock || 0;
                      const pStatus = getStockStatus(pStock);
                      return (
                        <CommandItem
                          key={p.id}
                          value={p.name}
                          onSelect={() => {
                            field.onChange(p.id);
                            handleProductChange(p.id, index);
                            setOpen(false);
                          }}
                          className="cursor-pointer text-sm"
                          disabled={pStock === 0}
                        >
                          <Check className={cn("mr-2 h-3 w-3", p.id === field.value ? "opacity-100" : "opacity-0")} />
                          <span className="flex-1 truncate font-mono">{p.name}</span>
                          <Badge className={`${pStatus.color} text-white text-[10px] h-5`}>
                            {pStatus.label}
                          </Badge>
                        </CommandItem>
                      );
                    })}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}