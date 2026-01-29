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
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-1">
        <FormField
          control={form.control}
          name="productId"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel className="font-mono font-bold">Produk</FormLabel>
              <Popover open={productPopoverOpen} onOpenChange={setProductPopoverOpen}>
                <PopoverTrigger asChild disabled={!!purchase}>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between rounded-none border-2 border-brand-black bg-brand-white hover:bg-gray-50",
                        !field.value && "text-muted-foreground",
                        !!purchase && "opacity-50 cursor-not-allowed"
                      )}
                      disabled={!!purchase}
                    >
                      {field.value
                        ? sortedProducts.find(p => p.id === field.value)?.name
                        : "Pilih produk..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>
                <PopoverContent className="w-full min-w-[300px] p-0 rounded-none border-2 border-brand-black" align="start">
                  <Command className="rounded-none">
                    <CommandInput
                      placeholder="Cari produk..."
                      className="border-none focus:ring-0"
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
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                p.id === field.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex flex-1 justify-between items-center">
                              <span className="font-mono">{p.name}</span>
                              <span className="text-xs text-muted-foreground font-mono">
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
              {purchase && <FormDescription className="text-xs text-amber-600">Produk tidak dapat diubah saat edit.</FormDescription>}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Toggle Pack Purchase Mode */}
        <div className="flex items-center justify-between border-2 border-dashed border-brand-black p-4 bg-muted/20">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-brand-orange" />
            <div>
              <p className="font-mono font-bold text-sm">Pembelian Per Dus/Paket</p>
              <p className="text-xs text-muted-foreground font-mono">
                {isPackPurchase ? 'Mode: Dus/Paket' : 'Mode: Unit Satuan'}
              </p>
            </div>
          </div>
          <Switch
            checked={isPackPurchase}
            onCheckedChange={setIsPackPurchase}
            className="data-[state=checked]:bg-brand-orange"
          />
        </div>

        {isPackPurchase ? (
          // Pack/Box Purchase Mode
          <div className="space-y-4 border-2 border-brand-black p-4 bg-brand-white">
            <p className="font-mono font-bold text-sm text-brand-orange mb-3">📦 Pembelian Dus/Paket</p>
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="packQuantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono font-bold">Jumlah Dus/Paket</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => {
                          const val = e.target.value;
                          field.onChange(val === '' ? '' : parseInt(val, 10) || 0);
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="rounded-none border-2 border-brand-black"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">Contoh: 2 dus</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="unitsPerPack"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="font-mono font-bold">Isi Per Dus/Paket</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={e => {
                          const val = e.target.value;
                          field.onChange(val === '' ? '' : parseInt(val, 10) || 0);
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        className="rounded-none border-2 border-brand-black"
                      />
                    </FormControl>
                    <FormDescription className="text-xs">Contoh: 40 unit/dus</FormDescription>
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
                  <FormLabel className="font-mono font-bold">Harga Per Dus/Paket</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 100000"
                      {...field}
                      onChange={e => {
                        const val = e.target.value;
                        field.onChange(val === '' ? '' : parseFloat(val) || 0);
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="rounded-none border-2 border-brand-black"
                    />
                  </FormControl>
                  <FormDescription className="text-xs">Harga total per dus/paket</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="border-t-2 border-dashed border-brand-black pt-3 mt-3">
              <p className="text-sm font-mono text-muted-foreground mb-2">💡 Perhitungan Otomatis:</p>
              <div className="grid grid-cols-2 gap-2 text-sm font-mono">
                <p>Total Unit: <span className="font-bold text-brand-orange">{actualQuantity}</span></p>
                <p>Harga per Unit: <span className="font-bold text-brand-orange">
                  {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(actualUnitCost)}
                </span></p>
              </div>
            </div>
          </div>
        ) : (
          // Regular Unit Purchase Mode
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono font-bold">Jumlah Unit</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={e => {
                        const val = e.target.value;
                        field.onChange(val === '' ? '' : parseInt(val, 10) || 0);
                      }}
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
              name="unitCost"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono font-bold">Harga Beli Per Unit</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="e.g., 2500"
                      {...field}
                      onChange={e => {
                        const val = e.target.value;
                        field.onChange(val === '' ? '' : parseFloat(val) || 0);
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      className="rounded-none border-2 border-brand-black"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}

        <FormField
          control={form.control}
          name="supplierId"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="font-mono font-bold">Pemasok</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger className="rounded-none border-2 border-brand-black">
                    <SelectValue placeholder="Pilih pemasok" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="rounded-none border-2 border-brand-black bg-brand-white">
                  {suppliers.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Notes Field */}
        <div className="space-y-2">
          <label className="text-sm font-mono font-bold text-muted-foreground">Catatan (Opsional)</label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan khusus untuk pembelian ini (misal: kondisi barang, promo, dll)"
            className="rounded-lg border-2 border-brand-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] focus:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] transition-all font-mono resize-none"
            rows={3}
          />
        </div>

        <div className="text-right font-mono text-xl font-bold border-t-4 border-brand-black pt-4">
          Total Biaya: {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(totalCost)}
        </div>
        <Button
          type="submit"
          disabled={form.formState.isSubmitting}
          className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-base shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12"
        >
          {form.formState.isSubmitting ? 'Menyimpan...' : (purchase ? 'Update Pembelian' : 'Simpan')}
        </Button>
      </form>
    </Form>
  );
}