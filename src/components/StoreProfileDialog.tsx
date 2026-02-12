import { useState, useEffect } from 'react';
import { useWarungStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, Save, Loader2, LayoutGrid } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

const STORE_CATEGORIES = [
    { id: 'Warung', label: 'Warung (Default)', icon: '🏪' },
    { id: 'Material/Bangunan', label: 'Material / Bangunan', icon: '🧱' },
    { id: 'Listrik', label: 'Alat Listrik', icon: '⚡' },
    { id: 'Elektronik', label: 'Elektronik / Gadget', icon: '🔌' },
    { id: 'Pakaian', label: 'Pakaian / Fashion', icon: '👕' },
    { id: 'F&B', label: 'Makan / Minum', icon: '🍔' },
    { id: 'Jasa', label: 'Jasa / Service', icon: '🛠️' },
    { id: 'Lainnya', label: 'Lainnya', icon: '📦' },
];

export function StoreProfileDialog({ iconOnly = false, compact = false, trigger }: { iconOnly?: boolean; compact?: boolean; trigger?: React.ReactNode }) {
    const currentUser = useWarungStore((state) => state.currentUser);
    const storeProfile = useWarungStore((state) => state.storeProfile);
    const updateStoreProfile = useWarungStore((state) => state.updateStoreProfile);
    const { updateStoreSlug, storeId, refreshStore } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        category: '',
        address: '',
        phone: '',
        logoUrl: '',
        slug: '',
        color_scheme: 'orange' // default color
    });
    // Sync formData when storeProfile changes (e.g., after fetch from server)
    useEffect(() => {
        if (storeProfile) {
            setFormData(prev => ({ ...prev, ...storeProfile }));
        }
    }, [storeProfile]);

    // Security Check: If not owner/admin, do not render
    // IMPORTANT: This must be AFTER all hooks to avoid "Rendered fewer hooks" error
    if (currentUser && currentUser.role !== 'owner' && currentUser.role !== 'admin') {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            // Prepare payload with cleaned slug
            const payload = { ...formData };
            if (payload.slug) {
                // Remove leading/trailing hyphens for submission
                payload.slug = payload.slug.replace(/^-+|-+$/g, '');
            }

            // Validate slug
            if (payload.slug) {
                // Slug should only contain lowercase letters, numbers, and hyphens
                const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
                if (!slugRegex.test(payload.slug)) {
                    toast.error('Slug hanya boleh mengandung huruf kecil, angka, dan tanda hubung (-).');
                    setIsSaving(false);
                    return;
                }
            }

            // Check if slug changed and if it already exists
            if (payload.slug !== storeProfile.slug && payload.slug) {
                const { supabase } = await import('@/lib/supabase');
                const { data: existingStore } = await supabase
                    .from('stores')
                    .select('id, name, slug')
                    .eq('slug', payload.slug)
                    .neq('id', storeId)
                    .maybeSingle() as { data: { id: string; name: string; slug: string } | null; error: any };

                if (existingStore) {
                    toast.error(`Slug "${payload.slug}" sudah digunakan oleh toko "${existingStore.name}". Silakan gunakan slug lain.`);
                    setIsSaving(false);
                    return;
                }
            }

            // Update store profile
            await updateStoreProfile(payload);

            // CRITICAL: Refresh AuthContext store to sync slug
            // This ensures store?.slug in Sidebar shows the updated value
            await refreshStore();

            // Show success message with new slug if it changed
            if (payload.slug !== storeProfile.slug && payload.slug) {
                toast.success(`Profil toko berhasil diperbarui. URL toko baru: /${payload.slug}`);
            } else {
                toast.success('Profil toko berhasil diperbarui');
            }

            setIsOpen(false);
        } catch (error: any) {
            console.error('Failed to update store profile:', error);
            toast.error(`Gagal menyimpan profil toko: ${error.message || 'Terjadi kesalahan'}`);
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

        // Check file type for transparency support
        const isPng = file.type === 'image/png';
        const isGif = file.type === 'image/gif';
        const isWebp = file.type === 'image/webp';
        const hasTransparency = isPng || isGif || isWebp;

        // Compress and resize image before storing
        const img = new Image();
        const reader = new FileReader();

        reader.onload = (event) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { alpha: true });

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

                // Handle transparency properly
                if (ctx) {
                    // Clear canvas with transparent background
                    ctx.clearRect(0, 0, width, height);
                    // Draw image preserving transparency
                    ctx.drawImage(img, 0, 0, width, height);
                }

                // Always use PNG to preserve transparency
                let compressedDataUrl: string;
                if (hasTransparency) {
                    // Use PNG to preserve alpha channel
                    compressedDataUrl = canvas.toDataURL('image/png');
                } else {
                    // JPEG for non-transparent images (smaller size)
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
                {trigger || (
                    <Button
                        variant="ghost"
                        size={iconOnly || compact ? "sm" : "default"}
                        className={iconOnly
                            ? "hover:bg-brand-orange hover:text-brand-black rounded-none transition-colors text-muted-foreground"
                            : compact
                                ? "flex-1 justify-center font-mono uppercase font-bold text-xs px-2 py-2 hover:bg-brand-orange hover:text-brand-black rounded-none transition-colors text-muted-foreground"
                                : "w-full justify-start font-mono uppercase font-bold text-sm px-4 py-2 hover:bg-brand-orange hover:text-brand-black rounded-none transition-colors text-muted-foreground"
                        }
                    >
                        <Store className="w-4 h-4" style={(iconOnly || compact) ? {} : { marginRight: '0.5rem' }} />
                        {!iconOnly && !compact && "Profil Toko"}
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-4xl w-full rounded-none border-4 border-brand-black bg-brand-white p-0 overflow-hidden max-h-[90vh] flex flex-col">
                <div className="bg-brand-orange p-4 border-b-4 border-brand-black shrink-0">
                    <DialogHeader>
                        <DialogTitle className="font-display font-black text-2xl text-brand-black uppercase tracking-wider flex items-center gap-2">
                            <Store className="w-6 h-6" />
                            Pengaturan Toko
                        </DialogTitle>
                    </DialogHeader>
                </div>

                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Left Column: General Info */}
                        <div className="space-y-4">
                            <h3 className="font-display font-bold text-lg border-b-2 border-brand-black pb-2 mb-4 flex items-center gap-2">
                                <LayoutGrid className="w-5 h-5" />
                                Informasi Utama
                            </h3>

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
                                <Label htmlFor="category" className="font-mono font-bold uppercase text-xs">Kategori Usaha</Label>
                                <Select
                                    value={formData.category || 'Warung'}
                                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                                >
                                    <SelectTrigger className="w-full border-2 border-brand-black rounded-none font-mono focus:ring-0 focus:ring-offset-0">
                                        <SelectValue placeholder="Pilih Kategori" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-none border-2 border-brand-black max-h-[200px]">
                                        {STORE_CATEGORIES.map((cat) => (
                                            <SelectItem key={cat.id} value={cat.id} className="font-mono cursor-pointer hover:bg-brand-orange/20">
                                                <span className="mr-2">{cat.icon}</span> {cat.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-muted-foreground font-mono">
                                    Kategori akan menentukan tampilan background halaman publik toko Anda.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="slug" className="font-mono font-bold uppercase text-xs">URL Toko (Slug)</Label>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground font-mono text-sm hidden sm:inline">omzetin.web.id/</span>
                                    <Input
                                        id="slug"
                                        value={formData.slug || ''}
                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-') })}
                                        className="border-2 border-brand-black rounded-none font-mono focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-orange flex-1"
                                        placeholder="nama-toko"
                                    />
                                </div>
                                <p className="text-[10px] text-muted-foreground font-mono">
                                    Slug hanya boleh huruf kecil, angka, & strip (-). URL: <span className="font-bold text-brand-orange">/{formData.slug || storeProfile.slug || 'nama-toko'}</span>
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="logoUrl" className="font-mono font-bold uppercase text-xs">Logo Toko</Label>
                                <div className="flex items-start gap-4">
                                    {formData.logoUrl ? (
                                        <div className="w-20 h-20 border-2 border-brand-black rounded-full overflow-hidden bg-gray-100 shrink-0">
                                            <img src={formData.logoUrl} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-20 h-20 border-2 border-brand-black border-dashed rounded-full flex items-center justify-center bg-gray-50 text-gray-400 shrink-0">
                                            <Store className="w-8 h-8 opacity-50" />
                                        </div>
                                    )}
                                    <div className="flex-1 space-y-2">
                                        <Input
                                            id="logoUpload"
                                            type="file"
                                            accept="image/*"
                                            onChange={handleImageUpload}
                                            className="border-2 border-brand-black rounded-none font-mono cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-xs file:font-bold file:bg-brand-black file:text-brand-white hover:file:bg-brand-orange hover:file:text-brand-black transition-all"
                                        />
                                        <div className="relative">
                                            <div className="absolute inset-0 flex items-center">
                                                <span className="w-full border-t border-gray-300" />
                                            </div>
                                            <div className="relative flex justify-center text-xs uppercase">
                                                <span className="bg-brand-white px-2 text-muted-foreground font-mono">Atau URL</span>
                                            </div>
                                        </div>
                                        <Input
                                            id="logoUrl"
                                            value={formData.logoUrl || ''}
                                            onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                                            placeholder="https://example.com/logo.png"
                                            className="border-2 border-brand-black rounded-none font-mono text-xs h-8 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-orange"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Contact & Address */}
                        <div className="space-y-4">
                            <h3 className="font-display font-bold text-lg border-b-2 border-brand-black pb-2 mb-4 flex items-center gap-2">
                                <span className="text-xl">📍</span>
                                Kontak & Lokasi
                            </h3>

                            <div className="space-y-2">
                                <Label htmlFor="address" className="font-mono font-bold uppercase text-xs">Alamat Lengkap</Label>
                                <textarea
                                    id="address"
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    rows={4}
                                    className="flex w-full rounded-none border-2 border-brand-black bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-brand-orange disabled:cursor-not-allowed disabled:opacity-50 font-mono resize-none"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="font-mono font-bold uppercase text-xs">Nomor Telepon / WhatsApp</Label>
                                <Input
                                    id="phone"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="border-2 border-brand-black rounded-none font-mono focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-orange"
                                    placeholder="Contoh: 08123456789"
                                />
                                <p className="text-[10px] text-muted-foreground font-mono">
                                    Nomor ini akan digunakan untuk link WhatsApp pada struk.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="p-6 pt-0 mt-auto">
                        <Button
                            type="submit"
                            disabled={isSaving}
                            className="w-full bg-brand-black text-brand-white hover:bg-brand-orange hover:text-brand-black border-2 border-transparent hover:border-brand-black rounded-none font-mono font-bold uppercase transition-all disabled:opacity-50 h-12 text-lg"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    Menyimpan Perubahan...
                                </>
                            ) : (
                                <>
                                    <Save className="w-5 h-5 mr-2" />
                                    Simpan Pengaturan Toko
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
