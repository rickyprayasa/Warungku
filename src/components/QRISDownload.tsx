import { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { toPng } from 'html-to-image';
import { toast } from 'sonner';

interface QRISDownloadProps {
  qrisString: string;
  merchantName: string;
  merchantLogo?: string;
  amount?: number;
  fileName?: string;
  showAmount?: boolean;
}

export function QRISDownloadCard({
  qrisString,
  merchantName,
  merchantLogo,
  amount,
  fileName = 'qris',
  showAmount = false,
}: QRISDownloadProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);

  const handleDownload = async () => {
    if (!cardRef.current) return;

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 3,
        backgroundColor: '#ffffff',
      });

      const link = document.createElement('a');
      link.download = `${fileName}-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();

      toast.success('QRIS berhasil didownload!');
    } catch (error) {
      console.error('Failed to download QRIS:', error);
      toast.error('Gagal download QRIS');
    }
  };

  return (
    <div className="space-y-3">
      {/* Downloadable Card */}
      <div
        ref={cardRef}
        className="bg-white p-6 border-4 border-brand-black"
        style={{ width: '320px', margin: '0 auto' }}
      >
        {/* Header */}
        <div className="text-center mb-4 pb-4 border-b-2 border-brand-black">
          {merchantLogo ? (
            <img
              src={merchantLogo}
              alt={merchantName}
              className="h-12 w-auto mx-auto mb-2 object-contain"
            />
          ) : (
            <h2 className="font-bold text-xl text-brand-black">{merchantName}</h2>
          )}
          <p className="text-sm text-gray-600">Scan untuk membayar</p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-4">
          <div className="border-4 border-brand-black p-3 bg-white">
            <QRCodeSVG
              value={qrisString}
              size={180}
              level="M"
              includeMargin={false}
            />
          </div>
        </div>

        {/* Amount (if provided) */}
        {showAmount && amount && (
          <div className="text-center mb-4 p-3 bg-brand-orange/10 border-2 border-brand-black">
            <p className="text-xs text-gray-600 font-mono">Total Pembayaran</p>
            <p className="font-bold text-2xl text-brand-black">{formatCurrency(amount)}</p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-3 border-t-2 border-dashed border-gray-300">
          <div className="flex items-center justify-center gap-2 mb-1">
            <img src="/qris-logo.png" alt="QRIS" className="h-4" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
            <span className="font-bold text-sm">QRIS</span>
          </div>
          <p className="text-[10px] text-gray-500">
            Pembayaran aman dengan QRIS
          </p>
        </div>
      </div>

      {/* Download Button */}
      <Button
        onClick={handleDownload}
        className="w-full bg-brand-black text-brand-white hover:bg-brand-orange hover:text-brand-black border-2 border-brand-black rounded-none font-mono font-bold transition-all"
      >
        <Download className="w-4 h-4 mr-2" />
        Download QRIS
      </Button>
    </div>
  );
}

// Simpler download button that can be placed anywhere
export function QRISDownloadButton({
  qrisString,
  merchantName,
  merchantLogo,
  amount,
  fileName = 'qris',
  showAmount = false,
  variant = 'default',
}: QRISDownloadProps & { variant?: 'default' | 'ghost' | 'outline' }) {
  const handleDownload = async () => {
    // Create a temporary container for rendering
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    document.body.appendChild(container);

    const formatCurrency = (value: number) =>
      new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(value);

    // Create the card HTML
    container.innerHTML = `
      <div id="qris-download-temp" style="background: white; padding: 24px; border: 4px solid #1A1A1A; width: 320px; font-family: system-ui, -apple-system, sans-serif;">
        <div style="text-align: center; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 2px solid #1A1A1A;">
          ${merchantLogo 
            ? `<img src="${merchantLogo}" alt="${merchantName}" style="height: 48px; width: auto; margin: 0 auto 8px; object-fit: contain;" />`
            : `<h2 style="font-weight: bold; font-size: 20px; color: #1A1A1A; margin: 0;">${merchantName}</h2>`
          }
          <p style="font-size: 14px; color: #666; margin: 4px 0 0;">Scan untuk membayar</p>
        </div>
        <div style="display: flex; justify-content: center; margin-bottom: 16px;">
          <div id="qr-placeholder" style="border: 4px solid #1A1A1A; padding: 12px; background: white;"></div>
        </div>
        ${showAmount && amount ? `
          <div style="text-align: center; margin-bottom: 16px; padding: 12px; background: rgba(243, 128, 32, 0.1); border: 2px solid #1A1A1A;">
            <p style="font-size: 12px; color: #666; font-family: monospace; margin: 0;">Total Pembayaran</p>
            <p style="font-weight: bold; font-size: 24px; color: #1A1A1A; margin: 4px 0 0;">${formatCurrency(amount)}</p>
          </div>
        ` : ''}
        <div style="text-align: center; padding-top: 12px; border-top: 2px dashed #ccc;">
          <p style="font-weight: bold; font-size: 14px; margin: 0 0 4px;">QRIS</p>
          <p style="font-size: 10px; color: #999; margin: 0;">Pembayaran aman dengan QRIS</p>
        </div>
      </div>
    `;

    // Add QR code using canvas
    const qrPlaceholder = container.querySelector('#qr-placeholder');
    if (qrPlaceholder) {
      const canvas = document.createElement('canvas');
      const QRCode = await import('qrcode');
      await QRCode.toCanvas(canvas, qrisString, {
        width: 180,
        margin: 0,
        errorCorrectionLevel: 'M',
      });
      qrPlaceholder.appendChild(canvas);
    }

    try {
      const element = container.querySelector('#qris-download-temp') as HTMLElement;
      if (element) {
        const dataUrl = await toPng(element, {
          quality: 1,
          pixelRatio: 3,
          backgroundColor: '#ffffff',
        });

        const link = document.createElement('a');
        link.download = `${fileName}-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();

        toast.success('QRIS berhasil didownload!');
      }
    } catch (error) {
      console.error('Failed to download QRIS:', error);
      toast.error('Gagal download QRIS');
    } finally {
      document.body.removeChild(container);
    }
  };

  return (
    <Button
      onClick={handleDownload}
      variant={variant}
      className={
        variant === 'ghost'
          ? 'font-mono text-xs'
          : variant === 'outline'
          ? 'border-2 border-brand-black rounded-none font-mono hover:bg-brand-orange hover:text-brand-black'
          : 'bg-brand-black text-brand-white hover:bg-brand-orange hover:text-brand-black border-2 border-brand-black rounded-none font-mono font-bold transition-all'
      }
    >
      <Download className="w-4 h-4 mr-2" />
      Download QRIS
    </Button>
  );
}
