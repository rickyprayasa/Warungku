
import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { useWarungStore } from '@/lib/store';
import { PurchaseFormValues } from '@shared/types';
import { Package, Check, Calculator } from 'lucide-react';
import { getPackageLabel } from '@/lib/utils';

interface EditCartItemDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    item: PurchaseFormValues | null;
    onSave: (updatedItem: PurchaseFormValues) => void;
}

export function EditCartItemDialog({ open, onOpenChange, item, onSave }: EditCartItemDialogProps) {
    const { products } = useWarungStore();

    // Local state for editing
    const [isPack, setIsPack] = useState(false);
    const [quantity, setQuantity] = useState(0); // Unit quantity
    const [packQuantity, setPackQuantity] = useState(0);
    const [unitsPerPack, setUnitsPerPack] = useState(1);
    const [cost, setCost] = useState(0); // Unit Cost or Pack Price depending on mode
    const [notes, setNotes] = useState('');

    const product = products.find(p => p.id === item?.productId);
    const packageLabel = getPackageLabel(product?.unit);

    // Initialize state when item changes
    useEffect(() => {
        if (item && open) {
            const isPackMode = item._display?.isPackMode || false;
            setIsPack(isPackMode);
            setQuantity(item.quantity);
            setPackQuantity(item._display?.packQty || 0);
            setUnitsPerPack(item._display?.packUnit || product?.qtyPerUnit || 1);
            setNotes(item.notes || '');

            if (isPackMode) {
                // Calculate Pack Price from Total Cost
                const total = item._display?.totalCost || 0;
                const packs = item._display?.packQty || 1;
                setCost(packs > 0 ? total / packs : 0);
            } else {
                setCost(item.unitCost);
            }
        }
    }, [item, open, product]);

    const handleSave = () => {
        if (!item) return;

        let finalQuantity = quantity;
        let finalTotalCost = 0;
        let finalUnitCost = 0;

        if (isPack) {
            finalQuantity = packQuantity * unitsPerPack;
            finalTotalCost = packQuantity * cost;
            finalUnitCost = finalQuantity > 0 ? finalTotalCost / finalQuantity : 0;
        } else {
            finalQuantity = quantity;
            finalTotalCost = quantity * cost;
            finalUnitCost = cost;
        }

        const updatedItem: PurchaseFormValues = {
            ...item,
            quantity: finalQuantity,
            unitCost: finalUnitCost,
            notes: notes,
            // Update pack specific fields if needed for future reference, though schema doesn't strictly enforce them in root for all logic
            packQuantity: isPack ? packQuantity : undefined,
            unitsPerPack: isPack ? unitsPerPack : undefined,

            _display: {
                ...item._display,
                isPackMode: isPack,
                totalCost: finalTotalCost,
                packQty: isPack ? packQuantity : undefined,
                packUnit: isPack ? unitsPerPack : undefined,
                unitLabel: isPack ? packageLabel : 'Unit'
            }
        };

        onSave(updatedItem);
        onOpenChange(false);
    };

    // Calculate live preview totals
    const previewTotal = isPack
        ? (packQuantity * cost)
        : (quantity * cost);

    const previewTotalQty = isPack
        ? (packQuantity * unitsPerPack)
        : quantity;

    if (!item) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md border-4 border-brand-black p-0 rounded-xl bg-white overflow-hidden">
                <DialogHeader className="p-6 bg-brand-orange/10 border-b-2 border-brand-black">
                    <DialogTitle className="flex items-center gap-2 font-display text-xl">
                        <div className="p-2 bg-brand-orange text-brand-black border-2 border-brand-black rounded-lg">
                            <Package className="w-5 h-5" />
                        </div>
                        Edit Barang
                    </DialogTitle>
                    <p className="text-sm font-bold text-muted-foreground mt-2">{item._display?.productName}</p>
                </DialogHeader>

                <div className="p-6 space-y-6">
                    {/* Mode Toggle */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                        <Label className="font-bold text-sm">Mode Pembelian</Label>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono">{isPack ? 'Paket' : 'Satuan'}</span>
                            <Switch checked={isPack} onCheckedChange={setIsPack} className="border-2 border-brand-black data-[state=checked]:bg-brand-orange" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        {isPack ? (
                            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-left-2">
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Jml {packageLabel}</Label>
                                    <Input
                                        type="number"
                                        value={packQuantity || ''}
                                        onChange={e => setPackQuantity(parseInt(e.target.value) || 0)}
                                        className="font-bold text-center border-2 border-brand-black h-11"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Isi / {packageLabel}</Label>
                                    <Input
                                        type="number"
                                        value={unitsPerPack || ''}
                                        onChange={e => setUnitsPerPack(parseInt(e.target.value) || 0)}
                                        className="font-bold text-center border-2 border-brand-black h-11"
                                    />
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-2 animate-in slide-in-from-right-2">
                                <Label className="text-xs font-bold uppercase text-muted-foreground">Jumlah Unit</Label>
                                <Input
                                    type="number"
                                    value={quantity || ''}
                                    onChange={e => setQuantity(parseInt(e.target.value) || 0)}
                                    className="font-bold text-center border-2 border-brand-black h-11"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">
                                Harga Beli {isPack ? `/ ${packageLabel}` : '/ Unit'}
                            </Label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">Rp</span>
                                <Input
                                    type="number"
                                    value={cost || ''}
                                    onChange={e => setCost(parseFloat(e.target.value) || 0)}
                                    className="pl-9 font-bold font-mono border-2 border-brand-black h-11"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase text-muted-foreground">Catatan</Label>
                            <Textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                className="resize-none font-mono text-sm border-2 border-brand-black min-h-[80px]"
                                placeholder="Catatan..."
                            />
                        </div>
                    </div>

                    {/* Summary Box */}
                    <div className="bg-brand-black text-white p-4 rounded-xl space-y-2 font-mono text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Total Qty:</span>
                            <span className="font-bold">{previewTotalQty} Pcs</span>
                        </div>
                        <div className="flex justify-between text-lg border-t border-white/20 pt-2 mt-2">
                            <span className="text-gray-400">Total:</span>
                            <span className="font-bold text-brand-orange">
                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(previewTotal)}
                            </span>
                        </div>
                    </div>
                </div>

                <DialogFooter className="p-4 border-t-2 border-brand-black bg-gray-50">
                    <div className="flex gap-2 w-full">
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 font-bold border-2 border-brand-black h-12">
                            Batal
                        </Button>
                        <Button onClick={handleSave} className="flex-1 font-bold bg-brand-orange text-brand-black border-2 border-brand-black h-12 hover:bg-brand-black hover:text-white transition-all shadow-hard hover:shadow-hard-sm">
                            <Check className="w-4 h-4 mr-2" />
                            Simpan Perubahan
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
