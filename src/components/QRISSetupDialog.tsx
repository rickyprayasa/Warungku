import { useState, useRef, useEffect } from 'react';
import { useWarungStore } from '@/lib/store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QrCode, Save, Loader2, Upload, CheckCircle, AlertCircle, Download, Printer, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { validateQRIS, getMerchantName, parseQRISInfo } from '@/lib/qris';
import jsQR from 'jsqr';
import { QRCodeSVG } from 'qrcode.react';
import { QRISDownloadButton } from './QRISDownload';

interface QRISSetupDialogProps {
  trigger?: React.ReactNode;
  compact?: boolean;
}

export function QRISSetupDialog({ trigger, compact = false }: QRISSetupDialogProps) {
  const storeProfile = useWarungStore((state) => state.storeProfile);
  const updateStoreProfile = useWarungStore((state) => state.updateStoreProfile);
  const [isOpen, setIsOpen] = useState(false);
  const [qrisString, setQrisString] = useState(storeProfile.qrisCode || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [validation, setValidation] = useState<{ valid: boolean; error?: string; merchantName?: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (storeProfile.qrisCode) {
      setQrisString(storeProfile.qrisCode);
      validateQRISString(storeProfile.qrisCode);
    }
  }, [storeProfile.qrisCode]);

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

    if (!validation?.valid) {
      toast.error('QRIS tidak valid. Periksa kembali kode QRIS Anda.');
      return;
    }

    setIsSaving(true);
    try {
      await updateStoreProfile({
        ...storeProfile,
        qrisCode: qrisString.trim(),
      });
      toast.success('QRIS berhasil disimpan');
      setIsOpen(false);
    } catch (error) {
      toast.error('Gagal menyimpan QRIS. Silakan coba lagi.');
      console.error('Failed to save QRIS:', error);
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size={compact ? "sm" : "default"}
            className={compact
              ? "flex-1 justify-center font-mono uppercase font-bold text-xs px-2 py-2 hover:bg-brand-orange hover:text-brand-black rounded-none transition-colors text-muted-foreground"
              : "w-full justify-start font-mono uppercase font-bold text-sm px-4 py-2 hover:bg-brand-orange hover:text-brand-black rounded-none transition-colors text-muted-foreground"
            }
          >
            <QrCode className={compact ? "w-4 h-4" : "w-4 h-4 mr-2"} />
            {!compact && "Setup QRIS"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] rounded-none border-4 border-brand-black bg-brand-white p-0 max-h-[90vh] overflow-y-auto">
        <div className="bg-brand-orange p-4 border-b-4 border-brand-black">
          <DialogHeader>
            <DialogTitle className="font-display font-black text-2xl text-brand-black uppercase tracking-wider flex items-center gap-2">
              <QrCode className="w-6 h-6" />
              Setup QRIS Pembayaran
            </DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              <span className="bg-brand-white px-2 text-muted-foreground font-mono">Atau</span>
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
              className={`p-3 border-2 ${
                validation.valid
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

          <Button
            type="submit"
            disabled={isSaving || !validation?.valid}
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
                Simpan QRIS
              </>
            )}
          </Button>

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
                    <p className="font-bold text-lg mb-2">{storeProfile.name}</p>
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
        </form>
      </DialogContent>
    </Dialog>
  );
}
