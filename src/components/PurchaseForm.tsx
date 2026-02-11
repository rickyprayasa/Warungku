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
import { Package, Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  const [isPackPurchase, setIsPackPurchase] = useState(initialIsPackMode);
  const [notes, setNotes] = useState(purchase?.notes || '');
  const [productPopoverOpen, setProductPopoverOpen] = useState(false);

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

  const onSubmit = async (values: PurchaseFormValues) => {
    // Calculate actual values based on mode
    let finalQuantity = values.quantity;
    let finalUnitCost = values.unitCost;

    if (isPackPurchase && values.packQuantity && values.unitsPerPack) {
      // CRITICAL FIX: Round unitsPerPack to prevent floating point errors
      const roundedUnitsPerPack = Math.round(values.unitsPerPack * 100) / 100;
      finalQuantity = values.packQuantity * roundedUnitsPerPack;

      // If user entered total cost per pack, divide by units per pack to get unit cost
      // CRITICAL FIX: Don't round unitCost - keep full precision to prevent totalCost errors
      // Only round for DISPLAY, not for storage
      if (values.unitCost) {
        finalUnitCost = values.unitCost / roundedUnitsPerPack;
      }
    }

    const purchaseData = {
      ...values,
      quantity: finalQuantity,
      unitCost: finalUnitCost,
      notes: notes.trim() || undefined,
    };

    try {
      let promise;
      if (purchase) {
        if (!updatePurchase) {
          throw new Error('Update purchase function not available');
        }
        promise = updatePurchase(purchase.id, purchaseData);
        toast.promise(promise, {
          loading: 'Mengupdate...',
          success: 'Pembelian berhasil diupdate!',
          error: 'Gagal mengupdate pembelian.',
        });
      } else {
        promise = addPurchase(purchaseData);
        toast.promise(promise, {
          loading: 'Menyimpan...',
          success: 'Pembelian berhasil dicatat!',
          error: 'Gagal mencatat pembelian.',
        });
      }

      await promise;

      // Reset form only if adding new
      if (!purchase) {
        form.reset({
          productId: '',
          quantity: 1,
          packQuantity: 1,
          unitsPerPack: 1,
          unitCost: 0,
          supplierId: '',
        });
        setNotes('');
        setIsPackPurchase(false);
      }

      onSuccess();
    } catch (error) {
      console.error('Purchase submit error:', error);
    }
  };

  const { quantity, unitCost, packQuantity, unitsPerPack } = form.watch();

  // Calculate based on mode - CRITICAL FIX: Round unitsPerPack to prevent floating point errors
  const roundedUnitsPerPack = (isPackPurchase && unitsPerPack)
    ? Math.round(unitsPerPack * 100) / 100
    : 1;

  const actualQuantity = isPackPurchase && packQuantity && unitsPerPack
    ? packQuantity * roundedUnitsPerPack
    : (quantity || 0);

  // For display: round to 2 decimal places
  const actualUnitCost = isPackPurchase && unitsPerPack && unitCost
    ? Math.round((unitCost / roundedUnitsPerPack) * 100) / 100
    : (unitCost || 0);

  // CRITICAL FIX: Calculate totalCost from RAW values, not rounded ones!
  // This prevents precision loss: 12 * (11000/12) = 11000, not 10999.92
  const rawUnitCost = isPackPurchase && unitsPerPack && unitCost
    ? (unitCost / roundedUnitsPerPack)
    : (unitCost || 0);
  const totalCost = Math.round(actualQuantity * rawUnitCost);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* LEFT COLUMN - PRODUCT & SUPPLIER (7/12) */}
          <div className="md:col-span-7 space-y-6">

            {/* Card: Selection */}
            <div className="p-6 bg-white border-2 border-brand-black rounded-xl shadow-hard space-y-5 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-brand-black"></div>
              <h3 className="font-display font-bold text-lg flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-400 border-2 border-brand-black flex items-center justify-center text-sm">01</span>
                Pilih Produk
              </h3>

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
                          <CommandInput
                            placeholder="Cari produk..."
                            className="border-none focus:ring-0 font-bold"
                          />
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
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      p.id === field.value ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-1 justify-between items-center">
                                    <span className="font-bold">{p.name}</span>
                                    <span className="text-xs font-mono bg-gray-100 px-2 py-0.5 rounded border border-gray-300">
                                      Stok: {p.totalStock || 0}
                                    </span>
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

            {/* Card: Purchase Mode */}
            <div className="bg-white border-2 border-brand-black rounded-xl shadow-hard overflow-hidden">
              <div className="p-4 bg-gray-50 border-b-2 border-dashed border-brand-black/30 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border-2 border-brand-black ${isPackPurchase ? 'bg-brand-orange text-brand-black' : 'bg-white text-muted-foreground'}`}>
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-sm">Mode Pembelian</p>
                    <p className="text-xs font-mono text-muted-foreground">
                      {isPackPurchase ? 'Beli per Dus / Paket' : 'Beli per Unit Satuan'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isPackPurchase}
                  onCheckedChange={setIsPackPurchase}
                  className="data-[state=checked]:bg-brand-orange border-2 border-brand-black scale-110"
                />
              </div>

              <div className="p-6">
                {isPackPurchase ? (
                  // Pack/Box Purchase Mode
                  <div className="space-y-6 animate-in slide-in-from-left-2">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="packQuantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Jumlah Paket</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={e => {
                                  const val = e.target.value;
                                  field.onChange(val === '' ? '' : parseInt(val, 10) || 0);
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="h-12 rounded-lg border-2 border-brand-black font-bold text-lg text-center shadow-sm"
                                placeholder="0"
                              />
                            </FormControl>
                            <FormDescription className="text-xs text-center font-mono">Dus / Karton</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="unitsPerPack"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Isi per Paket</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={e => {
                                  const val = e.target.value;
                                  field.onChange(val === '' ? '' : parseInt(val, 10) || 0);
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="h-12 rounded-lg border-2 border-brand-black font-bold text-lg text-center shadow-sm"
                                placeholder="0"
                              />
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
                          <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Harga Beli Per Paket</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">Rp</span>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={e => {
                                  const val = e.target.value;
                                  field.onChange(val === '' ? '' : parseFloat(val) || 0);
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
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
                  // Regular Unit Purchase Mode
                  <div className="space-y-4 animate-in slide-in-from-right-2">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="font-bold font-mono uppercase text-xs text-muted-foreground">Jumlah Unit</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                {...field}
                                onChange={e => {
                                  const val = e.target.value;
                                  field.onChange(val === '' ? '' : parseInt(val, 10) || 0);
                                }}
                                onWheel={(e) => e.currentTarget.blur()}
                                className="h-12 rounded-lg border-2 border-brand-black font-bold text-lg text-center shadow-sm"
                                placeholder="0"
                              />
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
                                <Input
                                  type="number"
                                  placeholder="0"
                                  {...field}
                                  onChange={e => {
                                    const val = e.target.value;
                                    field.onChange(val === '' ? '' : parseFloat(val) || 0);
                                  }}
                                  onWheel={(e) => e.currentTarget.blur()}
                                  className="h-12 pl-9 rounded-lg border-2 border-brand-black font-bold font-mono text-lg shadow-sm"
                                />
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
              {form.formState.isSubmitting ? 'Menyimpan...' : (purchase ? 'Update Pembelian' : 'SIMPAN TRANSAKSI')}
            </Button>

          </div>
        </div>
      </form>
    </Form>
  );
}