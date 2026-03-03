import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useWarungStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Store, Loader2, CheckCircle2, Eye, EyeOff, LogOut } from 'lucide-react';
import { toast } from 'sonner';

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

export function OnboardingPage() {
    const navigate = useNavigate();
    const { user, store, refreshStore } = useAuth();

    const [storeName, setStoreName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [category, setCategory] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [logoUrl, setLogoUrl] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isReady, setIsReady] = useState(false);

    // Initialize form with existing store data
    useEffect(() => {
        if (store) {
            if (store.settings?.onboarded) {
                // Already onboarded, redirect to dashboard
                navigate('/dashboard', { replace: true });
                return;
            }
            setStoreName(store.name || '');
            setAddress(store.address || '');
            setPhone(store.phone || '');
            setLogoUrl(store.logo_url || '');
            setIsReady(true);

            // Fetch category from the settings table (key: store_category)
            supabase
                .from('settings')
                .select('value')
                .eq('store_id', store.id)
                .eq('key', 'store_category')
                .maybeSingle()
                .then(({ data }) => {
                    if (data?.value) setCategory(data.value);
                });
        }
    }, [store, navigate]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!store?.id) return;

        // Validate category
        if (!category) {
            toast.error('Silakan pilih kategori usaha Anda');
            return;
        }

        // Validate phone length
        if (phone && phone.length < 8) {
            toast.error('Nomor telepon tidak valid');
            return;
        }

        // Validate password strength if provided
        if (password) {
            if (password.length < 8) {
                toast.error('Password baru minimal 8 karakter');
                return;
            }
            if (!/[A-Z]/.test(password)) {
                toast.error('Password baru harus mengandung minimal 1 huruf kapital');
                return;
            }
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
                toast.error('Password baru harus mengandung minimal 1 karakter spesial');
                return;
            }
        }

        setIsSubmitting(true);

        try {
            // 1. Update store profile
            const newSettings = {
                ...(store.settings as Record<string, any>),
                onboarded: true
            };

            const { error: storeError } = await supabase
                .from('stores')
                .update({
                    name: storeName,
                    address,
                    phone,
                    logo_url: logoUrl,
                    settings: newSettings,
                    updated_at: new Date().toISOString()
                })
                .eq('id', store.id);

            if (storeError) throw storeError;

            // 1b. Save category to the settings table (same as StoreProfileDialog)
            await (supabase
                .from('settings')
                .upsert(
                    { store_id: store.id, key: 'store_category', value: category },
                    { onConflict: 'store_id,key' }
                ) as any);

            if (storeError) throw storeError;

            // 2. Update user password if provided
            if (password && password.length >= 6) {
                const { error: authError } = await supabase.auth.updateUser({
                    password: password
                });

                if (authError) {
                    console.error("Failed to update password:", authError);
                    toast.error("Gagal memperbarui password, tetapi data toko berhasil disimpan.");
                }
            }

            // 3. Update store_members if must_change_password was true
            if (user?.id) {
                await supabase
                    .from('store_members')
                    .update({ must_change_password: false })
                    .eq('store_id', store.id)
                    .eq('user_id', user.id);
            }

            toast.success('Pengaturan selesai! Selamat datang di dashboard.');

            // Refresh local auth context to pick up the new settings
            await refreshStore();

            // Use replace so they can't go back to onboarding
            navigate('/dashboard', { replace: true });

        } catch (err: any) {
            console.error('Onboarding error:', err);
            toast.error(err.message || 'Gagal menyimpan pengaturan');
        } finally {
            setIsSubmitting(false);
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

        const isPng = file.type === 'image/png';
        const isGif = file.type === 'image/gif';
        const isWebp = file.type === 'image/webp';
        const hasTransparency = isPng || isGif || isWebp;

        const img = new Image();
        const reader = new FileReader();

        reader.onload = (event) => {
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { alpha: true });

                const maxWidth = 150;
                const maxHeight = 150;
                let { width, height } = img;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;

                if (ctx) {
                    ctx.clearRect(0, 0, width, height);
                    ctx.drawImage(img, 0, 0, width, height);
                }

                let compressedDataUrl: string;
                if (hasTransparency) {
                    compressedDataUrl = canvas.toDataURL('image/png');
                } else {
                    compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
                }

                const base64Size = compressedDataUrl.length * 0.75;
                if (base64Size > 100 * 1024) {
                    toast.warning('Logo dikompresi. Untuk hasil terbaik, gunakan gambar lebih kecil.');
                }

                setLogoUrl(compressedDataUrl);
            };
            img.src = event.target?.result as string;
        };

        reader.readAsDataURL(file);
    };

    if (!isReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-muted/40">
                <Loader2 className="w-12 h-12 text-brand-orange animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-muted/40 py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-2xl bg-brand-white border-4 border-brand-black shadow-hard p-8">

                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-orange border-2 border-brand-black mb-4 overflow-hidden rounded-full">
                        {logoUrl ? (
                            <img src={logoUrl} alt="Store Logo" className="w-full h-full object-cover" />
                        ) : (
                            <Store className="w-8 h-8 text-brand-black" />
                        )}
                    </div>
                    <h1 className="text-3xl font-display font-bold text-brand-black mb-2">
                        Lengkapi Profil Toko Anda
                    </h1>
                    <p className="font-mono text-muted-foreground text-sm">
                        Hanya butuh 1 menit untuk menyiapkan toko Anda sebelum bisa mulai berjualan.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        <div className="space-y-2 col-span-1 md:col-span-2">
                            <Label htmlFor="logoUpload" className="font-mono font-bold text-sm">Logo Toko (Opsional)</Label>
                            <Input
                                id="logoUpload"
                                type="file"
                                accept="image/*"
                                onChange={handleImageUpload}
                                className="border-2 border-brand-black rounded-none font-mono cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-none file:border-0 file:text-xs file:font-bold file:bg-brand-black file:text-brand-white hover:file:bg-brand-orange hover:file:text-brand-black transition-all"
                            />
                            <p className="text-[10px] text-muted-foreground font-mono">
                                Format disarankan PNG/JPEG. Maksimal 500KB.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="storeName" className="font-mono font-bold text-sm">Nama Toko *</Label>
                            <Input
                                id="storeName"
                                value={storeName}
                                onChange={(e) => setStoreName(e.target.value)}
                                required
                                className="h-12 rounded-none border-2 border-brand-black focus-visible:ring-brand-orange font-mono"
                                placeholder="Contoh: Toko Berkah"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="category" className="font-mono font-bold text-sm">Kategori Usaha *</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger className="h-12 rounded-none border-2 border-brand-black focus:ring-brand-orange font-mono">
                                    <SelectValue placeholder="Pilih kategori..." />
                                </SelectTrigger>
                                <SelectContent className="rounded-none border-2 border-brand-black shadow-hard font-mono">
                                    {STORE_CATEGORIES.map((cat) => (
                                        <SelectItem key={cat.id} value={cat.id} className="cursor-pointer hover:bg-brand-orange/20">
                                            <span className="mr-2">{cat.icon}</span> {cat.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone" className="font-mono font-bold text-sm">Nomor Telepon/WhatsApp</Label>
                            <Input
                                id="phone"
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="h-12 rounded-none border-2 border-brand-black focus-visible:ring-brand-orange font-mono"
                                placeholder="Contoh: 081234567890"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="font-mono font-bold text-sm">Setel Password Baru (Opsional)</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="h-12 rounded-none border-2 border-brand-black focus-visible:ring-brand-orange font-mono pr-12"
                                    placeholder="Kosongkan jika tidak ingin mengubah"
                                />
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-gray-100"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                                </Button>
                            </div>

                            {/* Animated Password Strength Indicator */}
                            {password.length > 0 ? (
                                (() => {
                                    const hasLength = password.length >= 8;
                                    const hasUpper = /[A-Z]/.test(password);
                                    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

                                    let strength = 1; // Weak
                                    let label = "Lemah (Butuh 8 karakter, huruf kapital, & simbol)";
                                    let colorStr = "bg-red-500";
                                    let textColor = "text-red-500";

                                    if (hasLength && (hasUpper || hasSpecial)) {
                                        strength = 2; // Medium
                                        label = "Sedang (Kurang huruf kapital atau simbol)";
                                        colorStr = "bg-yellow-500";
                                        textColor = "text-yellow-600";
                                    }

                                    if (hasLength && hasUpper && hasSpecial) {
                                        strength = 3; // Strong
                                        label = "Kuat (Password aman)";
                                        colorStr = "bg-green-500";
                                        textColor = "text-green-500";
                                    }

                                    return (
                                        <div className="mt-2 flex flex-col gap-1">
                                            <div className="flex gap-1 h-1.5 w-full">
                                                <div className={`flex-1 rounded-full transition-all duration-300 ${strength >= 1 ? colorStr : 'bg-gray-200'}`} />
                                                <div className={`flex-1 rounded-full transition-all duration-300 ${strength >= 2 ? colorStr : 'bg-gray-200'}`} />
                                                <div className={`flex-1 rounded-full transition-all duration-300 ${strength === 3 ? colorStr : 'bg-gray-200'}`} />
                                            </div>
                                            <p className={`text-[10px] font-mono font-bold mt-1 transition-colors duration-300 ${textColor}`}>
                                                {label}
                                            </p>
                                        </div>
                                    );
                                })()
                            ) : (
                                <p className="text-[10px] text-muted-foreground font-mono mt-1">
                                    Minimal 8 karakter, 1 huruf kapital, dan 1 karakter spesial.
                                </p>
                            )}
                        </div>

                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="address" className="font-mono font-bold text-sm">Alamat Lengkap</Label>
                        <Textarea
                            id="address"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            className="resize-none rounded-none border-2 border-brand-black focus-visible:ring-brand-orange font-mono"
                            rows={3}
                            placeholder="Contoh: Jl. Sudirman No 123..."
                        />
                    </div>

                    <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-between items-center">
                        <Button
                            type="button"
                            variant="ghost"
                            className="w-full sm:w-auto text-muted-foreground hover:text-red-500 font-mono text-sm"
                            onClick={async () => {
                                await supabase.auth.signOut();
                                navigate('/login', { replace: true });
                            }}
                        >
                            <LogOut className="w-4 h-4 mr-2" />
                            Keluar / Logout
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full sm:w-auto bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-base shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12 px-8"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                    MENYIMPAN...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="w-5 h-5 mr-2" />
                                    SIMPAN & MASUK DASHBOARD
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
