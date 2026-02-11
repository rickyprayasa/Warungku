import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { saleSchema, type SaleFormValues } from '@shared/types';
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
import type { Sale } from '@shared/types';
import { ScrollArea } from '@/components/ui/scroll-area';

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
    const [showReceiptDialog, setShowReceiptDialog] = useState(false);
    const [savedSale, setSavedSale] = useState<Sale | null>(null);
    const [notes, setNotes] = useState('');
    const storeProfile = useWarungStore((state) => state.storeProfile);
    const opnameMode = useWarungStore((state) => state.opnameMode);

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
        } catch (e) {
            // toast handled by promise
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-full gap-4 overflow-hidden">
            {/* Left: Product Grid */}
            <div className="h-[35%] flex-shrink-0 md:h-auto md:flex-1 flex flex-col min-w-0 bg-gray-50 p-4 border-2 border-brand-black rounded-lg overflow-hidden">
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
                                        "hidden md:flex flex-col text-left bg-white border-2 border-brand-black rounded-lg overflow-hidden transition-all hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-hard group",
                                        !product.totalStock && "opacity-50 cursor-not-allowed hover:translate-x-0 hover:translate-y-0 hover:shadow-none"
                                    )}
                                >
                                    <div className="aspect-square bg-gray-100 relative overflow-hidden">
                                        {product.imageUrl ? (
                                            <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-300">
                                                <Package className="w-8 h-8" />
                                            </div>
                                        )}
                                        <div className="absolute top-2 right-2">
                                            <Badge variant={product.totalStock ? "default" : "destructive"} className="text-[10px] font-bold shadow-sm">
                                                {product.totalStock ? product.totalStock : 'Habis'}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="p-3 flex flex-col flex-1 gap-1">
                                        <h4 className="font-bold text-xs sm:text-sm line-clamp-2 leading-tight">{product.name}</h4>
                                        <p className="text-brand-orange font-mono font-bold text-xs sm:text-sm mt-auto">
                                            {formatCurrency(product.price)}
                                        </p>
                                    </div>
                                </button>
                            </div>
                        ))}
                    </div>
                </ScrollArea>
            </div>

            {/* Right: Cart */}
            <div className="w-full md:w-[380px] flex-1 md:h-full flex flex-col bg-white border-2 border-brand-black rounded-lg overflow-hidden shadow-hard flex-shrink-0">
                <div className="p-4 border-b-2 border-brand-black bg-brand-orange/10 flex items-center gap-2 flex-shrink-0">
                    <ShoppingCart className="w-5 h-5 text-brand-black" />
                    <h3 className="font-display font-bold text-lg">Keranjang</h3>
                    <Badge variant="outline" className="ml-auto border-2 border-brand-black bg-white font-mono">
                        {fields.length} Item
                    </Badge>
                </div>

                <ScrollArea className="flex-1 p-4">
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
                                    <div key={field.id} className="flex flex-col bg-gray-50 border-2 border-brand-black p-3 rounded-lg relative group transition-all hover:bg-white hover:shadow-hard-sm">
                                        <button
                                            type="button"
                                            onClick={() => remove(index)}
                                            className="absolute top-2 right-2 text-muted-foreground/50 hover:text-red-500 transition-colors p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>

                                        <div className="pr-8 mb-3">
                                            <span className="font-bold line-clamp-2 text-sm leading-tight text-brand-black">{item.productName}</span>
                                            <span className="text-[10px] text-muted-foreground font-mono block mt-1">@{formatCurrency(item.price || 0)}</span>
                                        </div>

                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="flex items-center border-2 border-brand-black bg-white rounded-md overflow-hidden h-8 shadow-sm">
                                                <button
                                                    type="button"
                                                    className="w-8 h-full flex items-center justify-center hover:bg-brand-orange hover:text-brand-black active:bg-brand-orange/80 transition-colors border-r-2 border-brand-black text-brand-black disabled:opacity-50"
                                                    onClick={() => updateQuantity(index, -1)}
                                                >
                                                    <Minus className="w-3 h-3 stroke-[3]" />
                                                </button>
                                                <div className="w-10 h-full flex items-center justify-center font-mono font-bold text-sm bg-white text-brand-black">
                                                    {item.quantity}
                                                </div>
                                                <button
                                                    type="button"
                                                    className="w-8 h-full flex items-center justify-center hover:bg-brand-orange hover:text-brand-black active:bg-brand-orange/80 transition-colors border-l-2 border-brand-black text-brand-black"
                                                    onClick={() => updateQuantity(index, 1)}
                                                >
                                                    <Plus className="w-3 h-3 stroke-[3]" />
                                                </button>
                                            </div>
                                            <span className="font-bold font-mono text-base text-brand-orange">
                                                {formatCurrency((item.price || 0) * (item.quantity || 0))}
                                            </span>
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

                    <div className="grid grid-cols-2 gap-3 text-xs">
                        {opnameMode !== 'retail' && (
                            <div className="flex items-center gap-2 p-2 rounded border border-brand-black/10 bg-white">
                                <Switch checked={isDisplaySale} onCheckedChange={setIsDisplaySale} id="mode-display" className="scale-75 origin-left" />
                                <label htmlFor="mode-display" className="cursor-pointer font-bold text-brand-black">Mode Display</label>
                            </div>
                        )}
                        <div className="flex items-center gap-2 p-2 rounded border border-brand-black/10 bg-white">
                            <Switch checked={printAfterSave} onCheckedChange={setPrintAfterSave} id="print-opt" className="scale-75 origin-left" />
                            <label htmlFor="print-opt" className="cursor-pointer font-bold text-brand-black">Cetak Struk</label>
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
