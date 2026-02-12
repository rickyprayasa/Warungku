import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { KeyRound, Loader2, Eye, EyeOff, Store, ArrowLeft, ShieldAlert } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useWarungStore } from '@/lib/store';

interface StoreInfo {
    id: string;
    name: string;
    slug: string;
    plan: string;
    logo_url?: string;
}

export function StoreLoginPage() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { signIn, isAuthenticated, user } = useAuth();
    const setCurrentStoreId = useWarungStore((state) => state.setCurrentStoreId);

    const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null);
    const [storeLoading, setStoreLoading] = useState(true);
    const [storeNotFound, setStoreNotFound] = useState(false);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [verifyingMembership, setVerifyingMembership] = useState(false);

    // Fetch store info by slug
    useEffect(() => {
        const fetchStore = async () => {
            if (!slug) {
                setStoreNotFound(true);
                setStoreLoading(false);
                return;
            }

            try {
                const { data, error: fetchError } = await supabase
                    .from('stores')
                    .select('id, name, slug, plan, logo_url')
                    .eq('slug', slug)
                    .single();

                if (fetchError || !data) {
                    setStoreNotFound(true);
                } else {
                    setStoreInfo(data as StoreInfo);

                    // Also try to fetch logo from settings as fallback
                    const { data: settingsData } = await supabase
                        .from('settings')
                        .select('value')
                        .eq('store_id', data.id)
                        .eq('key', 'store_profile')
                        .maybeSingle();

                    if (settingsData?.value) {
                        try {
                            const profile = typeof settingsData.value === 'string'
                                ? JSON.parse(settingsData.value)
                                : settingsData.value;

                            // Check for both camelCase and snake_case properties
                            const logoUrl = profile.logoUrl || profile.logo_url;

                            if (logoUrl) {
                                setStoreInfo(prev => prev ? { ...prev, logo_url: logoUrl } : null);
                            }
                        } catch { /* ignore parse errors */ }
                    }
                }
            } catch {
                setStoreNotFound(true);
            } finally {
                setStoreLoading(false);
            }
        };

        fetchStore();
    }, [slug]);

    // If already authenticated, verify membership and redirect
    useEffect(() => {
        const verifyAndRedirect = async () => {
            if (!isAuthenticated || !user || !storeInfo) return;

            setVerifyingMembership(true);
            try {
                const { data: membership, error: memberError } = await supabase
                    .from('store_members')
                    .select('store_id, role')
                    .eq('user_id', user.id)
                    .eq('store_id', storeInfo.id)
                    .maybeSingle();

                if (memberError || !membership) {
                    setError('Akun Anda tidak terdaftar sebagai anggota toko ini.');
                    // Sign out to prevent confusion
                    await supabase.auth.signOut();
                    setVerifyingMembership(false);
                    return;
                }

                // Set the correct store context
                setCurrentStoreId(storeInfo.id);
                navigate('/dashboard');
            } catch {
                setError('Gagal memverifikasi keanggotaan.');
            } finally {
                setVerifyingMembership(false);
            }
        };

        verifyAndRedirect();
    }, [isAuthenticated, user, storeInfo, navigate, setCurrentStoreId]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!storeInfo) {
            setError('Toko tidak ditemukan.');
            setIsLoading(false);
            return;
        }

        try {
            const result = await signIn(email, password);
            if (result.error) {
                setError('Email atau kata sandi salah. Silakan coba lagi.');
                setIsLoading(false);
                return;
            }

            // After signIn, get the current user
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            if (!currentUser) {
                setError('Gagal mendapatkan informasi pengguna.');
                setIsLoading(false);
                return;
            }

            // Verify membership in this specific store
            const { data: membership, error: memberError } = await supabase
                .from('store_members')
                .select('store_id, role')
                .eq('user_id', currentUser.id)
                .eq('store_id', storeInfo.id)
                .maybeSingle();

            if (memberError || !membership) {
                setError('Akun Anda tidak terdaftar sebagai anggota toko ini. Hubungi pemilik toko untuk mendapatkan akses.');
                // Sign out since they don't belong to this store
                await supabase.auth.signOut();
                setIsLoading(false);
                return;
            }

            // Set the correct store context
            setCurrentStoreId(storeInfo.id);
            navigate('/dashboard');
        } catch (err: any) {
            setError(err.message || 'Terjadi kesalahan saat login.');
        } finally {
            setIsLoading(false);
        }
    };

    // Loading state
    if (storeLoading) {
        return (
            <div className="fixed inset-0 bg-brand-white flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-10 h-10 animate-spin text-brand-orange mx-auto mb-4" />
                    <p className="font-mono text-muted-foreground">Memuat informasi toko...</p>
                </div>
            </div>
        );
    }

    // Store not found
    if (storeNotFound) {
        return (
            <div className="fixed inset-0 bg-brand-white flex items-center justify-center px-4">
                <div className="text-center max-w-sm">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 border-2 border-red-500 mb-4">
                        <ShieldAlert className="w-8 h-8 text-red-500" />
                    </div>
                    <h1 className="text-2xl font-display font-bold text-brand-black mb-2">Toko Tidak Ditemukan</h1>
                    <p className="font-mono text-muted-foreground mb-6">
                        Toko dengan URL <span className="font-bold text-brand-black">/{slug}</span> tidak ditemukan.
                    </p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 bg-brand-black text-brand-white border-2 border-brand-black px-6 py-3 font-mono font-bold uppercase text-sm hover:bg-brand-orange hover:text-brand-black transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Kembali ke Beranda
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center px-4">
            <div className="w-full max-w-sm">
                {/* Store branding header */}
                <div className="text-center mb-6">
                    {storeInfo?.logo_url ? (
                        <div className="flex justify-center mb-4">
                            <img
                                src={storeInfo.logo_url}
                                alt={storeInfo.name}
                                className="h-24 w-auto object-contain"
                            />
                        </div>
                    ) : (
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-brand-orange border-4 border-brand-black mb-3 shadow-hard">
                            <Store className="w-10 h-10 text-brand-black" />
                        </div>
                    )}
                    <h1 className="text-2xl font-display font-bold text-brand-black">{storeInfo?.name}</h1>
                    <p className="font-mono text-xs text-muted-foreground mt-1">Staff & Team Login</p>
                </div>

                {/* Login card */}
                <div className="bg-brand-white border-4 border-brand-black shadow-hard p-8">
                    <div className="text-center mb-6">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-orange/20 border-2 border-brand-orange mb-3">
                            <KeyRound className="w-6 h-6 text-brand-orange" />
                        </div>
                        <h2 className="text-lg font-display font-bold text-brand-black">Masuk ke Toko</h2>
                        <p className="font-mono text-xs text-muted-foreground">Masukkan kredensial untuk mengelola toko.</p>
                    </div>

                    {/* Dialog for Error */}
                    <Dialog open={!!error} onOpenChange={(open) => !open && setError('')}>
                        <DialogContent className="sm:max-w-md border-2 border-red-500">
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2 text-red-600">
                                    <ShieldAlert className="w-5 h-5" />
                                    Gagal Masuk
                                </DialogTitle>
                                <DialogDescription className="font-mono text-brand-black pt-2">
                                    {error}
                                </DialogDescription>
                            </DialogHeader>
                            <DialogFooter className="sm:justify-end">
                                <Button
                                    type="button"
                                    onClick={() => setError('')}
                                    className="bg-red-600 text-white hover:bg-red-700 border-2 border-brand-black rounded-none font-bold"
                                >
                                    Tutup
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>


                    {verifyingMembership ? (
                        <div className="text-center py-8">
                            <Loader2 className="w-8 h-8 animate-spin text-brand-orange mx-auto mb-3" />
                            <p className="font-mono text-sm text-muted-foreground">Memverifikasi keanggotaan...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleLogin} className="space-y-5">
                            <div className="space-y-2">
                                <Label htmlFor="store-email" className="font-mono font-bold text-sm">Email</Label>
                                <Input
                                    id="store-email"
                                    type="email"
                                    placeholder="staff@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                    className="h-12 rounded-none border-2 border-brand-black focus-visible:ring-brand-orange font-mono"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="store-password" className="font-mono font-bold text-sm">Kata Sandi</Label>
                                <div className="relative">
                                    <Input
                                        id="store-password"
                                        type={showPassword ? 'text' : 'password'}
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={isLoading}
                                        className="h-12 rounded-none border-2 border-brand-black focus-visible:ring-brand-orange font-mono pr-12"
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
                            </div>

                            <Button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-base shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Memverifikasi...
                                    </>
                                ) : (
                                    'Masuk'
                                )}
                            </Button>
                        </form>
                    )}

                    {/* Footer */}
                    <div className="mt-6 pt-4 border-t-2 border-gray-200 text-center">
                        <p className="font-mono text-[10px] text-muted-foreground">
                            Hanya staf yang terdaftar oleh pemilik toko yang dapat masuk.
                        </p>
                    </div>
                </div>

                {/* Back link */}
                <div className="text-center mt-4">
                    <Link
                        to={`/${slug}`}
                        className="font-mono text-sm text-muted-foreground hover:text-brand-black transition-colors inline-flex items-center gap-1"
                    >
                        <ArrowLeft className="w-3 h-3" />
                        Lihat Toko
                    </Link>
                </div>
            </div>
        </div>
    );
}
