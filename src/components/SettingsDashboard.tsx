import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Globe,
    Users,
    Shield,
    Plus,
    Trash2,
    Save,
    Loader2,
    AlertCircle,
    CheckCircle2,
    Package, ShoppingCart, Database, Download, Trash2 as TrashIcon, AlertTriangle, Info, LogOut, KeyRound, Settings as SettingsIcon
} from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface StoreMember {
    user_id: string;
    email: string;
    role: string;
    joined_at: string;
}

import { useWarungStore } from '@/lib/store';
import { useCartStore } from '@/lib/cart-store';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';

import { ChangePasswordDialog } from './ChangePasswordDialog';

export function SettingsDashboard() {
    const { store, user } = useAuth();
    const [activeTab, setActiveTab] = useState('general');

    // Domain Settings State
    const [customDomain, setCustomDomain] = useState('');
    const [isSavingDomain, setIsSavingDomain] = useState(false);

    // Team Settings State
    const [members, setMembers] = useState<StoreMember[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('staff');
    const [isInviting, setIsInviting] = useState(false);
    const [isDeletingMember, setIsDeletingMember] = useState<string | null>(null);

    // System Settings State (Migrated from SettingsDialog)
    const storeProfile = useWarungStore((state) => state.storeProfile);
    const opnameMode = useWarungStore((state) => state.opnameMode);
    const updateStoreProfile = useWarungStore((state) => state.updateStoreProfile);
    const updateOpnameMode = useWarungStore((state) => state.updateOpnameMode);
    const fetchOpnameMode = useWarungStore((state) => state.fetchOpnameMode);
    const clearCart = useCartStore((state) => state.clearCart);
    const [isResetting, setIsResetting] = useState(false);

    const isCartEnabled = storeProfile.cartEnabled ?? false;

    // Local state for default isi paket input (to avoid saving on every keystroke)
    const [localDefaultUnitsPerPack, setLocalDefaultUnitsPerPack] = useState<string>(
        (storeProfile.settings as any)?.defaultUnitsPerPack?.toString() || ''
    );

    // Sync local state when storeProfile changes (e.g. after fetch)
    useEffect(() => {
        const val = (storeProfile.settings as any)?.defaultUnitsPerPack;
        setLocalDefaultUnitsPerPack(val ? val.toString() : '');
    }, [(storeProfile.settings as any)?.defaultUnitsPerPack]);

    // Load opname mode on mount
    useEffect(() => {
        fetchOpnameMode();
    }, [fetchOpnameMode]);

    const handleModeChange = async (newMode: string) => {
        try {
            await updateOpnameMode(newMode as 'retail' | 'display' | 'terpadu');

            // If switching to display mode, disable cart
            if (newMode === 'display' && isCartEnabled) {
                handleToggleCart(false);
                toast.success('Mode Display dipilih. Keranjang belanja dinonaktifkan otomatis.');
            } else {
                const modeLabels: Record<string, string> = {
                    retail: 'Retail (Rekon Stok)',
                    display: 'Display (Rekon Kas)',
                    terpadu: 'Terpadu (Rekon Kas + Stok)'
                };
                toast.success(`Mode diubah ke: ${modeLabels[newMode] || newMode}`);
            }
        } catch (error) {
            toast.error('Gagal menyimpan pengaturan mode');
        }
    };

    const handleToggleCart = async (enabled: boolean) => {
        try {
            await updateStoreProfile({
                ...storeProfile,
                cartEnabled: enabled,
            });
            if (!enabled) {
                clearCart(); // Clear cart when disabled
            }
            toast.success(enabled ? 'Fitur keranjang diaktifkan' : 'Fitur keranjang dinonaktifkan');
        } catch (error) {
            toast.error('Gagal mengubah pengaturan');
        }
    };

    const handleResetData = async () => {
        const confirmed = window.confirm(
            '⚠️ PERINGATAN!\n\n' +
            'Tindakan ini akan menghapus SEMUA data:\n' +
            '• Semua produk\n' +
            '• Semua penjualan\n' +
            '• Semua pembelian\n' +
            '• Semua stock details\n' +
            '• Semua supplier\n\n' +
            'Data tidak dapat dikembalikan!\n\n' +
            'Lanjutkan reset data?'
        );

        if (!confirmed) return;

        const doubleConfirm = window.confirm(
            'Konfirmasi terakhir!\n\n' +
            'Ketik "RESET" untuk konfirmasi (case sensitive)'
        );

        if (doubleConfirm) {
            try {
                setIsResetting(true);

                // Clear all data from database
                const response = await fetch('/api/reset-all-data', {
                    method: 'POST',
                });

                if (!response.ok) {
                    throw new Error('Failed to reset data');
                }

                // Clear local state
                useWarungStore.getState().products = [];
                useWarungStore.getState().sales = [];
                useWarungStore.getState().purchases = [];
                useWarungStore.getState().suppliers = [];
                useWarungStore.getState().stockDetails = [];

                toast.success('✅ Semua data berhasil direset!');

                // Reload page
                setTimeout(() => {
                    window.location.reload();
                }, 1500);

            } catch (error) {
                console.error('Reset error:', error);
                toast.error('❌ Gagal reset data');
            } finally {
                setIsResetting(false);
            }
        }
    };

    const handleClearCache = () => {
        try {
            // Preserve tour history
            const tourKeys = Object.keys(localStorage).filter(key => key.startsWith('has-seen-'));
            const tourData = tourKeys.map(key => ({ key, value: localStorage.getItem(key) }));

            // Clear localStorage
            localStorage.clear();
            sessionStorage.clear();

            // Restore tour history
            tourData.forEach(({ key, value }) => {
                if (value) localStorage.setItem(key, value);
            });

            toast.success('✅ Cache berhasil dibersihkan!');
            setTimeout(() => {
                window.location.reload();
            }, 1000);
        } catch (error) {
            console.error('Clear cache error:', error);
            toast.error('❌ Gagal membersihkan cache');
        }
    };

    const handleExportData = async () => {
        try {
            const store = useWarungStore.getState();
            const exportData = {
                version: '1.0',
                exportDate: new Date().toISOString(),
                data: {
                    products: store.products,
                    sales: store.sales,
                    purchases: store.purchases,
                    suppliers: store.suppliers,
                    stockDetails: store.stockDetails,
                },
                counts: {
                    products: store.products.length,
                    sales: store.sales.length,
                    purchases: store.purchases.length,
                    suppliers: store.suppliers.length,
                    stockDetails: store.stockDetails.length,
                }
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], {
                type: 'application/json'
            });

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `omzetin-backup-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            toast.success('✅ Data berhasil di-export!');
        } catch (error) {
            console.error('Export error:', error);
            toast.error('❌ Gagal export data');
        }
    };

    const isProOrEnterprise = store?.plan === 'pro' || store?.plan === 'enterprise';

    useEffect(() => {
        if (store?.settings && (store.settings as any).custom_domain) {
            setCustomDomain((store.settings as any).custom_domain);
        }
    }, [store]);

    const fetchMembers = useCallback(async () => {
        setIsLoadingMembers(true);
        try {
            // Wrap in timeout to prevent infinite loading from LockManager deadlocks
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => reject(new Error('TIMEOUT')), 10000);
            });

            const fetchPromise = async () => {
                const { data, error } = await supabase.rpc('get_store_members');
                if (error) throw error;
                return data || [];
            };

            const data = await Promise.race([fetchPromise(), timeoutPromise]);
            setMembers(data);
        } catch (error) {
            console.error('Error fetching members:', error);
            // Fallback for demo/dev if RPC doesn't exist yet
            if (user?.email) {
                setMembers([
                    {
                        user_id: user.id,
                        email: user.email,
                        role: 'owner',
                        joined_at: new Date().toISOString()
                    }
                ]);
            }
        } finally {
            setIsLoadingMembers(false);
        }
    }, [user?.email, user?.id]);

    useEffect(() => {
        if (activeTab === 'team' && isProOrEnterprise) {
            fetchMembers();
        }
    }, [activeTab, isProOrEnterprise, fetchMembers]);

    const handleSaveDomain = async () => {
        if (!isProOrEnterprise) {
            toast.error('Fitur Custom Domain hanya untuk plan Pro dan Enterprise');
            return;
        }

        setIsSavingDomain(true);
        try {
            const currentSettings = (store?.settings as any) || {};
            const newSettings = { ...currentSettings, custom_domain: customDomain };

            const { error } = await (supabase
                .from('stores') as any)
                .update({ settings: newSettings })
                .eq('id', store?.id);

            if (error) throw error;
            toast.success('Pengaturan domain berhasil disimpan');
        } catch (error: any) {
            console.error('Error saving domain:', error);
            toast.error('Gagal menyimpan domain: ' + error.message);
        } finally {
            setIsSavingDomain(false);
        }
    };

    const handleInviteMember = async () => {
        if (!inviteEmail) {
            toast.error('Email wajib diisi');
            return;
        }

        setIsInviting(true);
        try {
            const { data, error } = await (supabase.rpc as any)('add_store_member_by_email', {
                p_email: inviteEmail,
                p_role: inviteRole
            });

            if (error) throw error;

            if (data && !data.success) {
                toast.error(data.message);
            } else {
                toast.success('Member berhasil ditambahkan');
                setIsInviteDialogOpen(false);
                setInviteEmail('');
                fetchMembers();
            }
        } catch (error: any) {
            console.error('Error inviting member:', error);
            // Fallback for UI demo
            toast.error('Gagal menambahkan member: ' + (error.message || 'RPC Error'));
        } finally {
            setIsInviting(false);
        }
    };

    const handleRemoveMember = async (userId: string) => {
        if (!confirm('Apakah Anda yakin ingin menghapus member ini?')) return;

        setIsDeletingMember(userId);
        try {
            const { data, error } = await (supabase.rpc as any)('remove_store_member', {
                p_user_id: userId
            });

            if (error) throw error;

            if (data && !data.success) {
                toast.error(data.message);
            } else {
                toast.success('Member berhasil dihapus');
                fetchMembers();
            }
        } catch (error: any) {
            console.error('Error removing member:', error);
            toast.error('Gagal menghapus member');
        } finally {
            setIsDeletingMember(null);
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="mb-8">
                <h2 className="text-3xl font-display font-bold text-brand-black flex items-center gap-3">
                    <Shield className="w-8 h-8" />
                    Pengaturan Toko
                </h2>
                <p className="font-mono text-muted-foreground mt-1">
                    Kelola domain, tim, dan konfigurasi toko Anda
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-3 max-w-[600px] mb-8 border-2 border-brand-black p-0 bg-transparent gap-0">
                    <TabsTrigger
                        value="general"
                        className="rounded-none data-[state=active]:bg-brand-black data-[state=active]:text-white font-mono font-bold uppercase border-r-2 border-brand-black"
                    >
                        General & Domain
                    </TabsTrigger>
                    <TabsTrigger
                        value="team"
                        className="rounded-none data-[state=active]:bg-brand-black data-[state=active]:text-white font-mono font-bold uppercase border-r-2 border-brand-black"
                    >
                        Team Members
                    </TabsTrigger>
                    <TabsTrigger
                        value="system"
                        className="rounded-none data-[state=active]:bg-brand-black data-[state=active]:text-white font-mono font-bold uppercase"
                    >
                        System & Config
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-6">
                    <Card className="border-4 border-brand-black rounded-none shadow-hard">
                        <CardHeader className="border-b-2 border-brand-black bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Globe className="w-6 h-6 text-brand-black" />
                                    <div>
                                        <CardTitle className="font-display text-xl">Custom Domain</CardTitle>
                                        <CardDescription className="font-mono">
                                            Hubungkan domain Anda sendiri ke toko Omzetin
                                        </CardDescription>
                                    </div>
                                </div>
                                {!isProOrEnterprise && (
                                    <Badge className="bg-gray-200 text-gray-600 border-2 border-gray-400 font-mono">
                                        PRO FEATURE
                                    </Badge>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            {!isProOrEnterprise ? (
                                <div className="text-center py-8">
                                    <Shield className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                    <h3 className="font-display font-bold text-lg mb-2">Upgrade ke Pro</h3>
                                    <p className="font-mono text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                                        Fitur Custom Domain hanya tersedia untuk paket Pro dan Enterprise.
                                        Tingkatkan kredibilitas toko Anda dengan domain sendiri.
                                    </p>
                                    <Button
                                        onClick={() => window.location.href = '/dashboard?tab=upgrade'}
                                        className="bg-brand-orange text-brand-black border-2 border-brand-black font-bold hover:bg-orange-400"
                                    >
                                        Upgrade Sekarang
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <Label htmlFor="domain" className="font-mono font-bold">Nama Domain</Label>
                                        <div className="flex gap-2">
                                            <Input
                                                id="domain"
                                                placeholder="contoh: tokoanda.com"
                                                value={customDomain}
                                                onChange={(e) => setCustomDomain(e.target.value)}
                                                className="rounded-none border-2 border-brand-black font-mono"
                                            />
                                            <Button
                                                onClick={handleSaveDomain}
                                                disabled={isSavingDomain}
                                                className="bg-brand-black text-white hover:bg-gray-800 rounded-none border-2 border-brand-black font-bold"
                                            >
                                                {isSavingDomain ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Save className="w-4 h-4 mr-2" />
                                                )}
                                                Simpan
                                            </Button>
                                        </div>
                                        <p className="text-xs font-mono text-muted-foreground">
                                            Masukkan domain tanpa http:// atau https://
                                        </p>
                                    </div>

                                    <div className="bg-blue-50 border-2 border-blue-200 p-4">
                                        <h4 className="font-bold text-blue-800 mb-2 flex items-center gap-2">
                                            <AlertCircle className="w-4 h-4" />
                                            Instruksi DNS
                                        </h4>
                                        <p className="text-sm text-blue-700 mb-3 font-mono">
                                            Untuk menghubungkan domain, tambahkan record berikut di penyedia domain Anda:
                                        </p>
                                        <div className="bg-white border border-blue-200 p-3 font-mono text-xs space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Type:</span>
                                                <span className="font-bold">CNAME</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Name:</span>
                                                <span className="font-bold">@ (atau www)</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">Value:</span>
                                                <span className="font-bold">domains.omzetin.com</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="team" className="space-y-6">
                    <Card className="border-4 border-brand-black rounded-none shadow-hard">
                        <CardHeader className="border-b-2 border-brand-black bg-gray-50">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Users className="w-6 h-6 text-brand-black" />
                                    <div>
                                        <CardTitle className="font-display text-xl">Team Members</CardTitle>
                                        <CardDescription className="font-mono">
                                            Kelola akses staff dan admin toko Anda
                                        </CardDescription>
                                    </div>
                                </div>
                                {!isProOrEnterprise ? (
                                    <Badge className="bg-gray-200 text-gray-600 border-2 border-gray-400 font-mono">
                                        PRO FEATURE
                                    </Badge>
                                ) : (
                                    <Button
                                        onClick={() => setIsInviteDialogOpen(true)}
                                        className="bg-brand-orange text-brand-black border-2 border-brand-black font-bold hover:bg-orange-400 rounded-none"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Tambah Member
                                    </Button>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {!isProOrEnterprise ? (
                                <div className="text-center py-8 p-6">
                                    <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                    <h3 className="font-display font-bold text-lg mb-2">Upgrade ke Pro</h3>
                                    <p className="font-mono text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                                        Kelola tim Anda dengan fitur Multi-user. Tambahkan staff, admin, dan atur hak akses mereka.
                                    </p>
                                    <Button
                                        onClick={() => window.location.href = '/dashboard?tab=upgrade'}
                                        className="bg-brand-orange text-brand-black border-2 border-brand-black font-bold hover:bg-orange-400"
                                    >
                                        Upgrade Sekarang
                                    </Button>
                                </div>
                            ) : (
                                <div className="divide-y-2 divide-brand-black">
                                    {isLoadingMembers ? (
                                        <div className="p-8 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-brand-orange" />
                                            <p className="mt-2 font-mono text-sm text-muted-foreground">Memuat data member...</p>
                                        </div>
                                    ) : members.length === 0 ? (
                                        <div className="p-8 text-center text-muted-foreground font-mono">
                                            Belum ada member lain.
                                        </div>
                                    ) : (
                                        members.map((member) => (
                                            <div key={member.user_id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full bg-brand-black text-white flex items-center justify-center font-bold font-mono">
                                                        {member.email.substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold font-mono">{member.email}</p>
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="rounded-none border-brand-black text-xs uppercase">
                                                                {member.role}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground font-mono">
                                                                Joined: {new Date(member.joined_at).toLocaleDateString()}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {member.user_id !== user?.id && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveMember(member.user_id)}
                                                        disabled={isDeletingMember === member.user_id}
                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        {isDeletingMember === member.user_id ? (
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                        ) : (
                                                            <Trash2 className="w-4 h-4" />
                                                        )}
                                                    </Button>
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="system" className="space-y-6">
                    <Card className="border-4 border-brand-black rounded-none shadow-hard">
                        <CardHeader className="border-b-2 border-brand-black bg-gray-50">
                            <div className="flex items-center gap-3">
                                <SettingsIcon className="w-6 h-6 text-brand-black" />
                                <div>
                                    <CardTitle className="font-display text-xl">Pengaturan Antarmuka</CardTitle>
                                    <CardDescription className="font-mono">
                                        Sesuaikan pengalaman penggunaan Omzetin
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            <div className="flex items-center justify-between border-b border-gray-200 pb-6">
                                <div className="space-y-0.5">
                                    <h4 className="font-bold font-mono">Onboarding Tour (Panduan)</h4>
                                    <p className="text-sm text-muted-foreground font-mono">
                                        Tampilkan panduan interaktif saat membuka fitur baru. Matikan jika dirasa mengganggu.
                                    </p>
                                </div>
                                <Switch
                                    checked={localStorage.getItem('onboarding-tours-disabled') !== 'true'}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            localStorage.removeItem('onboarding-tours-disabled');
                                        } else {
                                            localStorage.setItem('onboarding-tours-disabled', 'true');
                                            // Make sure any active tours are skipped instantly
                                            localStorage.setItem('has-seen-onboarding-tour', 'true');
                                        }
                                        // Force state update to reflect changes
                                        window.dispatchEvent(new Event('storage'));
                                        toast.success(checked ? 'Panduan diaktifkan' : 'Panduan dinonaktifkan');
                                    }}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    {/* Purchase Defaults Card */}
                    <Card className="border-4 border-brand-black rounded-none shadow-hard">
                        <CardHeader className="border-b-2 border-brand-black bg-gray-50">
                            <div className="flex items-center gap-3">
                                <Package className="w-6 h-6 text-brand-black" />
                                <div>
                                    <CardTitle className="font-display text-xl">Pengaturan Pembelian</CardTitle>
                                    <CardDescription className="font-mono">
                                        Atur default mode dan isi paket untuk form Pilih Banyak Produk
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {/* Default Pack Mode Toggle */}
                            <div className="flex items-center justify-between border-b border-gray-200 pb-6">
                                <div className="space-y-0.5">
                                    <h4 className="font-bold font-mono">Default Mode Paket</h4>
                                    <p className="text-sm text-muted-foreground font-mono">
                                        Aktifkan agar semua produk di form "Pilih Banyak Produk" otomatis menggunakan mode Paket.
                                    </p>
                                </div>
                                <Switch
                                    checked={(storeProfile.settings as any)?.defaultPackMode === true}
                                    onCheckedChange={async (checked) => {
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
                                    }}
                                    className="data-[state=checked]:bg-brand-orange border-2 border-brand-black"
                                />
                            </div>

                            {/* Default Units Per Pack */}
                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <h4 className="font-bold font-mono">Default Isi Paket</h4>
                                    <p className="text-sm text-muted-foreground font-mono">
                                        Jumlah pcs/unit default per paket saat mode Paket aktif. Kosongkan untuk menggunakan Isi Per Unit produk.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="number"
                                        min={1}
                                        className="w-24 h-10 font-mono text-center font-bold border-2 border-brand-black rounded-none"
                                        placeholder="Auto"
                                        value={localDefaultUnitsPerPack}
                                        onChange={(e) => setLocalDefaultUnitsPerPack(e.target.value)}
                                        onBlur={async () => {
                                            const val = parseInt(localDefaultUnitsPerPack) || 0;
                                            try {
                                                await updateStoreProfile({
                                                    ...storeProfile,
                                                    settings: {
                                                        ...(storeProfile.settings || {}),
                                                        defaultUnitsPerPack: val > 0 ? val : undefined,
                                                    },
                                                });
                                                if (val > 0) {
                                                    toast.success(`Default isi paket: ${val} pcs`);
                                                }
                                            } catch (error) {
                                                toast.error('Gagal menyimpan pengaturan');
                                            }
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                (e.target as HTMLInputElement).blur();
                                            }
                                        }}
                                    />
                                    <span className="text-sm font-mono text-muted-foreground">pcs</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                <DialogContent className="border-4 border-brand-black rounded-none max-w-md">
                    <DialogHeader>
                        <DialogTitle className="font-display text-xl">Tambah Member Baru</DialogTitle>
                        <DialogDescription className="font-mono">
                            Undang staff atau admin baru ke toko Anda. Pastikan user sudah terdaftar di Omzetin.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email User</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="email@user.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                                className="rounded-none border-2 border-brand-black"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select value={inviteRole} onValueChange={setInviteRole}>
                                <SelectTrigger className="rounded-none border-2 border-brand-black">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="staff">Staff (Kasir & Produk)</SelectItem>
                                    <SelectItem value="admin">Admin (Akses Penuh)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsInviteDialogOpen(false)}
                            className="rounded-none border-2 border-brand-black"
                        >
                            Batal
                        </Button>
                        <Button
                            onClick={handleInviteMember}
                            disabled={isInviting || !inviteEmail}
                            className="bg-brand-orange text-brand-black border-2 border-brand-black font-bold hover:bg-orange-400 rounded-none"
                        >
                            {isInviting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Menambahkan...
                                </>
                            ) : (
                                'Tambah Member'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
