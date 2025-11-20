import { useState } from 'react';
import type { Product } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PackagePlus, MessageSquare, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api-client';

interface CustomerFeedbackDialogProps {
    product: Product;
    type: 'stock_request' | 'feedback';
    onClose: () => void;
}

export function CustomerFeedbackDialog({ product, type, onClose }: CustomerFeedbackDialogProps) {
    const { toast } = useToast();
    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState(1);
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name.trim() || !message.trim()) {
            toast({
                title: "Error",
                description: "Nama dan pesan harus diisi",
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);

        try {
            await api('/api/feedback', {
                method: 'POST',
                body: JSON.stringify({
                    productId: product.id,
                    productName: product.name,
                    requesterName: name,
                    quantity: type === 'stock_request' ? quantity : 0,
                    notes: message,
                    requestType: type,
                    status: 'pending'
                })
            });

            toast({
                title: "Terkirim!",
                description: type === 'stock_request'
                    ? "Request stok Anda telah diterima. Kami akan segera memenuhi permintaan Anda."
                    : "Feedback Anda telah diterima. Terima kasih atas masukannya!",
            });

            onClose();
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Gagal mengirim request",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const isStockRequest = type === 'stock_request';
    const Icon = isStockRequest ? PackagePlus : MessageSquare;
    const title = isStockRequest ? 'Request Stok Produk' : 'Kirim Feedback';
    const description = isStockRequest
        ? 'Beritahu kami jika Anda ingin produk ini tersedia kembali'
        : 'Berikan feedback atau pertanyaan untuk produk ini';

    return (
        <div className="p-6">
            <DialogHeader>
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-brand-orange border-2 border-brand-black flex items-center justify-center">
                        <Icon className="w-5 h-5 text-brand-black" />
                    </div>
                    <div>
                        <DialogTitle className="text-xl font-display font-bold text-brand-black">
                            {title}
                        </DialogTitle>
                        <p className="text-sm font-mono text-muted-foreground">{product.name}</p>
                    </div>
                </div>
                <p className="text-sm text-muted-foreground font-mono">{description}</p>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="name" className="font-mono font-bold">Nama Anda</Label>
                    <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Masukkan nama Anda"
                        className="border-2 border-brand-black rounded-none font-mono"
                        required
                    />
                </div>

                {isStockRequest && (
                    <div className="space-y-2">
                        <Label htmlFor="quantity" className="font-mono font-bold">Jumlah yang Diinginkan</Label>
                        <Input
                            id="quantity"
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                            className="border-2 border-brand-black rounded-none font-mono"
                        />
                    </div>
                )}

                <div className="space-y-2">
                    <Label htmlFor="message" className="font-mono font-bold">
                        {isStockRequest ? 'Catatan (Opsional)' : 'Pesan Anda'}
                    </Label>
                    <Textarea
                        id="message"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder={isStockRequest ? "Kapan Anda butuhkan?" : "Tulis feedback atau pertanyaan Anda..."}
                        rows={4}
                        className="border-2 border-brand-black rounded-none font-mono resize-none"
                        required
                    />
                </div>

                <div className="flex gap-2 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        className="flex-1 border-2 border-brand-black rounded-none font-mono font-bold"
                        disabled={isSubmitting}
                    >
                        Batal
                    </Button>
                    <Button
                        type="submit"
                        className="flex-1 bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold hover:bg-brand-black hover:text-brand-white"
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Mengirim...
                            </>
                        ) : (
                            'Kirim'
                        )}
                    </Button>
                </div>
            </form>
        </div>
    );
}
