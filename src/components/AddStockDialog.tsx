import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWarungStore } from '@/lib/store';
import { toast } from 'sonner';
import { Loader2, Plus } from 'lucide-react';
import { Product } from '@shared/types';

interface AddStockDialogProps {
    product: Product;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function AddStockDialog({ product, open, onOpenChange }: AddStockDialogProps) {
    const [quantity, setQuantity] = useState<string>('');
    const [unitCost, setUnitCost] = useState<string>('');
    const [isLoading, setIsLoading] = useState(false);
    const { fetchProducts } = useWarungStore();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const qty = parseInt(quantity);
        const cost = parseInt(unitCost.replace(/\D/g, '')); // Remove non-digits

        if (!qty || qty <= 0) {
            toast.error('Jumlah stok harus lebih dari 0');
            return;
        }

        if (isNaN(cost) || cost < 0) {
            toast.error('Harga beli tidak valid');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`/api/products/${product.id}/add-stock`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ quantity: qty, unitCost: cost }),
            });

            if (!response.ok) throw new Error('Gagal menambah stok');

            toast.success('Stok berhasil ditambahkan');
            await fetchProducts();
            onOpenChange(false);
            setQuantity('');
            setUnitCost('');
        } catch (error) {
            toast.error('Terjadi kesalahan saat menambah stok');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const formatCurrency = (value: string) => {
        const number = parseInt(value.replace(/\D/g, ''));
        if (isNaN(number)) return '';
        return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(number);
    };

    const handleCostChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, '');
        setUnitCost(rawValue);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] border-4 border-brand-black rounded-none bg-brand-white">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-bold">Tambah Stok Manual</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Produk</Label>
                        <div className="p-3 bg-gray-100 border-2 border-brand-black font-mono font-bold">
                            {product.name}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="quantity">Jumlah Tambahan</Label>
                            <Input
                                id="quantity"
                                type="number"
                                min="1"
                                placeholder="0"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="border-2 border-brand-black rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-orange"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="cost">Harga Beli (per unit)</Label>
                            <Input
                                id="cost"
                                type="text"
                                placeholder="Rp 0"
                                value={unitCost ? formatCurrency(unitCost) : ''}
                                onChange={handleCostChange}
                                className="border-2 border-brand-black rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-orange"
                            />
                        </div>
                    </div>

                    <div className="p-3 bg-blue-50 border-2 border-blue-200 text-sm text-blue-800">
                        <p className="font-bold mb-1">ℹ️ Info</p>
                        Stok ini akan ditambahkan ke sistem FIFO dengan harga beli yang Anda masukkan. Transaksi ini akan tercatat sebagai "Manual Adjustment".
                    </div>

                    <DialogFooter>
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-brand-orange text-brand-black border-2 border-brand-black shadow-hard hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all font-bold rounded-none"
                        >
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                            Tambah Stok
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
