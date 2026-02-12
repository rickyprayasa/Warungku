import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings, Trash2, Database, Download, Info, AlertTriangle, Package, ShoppingCart, LogOut, KeyRound } from 'lucide-react';
import { useWarungStore } from '@/lib/store';
import { useAuth } from '@/contexts/AuthContext';
import { useCartStore } from '@/lib/cart-store';
import { toast } from 'sonner';
import { ChangePasswordDialog } from './ChangePasswordDialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, Users, Shield, Plus, Loader2, Save, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { UpgradePlanDialog } from './UpgradePlanDialog';

interface StoreMember {
    user_id: string;
    email: string;
    role: string;
    joined_at: string;
    name?: string;
    permissions?: string[];
}

const AVAILABLE_PERMISSIONS = [
    { id: 'pos', label: 'Kasir (POS)' },
    { id: 'products', label: 'Kelola Produk' },
    { id: 'sales', label: 'Lihat Penjualan' },
    { id: 'purchases', label: 'Pembelian' },
    { id: 'suppliers', label: 'Pemasok' },
    { id: 'requests', label: 'Request Jajanan' },
    { id: 'finance', label: 'Keuangan' },
    { id: 'settings', label: 'Pengaturan' },
];

// Helper to get default permissions based on role
const getDefaultPermissions = (role: string) => {
    if (role === 'admin' || role === 'owner') return AVAILABLE_PERMISSIONS.map(p => p.id);
    // Staff defaults: POS, Products (read), Sales (read)
    return ['pos', 'products', 'sales'];
};
export function SettingsDialog({ trigger }: { trigger?: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('system');
    const [isResetting, setIsResetting] = useState(false);
    const { store, user } = useAuth();

    // Domain Settings State
    const [customDomain, setCustomDomain] = useState('');
    const [isSavingDomain, setIsSavingDomain] = useState(false);

    // Team Settings State
    const [members, setMembers] = useState<StoreMember[]>([]);
    const [isLoadingMembers, setIsLoadingMembers] = useState(false);
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [invitePassword, setInvitePassword] = useState('');
    const [inviteRole, setInviteRole] = useState('staff');
    const [isInviting, setIsInviting] = useState(false);
    const [isDeletingMember, setIsDeletingMember] = useState<string | null>(null);

    // Edit Member State
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<StoreMember | null>(null);
    const [editName, setEditName] = useState('');
    const [editRole, setEditRole] = useState('');
    const [editPassword, setEditPassword] = useState('');
    const [editPermissions, setEditPermissions] = useState<string[]>([]);
    const [isEditing, setIsEditing] = useState(false);

    const isProOrEnterprise = store?.plan === 'pro' || store?.plan === 'enterprise';

    const storeProfile = useWarungStore((state) => state.storeProfile);
    const currentUser = useWarungStore((state) => state.currentUser);
    const opnameMode = useWarungStore((state) => state.opnameMode);
    const updateStoreProfile = useWarungStore((state) => state.updateStoreProfile);
    const updateOpnameMode = useWarungStore((state) => state.updateOpnameMode);
    const fetchOpnameMode = useWarungStore((state) => state.fetchOpnameMode);
    const clearCart = useCartStore((state) => state.clearCart);

    const isCartEnabled = storeProfile.cartEnabled ?? false;

    // Load opname mode on mount
    useEffect(() => {
        if (isOpen) {
            fetchOpnameMode();
        }
    }, [isOpen, fetchOpnameMode]);

    useEffect(() => {
        if (store?.settings && (store.settings as any).custom_domain) {
            setCustomDomain((store.settings as any).custom_domain);
        }
    }, [store]);

    useEffect(() => {
        if (activeTab === 'team' && isProOrEnterprise && isOpen) {
            fetchMembers();
        }
    }, [activeTab, isProOrEnterprise, isOpen]);

    const fetchMembers = async () => {
        setIsLoadingMembers(true);
        try {
            const { data, error } = await (supabase.rpc as any)('get_store_members');
            if (error) throw error;

            // Fetch permissions explicitly from table as RPC might not return new column yet
            const { data: permData } = await supabase
                .from('store_members')
                .select('user_id, permissions')
                .eq('store_id', store?.id);

            // Map out_ prefixed columns from RPC to frontend property names
            const mapped = (data || []).map((m: any) => {
                const userId = m.out_user_id || m.user_id;
                // Find matching permissions
                const userPerms = permData?.find(p => p.user_id === userId)?.permissions;

                return {
                    user_id: userId,
                    email: m.out_email || m.email,
                    role: m.out_role || m.role,
                    name: m.out_name || m.name,
                    joined_at: m.out_joined_at || m.joined_at,
                    permissions: userPerms
                };
            });
            setMembers(mapped);
        } catch (error) {
            console.error('Error fetching members:', error);
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
    };

    const handleSaveDomain = async () => {
        if (!isProOrEnterprise) {
            toast.error('Fitur Custom Domain hanya untuk plan Pro dan Enterprise');
            return;
        }

        setIsSavingDomain(true);
        try {
            const currentSettings = (store?.settings as any) || {};
            const newSettings = { ...currentSettings, custom_domain: customDomain };

            const { error } = await supabase
                .from('stores')
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

    const handleInviteMember = async () => {
        if (!inviteEmail.trim()) {
            toast.error('Masukkan email member');
            return;
        }
        if (!invitePassword || invitePassword.length < 6) {
            toast.error('Password minimal 6 karakter');
            return;
        }

        setIsInviting(true);
        try {
            const { data, error } = await (supabase.rpc as any)('create_team_member', {
                p_email: inviteEmail.trim().toLowerCase(),
                p_password: invitePassword,
                p_role: inviteRole,
                p_name: inviteName.trim() || null,
            });

            if (error) throw error;

            if (data && !data.success) {
                toast.error(data.message || 'Gagal menambahkan member');
            } else {
                toast.success(data.message || `Member ${inviteEmail} berhasil ditambahkan`);
                setInviteEmail('');
                setInviteName('');
                setInvitePassword('');
                setInviteRole('cashier');
                setIsInviteDialogOpen(false);
                fetchMembers();
            }
        } catch (error: any) {
            console.error('Error adding member:', error);
            if (error.message?.includes('not found') || error.code === '42883') {
                toast.error('Fitur ini belum tersedia. Pastikan RPC create_team_member sudah dibuat.');
            } else {
                toast.error(error.message || 'Gagal menambahkan member');
            }
        } finally {
            setIsInviting(false);
        }
    };

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

            // Clear sessionStorage
            sessionStorage.clear();

            // Restore tour history
            tourData.forEach(({ key, value }) => {
                if (value) localStorage.setItem(key, value);
            });

            toast.success('✅ Cache berhasil dibersihkan!');

            // Reload
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

    const handleAbout = () => {
        alert(
            'OMZETIN (Omzetin)\n\n' +
            'Version: 1.0.0\n' +
            'Developed by: RSQUARE\n\n' +
            '📦 Fitur Utama:\n' +
            '✓ Manajemen Stok FIFO\n' +
            '✓ Pembelian Pack/Box\n' +
            '✓ Mode Jual Display & Retail\n' +
            '✓ Validasi Stok Real-time\n' +
            '✓ Override Harga & Promo\n' +
            '✓ Rekonsiliasi Kas Harian\n' +
            '✓ Laporan Keuangan Lengkap\n\n' +
            '🛠️ Teknologi:\n' +
            '• Frontend: React + TypeScript\n' +
            '• Backend: Cloudflare Workers\n' +
            '• Database: Cloudflare D1 (SQLite)\n' +
            '• UI: Shadcn/ui + Tailwind CSS\n\n' +
            '© 2025 RSQUARE - All Rights Reserved'
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button
                        variant="outline"
                        size="icon"
                        className="rounded-none border-2 border-brand-black hover:bg-brand-orange hover:text-brand-white"
                        title="Pengaturan"
                    >
                        <Settings className="w-5 h-5" />
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[700px] rounded-none border-4 border-brand-black max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-bold flex items-center gap-2">
                        <Settings className="w-6 h-6" />
                        Pengaturan
                    </DialogTitle>
                    <DialogDescription className="font-mono text-sm">
                        Kelola data dan pengaturan aplikasi
                    </DialogDescription>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4 border-2 border-brand-black p-0 bg-transparent gap-0">
                        <TabsTrigger
                            value="system"
                            className="rounded-none data-[state=active]:bg-brand-black data-[state=active]:text-white font-mono font-bold uppercase border-r-2 border-brand-black"
                        >
                            System
                        </TabsTrigger>
                        <TabsTrigger
                            value="team"
                            className="rounded-none data-[state=active]:bg-brand-black data-[state=active]:text-white font-mono font-bold uppercase border-r-2 border-brand-black"
                        >
                            Team
                        </TabsTrigger>
                        {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
                            <TabsTrigger
                                value="domain"
                                className="rounded-none data-[state=active]:bg-brand-black data-[state=active]:text-white font-mono font-bold uppercase"
                            >
                                Domain
                            </TabsTrigger>
                        )}
                    </TabsList>

                    <TabsContent value="system" className="space-y-4 py-2">
                        {/* Opname Configuration Section - Move to top for clarity */}
                        {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
                            <div className="border-2 border-brand-black p-4 space-y-3 bg-blue-50">
                                <h3 className="font-mono font-bold flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    Mode Penjualan
                                </h3>

                                <div>
                                    <label className="text-sm font-mono font-bold mb-2 block">
                                        Pilih Mode Penjualan
                                    </label>
                                    <select
                                        value={opnameMode}
                                        onChange={(e) => handleModeChange(e.target.value)}
                                        className="w-full border-2 border-brand-black p-2 font-mono rounded-none"
                                    >
                                        <option value="retail">Retail - Stok dikurangi saat penjualan → Rekon Stok</option>
                                        <option value="display">Display - Stok dikurangi di awal → Rekon Kas</option>
                                        <option value="terpadu">Terpadu - Self-service → Rekon Kas + Stok sekaligus</option>
                                    </select>
                                </div>

                                {opnameMode === 'display' && (
                                    <Alert className="border-2 border-purple-500 bg-purple-50">
                                        <AlertDescription className="text-xs font-mono text-purple-800">
                                            <strong>Mode Display Aktif:</strong> Stok sudah dikurangi saat dipajang.
                                            Profit dihitung dari rekonsiliasi kas harian.
                                            Fitur keranjang TIDAK tersedia di mode ini.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {opnameMode === 'retail' && (
                                    <Alert className="border-2 border-blue-500 bg-blue-100">
                                        <AlertDescription className="text-xs font-mono text-blue-800">
                                            <strong>Mode Retail:</strong> Stok dikurangi saat terjadi penjualan.
                                            Cocok untuk warung dengan kasir atau self-checkout via QRIS.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {opnameMode === 'terpadu' && (
                                    <Alert className="border-2 border-green-500 bg-green-50">
                                        <AlertDescription className="text-xs font-mono text-green-800">
                                            <strong>Mode Terpadu Aktif:</strong> Cocok untuk warung self-service.
                                            Rekonsiliasi kas dan stok dilakukan sekaligus. Selisih stok otomatis
                                            di-generate sebagai penjualan cash.
                                        </AlertDescription>
                                    </Alert>
                                )}
                            </div>
                        )}

                        {/* Cart & QRIS Settings - Only show if NOT in display mode */}
                        {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && opnameMode !== 'display' && (
                            <div className="border-2 border-brand-black p-4 space-y-3 bg-green-50">
                                <h3 className="font-mono font-bold flex items-center gap-2">
                                    <ShoppingCart className="w-4 h-4" />
                                    Fitur Keranjang & Self-Checkout
                                </h3>

                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="cart-toggle" className="font-mono font-bold text-sm">
                                            Aktifkan Keranjang Belanja
                                        </Label>
                                        <p className="text-xs text-muted-foreground font-mono">
                                            Pengunjung dapat self-checkout via QRIS
                                        </p>
                                    </div>
                                    <Switch
                                        id="cart-toggle"
                                        checked={isCartEnabled}
                                        onCheckedChange={handleToggleCart}
                                    />
                                </div>

                                {isCartEnabled && !storeProfile.qrisCode && (
                                    <Alert className="border-2 border-yellow-500 bg-yellow-50">
                                        <AlertDescription className="text-xs font-mono text-yellow-800">
                                            ⚠️ QRIS belum di-setup. Pengunjung tidak akan bisa checkout.
                                            Setup QRIS di menu "Setup QRIS" di sidebar.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                {isCartEnabled && storeProfile.qrisCode && (
                                    <Alert className="border-2 border-green-500 bg-green-100">
                                        <AlertDescription className="text-xs font-mono text-green-800">
                                            ✓ Keranjang aktif dan QRIS sudah di-setup. Pengunjung dapat berbelanja.
                                        </AlertDescription>
                                    </Alert>
                                )}

                                <Alert className="border-2 border-orange-500 bg-orange-50">
                                    <AlertDescription className="text-xs font-mono text-orange-800">
                                        <strong>Penting:</strong> Pembayaran QRIS tidak bisa diverifikasi otomatis.
                                        Pengunjung perlu konfirmasi manual setelah membayar.
                                        Pastikan cek mutasi rekening secara berkala.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        {/* Display mode cart disabled notice */}
                        {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && opnameMode === 'display' && (
                            <div className="border-2 border-gray-300 p-4 space-y-3 bg-gray-50">
                                <h3 className="font-mono font-bold flex items-center gap-2 text-gray-500">
                                    <ShoppingCart className="w-4 h-4" />
                                    Fitur Keranjang (Tidak Tersedia)
                                </h3>
                                <p className="text-xs text-muted-foreground font-mono">
                                    Fitur keranjang tidak tersedia di Mode Display karena stok sudah dikurangi saat dipajang.
                                    Gunakan Mode Retail jika ingin mengaktifkan fitur self-checkout.
                                </p>
                            </div>
                        )}

                        {/* Data Management Section */}
                        {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
                            <div className="border-2 border-brand-black p-4 space-y-3">
                                <h3 className="font-mono font-bold flex items-center gap-2">
                                    <Database className="w-4 h-4" />
                                    Manajemen Data
                                </h3>

                                <div className="space-y-2">
                                    <Button
                                        onClick={handleExportData}
                                        variant="outline"
                                        className="w-full justify-start border-2 border-brand-black rounded-none font-mono"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Export Data (Backup)
                                    </Button>

                                    <Button
                                        onClick={handleClearCache}
                                        variant="outline"
                                        className="w-full justify-start border-2 border-brand-black rounded-none font-mono"
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        Clear Cache
                                    </Button>

                                    <Button
                                        onClick={handleResetData}
                                        disabled={isResetting}
                                        variant="destructive"
                                        className="w-full justify-start border-2 border-brand-black rounded-none font-mono"
                                    >
                                        <AlertTriangle className="w-4 h-4 mr-2" />
                                        {isResetting ? 'Mereset...' : 'Reset Semua Data'}
                                    </Button>
                                </div>

                                <Alert className="border-2 border-yellow-500 bg-yellow-50">
                                    <AlertDescription className="text-xs font-mono text-yellow-800">
                                        ⚠️ Reset data akan menghapus semua data secara permanen.
                                        Export data terlebih dahulu untuk backup!
                                    </AlertDescription>
                                </Alert>
                            </div>
                        )}

                        {/* App Info Section */}
                        <div className="border-2 border-brand-black p-4 space-y-3">
                            <h3 className="font-mono font-bold flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                Informasi Aplikasi
                            </h3>

                            <div className="space-y-2 text-sm font-mono">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Versi:</span>
                                    <span className="font-bold">1.0.0</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Database:</span>
                                    <span className="font-bold">Cloudflare DO</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Storage:</span>
                                    <span className="font-bold">SQLite</span>
                                </div>
                            </div>

                            <Button
                                onClick={handleAbout}
                                variant="outline"
                                className="w-full border-2 border-brand-black rounded-none font-mono"
                            >
                                <Info className="w-4 h-4 mr-2" />
                                Tentang Aplikasi
                            </Button>
                        </div>

                        {/* Account Section */}
                        <div className="border-2 border-brand-black p-4 space-y-3 bg-gray-50">
                            <h3 className="font-mono font-bold flex items-center gap-2">
                                <LogOut className="w-4 h-4" />
                                Akun & Keamanan
                            </h3>

                            <ChangePasswordDialog
                                trigger={
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start border-2 border-brand-black rounded-none font-mono"
                                    >
                                        <KeyRound className="w-4 h-4 mr-2" />
                                        Ganti Password
                                    </Button>
                                }
                            />

                            <Button
                                onClick={async () => {
                                    if (window.confirm('Apakah Anda yakin ingin keluar?')) {
                                        await useAuth().signOut();
                                        window.location.href = '/login';
                                    }
                                }}
                                variant="destructive"
                                className="w-full justify-start border-2 border-brand-black rounded-none font-mono"
                            >
                                <LogOut className="w-4 h-4 mr-2" />
                                Keluar Aplikasi
                            </Button>
                        </div>

                        {/* System Info */}
                        <Alert className="border-2 border-brand-black bg-gradient-to-r from-brand-orange/10 to-brand-white">
                            <AlertDescription className="text-xs font-mono text-brand-black">
                                <strong>🏢 Developed by RSQUARE</strong><br />
                                Sistem manajemen warung modern dengan teknologi cloud.
                                Data Anda aman tersimpan di Cloudflare D1 dengan backup otomatis.
                            </AlertDescription>
                        </Alert>
                    </TabsContent>

                    <TabsContent value="team" className="space-y-4 py-2">
                        {!isProOrEnterprise ? (
                            <div className="text-center py-8 p-6 border-2 border-brand-black bg-gray-50">
                                <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                <h3 className="font-display font-bold text-lg mb-2">Upgrade ke Pro</h3>
                                <p className="font-mono text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                                    Kelola tim Anda dengan fitur Multi-user. Tambahkan staff, admin, dan atur hak akses mereka.
                                </p>
                                <UpgradePlanDialog
                                    trigger={
                                        <Button
                                            className="bg-brand-orange text-brand-black border-2 border-brand-black font-bold hover:bg-orange-400"
                                        >
                                            Upgrade Sekarang
                                        </Button>
                                    }
                                />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Store Login URL Info */}
                                {store?.slug && (
                                    <div className="bg-blue-50 border-2 border-blue-200 p-3">
                                        <div className="flex items-start gap-2">
                                            <Info className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-mono text-xs text-blue-800 font-bold">Link Login Tim</p>
                                                <p className="font-mono text-xs text-blue-700 mt-1 break-all">
                                                    {window.location.origin}/{store.slug}/login
                                                </p>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="mt-1 h-6 px-2 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                                                    onClick={() => {
                                                        navigator.clipboard.writeText(`${window.location.origin}/${store.slug}/login`);
                                                        toast.success('Link login disalin!');
                                                    }}
                                                >
                                                    📋 Salin Link
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Invite Dialog */}


                                {/* Add Button */}
                                {!isInviteDialogOpen && (currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
                                    <div className="flex justify-end">
                                        <Button
                                            onClick={() => setIsInviteDialogOpen(true)}
                                            className="bg-brand-orange text-brand-black border-2 border-brand-black font-bold hover:bg-orange-400 rounded-none"
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Tambah Member
                                        </Button>
                                    </div>
                                )}

                                {/* Members List */}
                                <div className="border-2 border-brand-black divide-y-2 divide-brand-black">
                                    {isLoadingMembers ? (
                                        <div className="p-8 text-center">
                                            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground mb-2" />
                                            <p className="font-mono text-sm text-muted-foreground">Memuat data member...</p>
                                        </div>
                                    ) : (
                                        <>
                                            {members.length === 0 ? (
                                                <div className="p-8 text-center text-muted-foreground bg-gray-50">
                                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                    <p className="font-mono text-sm">Belum ada member team.</p>
                                                    <p className="text-xs mt-1">Undang staff untuk membantu mengelola toko.</p>
                                                </div>
                                            ) : (
                                                members.map((member) => (
                                                    <div key={member.user_id} className="flex items-center justify-between p-3 bg-white hover:bg-gray-50 transition-colors">
                                                        <div className="flex items-center gap-3 overflow-hidden">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shrink-0 ${member.role === 'owner' ? 'bg-brand-orange' :
                                                                member.role === 'admin' ? 'bg-blue-600' :
                                                                    'bg-gray-600'
                                                                }`}>
                                                                {member.name ? member.name.substring(0, 2).toUpperCase() : member.email.substring(0, 2).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold font-mono text-sm truncate">{member.name || member.email}</p>
                                                                {member.name && <p className="text-xs text-muted-foreground font-mono truncate">{member.email}</p>}
                                                                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                                                    <Badge variant="outline" className={`rounded-none text-[10px] uppercase ${member.role === 'owner' ? 'border-brand-orange bg-orange-50 text-orange-800' :
                                                                        member.role === 'admin' ? 'border-blue-400 bg-blue-50 text-blue-800' :
                                                                            'border-gray-400 bg-gray-50 text-gray-700'
                                                                        }`}>
                                                                        {member.role}
                                                                    </Badge>
                                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                                        Joined: {new Date(member.joined_at).toLocaleDateString()}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-1">
                                                            {/* Edit Button */}
                                                            {member.user_id !== user?.id && (
                                                                (currentUser?.role === 'owner') ||
                                                                (currentUser?.role === 'admin' && (member.role === 'staff' || member.role === 'cashier'))
                                                            ) && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => {
                                                                            setEditingMember(member);
                                                                            setEditName(member.name || '');
                                                                            setEditRole(member.role);
                                                                            // Initialize permissions: use existing or defaults based on role
                                                                            const existingPerms = member.permissions && member.permissions.length > 0
                                                                                ? member.permissions
                                                                                : getDefaultPermissions(member.role);
                                                                            setEditPermissions(existingPerms);
                                                                            setIsEditDialogOpen(true);
                                                                        }}
                                                                        className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 shrink-0"
                                                                    >
                                                                        <Settings className="w-4 h-4" />
                                                                    </Button>
                                                                )}

                                                            {/* Delete Button */}
                                                            {member.user_id !== user?.id && (
                                                                (currentUser?.role === 'owner') ||
                                                                (currentUser?.role === 'admin' && (member.role === 'staff' || member.role === 'cashier'))
                                                            ) && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={() => handleRemoveMember(member.user_id)}
                                                                        disabled={isDeletingMember === member.user_id}
                                                                        className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                                                                    >
                                                                        {isDeletingMember === member.user_id ? (
                                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                                        ) : (
                                                                            <Trash2 className="w-4 h-4" />
                                                                        )}
                                                                    </Button>
                                                                )}
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}

                    </TabsContent>

                    <TabsContent value="domain" className="space-y-4 py-2">
                        {/* Only rendered if trigger is visible, but good to be safe */}
                        {(currentUser?.role === 'owner' || currentUser?.role === 'admin') && (
                            !isProOrEnterprise ? (
                                <div className="text-center py-8 border-2 border-brand-black bg-gray-50">
                                    <Shield className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                                    <h3 className="font-display font-bold text-lg mb-2">Upgrade ke Pro</h3>
                                    <p className="font-mono text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                                        Fitur Custom Domain hanya tersedia untuk paket Pro dan Enterprise.
                                        Tingkatkan kredibilitas toko Anda dengan domain sendiri.
                                    </p>
                                    <UpgradePlanDialog
                                        trigger={
                                            <Button
                                                className="bg-brand-orange text-brand-black border-2 border-brand-black font-bold hover:bg-orange-400"
                                            >
                                                Upgrade Sekarang
                                            </Button>
                                        }
                                    />
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
                            )
                        )}
                    </TabsContent>
                </Tabs>

                {/* Invite Member Dialog */}
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
                                <Label htmlFor="invite-name">Nama / Username</Label>
                                <Input
                                    id="invite-name"
                                    placeholder="Nama staff (Opsional)"
                                    value={inviteName}
                                    onChange={(e) => setInviteName(e.target.value)}
                                    className="rounded-none border-2 border-brand-black"
                                />
                            </div>
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
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="text"
                                    placeholder="Password sementara (min 6 karakter)"
                                    value={invitePassword}
                                    onChange={(e) => setInvitePassword(e.target.value)}
                                    className="rounded-none border-2 border-brand-black font-mono"
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

                        <div className="flex justify-end gap-2">
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
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Edit Member Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                    <DialogContent className="border-4 border-brand-black rounded-none max-w-md">
                        <DialogHeader>
                            <DialogTitle className="font-display text-xl">Edit Member</DialogTitle>
                            <DialogDescription className="font-mono">
                                Ubah detail member atau hak akses.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-name">Nama / Username</Label>
                                <Input
                                    id="edit-name"
                                    placeholder="Nama staff"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="rounded-none border-2 border-brand-black"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-password">Password Baru (opsional)</Label>
                                <Input
                                    id="edit-password"
                                    type="password"
                                    placeholder="Kosongkan jika tidak ingin mengubah"
                                    value={editPassword}
                                    onChange={(e) => setEditPassword(e.target.value)}
                                    className="rounded-none border-2 border-brand-black"
                                />
                                <p className="text-xs text-muted-foreground">Min. 6 karakter. Kosongkan jika tidak ingin mengubah password.</p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-role">Role</Label>
                                <Select value={editRole} onValueChange={setEditRole}>
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

                        {/* Permissions Toggles */}
                        <div className="space-y-3">
                            <Label>Hak Akses Menu</Label>
                            <div className="grid grid-cols-2 gap-2 border-2 border-brand-black p-3 bg-gray-50">
                                {AVAILABLE_PERMISSIONS.map((perm) => (
                                    <div key={perm.id} className="flex items-center space-x-2">
                                        <input
                                            type="checkbox"
                                            id={`perm-${perm.id}`}
                                            checked={editPermissions.includes(perm.id)}
                                            onChange={(e) => {
                                                if (e.target.checked) {
                                                    setEditPermissions([...editPermissions, perm.id]);
                                                } else {
                                                    setEditPermissions(editPermissions.filter(p => p !== perm.id));
                                                }
                                            }}
                                            className="w-4 h-4 rounded-none border-brand-black accent-brand-orange"
                                        />
                                        <Label htmlFor={`perm-${perm.id}`} className="font-mono text-sm cursor-pointer">
                                            {perm.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                            <p className="text-xs text-muted-foreground font-mono">
                                Pilih menu yang dapat diakses oleh member ini.
                            </p>
                        </div>


                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsEditDialogOpen(false)}
                                className="rounded-none border-2 border-brand-black"
                            >
                                Batal
                            </Button>
                            <Button
                                onClick={async () => {
                                    if (!editingMember) return;
                                    setIsEditing(true);
                                    try {
                                        // Validate password if provided
                                        if (editPassword && editPassword.length < 6) {
                                            toast.error('Password minimal 6 karakter');
                                            setIsEditing(false);
                                            return;
                                        }

                                        const { data, error } = await (supabase.rpc as any)('update_store_member', {
                                            p_user_id: editingMember.user_id,
                                            p_role: editRole,
                                            p_name: editName.trim() || null,
                                            p_password: editPassword || null
                                        });

                                        if (error) throw error;

                                        if (data && !data.success) {
                                            toast.error(data.message);
                                        } else {
                                            // RPC doesn't support permissions yet, so update it directly
                                            // This works because owner/admin has RLS update rights on store_members
                                            const { error: permError } = await supabase
                                                .from('store_members')
                                                .update({ permissions: editPermissions })
                                                .eq('user_id', editingMember.user_id)
                                                .eq('store_id', store?.id);

                                            if (permError) {
                                                console.error('Error updating permissions:', permError);
                                                toast.warning('Member diupdate, tapi gagal menyimpan permissions');
                                            } else {
                                                toast.success(editPassword ? 'Member, password & permissions diupdate' : 'Member & permissions diupdate');
                                            }

                                            setEditPassword('');
                                            setIsEditDialogOpen(false);
                                            fetchMembers();
                                        }
                                    } catch (error: any) {
                                        console.error('Error updating member:', error);
                                        toast.error(error.message || 'Gagal update member');
                                    } finally {
                                        setIsEditing(false);
                                    }
                                }}
                                disabled={isEditing}
                                className="bg-brand-orange text-brand-black border-2 border-brand-black font-bold hover:bg-orange-400 rounded-none"
                            >
                                {isEditing ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Menyimpan...
                                    </>
                                ) : (
                                    'Simpan Perubahan'
                                )}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            </DialogContent >
        </Dialog >
    );
}
