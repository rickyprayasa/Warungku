import { useState, useEffect } from 'react';
import { useWarungStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Store, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function StoreProfileDialog({ iconOnly = false }: { iconOnly?: boolean }) {
    const storeProfile = useWarungStore((state) => state.storeProfile);
    const updateStoreProfile = useWarungStore((state) => state.updateStoreProfile);
    const [isOpen, setIsOpen] = useState(false);
    const [formData, setFormData] = useState(storeProfile);
    const [isSaving, setIsSaving] = useState(false);

    // Sync formData when storeProfile changes (e.g., after fetch from server)
    useEffect(() => {
        setFormData(storeProfile);
    }, [storeProfile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await updateStoreProfile(formData);
            toast.success('Profil toko berhasil diperbarui');
            setIsOpen(false);
        } catch (error) {
            toast.error('Gagal menyimpan profil toko. Silakan coba lagi.');
            console.error('Failed to update store profile:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (max 500KB for base64 storage)
        if (file.size > 500 * 1024) {
            toast.error('Ukuran file terlalu besar. Maksimal 500KB.');
            return;
        }

        // Check file type
        const isPng = file.type === 'image/png';
        const isGif = file.type === 'image/gif';
        const hasTransparency = isPng || isGif;

        // Compress and resize image before storing
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = (event) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                
                // Max dimensions for logo
                const maxWidth = 150;
                const maxHeight = 150;
                
                let { width, height } = img;
                
                // Calculate new dimensions maintaining aspect ratio
                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // Clear canvas for transparency support
                if (ctx) {
                    ctx.clearRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                }
                
                // Use PNG for images with transparency, JPEG for others (smaller size)
                let compressedDataUrl: string;
                if (hasTransparency) {
                    compressedDataUrl = canvas.toDataURL('image/png');
                } else {
                    compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                }
                
                // Check final size (base64 is ~33% larger than binary)
                const base64Size = compressedDataUrl.length * 0.75;
                if (base64Size > 100 * 1024) {
                    toast.warning('Logo dikompresi. Untuk hasil terbaik, gunakan gambar lebih kecil.');
                }
                
                setFormData(prev => ({ ...prev, logoUrl: compressedDataUrl }));
            };
            img.src = event.target?.result as string;
        };
        
        reader.readAsDataURL(file);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="ghost"
                    size={iconOnly ? "icon" : "default"}
                    className={iconOnly
                        ? "hover:bg-brand-orange hover:text-brand-black rounded-none transition-colors text-muted-foreground"
                        : "w-full justify-start font-mono uppercase font-bold text-sm px-4 py-2 hover:bg-brand-orange hover:text-brand-black rounded-none transition-colors text-muted-foreground"
                    }
                >
                    <Store className="w-4 h-4" style={iconOnly ? {} : { marginRight: '0.5rem' }} />
                    {!iconOnly && "Profil Toko"}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-none border-4 border-brand-black bg-brand-white p-0">
                <div className="bg-brand-orange p-4 border-b-4 border-brand-black">
                    <DialogHeader>
                        <DialogTitle className="font-display font-black text-2xl text-brand-black uppercase tracking-wider flex items-center gap-2">
                            <Store className="w-6 h-6" />
                            Pengaturan Toko
                        </DialogTitle>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="font-mono font-bold uppercase text-xs">Nama Toko</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="border-2 border-brand-black rounded-none font-mono focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-orange"
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="logoUrl" className="font-mono font-bold uppercase text-xs">Logo Toko</Label>
                        <div className="flex items-center gap-4">
                            {formData.logoUrl && (
                                <div className="w-16 h-16 border-2 border-brand-black rounded-full overflow-hidden bg-gray-100 shrink-0">
                                    <img src={formData.logoUrl} alt="Preview" className="w-full h-full object-cover" />
                                </div>
                            )}
                            <div className="flex-1">
                                <Input
                                    id="logoUpload"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageUpload}
                                    className="border-2 border-brand-black rounded-none font-mono cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-xs file:font-bold file:bg-brand-black file:text-brand-white hover:file:bg-brand-orange hover:file:text-brand-black transition-all"
                                />
                                <p className="text-[10px] text-muted-foreground font-mono mt-1">
                                    Upload gambar logo (Max 500KB). Format: JPG, PNG, GIF.
                                </p>
                            </div>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-300" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-brand-white px-2 text-muted-foreground font-mono">Atau gunakan URL</span>
                            </div>
                        </div>

                        <Input
                            id="logoUrl"
                            value={formData.logoUrl || ''}
                            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                            placeholder="https://example.com/logo.png"
                            className="border-2 border-brand-black rounded-none font-mono focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-orange"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address" className="font-mono font-bold uppercase text-xs">Alamat</Label>
                        <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            className="border-2 border-brand-black rounded-none font-mono focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-orange"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone" className="font-mono font-bold uppercase text-xs">Nomor Telepon</Label>
                        <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            className="border-2 border-brand-black rounded-none font-mono focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-orange"
                        />
                    </div>

                    <Button 
                        type="submit" 
                        disabled={isSaving}
                        className="w-full bg-brand-black text-brand-white hover:bg-brand-orange hover:text-brand-black border-2 border-transparent hover:border-brand-black rounded-none font-mono font-bold uppercase transition-all disabled:opacity-50"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Menyimpan...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Simpan Perubahan
                            </>
                        )}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
