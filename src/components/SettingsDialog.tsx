import { useState } from 'react';
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
import { Settings, Trash2, Database, Download, Upload, Info, AlertTriangle } from 'lucide-react';
import { useWarungStore } from '@/lib/store';
import { toast } from 'sonner';

export function SettingsDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [isResetting, setIsResetting] = useState(false);

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
            'Build: Production\n\n' +
            'Features:\n' +
            '✓ FIFO Stock Management\n' +
            '✓ Pack/Box Purchase\n' +
            '✓ Display Sale Mode\n' +
            '✓ Real-time Stock Validation\n' +
            '✓ Price Override & Discounts\n' +
            '✓ Comprehensive Reports\n\n' +
            'Technology:\n' +
            '• Frontend: React + TypeScript\n' +
            '• Backend: Cloudflare Workers\n' +
            '• Database: Durable Objects (SQLite)\n' +
            '• UI: shadcn/ui + Tailwind CSS\n\n' +
            '© 2025 OMZETIN'
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="rounded-none border-2 border-brand-black hover:bg-brand-orange hover:text-brand-white"
                    title="Pengaturan"
                >
                    <Settings className="w-5 h-5" />
                </Button>
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

                    {/* Database Info */}
                    <Alert className="border-2 border-blue-500 bg-blue-50">
                        <AlertDescription className="text-xs font-mono text-blue-800">
                            💡 <strong>Ready for Production:</strong> Aplikasi sudah siap untuk
                            deployment ke Cloudflare Workers dengan Durable Objects storage.
                            Auth dapat ditambahkan via Cloudflare Access atau custom middleware.
                        </AlertDescription>
                    </Alert>
                </div>
            </DialogContent>
        </Dialog>
    );
}
