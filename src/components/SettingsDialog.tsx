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
import { Settings, Trash2, Database, Download, Info, AlertTriangle, Package, ShoppingCart } from 'lucide-react';
import { useWarungStore } from '@/lib/store';
import { useCartStore } from '@/lib/cart-store';
import { toast } from 'sonner';

export function SettingsDialog({ trigger }: { trigger?: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const storeProfile = useWarungStore((state) => state.storeProfile);
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
            // Clear localStorage
            localStorage.clear();

            // Clear sessionStorage
            sessionStorage.clear();

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
            a.download = `warungku-backup-${new Date().toISOString().split('T')[0]}.json`;
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
            'OMZETIN (Warungku)\n\n' +
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

            <DialogContent className="sm:max-w-[550px] rounded-none border-4 border-brand-black max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="font-display text-2xl font-bold flex items-center gap-2">
                        <Settings className="w-6 h-6" />
                        Pengaturan
                    </DialogTitle>
                    <DialogDescription className="font-mono text-sm">
                        Kelola data dan pengaturan aplikasi
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Opname Configuration Section - Move to top for clarity */}
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

                    {/* Cart & QRIS Settings - Only show if NOT in display mode */}
                    {opnameMode !== 'display' && (
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
                    {opnameMode === 'display' && (
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

                    {/* System Info */}
                    <Alert className="border-2 border-brand-black bg-gradient-to-r from-brand-orange/10 to-brand-white">
                        <AlertDescription className="text-xs font-mono text-brand-black">
                            <strong>🏢 Developed by RSQUARE</strong><br />
                            Sistem manajemen warung modern dengan teknologi cloud.
                            Data Anda aman tersimpan di Cloudflare D1 dengan backup otomatis.
                        </AlertDescription>
                    </Alert>
                </div>
            </DialogContent>
        </Dialog>
    );
}
