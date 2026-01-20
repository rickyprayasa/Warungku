import { useState, useRef, useEffect } from 'react';
import { useWarungStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { QrCode, Save, Loader2, Upload, CheckCircle, AlertCircle, Printer, Trash2, CreditCard, Building2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { validateQRIS, getMerchantName, parseQRISInfo } from '@/lib/qris';
import jsQR from 'jsqr';
import { QRCodeSVG } from 'qrcode.react';
import { QRISDownloadButton } from './QRISDownload';
import { usePlan } from '@/contexts/PlanContext';
import { PlanUpgradePrompt } from '@/components/PlanUpgradePrompt';

const PAYMENT_METHODS = [
    { id: 'gopay', label: 'GoPay', type: 'wallet' },
    { id: 'ovo', label: 'OVO', type: 'wallet' },
    { id: 'dana', label: 'Dana', type: 'wallet' },
    { id: 'shopeepay', label: 'ShopeePay', type: 'wallet' },
    { id: 'linkaja', label: 'LinkAja', type: 'wallet' },
    { id: 'bca', label: 'BCA Mobile', type: 'bank' },
    { id: 'mandiri', label: 'Mandiri Livin', type: 'bank' },
    { id: 'bri', label: 'BRImo', type: 'bank' },
    { id: 'bni', label: 'BNI Mobile', type: 'bank' },
    { id: 'cash', label: 'Tunai (Cash)', type: 'cash' },
];

export function QRISSetupContent({ onSaveSuccess }: { onSaveSuccess?: () => void }) {
    const { limits } = usePlan();
    const [upgradeOpen, setUpgradeOpen] = useState(false);
    const storeProfile = useWarungStore((state) => state.storeProfile);
    const updateStoreProfile = useWarungStore((state) => state.updateStoreProfile);
    const [qrisString, setQrisString] = useState(storeProfile.qrisCode || '');
    const [selectedMethods, setSelectedMethods] = useState<string[]>(storeProfile.paymentMethods || []);
    const [isSaving, setIsSaving] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [validation, setValidation] = useState<{ valid: boolean; error?: string; merchantName?: string } | null>(null);
    const [manualPaymentInfo, setManualPaymentInfo] = useState({
        enabled: false,
        bankName: (storeProfile as any).bankName || '',
        accountNumber: (storeProfile as any).accountNumber || '',
        accountName: (storeProfile as any).accountName || '',
        phoneNumber: (storeProfile as any).phoneNumber || '',
        walletName: '',
    });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Check if user can use QRIS
    if (!limits.canUseQris) {
        return (
            <div className="flex flex-col items-center justify-center py-16 px-4">
                <div className="w-20 h-20 bg-brand-orange/10 border-4 border-brand-black flex items-center justify-center mb-6">
                    <Lock className="w-10 h-10 text-brand-orange" />
                </div>
                <h2 className="text-2xl font-display font-bold text-brand-black mb-2">
                    Fitur QRIS Tidak Tersedia
                </h2>
                <p className="font-mono text-sm text-muted-foreground text-center max-w-md mb-6">
                    Fitur pembayaran QRIS hanya tersedia untuk plan Pro dan Enterprise. Terima pembayaran non-tunai dengan mudah.
                </p>
                <Button
                    onClick={() => setUpgradeOpen(true)}
                    className="bg-brand-orange text-brand-black hover:bg-brand-black hover:text-brand-white border-2 border-brand-black rounded-none font-mono font-bold uppercase"
                >
                    Upgrade ke Pro
                </Button>
                <PlanUpgradePrompt
                    open={upgradeOpen}
                    onClose={() => setUpgradeOpen(false)}
                    feature="qris"
                />
            </div>
        );
    }

    useEffect(() => {
        if (storeProfile.qrisCode) {
            setQrisString(storeProfile.qrisCode);
            validateQRISString(storeProfile.qrisCode);
        }
        if (storeProfile.paymentMethods) {
            setSelectedMethods(storeProfile.paymentMethods);
        }
    }, [storeProfile.qrisCode, storeProfile.paymentMethods]);

    const validateQRISString = (str: string) => {
        if (!str.trim()) {
            setValidation(null);
            return;
        }

        const result = validateQRIS(str);
        if (result.valid) {
            const merchantName = getMerchantName(str);
            setValidation({ valid: true, merchantName });
        } else {
            setValidation({ valid: false, error: result.error });
        }
    };

    const handleQRISChange = (value: string) => {
        setQrisString(value);
        validateQRISString(value);
    };

    const handleMethodToggle = (methodId: string) => {
        setSelectedMethods(prev =>
            prev.includes(methodId)
                ? prev.filter(id => id !== methodId)
                : [...prev, methodId]
        );
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsScanning(true);

        try {
            const imageData = await readImageFile(file);
            const code = jsQR(imageData.data, imageData.width, imageData.height);

            if (code) {
                setQrisString(code.data);
                validateQRISString(code.data);
                toast.success('QR Code berhasil dibaca!');
            } else {
                toast.error('Tidak dapat membaca QR Code dari gambar. Pastikan gambar jelas dan QR Code terlihat.');
            }
        } catch (error) {
            toast.error('Gagal memproses gambar');
            console.error(error);
        } finally {
            setIsScanning(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const readImageFile = (file: File): Promise<ImageData> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = img.width;
                    canvas.height = img.height;
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Could not get canvas context'));
                        return;
                    }
                    ctx.drawImage(img, 0, 0);
                    const imageData = ctx.getImageData(0, 0, img.width, img.height);
                    resolve(imageData);
                };
                img.onerror = reject;
                img.src = e.target?.result as string;
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Allow saving payment methods even if QRIS is empty/invalid (e.g. only cash)
        // But if QRIS is present, it must be valid
        if (qrisString && !validation?.valid) {
            toast.error('QRIS tidak valid. Periksa kembali kode QRIS Anda.');
            return;
        }

        setIsSaving(true);
        try {
            await updateStoreProfile({
                ...storeProfile,
                qrisCode: qrisString.trim(),
                paymentMethods: selectedMethods,
                bankName: manualPaymentInfo.bankName.trim(),
                accountNumber: manualPaymentInfo.accountNumber.trim(),
                accountName: manualPaymentInfo.accountName.trim(),
                phoneNumber: manualPaymentInfo.phoneNumber.trim(),
            });
            toast.success('Pengaturan pembayaran berhasil disimpan');
            onSaveSuccess?.();
        } catch (error) {
            toast.error('Gagal menyimpan pengaturan. Silakan coba lagi.');
            console.error('Failed to save settings:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const qrisInfo = qrisString ? parseQRISInfo(qrisString) : null;

    const handleDelete = async () => {
        if (!confirm('Apakah Anda yakin ingin menghapus QRIS? Pelanggan tidak akan bisa membayar dengan QRIS setelah dihapus.')) {
            return;
        }

        setIsDeleting(true);
        try {
            await updateStoreProfile({
                ...storeProfile,
                qrisCode: '',
            });
            setQrisString('');
            setValidation(null);
            toast.success('QRIS berhasil dihapus');
        } catch (error) {
            toast.error('Gagal menghapus QRIS. Silakan coba lagi.');
            console.error('Failed to delete QRIS:', error);
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {/* Payment Methods Section with Inline Manual Info */}
            <div className="bg-white border-2 border-brand-black p-4 space-y-4">
                <h3 className="font-mono font-bold uppercase text-sm flex items-center gap-2 border-b-2 border-brand-black pb-2">
                    <CreditCard className="w-4 h-4" />
                    Metode Pembayaran Diterima
                </h3>

                <div className="bg-blue-50 border-2 border-blue-200 p-3">
                    <p className="font-mono text-xs text-blue-800">
                        <strong>Info:</strong> Pilih metode pembayaran yang diterima dan isi informasi detail di bawahnya.
                        Informasi ini akan tampil saat customer checkout.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {PAYMENT_METHODS.map((method) => (
                        <div
                            key={method.id}
                            className={`border-2 rounded-none p-3 space-y-2 ${selectedMethods.includes(method.id)
                                    ? 'border-brand-orange bg-orange-50'
                                    : 'border-gray-300 bg-white'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id={`method-${method.id}`}
                                    checked={selectedMethods.includes(method.id)}
                                    onCheckedChange={() => handleMethodToggle(method.id)}
                                    className="border-2 border-brand-black rounded-none data-[state=checked]:bg-brand-orange data-[state=checked]:text-brand-black"
                                />
                                <Label
                                    htmlFor={`method-${method.id}`}
                                    className="font-mono text-sm font-bold cursor-pointer flex-1"
                                >
                                    {method.label}
                                </Label>
                            </div>

                            {/* Inline Payment Info - Only show if selected */}
                            {selectedMethods.includes(method.id) && method.type === 'wallet' && (
                                <div className="pl-6 space-y-2 border-l-2 border-brand-orange">
                                    <div className="space-y-1">
                                        <Label htmlFor={`phone-${method.id}`} className="font-mono font-bold uppercase text-xs flex items-center gap-1">
                                            <QrCode className="w-3 h-3" />
                                            Nomor HP / E-Wallet
                                        </Label>
                                        <Input
                                            id={`phone-${method.id}`}
                                            value={selectedMethods.includes(method.id) ? manualPaymentInfo.phoneNumber : ''}
                                            onChange={(e) => setManualPaymentInfo(prev => ({ ...prev, phoneNumber: e.target.value.replace(/\D/g, '') }))}
                                            placeholder={method.id === 'gopay' ? '0812xxxxxxx' : '081234567890'}
                                            className="border-2 border-brand-black rounded-none font-mono text-xs focus-visible:ring-2 focus-visible:ring-brand-orange"
                                            maxLength={15}
                                        />
                                        <p className="text-xs text-muted-foreground font-mono">
                                            Untuk pembayaran {method.label}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {selectedMethods.includes(method.id) && method.type === 'bank' && (
                                <div className="pl-6 space-y-3 border-l-2 border-brand-orange">
                                    <div className="space-y-1">
                                        <Label htmlFor={`bank-${method.id}`} className="font-mono font-bold uppercase text-xs flex items-center gap-1">
                                            <Building2 className="w-3 h-3" />
                                            Nama Bank
                                        </Label>
                                        <Input
                                            id={`bank-${method.id}`}
                                            value={selectedMethods.includes(method.id) ? manualPaymentInfo.bankName : ''}
                                            onChange={(e) => setManualPaymentInfo(prev => ({ ...prev, bankName: e.target.value.toUpperCase() }))}
                                            placeholder={method.id === 'bca' ? 'BCA' : method.id === 'mandiri' ? 'MANDIRI' : method.id === 'bri' ? 'BRI' : 'BNI'}
                                            className="border-2 border-brand-black rounded-none font-mono text-xs focus-visible:ring-2 focus-visible:ring-brand-orange"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label htmlFor={`account-${method.id}`} className="font-mono font-bold uppercase text-xs">
                                                No. Rekening
                                            </Label>
                                            <Input
                                                id={`account-${method.id}`}
                                                value={selectedMethods.includes(method.id) ? manualPaymentInfo.accountNumber : ''}
                                                onChange={(e) => setManualPaymentInfo(prev => ({ ...prev, accountNumber: e.target.value.replace(/\D/g, '') }))}
                                                placeholder="1234567890"
                                                className="border-2 border-brand-black rounded-none font-mono text-xs focus-visible:ring-2 focus-visible:ring-brand-orange"
                                                maxLength={20}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label htmlFor={`owner-${method.id}`} className="font-mono font-bold uppercase text-xs">
                                                a.n Pemilik
                                            </Label>
                                            <Input
                                                id={`owner-${method.id}`}
                                                value={selectedMethods.includes(method.id) ? manualPaymentInfo.accountName : ''}
                                                onChange={(e) => setManualPaymentInfo(prev => ({ ...prev, accountName: e.target.value }))}
                                                placeholder="Nama Pemilik"
                                                className="border-2 border-brand-black rounded-none font-mono text-xs focus-visible:ring-2 focus-visible:ring-brand-orange"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* QRIS Section */}
            <div className="bg-white border-2 border-brand-black p-4 space-y-4">
                <h3 className="font-mono font-bold uppercase text-sm flex items-center gap-2 border-b-2 border-brand-black pb-2">
                    <QrCode className="w-4 h-4" />
                    Setup QRIS
                </h3>

                <div className="bg-blue-50 border-2 border-blue-200 p-4">
                    <p className="font-mono text-sm text-blue-800">
                        <strong>Cara mendapatkan QRIS:</strong>
                    </p>
                    <ol className="font-mono text-xs text-blue-700 mt-2 list-decimal list-inside space-y-1">
                        <li>Daftar sebagai merchant QRIS di bank atau e-wallet Anda</li>
                        <li>Dapatkan QR Code static dari penyedia</li>
                        <li>Upload gambar QR atau salin string QRIS</li>
                    </ol>
                </div>

                <div className="space-y-2">
                    <Label className="font-mono font-bold uppercase text-xs">Upload QR Code</Label>
                    <div className="flex gap-2">
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="qris-upload"
                        />
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isScanning}
                            className="flex-1 border-2 border-brand-black rounded-none font-mono hover:bg-brand-orange hover:text-brand-black"
                        >
                            {isScanning ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Membaca...
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-2" />
                                    Upload Gambar QR
                                </>
                            )}
                        </Button>
                    </div>
                </div>

                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t-2 border-gray-300" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-muted-foreground font-mono">Atau</span>
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="qrisString" className="font-mono font-bold uppercase text-xs">
                        String QRIS (Manual)
                    </Label>
                    <Input
                        id="qrisString"
                        value={qrisString}
                        onChange={(e) => handleQRISChange(e.target.value)}
                        placeholder="00020101021126..."
                        className="border-2 border-brand-black rounded-none font-mono text-xs focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-brand-orange"
                    />
                </div>

                {/* Validation Status */}
                {validation && (
                    <div
                        className={`p-3 border-2 ${validation.valid
                            ? 'border-green-500 bg-green-50'
                            : 'border-red-500 bg-red-50'
                            }`}
                    >
                        <div className="flex items-start gap-2">
                            {validation.valid ? (
                                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                            ) : (
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            )}
                            <div className="flex-1">
                                {validation.valid ? (
                                    <>
                                        <p className="font-mono text-sm font-bold text-green-800">QRIS Valid</p>
                                        {qrisInfo && (
                                            <div className="font-mono text-xs text-green-700 mt-1 space-y-0.5">
                                                <p>Merchant: {qrisInfo.merchantName}</p>
                                                <p>Kota: {qrisInfo.merchantCity}</p>
                                                <p>Tipe: {qrisInfo.pointOfInitiation === 'static' ? 'Static' : 'Dynamic'}</p>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <p className="font-mono text-sm font-bold text-red-800">QRIS Tidak Valid</p>
                                        <p className="font-mono text-xs text-red-700 mt-1">{validation.error}</p>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Preview & Download Section - Show when QRIS is valid and saved */}
                {storeProfile.qrisCode && validation?.valid && qrisString === storeProfile.qrisCode && (
                    <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-300">
                        <h3 className="font-mono font-bold text-sm uppercase mb-3 flex items-center gap-2">
                            <Printer className="w-4 h-4" />
                            Preview & Cetak QRIS
                        </h3>

                        {/* Preview */}
                        <div className="bg-gray-50 border-2 border-brand-black p-4 mb-3">
                            <div className="flex flex-col items-center">
                                {storeProfile.logoUrl ? (
                                    <img
                                        src={storeProfile.logoUrl}
                                        alt={storeProfile.name}
                                        className="h-10 w-auto mb-2 object-contain"
                                    />
                                ) : (
                                    <div className="w-full h-10 flex items-center justify-center bg-gray-100 border border-gray-300 mb-2">
                                        <span className="font-mono text-xs text-gray-500">{storeProfile.name}</span>
                                    </div>
                                )}
                                <div className="border-2 border-brand-black p-2 bg-white">
                                    <QRCodeSVG
                                        value={storeProfile.qrisCode}
                                        size={120}
                                        level="M"
                                        includeMargin={false}
                                    />
                                </div>
                                <p className="font-mono text-xs text-muted-foreground mt-2">
                                    QRIS Static - Scan untuk membayar
                                </p>
                            </div>
                        </div>

                        {/* Download Button */}
                        <QRISDownloadButton
                            qrisString={storeProfile.qrisCode}
                            merchantName={storeProfile.name}
                            merchantLogo={storeProfile.logoUrl}
                            fileName={`qris-${storeProfile.name.replace(/\s+/g, '-').toLowerCase()}`}
                            variant="outline"
                        />

                        <p className="font-mono text-[10px] text-muted-foreground mt-2 text-center">
                            Download dan cetak untuk ditempel di kasir
                        </p>

                        {/* Delete Button */}
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handleDelete}
                            disabled={isDeleting}
                            className="w-full mt-4 border-2 border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 rounded-none font-mono font-bold uppercase transition-all"
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Menghapus...
                                </>
                            ) : (
                                <>
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Hapus QRIS
                                </>
                            )}
                        </Button>
                    </div>
                )}
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
                        Simpan Pengaturan
                    </>
                )}
            </Button>
        </form>
    );
}
