import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { saleSchema, type SaleFormValues, type Sale } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { useWarungStore } from '@/lib/store';
import { toast } from 'sonner';
import { useEffect, useState, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Trash2, Package, Search, Plus, Minus, Printer, MessageCircle, Info, ShoppingCart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ReceiptTemplate, handleWhatsAppShare, handlePrintReceipt } from './ReceiptTemplate';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';

interface POSSaleFormProps {
    onSuccess: () => void;
}

export function POSSaleForm({ onSuccess }: POSSaleFormProps) {
    const { products, fetchProducts, addSale } = useWarungStore(
        useShallow((state) => ({
            products: state.products,
            fetchProducts: state.fetchProducts,
            addSale: state.addSale,
        }))
    );

    const [searchQuery, setSearchQuery] = useState('');
    const [isDisplaySale, setIsDisplaySale] = useState(false);
    const [printAfterSave, setPrintAfterSave] = useState(false);
    const [whatsappAfterSave, setWhatsappAfterSave] = useState(false);
    const [isPiutang, setIsPiutang] = useState(false);
    const [showReceiptDialog, setShowReceiptDialog] = useState(false);
    const [savedSale, setSavedSale] = useState<Sale | null>(null);
    const [notes, setNotes] = useState('');
    const [mobileStep, setMobileStep] = useState<1 | 2>(1);
    const storeProfile = useWarungStore((state) => state.storeProfile);
    const opnameMode = useWarungStore((state) => state.opnameMode);
    const { user } = useAuth();

    useEffect(() => {
        if (opnameMode === 'retail') {
            setIsDisplaySale(false);
        } else if (opnameMode === 'display') {
            setIsDisplaySale(true);
        }
    }, [opnameMode]);

    const form = useForm<SaleFormValues>({
        resolver: zodResolver(saleSchema),
        defaultValues: {
            items: [],
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

    const filteredProducts = useMemo(() => {
        if (!searchQuery) return products;
        const lowerQuery = searchQuery.toLowerCase();
        return products.filter(p => p.name.toLowerCase().includes(lowerQuery));
    }, [products, searchQuery]);

    const addToCart = (product: any) => {
        if (!product.totalStock || product.totalStock <= 0) {
            toast.error('Stok habis!');
            return;
        }

        const existingIndex = fields.findIndex(f => f.productId === product.id);
        if (existingIndex >= 0) {
            // Increment quantity
            const currentItem = form.getValues(`items.${existingIndex}`);
            if ((currentItem.quantity || 0) + 1 > product.totalStock) {
                toast.error(`Maksimal stok: ${product.totalStock}`);
                return;
            }
            update(existingIndex, {
                ...currentItem,
                quantity: (currentItem.quantity || 0) + 1
            });
        } else {
            // Add new item
            append({
                productId: product.id,
                productName: product.name,
                quantity: 1,
                price: product.price
            });
        }
    };

    const updateQuantity = (index: number, delta: number) => {
        const item = form.getValues(`items.${index}`);
        const product = products.find(p => p.id === item.productId);
        if (!product) return;

        const newQty = (item.quantity || 0) + delta;
        if (newQty < 1) {
            remove(index);
            return;
        }
        if (newQty > (product.totalStock || 0)) {
            toast.error(`Maksimal stok: ${product.totalStock}`);
            return;
        }
        update(index, { ...item, quantity: newQty });
    };

    const total = form.watch('items').reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 0), 0);
    const formatCurrency = (value: number) =>
        new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

    const onSubmit = async (values: SaleFormValues) => {
        if (values.items.length === 0) {
            toast.error('Pilih produk terlebih dahulu');
            return;
        }

        const saleData = {
            ...values,
            saleType: isDisplaySale ? 'display' as const : 'retail' as const,
            status: isPiutang ? 'pending' as const : 'completed' as const,
            notes: notes.trim() || undefined,
        };

        try {
            const promise = addSale(saleData);
            toast.promise(promise, {
                loading: 'Menyimpan...',
                success: 'Penjualan berhasil!',
                error: 'Gagal menyimpan',
            });
            const newSale = await promise;

            setSavedSale(newSale);
            if (printAfterSave || whatsappAfterSave) {
                setShowReceiptDialog(true);
            } else {
                onSuccess();
            }

            form.reset({ items: [] });
            setNotes('');
            setIsPiutang(false);
            setMobileStep(1);
        } catch (e) {
            // toast handled by promise
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-full gap-4 overflow-hidden">
            {/* Left: Product Grid */}
            <div className={cn(
                "flex-1 h-full md:h-auto flex flex-col min-w-0 bg-gray-50 p-4 border-2 border-brand-black rounded-lg overflow-hidden",
                mobileStep === 1 ? "flex" : "hidden md:flex"
            )}>
                {/* Search */}
                <div className="relative mb-4 flex-shrink-0">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Cari produk..."
                        className="pl-9 border-2 border-brand-black rounded-none h-10"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                {/* Grid */}
                <ScrollArea className="flex-1 -mr-3 pr-3">
                    <div className="flex flex-col gap-3 md:grid md:grid-cols-3 xl:grid-cols-4 pb-2">
                        {filteredProducts.map(product => (
                            <div key={product.id} className="contents">
                                {/* Mobile List View */}
                                <button
                                    onClick={() => addToCart(product)}
                                    disabled={!product.totalStock}
                                    className={cn(
                                        "md:hidden flex items-center p-2 bg-white border-2 border-brand-black rounded-lg transition-all active:scale-[0.98] active:bg-gray-50 text-left gap-3 relative overflow-hidden",
                                        !product.totalStock && "opacity-60 cursor-not-allowed bg-gray-50"
                                    )}
                                >
                                    {/* Image */}
                                    <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden border border-brand-black/20 relative">
                                        {product.imageUrl ? (
                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <Package className="w-6 h-6" />
                                            </div>
                                        )}
                                        {!product.totalStock && (
                                            <div className="absolute inset-0 bg-red-500/20 backdrop-blur-[1px] flex items-center justify-center">
                                                <span className="text-[8px] font-bold text-red-600 bg-white/90 px-1 rounded shadow-sm">HABIS</span>
                                            </div>
                                        )}
                                        {product.totalStock > 0 && product.totalStock <= 5 && (
                                            <div className="absolute bottom-0 right-0 bg-red-500 text-white text-[8px] px-1 font-bold rounded-tl-sm">
                                                {product.totalStock}
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-sm leading-tight line-clamp-2 text-brand-black">{product.name}</h4>
                                        <p className="text-brand-orange font-mono font-bold text-sm mt-0.5">
                                            {formatCurrency(product.price)}
                                        </p>
                                    </div>

                                    {/* Quick Add Icon */}
                                    <div className="w-8 h-8 flex items-center justify-center bg-brand-orange/10 rounded-full text-brand-orange">
                                        <Plus className="w-5 h-5" />
                                    </div>
                                </button>

                                {/* Desktop Grid View */}
                                <button
                                    onClick={() => addToCart(product)}
                                    disabled={!product.totalStock}
                                    className={cn(
                                        "hidden md:flex flex-col text-left bg-white border-2 border-brand-black rounded-lg overflow-hidden transition-all duration-200 group relative",
                                        // Hover State: Lift up + Hard Shadow
                                        "hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[4px_4px_0_0_#1a1a1a]",
                                        // Active State: Press down + No Shadow + Scale
                                        "active:translate-x-0 active:translate-y-0 active:shadow-none active:scale-[0.98]",
                                        !product.totalStock && "opacity-50 cursor-not-allowed hover:translate-x-0 hover:translate-y-0 hover:shadow-none active:scale-100"
                                    )}
                                >
                                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                                        {product.imageUrl ? (
                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <Package className="w-8 h-8" />
                                            </div>
                                        )}

                                        {/* Hover Overlay with Add Icon */}
                                        {product.totalStock > 0 && (
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center backdrop-blur-[2px]">
                                                <div className="bg-brand-orange text-brand-black w-10 h-10 rounded-full flex items-center justify-center border-2 border-brand-black shadow-hard transform scale-50 group-hover:scale-100 transition-transform duration-200">
                                                    <Plus className="w-6 h-6 stroke-[3]" />
                                                </div>
                                            </div>
                                        )}

                                        <div className="absolute top-2 right-2">
                                            <Badge variant={product.totalStock ? "default" : "destructive"} className="text-[10px] font-bold shadow-sm border border-brand-black font-mono">
                                                {product.totalStock ? `Stok: ${product.totalStock}` : 'Habis'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="p-3 flex flex-col flex-1 gap-1">
                                        <h4 className="font-bold text-xs sm:text-sm line-clamp-2 leading-tight group-hover:text-brand-orange transition-colors">{product.name}</h4>
                                        <p className="text-brand-black font-mono font-bold text-xs sm:text-sm mt-auto">
                                            {formatCurrency(product.price)}
                                        </p>
                                    </div>
                                </button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>

                {/* Mobile Bottom Bar - Step 1 */}
                <div className="md:hidden mt-4 pt-3 border-t-2 border-brand-black flex items-center justify-between bg-white flex-shrink-0">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-mono text-muted-foreground uppercase font-bold">Total Sementara</span>
                        <span className="font-bold text-lg text-brand-orange leading-none">{formatCurrency(total)}</span>
                    </div>
                    <Button
                        type="button"
                        disabled={fields.length === 0}
                        onClick={() => setMobileStep(2)}
                        className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-md font-bold uppercase text-xs shadow-hard hover:shadow-hard-sm px-4 h-10 flex items-center gap-2 disabled:opacity-50"
                    >
                        <span>Lanjut Ke Bayar ({fields.length})</span>
                        <ShoppingCart className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Right: Cart */}
            <div className={cn(
                "w-full md:w-[380px] h-full flex flex-col bg-white border-2 border-brand-black rounded-lg overflow-hidden shadow-hard flex-shrink-0",
                mobileStep === 2 ? "flex" : "hidden md:flex"
            )}>
                <div className="p-3 md:p-4 border-b-2 border-brand-black bg-brand-orange/10 flex items-center gap-2 flex-shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setMobileStep(1)}
                        className="md:hidden border-2 border-brand-black rounded-md font-bold text-xs h-8 px-2 bg-white"
                    >
                        ← Tambah
                    </Button>
                    <ShoppingCart className="w-4 h-4 text-brand-black" />
                    <h3 className="font-display font-bold text-base md:text-lg">Keranjang</h3>
                    <Badge variant="outline" className="ml-auto border-2 border-brand-black bg-white font-mono text-xs">
                        {fields.length} Item
                    </Badge>
                </div>

                <ScrollArea className="flex-1 p-4 hidden md:block">
                    {fields.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-8 opacity-50">
                            <Package className="w-16 h-16 mb-4 stroke-1" />
                            <p className="font-bold text-lg">Keranjang Kosong</p>
                            <p className="text-sm">Pilih produk di sebelah kiri</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {fields.map((field, index) => {
                                const item = form.watch(`items.${index}`);
                                return (
                                    <div key={field.id} className="group flex gap-3 p-3 bg-white border-2 border-brand-black rounded-lg relative shadow-[2px_2px_0_0_rgba(26,26,26,1)] hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_0_rgba(26,26,26,1)] transition-all animate-in slide-in-from-right-4 duration-300">
                                        {/* Product Image (Small) */}
                                        <div className="w-12 h-12 flex-shrink-0 bg-gray-100 rounded-md overflow-hidden border border-brand-black/20">
                                            {(() => {
                                                const product = products.find(p => p.id === item.productId);
                                                return product?.imageUrl ? (
                                                    <img src={product.imageUrl} alt={item.productName} className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                        <Package className="w-6 h-6" />
                                                    </div>
                                                );
                                            })()}
                                        </div>

                                        {/* Content */}
                                        <div className="flex-1 min-w-0 flex flex-col justify-between">
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <span className="font-bold text-sm leading-tight text-brand-black line-clamp-1" title={item.productName}>
                                                        {item.productName}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-mono block">
                                                        @{formatCurrency(item.price || 0)}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => remove(index)}
                                                    className="text-gray-400 hover:text-red-500 transition-colors p-0.5"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            <div className="flex items-center justify-between mt-1">
                                                {/* Qty Controls */}
                                                <div className="flex items-center bg-gray-50 border border-brand-black/30 rounded-md overflow-hidden h-6 shadow-sm">
                                                    <button
                                                        type="button"
                                                        className="w-6 h-full flex items-center justify-center hover:bg-brand-orange hover:text-brand-black active:bg-brand-orange/80 transition-colors border-r border-brand-black/30 text-brand-black disabled:opacity-50"
                                                        onClick={() => updateQuantity(index, -1)}
                                                    >
                                                        <Minus className="w-2.5 h-2.5 stroke-[3]" />
                                                    </button>
                                                    <div className="w-8 h-full flex items-center justify-center font-mono font-bold text-xs bg-white text-brand-black">
                                                        {item.quantity}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        className="w-6 h-full flex items-center justify-center hover:bg-brand-orange hover:text-brand-black active:bg-brand-orange/80 transition-colors border-l border-brand-black/30 text-brand-black"
                                                        onClick={() => updateQuantity(index, 1)}
                                                    >
                                                        <Plus className="w-2.5 h-2.5 stroke-[3]" />
                                                    </button>
                                                </div>

                                                {/* Subtotal */}
                                                <span className="font-bold font-mono text-sm text-brand-orange">
                                                    {formatCurrency((item.price || 0) * (item.quantity || 0))}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </ScrollArea>

                {/* Footer */}
                <div className="p-3 space-y-2 md:p-4 md:space-y-3 border-t-2 border-brand-black bg-gray-50 flex-shrink-0 z-10 shadow-[0_-5px_10px_rgba(0,0,0,0.05)]">
                    <div className="flex items-end justify-between border-b-2 border-dashed border-brand-black/20 pb-3 mb-2">
                        <span className="font-mono text-sm font-bold text-muted-foreground">Total Tagihan</span>
                        <span className="font-bold text-2xl text-brand-orange leading-none">{formatCurrency(total)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs mb-2">
                        {opnameMode !== 'retail' && (
                            <div className="flex items-center gap-2 p-2 rounded border border-brand-black/10 bg-white">
                                <Switch checked={isDisplaySale} onCheckedChange={setIsDisplaySale} id="mode-display" className="scale-75 origin-left" />
                                <label htmlFor="mode-display" className="cursor-pointer font-bold text-brand-black">Mode Display</label>
                            </div>
                        )}
                        <div className="flex items-center gap-2 p-2 rounded border border-brand-black/10 bg-white">
                            <Switch checked={isPiutang} onCheckedChange={setIsPiutang} id="mode-piutang" className="scale-75 origin-left" />
                            <label htmlFor="mode-piutang" className="cursor-pointer font-bold text-red-600">Catat Piutang</label>
                        </div>
                        <div className="flex items-center gap-2 p-2 rounded border border-brand-black/10 bg-white col-span-2">
                            <Switch checked={printAfterSave} onCheckedChange={setPrintAfterSave} id="print-opt" className="scale-75 origin-left" />
                            <label htmlFor="print-opt" className="cursor-pointer font-bold text-brand-black">Cetak Struk Otomatis</label>
                        </div>
                    </div>

                    <Textarea
                        placeholder="Catatan transaksi (opsional)..."
                        className="h-12 min-h-[48px] resize-none text-xs border-2 border-brand-black/30 focus-visible:border-brand-black focus-visible:ring-0 rounded-md bg-white"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />

                    <Button
                        className="w-full h-12 text-lg font-bold uppercase rounded-md border-2 border-brand-black shadow-hard hover:shadow-hard-sm hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all bg-brand-orange text-brand-black disabled:opacity-50 disabled:shadow-none disabled:translate-x-0 disabled:translate-y-0"
                        onClick={form.handleSubmit(onSubmit)}
                        disabled={fields.length === 0 || form.formState.isSubmitting}
                    >
                        {form.formState.isSubmitting ? 'Memproses...' : 'Bayar Sekarang'}
                    </Button>
                </div>
            </div>

            {/* Receipt Dialog reused from SaleForm */}
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
                                <Button onClick={() => handlePrintReceipt()} className="flex-1" variant="outline">
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
                                    <MessageCircle className="w-4 h-4 mr-2" /> WA
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
        </div>
    );
}
