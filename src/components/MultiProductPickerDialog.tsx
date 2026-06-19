
import { useState, useMemo, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Package, Check, Minus, Plus, Settings } from 'lucide-react';
import { useWarungStore } from '@/lib/store';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface MultiProductPickerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelectProducts: (selectedItems: Array<{ productId: string; quantity: number; isPack: boolean; unitsPerPack?: number; packQuantity?: number; buyPrice: number; notes?: string }>) => void;
}

export function MultiProductPickerDialog({ open, onOpenChange, onSelectProducts }: MultiProductPickerDialogProps) {
    const products = useWarungStore((state) => state.products);
    const storeProfile = useWarungStore((state) => state.storeProfile);
    const updateStoreProfile = useWarungStore((state) => state.updateStoreProfile);
    const [searchQuery, setSearchQuery] = useState('');
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [buyPrices, setBuyPrices] = useState<Record<string, number>>({});
    const [notes, setNotes] = useState<Record<string, string>>({});
    const [packModes, setPackModes] = useState<Record<string, boolean>>({});
    const [unitsPerPacks, setUnitsPerPacks] = useState<Record<string, number>>({});

    // Read default settings from storeProfile
    const defaultPackMode = (storeProfile.settings as any)?.defaultPackMode === true;
    const defaultUnitsPerPack = (storeProfile.settings as any)?.defaultUnitsPerPack as number | undefined;

    // Apply defaults to all products helper
    const applyDefaultsToAll = (packMode: boolean, unitsPP?: number) => {
        if (packMode) {
            const defaultModes: Record<string, boolean> = {};
            const defaultUnits: Record<string, number> = {};
            products.forEach(p => {
                defaultModes[p.id] = true;
                defaultUnits[p.id] = unitsPP || p.qtyPerUnit || 1;
            });
            setPackModes(defaultModes);
            setUnitsPerPacks(defaultUnits);
        } else {
            setPackModes({});
            setUnitsPerPacks({});
        }
    };

    // Reset when opening, apply defaults from settings
    useEffect(() => {
        if (open) {
            setQuantities({});
            setBuyPrices({});
            setNotes({});
            setSearchQuery('');
            applyDefaultsToAll(defaultPackMode, defaultUnitsPerPack);
        }
    }, [open]);

    const filteredProducts = useMemo(() => {
        let result = [...products]; // Spread to avoid mutating frozen Zustand state
        if (searchQuery) {
            const lower = searchQuery.toLowerCase();
            result = result.filter(p => p.name.toLowerCase().includes(lower) || p.category?.toLowerCase().includes(lower));
        }
        // Sort by name
        return result.sort((a, b) => a.name.localeCompare(b.name));
    }, [products, searchQuery]);

    const handleQuantityChange = (productId: string, val: string) => {
        const num = parseInt(val) || 0;
        setQuantities(prev => ({ ...prev, [productId]: num }));
    };

    const handlePriceChange = (productId: string, val: string) => {
        const num = parseInt(val.replace(/\D/g, '')) || 0;
        setBuyPrices(prev => ({ ...prev, [productId]: num }));
    };

    const handleNoteChange = (productId: string, val: string) => {
        setNotes(prev => ({ ...prev, [productId]: val }));
    };

    const handleUnitsPerPackChange = (productId: string, val: string) => {
        const num = parseInt(val) || 1;
        setUnitsPerPacks(prev => ({ ...prev, [productId]: num }));
    };

    const incrementQty = (productId: string) => {
        setQuantities(prev => ({ ...prev, [productId]: (prev[productId] || 0) + 1 }));
    };

    const decrementQty = (productId: string) => {
        setQuantities(prev => ({ ...prev, [productId]: Math.max(0, (prev[productId] || 0) - 1) }));
    };

    const togglePackMode = (productId: string) => {
        setPackModes(prev => ({ ...prev, [productId]: !prev[productId] }));
    };

    // Save setting to storeProfile
    const handleToggleDefaultPackMode = async (checked: boolean) => {
        // Apply to local product states instantly for responsive UI
        applyDefaultsToAll(checked, defaultUnitsPerPack);

        try {
            await updateStoreProfile({
                ...storeProfile,
                settings: {
                    ...(storeProfile.settings || {}),
                    defaultPackMode: checked,
                },
            });
            toast.success(checked ? 'Default mode Paket diaktifkan' : 'Default mode Satuan diaktifkan');
        } catch (error) {
            toast.error('Gagal menyimpan pengaturan');
        }
    };

    const handleSaveDefaultUnitsPerPack = async (val: number) => {
        const targetVal = val > 0 ? val : undefined;
        // Apply to local product states instantly for responsive UI
        if (defaultPackMode) {
            applyDefaultsToAll(true, targetVal);
        }

        try {
            await updateStoreProfile({
                ...storeProfile,
                settings: {
                    ...(storeProfile.settings || {}),
                    defaultUnitsPerPack: targetVal,
                },
            });
            if (val > 0) {
                toast.success(`Default isi paket: ${val} pcs`);
            }
        } catch (error) {
            toast.error('Gagal menyimpan pengaturan');
        }
    };

    const handleSubmit = () => {
        const selected: Array<{ productId: string; quantity: number; isPack: boolean; unitsPerPack?: number; packQuantity?: number; buyPrice: number; notes?: string }> = [];

        products.forEach(p => {
            const inputQty = quantities[p.id] || 0;
            if (inputQty > 0) {
                const isPack = packModes[p.id] || false;

                if (isPack) {
                    selected.push({
                        productId: p.id,
                        quantity: 0, // Calculated later in Parent
                        isPack: true,
                        packQuantity: inputQty,
                        buyPrice: buyPrices[p.id] !== undefined ? buyPrices[p.id] : (p.cost || 0),
                        unitsPerPack: unitsPerPacks[p.id] || p.qtyPerUnit || 1,
                        notes: notes[p.id] || ''
                    });
                } else {
                    // Unit Mode
                    selected.push({
                        productId: p.id,
                        quantity: inputQty,
                        buyPrice: buyPrices[p.id] !== undefined ? buyPrices[p.id] : (p.cost || 0),
                        isPack: false,
                        notes: notes[p.id] || ''
                    });
                }
            }
        });

        onSelectProducts(selected);
        onOpenChange(false);
    };

    const totalSelectedItems = Object.values(quantities).filter(q => q > 0).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 rounded-none border-4 border-brand-black bg-brand-white">
                <DialogHeader className="px-6 py-4 border-b-2 border-brand-black bg-brand-light-orange/20 flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold font-display">
                        <Package className="w-6 h-6" />
                        Pilih Banyak Produk
                    </DialogTitle>
                </DialogHeader>

                {/* Inline Settings Bar (Always visible) */}
                <div className="px-6 py-3 border-b-2 border-brand-black bg-gray-50 flex-shrink-0">
                    <div className="flex items-center gap-6 flex-wrap">
                        {/* Default Pack Mode Toggle */}
                        <div className="flex items-center gap-2.5">
                            <Label className="text-xs font-mono font-bold text-muted-foreground whitespace-nowrap">Default Mode:</Label>
                            <div className="flex items-center gap-1.5 bg-white border-2 border-brand-black/20 rounded-lg px-2.5 py-1.5">
                                <span className={`text-xs font-mono font-bold ${defaultPackMode ? 'text-brand-orange' : 'text-muted-foreground'}`}>
                                    {defaultPackMode ? 'Paket' : 'Satuan'}
                                </span>
                                <Switch
                                    checked={defaultPackMode}
                                    onCheckedChange={handleToggleDefaultPackMode}
                                    className="data-[state=checked]:bg-brand-orange border-2 border-brand-black scale-75"
                                />
                            </div>
                        </div>

                        {/* Default Units Per Pack */}
                        <div className="flex items-center gap-2.5">
                            <Label className="text-xs font-mono font-bold text-muted-foreground whitespace-nowrap">Isi Paket:</Label>
                            <div className="flex items-center gap-1">
                                <Input
                                    type="number"
                                    min={1}
                                    className="w-16 h-8 font-mono text-center font-bold border-2 border-brand-black/20 rounded-lg text-sm bg-white"
                                    placeholder="Auto"
                                    defaultValue={defaultUnitsPerPack || ''}
                                    onBlur={(e) => {
                                        const val = parseInt(e.target.value) || 0;
                                        handleSaveDefaultUnitsPerPack(val);
                                    }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                                    }}
                                />
                                <span className="text-[10px] font-mono text-muted-foreground">pcs</span>
                            </div>
                        </div>

                        <span className="text-[10px] font-mono text-muted-foreground/60 italic ml-auto">
                            Pengaturan tersimpan otomatis
                        </span>
                    </div>
                </div>

                <div className="p-4 border-b-2 border-brand-black bg-white flex-shrink-0">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Cari produk..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 border-2 border-brand-black rounded-none h-11 focus-visible:ring-0 focus-visible:ring-offset-0 font-bold"
                            autoFocus
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 bg-gray-50">
                    <div className="grid grid-cols-1 gap-0">
                        {filteredProducts.map(product => {
                            const qty = quantities[product.id] || 0;
                            const isPack = packModes[product.id] || false;
                            const isSelected = qty > 0;
                            const currentUnitsPerPack = unitsPerPacks[product.id] || product.qtyPerUnit || 1;

                            return (
                                <div
                                    key={product.id}
                                    className={`
                    flex items-center justify-between p-4 border-b transition-all
                    ${isSelected ? 'bg-brand-orange/10' : 'bg-white hover:bg-gray-50'}
                    border-gray-200
                  `}
                                >
                                    <div className="flex-1 min-w-0 mr-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-bold text-lg truncate">{product.name}</h4>
                                            {product.category && <Badge variant="outline" className="text-[10px] h-5 rounded-none border-black">{product.category}</Badge>}
                                        </div>
                                        <div className="text-sm text-muted-foreground font-mono flex gap-3">
                                            <span>•</span>
                                            <span>Limit Min: {product.minStockLevel}</span>
                                        </div>
                                        <div className="mt-2">
                                            <Input
                                                placeholder="Catatan..."
                                                className="h-8 text-xs border-dashed border-2 border-gray-300 w-full"
                                                value={notes[product.id] || ''}
                                                onChange={(e) => handleNoteChange(product.id, e.target.value)}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        {/* Pack Mode Configuration Group */}
                                        <div className={`
                                            flex items-center gap-3 px-3 py-1 rounded-lg border-2 transition-all
                                            ${isPack ? 'bg-brand-orange/10 border-brand-orange' : 'bg-gray-50 border-gray-200'}
                                        `}>
                                            <div className="flex items-center gap-2">
                                                <Label htmlFor={`mode-${product.id}`} className="text-xs font-mono text-muted-foreground cursor-pointer select-none font-bold">
                                                    {isPack ? 'Paket' : 'Satuan'}
                                                </Label>
                                                <Switch
                                                    id={`mode-${product.id}`}
                                                    checked={isPack}
                                                    onCheckedChange={() => togglePackMode(product.id)}
                                                    className="data-[state=checked]:bg-brand-orange border-2 border-brand-black scale-90"
                                                />
                                            </div>

                                            {/* Units per Pack Input (Only visible in Pack Mode) */}
                                            {isPack && (
                                                <div className="flex items-center gap-1 pl-3 border-l-2 border-brand-black/10 animate-in fade-in slide-in-from-left-2">
                                                    <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">Isi:</span>
                                                    <Input
                                                        id={`upp-${product.id}`}
                                                        type="number"
                                                        className="h-7 w-14 font-mono text-center font-bold border-1 border-brand-black/30 focus:border-brand-black text-xs p-0 rounded-md bg-white"
                                                        placeholder="1"
                                                        value={currentUnitsPerPack}
                                                        onChange={(e) => handleUnitsPerPackChange(product.id, e.target.value)}
                                                    />
                                                    <span className="text-[10px] font-mono text-muted-foreground">pcs</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Quantity Input */}
                                        <div className="flex items-center gap-0 bg-white border-2 border-brand-black shadow-sm h-10 w-32">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-full w-9 rounded-none hover:bg-gray-100 border-r-2 border-brand-black"
                                                onClick={() => decrementQty(product.id)}
                                            >
                                                <Minus className="w-3 h-3" />
                                            </Button>
                                            <Input
                                                type="number"
                                                className="h-full border-none text-center p-0 focus-visible:ring-0 font-bold text-lg rounded-none"
                                                value={qty === 0 ? '' : qty}
                                                placeholder="0"
                                                onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                                            />
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-full w-9 rounded-none hover:bg-gray-100 border-l-2 border-brand-black"
                                                onClick={() => incrementQty(product.id)}
                                            >
                                                <Plus className="w-3 h-3" />
                                            </Button>
                                        </div>

                                        {/* Price Input directly in row */}
                                        <div className="flex flex-col gap-0.5 w-28">
                                            <Label htmlFor={`price-${product.id}`} className="text-[9px] font-mono text-muted-foreground uppercase tracking-wider">Harga {isPack ? '/ Pack' : '/ Unit'}</Label>
                                            <Input
                                                id={`price-${product.id}`}
                                                className="h-9 font-mono text-right font-bold text-sm border-2 border-gray-200 focus:border-brand-black focus:ring-0 transition-all"
                                                placeholder="Rp 0"
                                                value={buyPrices[product.id] !== undefined ? buyPrices[product.id] : (product.cost || '')}
                                                onChange={(e) => handlePriceChange(product.id, e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}

                        {filteredProducts.length === 0 && (
                            <div className="text-center py-12 text-muted-foreground font-mono">
                                Tidak ada produk ditemukan.
                            </div>
                        )}
                    </div>
                </ScrollArea>

                <DialogFooter className="p-4 border-t-2 border-brand-black bg-white flex-shrink-0">
                    <div className="flex items-center justify-between w-full">
                        <div className="text-sm font-mono font-bold">
                            {totalSelectedItems} produk dipilih
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-none border-2 border-brand-black font-bold h-11 px-6">
                                Batal
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm transition-all h-11 px-6"
                                disabled={totalSelectedItems === 0}
                            >
                                <Check className="w-4 h-4 mr-2" />
                                Tambahkan ({totalSelectedItems})
                            </Button>
                        </div>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
