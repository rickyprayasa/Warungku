import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { purchaseSchema, type PurchaseFormValues, type Purchase } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useWarungStore } from '@/lib/store';
import { toast } from 'sonner';
import { useEffect, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Package, Check, ChevronsUpDown, Trash2, ShoppingCart, Pencil } from 'lucide-react';
import { cn, getPackageLabel } from '@/lib/utils';
import { MultiProductPickerDialog } from './MultiProductPickerDialog';
import { EditCartItemDialog } from './EditCartItemDialog';

interface PurchaseFormProps {
  onSuccess: () => void;
  purchase?: Purchase;
}

export function PurchaseForm({ onSuccess, purchase }: PurchaseFormProps) {
  const { products, suppliers, fetchProducts, fetchSuppliers, addPurchase, updatePurchase } = useWarungStore(
    useShallow((state) => ({
      products: state.products,
      suppliers: state.suppliers,
      fetchProducts: state.fetchProducts,
      fetchSuppliers: state.fetchSuppliers,
      addPurchase: state.addPurchase,
      updatePurchase: state.updatePurchase || (() => Promise.reject(new Error('Update not available'))),
    }))
  );

  // Determine initial mode based on purchase data
  const initialIsPackMode = !!(purchase?.packQuantity && purchase?.unitsPerPack);
  // Cart State for Multi-Item Purchase
  const [cart, setCart] = useState<PurchaseFormValues[]>([]);
  const [editingItemIndex, setEditingItemIndex] = useState<number | null>(null);
  const [isSubmittingAll, setIsSubmittingAll] = useState(false);
  const [isPackPurchase, setIsPackPurchase] = useState(initialIsPackMode);
  const [notes, setNotes] = useState(purchase?.notes || '');
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);
  const [isMultiPickerOpen, setMultiPickerOpen] = useState(false);

  const form = useForm<PurchaseFormValues>({
    resolver: zodResolver(purchaseSchema),
    defaultValues: {
      productId: purchase?.productId || '',
      quantity: purchase?.quantity || 1,
      packQuantity: purchase?.packQuantity || 1,
      unitsPerPack: purchase?.unitsPerPack || 1,
      // If pack mode, unitCost field represents price per pack
      unitCost: initialIsPackMode && purchase?.unitCost && purchase?.unitsPerPack
        ? Math.round(purchase.unitCost * purchase.unitsPerPack)
        : (purchase?.unitCost || 0),
      supplierId: purchase?.supplierId || '',
    },
  });



  useEffect(() => {
    if (products.length === 0) fetchProducts();
    if (suppliers.length === 0) fetchSuppliers();
  }, [products.length, suppliers.length, fetchProducts, fetchSuppliers]);

  const sortedProducts = [...products].sort((a, b) => a.name.localeCompare(b.name));

  const handleBulkAdd = (items: { productId: string; quantity: number; isPack: boolean; unitsPerPack?: number; packQuantity?: number; buyPrice: number; notes?: string }[]) => {
    const newItems: PurchaseFormValues[] = items.map((item) => {
      const product = products.find((p) => p.id === item.productId);
      const unitCost = item.buyPrice; // Use the user-input price

      // Calculate quantity and cost based on mode
      let finalQuantity = item.quantity;
      let finalTotalCost = 0;
      let finalUnitCost = 0;

      if (item.isPack) {
        const packs = item.packQuantity || 0;
        const unitsPerPack = item.unitsPerPack || product?.qtyPerUnit || 1;
        const packPrice = item.buyPrice || 0;

        finalQuantity = packs * unitsPerPack;
        finalTotalCost = packs * packPrice;
        finalUnitCost = finalQuantity > 0 ? finalTotalCost / finalQuantity : 0;
      } else {
        const unitPrice = item.buyPrice || 0;
        finalQuantity = item.quantity;
        finalTotalCost = finalQuantity * unitPrice;
        finalUnitCost = unitPrice;
      }

      return {
        productId: item.productId,
        quantity: finalQuantity,
        unitCost: finalUnitCost,
        supplierId: purchase?.supplierId || '',
        // Pack info
        packQuantity: item.packQuantity,
        unitsPerPack: item.unitsPerPack,
        notes: item.notes || '',
        _display: {
          productName: product?.name || 'Unknown',
          supplierName: suppliers.find(s => s.id === (purchase?.supplierId || ''))?.name || '-',
          isPackMode: item.isPack,
          totalCost: finalTotalCost,
          packQty: item.packQuantity,
          packUnit: item.unitsPerPack
        }
      };
    });

    setCart((prev) => [...prev, ...newItems]);
    toast.success(`${newItems.length} produk ditambahkan ke daftar!`);
  };

  // Calculate derived values for display
  const { quantity, packQuantity, unitsPerPack, unitCost } = form.watch();

  const actualQuantity = isPackPurchase
    ? (packQuantity || 0) * (unitsPerPack || 0)
    : (quantity || 0);

  const totalCost = isPackPurchase
    ? (packQuantity || 0) * (unitCost || 0)
    : (quantity || 0) * (unitCost || 0);

  const actualUnitCost = actualQuantity > 0 ? totalCost / actualQuantity : 0;

  const handleEditCartItem = (index: number) => {
    setEditingItemIndex(index);
  };

  const handleSaveEdit = (updatedItem: PurchaseFormValues) => {
    if (editingItemIndex === null) return;

    setCart(prev => {
      const newCart = [...prev];
      newCart[editingItemIndex] = updatedItem;
      return newCart;
    });

    setEditingItemIndex(null);
    toast.success('Item berhasil diperbarui');
  };

  const handleRemoveFromCart = (index: number) => {
    const newCart = [...cart];
    newCart.splice(index, 1);
    setCart(newCart);
  };

  const onSubmit = async (values: PurchaseFormValues) => {
    try {
      if (purchase) {
        // Edit mode - update existing purchase
        await updatePurchase(purchase.id, {
          ...values,
          // Recalculate quantity if pack mode
          quantity: isPackPurchase ? values.packQuantity! * values.unitsPerPack! : values.quantity,
          isPackPurchase,
          notes: notes
        });
        toast.success('Pembelian berhasil diperbarui');
        onSuccess();
      } else {
        // Add to cart mode
        const selectedProduct = products.find(p => p.id === values.productId);

        const newItem: PurchaseFormValues & { _display?: any, notes?: string } = {
          ...values,
          quantity: isPackPurchase ? values.packQuantity! * values.unitsPerPack! : values.quantity,
          isPackPurchase, // Store the mode preference
          notes: notes,
          _display: {
            productName: selectedProduct?.name || 'Unknown',
            supplierName: suppliers.find(s => s.id === values.supplierId)?.name || 'Unknown',
            totalCost: totalCost,
            isPackMode: isPackPurchase,
            packQty: values.packQuantity,
            packUnit: values.unitsPerPack,
            unitLabel: isPackPurchase ? getPackageLabel(selectedProduct?.unit) : 'Unit'
          }
        };

        setCart(prev => [...prev, newItem]);
        toast.success('Ditambahkan ke daftar!');

        // Reset form but keep some convenient defaults
        form.reset({
          productId: '',
          quantity: 1,
          packQuantity: 1,
          unitsPerPack: values.unitsPerPack, // Keep instructions
          unitCost: 0,
          supplierId: values.supplierId // Keep supplier
        });
        setNotes('');
        setProductPopoverOpen(false);
      }
    } catch (error) {
      toast.error('Gagal menyimpan data');
      console.error(error);
    }
  };

  const handleProcessAll = async () => {
    if (cart.length === 0) return;
    setIsSubmittingAll(true);
    try {
      let successCount = 0;
      for (const item of cart) {
        try {
          // Calculate normalized unit cost for the database
          const finalCost = item._display?.totalCost && item.quantity > 0
            ? item._display.totalCost / item.quantity
            : item.unitCost;

          await addPurchase({
            productId: item.productId,
            quantity: item.quantity,
            unitCost: finalCost,
            supplierId: item.supplierId,
            notes: item.notes,
            // date: new Date().toISOString() // Let backend handle date or use current
          });
          successCount++;
        } catch (e) {
          console.error('Error adding purchase:', e);
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} transaksi berhasil diproses`);
        setCart([]);
        onSuccess();
      } else {
        toast.error('Gagal memproses transaksi');
      }
    } catch (error) {
      toast.error('Terjadi kesalahan sistem');
      console.error(error);
    } finally {
      setIsSubmittingAll(false);
    }
  };

  // Get selected product for dynamic labels
  const { productId } = form.watch();
  const selectedProduct = products.find(p => p.id === productId);
  const packageLabel = getPackageLabel(selectedProduct?.unit);

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* LEFT COLUMN - PRODUCT & SUPPLIER (7/12) */}
            <div className="md:col-span-7 space-y-6">

              {/* Product Selection Card */}
              <div className="p-6 bg-white border-2 border-brand-black rounded-xl shadow-hard space-y-5 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-brand-black"></div>
                <div className="flex items-center justify-between">
                  <h3 className="font-display font-bold text-lg flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-blue-400 border-2 border-brand-black flex items-center justify-center text-sm">01</span>
                    Pilih Produk
                  </h3>
                  {/* Bulk Add Trigger */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setMultiPickerOpen(true)}
                      className="border-2 border-brand-black rounded-lg shadow-sm hover:shadow-hard transition-all font-bold"
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Pilih Banyak
                    </Button>
                    <MultiProductPickerDialog
                      open={isMultiPickerOpen}
                      onOpenChange={setMultiPickerOpen}
                      onSelectProducts={handleBulkAdd}
                    />
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="productId"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Nama Produk</FormLabel>
                      <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                        <PopoverTrigger asChild disabled={!!purchase}>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "h-12 w-full justify-between rounded-lg border-2 border-brand-black bg-white hover:bg-gray-50 shadow-sm focus:shadow-hard transition-all font-bold text-base",
                                !field.value && "text-muted-foreground",
                                !!purchase && "opacity-50 cursor-not-allowed"
                              )}
                              disabled={!!purchase}
                            >
                              {field.value
                                ? sortedProducts.find(p => p.id === field.value)?.name
                                : "Cari produk..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0 rounded-lg border-2 border-brand-black shadow-hard" align="start">
                          <Command className="rounded-lg">
                            <CommandInput placeholder="Cari produk..." className="border-none focus:ring-0 font-bold" />
                            <CommandList>
                              <CommandEmpty>Produk tidak ditemukan.</CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-y-auto">
                                {sortedProducts.map(p => (
                                  <CommandItem
                                    key={p.id}
                                    value={p.name}
                                    onSelect={() => {
                                      field.onChange(p.id);
                                      setProductPopoverOpen(false);
                                    }}
                                    className="cursor-pointer font-medium aria-selected:bg-brand-orange aria-selected:text-brand-black"
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", p.id === field.value ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-1 justify-between items-center">
                                      <span className="font-bold">{p.name}</span>
                                      <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded border border-gray-300">Stok: {p.totalStock || 0}</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {purchase && <FormDescription className="text-xs text-amber-600 font-bold">*Produk tidak dapat diubah saat edit.</FormDescription>}
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Pemasok / Supplier</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-11 rounded-lg border-2 border-brand-black shadow-sm focus:shadow-hard transition-all font-bold">
                            <SelectValue placeholder="Pilih pemasok" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-lg border-2 border-brand-black font-bold shadow-hard">
                          {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Card: Purchase Mode & Inputs */}
              <div className="bg-white border-2 border-brand-black rounded-xl shadow-hard overflow-hidden">
                <div className="p-4 bg-gray-50 border-b-2 border-dashed border-brand-black/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg border-2 border-brand-black ${isPackPurchase ? 'bg-brand-orange text-brand-black' : 'bg-white text-muted-foreground'}`}>
                      <Package className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-sm">Mode Pembelian</p>
                      <p className="text-xs font-mono text-muted-foreground">
                        {isPackPurchase ? `Beli per ${packageLabel}` : 'Beli per Unit Satuan'}
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={isPackPurchase}
                    onCheckedChange={(checked) => {
                      setIsPackPurchase(checked);
                      form.setValue('isPackPurchase', checked, { shouldValidate: true });
                    }}
                    className="data-[state=checked]:bg-brand-orange border-2 border-brand-black scale-110"
                  />
                </div>

                <div className="p-6">
                  {isPackPurchase ? (
                    <div className="space-y-6 animate-in slide-in-from-left-2">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="packQuantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Jumlah {packageLabel}</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : 0)} className="h-12 rounded-lg border-2 border-brand-black font-bold text-lg text-center shadow-sm" placeholder="0" />
                              </FormControl>
                              <FormDescription className="text-xs text-center font-mono">{packageLabel}</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="unitsPerPack"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Isi per {packageLabel}</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : 0)} className="h-12 rounded-lg border-2 border-brand-black font-bold text-lg text-center shadow-sm" placeholder="0" />
                              </FormControl>
                              <FormDescription className="text-xs text-center font-mono">Pcs / Unit</FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      <FormField
                        control={form.control}
                        name="unitCost"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Harga Beli Per {packageLabel}</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">Rp</span>
                                <Input
                                  type="number"
                                  placeholder="0"
                                  {...field}
                                  value={field.value || ''}
                                  onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)}
                                  className="h-12 pl-9 rounded-lg border-2 border-brand-black font-bold font-mono text-lg shadow-sm"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="bg-brand-orange/10 border-2 border-brand-orange border-dashed rounded-lg p-3">
                        <div className="flex justify-between items-center text-sm font-mono">
                          <span className="text-muted-foreground font-bold">Total Unit Masuk:</span>
                          <span className="font-black text-brand-black text-lg">{actualQuantity} Pcs</span>
                        </div>
                        <div className="flex justify-between items-center text-sm font-mono mt-1">
                          <span className="text-muted-foreground font-bold">Harga Satuan (Otomatis):</span>
                          <span className="font-black text-brand-black">
                            {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(actualUnitCost)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 animate-in slide-in-from-right-2">
                      <div className="grid grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="quantity"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Jumlah Unit</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : 0)} className="h-12 rounded-lg border-2 border-brand-black font-bold text-lg text-center shadow-sm" placeholder="0" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="unitCost"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Harga Beli Per Unit</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">Rp</span>
                                  <Input type="number" placeholder="0" {...field} value={field.value || ''} onChange={e => field.onChange(e.target.value ? parseFloat(e.target.value) : 0)} className="h-12 pl-9 rounded-lg border-2 border-brand-black font-bold font-mono text-lg shadow-sm" />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN - SUMMARY & SUBMIT (5/12) */}
            <div className="md:col-span-5 space-y-6">
              {/* Card: Calculations */}
              <div className="p-6 bg-brand-black text-white border-2 border-brand-black rounded-xl shadow-[4px_4px_0px_0px_#999] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Package className="w-32 h-32 text-white" />
                </div>
                <h3 className="font-display font-bold text-lg mb-6 border-b border-white/20 pb-2">Ringkasan Biaya</h3>

                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-end">
                    <span className="font-mono text-sm text-gray-400">Total Unit</span>
                    <span className="font-mono font-bold text-xl">{actualQuantity}</span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="font-mono text-sm text-gray-400">Total Harga</span>
                    <span className="font-mono font-bold text-3xl text-brand-orange">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalCost)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card: Notes */}
              <div className="p-6 bg-white border-2 border-brand-black rounded-xl shadow-hard space-y-4">
                <div className="space-y-2">
                  <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Catatan (Opsional)</FormLabel>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan khusus untuk pembelian ini..."
                    className="min-h-[100px] rounded-lg border-2 border-brand-black shadow-sm focus:shadow-hard transition-all font-mono resize-none"
                    rows={3}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={form.formState.isSubmitting}
                className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-brand-black hover:text-white hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all h-12 font-bold text-lg uppercase tracking-widest"
              >
                {form.formState.isSubmitting ? 'Memproses...' : (purchase ? 'Update Pembelian' : 'TAMBAH KE DAFTAR')}
              </Button>
            </div>
          </div>
        </form>
      </Form>

      {/* SHOPPING LIST / CART SUMMARY */}
      {!purchase && cart.length > 0 && (
        <div className="border-t-4 border-brand-black border-dashed pt-8 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-display font-bold text-2xl uppercase">Daftar Barang ({cart.length})</h3>
            <Button
              onClick={handleProcessAll}
              disabled={isSubmittingAll}
              className="bg-green-500 text-brand-black border-2 border-brand-black rounded-xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none transition-all h-12 font-bold text-lg uppercase tracking-widest px-8"
            >
              {isSubmittingAll ? 'Menyimpan...' : 'PROSES SEMUA TRANSAKSI'}
            </Button>
          </div>

          <div className="rounded-xl border-2 border-brand-black overflow-hidden">
            <table className="w-full text-sm font-mono text-left">
              <thead className="bg-brand-black text-white">
                <tr>
                  <th className="p-3">Produk</th>
                  <th className="p-3">Jumlah</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Catatan</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-black/20 bg-white">
                {cart.map((item: any, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-3 font-bold">
                      {item._display?.productName}
                      {item._display?.isPackMode && (
                        <span className="block text-xs text-muted-foreground font-normal">
                          {item._display.packQty} Paket x {item._display.packUnit} Pcs
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      {item.quantity} Unit
                    </td>
                    <td className="p-3 font-bold text-brand-black">
                      {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(item._display?.totalCost || 0)}
                    </td>
                    <td className="p-3 text-xs text-muted-foreground italic truncate max-w-[200px]">
                      {item.notes || '-'}
                    </td>
                    <td className="p-3 text-center">
                      <button
                        onClick={() => handleEditCartItem(idx)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors mr-1"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemoveFromCart(idx)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-100 font-bold">
                <tr>
                  <td colSpan={2} className="p-3 text-right">TOTAL KESELURUHAN:</td>
                  <td className="p-3 text-lg text-brand-orange">
                    {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(
                      cart.reduce((sum, item: any) => sum + (item._display?.totalCost || 0), 0)
                    )}
                  </td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
      <EditCartItemDialog
        open={editingItemIndex !== null}
        onOpenChange={(open) => !open && setEditingItemIndex(null)}
        item={editingItemIndex !== null ? cart[editingItemIndex] : null}
        onSave={handleSaveEdit}
      />
    </div>
  );
}