import { useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Sale } from '@shared/types';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { cn } from '@/lib/utils';

interface ReceiptTemplateProps {
  sale: Sale;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  storeLogo?: string;
  onClose?: () => void;
}

// Format currency
const formatCurrency = (value: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);

// Format date
const formatDate = (timestamp: number) =>
  new Date(timestamp).toLocaleString('id-ID', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

// Generate plain text version for WhatsApp
export function generateReceiptText(
  sale: Sale,
  storeName: string,
  storeAddress?: string,
  storePhone?: string
): string {
  const lines: string[] = [];
  const separator = '─'.repeat(30);

  lines.push(`*${storeName.toUpperCase()}*`);
  if (storeAddress) lines.push(storeAddress);
  if (storePhone) lines.push(`📞 ${storePhone}`);
  lines.push(separator);
  lines.push(`📅 ${formatDate(sale.createdAt)}`);
  lines.push(`No: #${sale.id.slice(-6).toUpperCase()}`);
  lines.push(separator);

  // Items
  sale.items.forEach((item) => {
    const subtotal = item.price * item.quantity;
    lines.push(`${item.productName}`);
    lines.push(`  ${item.quantity} x ${formatCurrency(item.price)} = ${formatCurrency(subtotal)}`);
  });

  lines.push(separator);
  lines.push(`*TOTAL: ${formatCurrency(sale.total)}*`);
  lines.push(separator);

  // Customer info
  if (sale.customerName) {
    lines.push(`👤 ${sale.customerName}`);
  }
  if (sale.customerPhone) {
    lines.push(`📱 ${sale.customerPhone}`);
  }
  if (sale.customerAddress) {
    lines.push(`📍 ${sale.customerAddress}`);
  }

  lines.push('');
  lines.push('Terima kasih! 🙏');
  lines.push('Sampai jumpa kembali');

  return lines.join('\n');
}

// Handle print
export function handlePrintReceipt() {
  window.print();
}

// Generate PDF from receipt element
// Generate PDF from receipt element
export async function generateReceiptPDF(receiptElementId: string = 'receipt-preview-area'): Promise<jsPDF | null> {
  const element = document.getElementById(receiptElementId);
  if (!element) {
    toast.error('Struk tidak ditemukan');
    return null;
  }

  try {
    toast.loading('Membuat PDF...', { id: 'pdf-loading' });

    // Get actual element dimensions
    const elementWidth = element.scrollWidth;
    const elementHeight = element.scrollHeight;

    // Capture element as canvas with proper window width to prevent cutoff
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      width: elementWidth,
      height: elementHeight,
      windowWidth: elementWidth + 50, // Add padding to prevent cutoff
      windowHeight: elementHeight + 50,
    });

    // Calculate PDF dimensions - use element aspect ratio
    // Standard thermal receipt width is 72mm (usable print area)
    const pdfWidth = 72; // mm
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    // Create PDF with exact content size
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [pdfWidth, pdfHeight + 5], // Small padding at bottom
    });

    // Add image to PDF - fill the page
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);

    toast.dismiss('pdf-loading');
    return pdf;
  } catch (error) {
    toast.dismiss('pdf-loading');
    toast.error('Gagal membuat PDF');
    console.error('PDF generation error:', error);
    return null;
  }
}



// Detect if device is mobile
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Check if Web Share API with files is supported
function canShareFiles(): boolean {
  return typeof navigator !== 'undefined' &&
    typeof navigator.share === 'function' &&
    typeof navigator.canShare === 'function';
}

// Handle WhatsApp share with purchase details
export async function handleWhatsAppShare(
  sale: Sale,
  storeName: string,
  storeAddress?: string,
  storePhone?: string
) {
  // Clean phone number
  let cleanPhone = '';
  if (sale.customerPhone) {
    cleanPhone = sale.customerPhone.replace(/\D/g, '');
    // Convert 08xxx to 628xxx
    if (cleanPhone.startsWith('0')) {
      cleanPhone = '62' + cleanPhone.slice(1);
    }
  }

  // Build professional WhatsApp message with purchase details
  const separator = '─'.repeat(25);
  let waMessage = `*${storeName.toUpperCase()}*\n`;
  if (storeAddress) waMessage += `${storeAddress}\n`;
  if (storePhone) waMessage += `Tel: ${storePhone}\n`;
  waMessage += `${separator}\n\n`;

  waMessage += `*STRUK PEMBELIAN*\n`;
  waMessage += `Tanggal: ${formatDate(sale.createdAt)}\n`;
  waMessage += `No: #${sale.id.slice(-6).toUpperCase()}\n\n`;

  waMessage += `${separator}\n`;

  // Items
  sale.items.forEach((item) => {
    const subtotal = item.price * item.quantity;
    waMessage += `${item.productName}\n`;
    waMessage += `${item.quantity} x ${formatCurrency(item.price)} = ${formatCurrency(subtotal)}\n`;
  });

  waMessage += `${separator}\n`;
  waMessage += `*TOTAL: ${formatCurrency(sale.total)}*\n`;
  waMessage += `${separator}\n\n`;

  // Notes if any
  if (sale.notes) {
    waMessage += `Catatan: ${sale.notes}\n\n`;
  }

  waMessage += `Terima kasih atas pembelian Anda.\n`;
  waMessage += `Kami tunggu kunjungan berikutnya.`;

  // Try to use Web Share API for mobile (can share text + optional PDF)
  if (isMobileDevice() && canShareFiles()) {
    try {
      // Generate PDF for mobile share
      const pdf = await generateReceiptPDF();
      if (pdf) {
        const pdfBlob = pdf.output('blob');
        const fileName = `Struk_${storeName.replace(/[^a-zA-Z0-9]/g, '_')}_${sale.id.slice(-6).toUpperCase()}.pdf`;
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

        if (navigator.canShare({ files: [pdfFile] })) {
          await navigator.share({
            files: [pdfFile],
            title: `Struk ${storeName}`,
            text: waMessage,
          });
          toast.success('Struk berhasil dibagikan!');
          return;
        }
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Share failed:', error);
      }
    }
  }

  // Fallback: Open WhatsApp with text message AND download PDF
  const isMobile = isMobileDevice();

  // On desktop/fallback, download the PDF so user can attach it manually
  if (!isMobile || !canShareFiles()) {
    try {
      const pdf = await generateReceiptPDF();
      if (pdf) {
        const safeName = storeName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const fileName = `struk_${safeName}_${sale.id.slice(-6)}.pdf`;

        // Manual blob download to ensure filename is respected
        const blob = pdf.output('blob');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast.success('PDF Struk berhasil diunduh');
      }
    } catch (e) {
      console.error('Failed to download PDF:', e);
    }
  }

  let waUrl: string;
  if (cleanPhone) {
    waUrl = isMobile
      ? `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waMessage)}`
      : `https://web.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(waMessage)}`;
  } else {
    waUrl = isMobile
      ? `https://api.whatsapp.com/send?text=${encodeURIComponent(waMessage)}`
      : `https://web.whatsapp.com/send?text=${encodeURIComponent(waMessage)}`;
  }

  window.open(waUrl, '_blank');
  toast.success('Membuka WhatsApp...');
}

const ReceiptContent = ({
  sale,
  storeName,
  storeAddress,
  storePhone,
  storeLogo,
  id,
  className
}: ReceiptTemplateProps & { id?: string; className?: string }) => {
  return (
    <div
      id={id}
      className={cn(
        "bg-white p-3 border-2 border-dashed border-gray-300 w-[280px] max-w-full print:w-full print:max-w-[80mm] print:mx-auto print:border-none print:p-0",
        className
      )}
    >
      {/* Header */}
      <div className="text-center mb-4">
        {storeLogo ? (
          <img src={storeLogo} alt={storeName} className="h-12 w-auto mx-auto mb-2 object-contain" />
        ) : null}
        <h2 className="font-bold text-lg uppercase">{storeName}</h2>
        {storeAddress && <p className="text-xs text-gray-600">{storeAddress}</p>}
        {storePhone && <p className="text-xs text-gray-600">📞 {storePhone}</p>}
      </div>

      {/* Separator */}
      <div className="border-t border-dashed border-gray-400 my-2" />

      {/* Transaction Info */}
      <div className="text-xs font-mono mb-2">
        <div className="flex justify-between">
          <span>Tanggal:</span>
          <span>{formatDate(sale.createdAt)}</span>
        </div>
        <div className="flex justify-between">
          <span>No. Transaksi:</span>
          <span>#{sale.id.slice(-6).toUpperCase()}</span>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t border-dashed border-gray-400 my-2" />

      {/* Items */}
      <div className="space-y-1 text-xs font-mono">
        {sale.items.map((item, index) => (
          <div key={index}>
            <div className="font-bold">{item.productName}</div>
            <div className="flex justify-between text-gray-600">
              <span>
                {item.quantity} x {formatCurrency(item.price)}
              </span>
              <span>{formatCurrency(item.price * item.quantity)}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Separator */}
      <div className="border-t border-dashed border-gray-400 my-2" />

      {/* Total */}
      <div className="flex justify-between font-bold text-sm font-mono">
        <span>TOTAL</span>
        <span>{formatCurrency(sale.total)}</span>
      </div>

      {/* Separator */}
      <div className="border-t border-dashed border-gray-400 my-2" />

      {/* Customer Info */}
      {(sale.customerName || sale.customerPhone || sale.customerAddress) && (
        <>
          <div className="text-xs font-mono space-y-0.5">
            {sale.customerName && (
              <div className="flex justify-between">
                <span>Pembeli:</span>
                <span>{sale.customerName}</span>
              </div>
            )}
            {sale.customerPhone && (
              <div className="flex justify-between">
                <span>HP:</span>
                <span>{sale.customerPhone}</span>
              </div>
            )}
            {sale.customerAddress && (
              <div className="flex justify-between">
                <span>Alamat:</span>
                <span className="text-right max-w-[60%]">{sale.customerAddress}</span>
              </div>
            )}
          </div>
          <div className="border-t border-dashed border-gray-400 my-2" />
        </>
      )}

      {/* Notes */}
      {sale.notes && (
        <>
          <div className="text-xs font-mono italic text-gray-600">
            Catatan: {sale.notes}
          </div>
          <div className="border-t border-dashed border-gray-400 my-2" />
        </>
      )}

      {/* Footer */}
      <div className="text-center text-xs font-mono text-gray-600 mt-4">
        <p className="font-bold">Terima kasih!</p>
        <p>Sampai jumpa kembali</p>
      </div>
    </div>
  );
};

export function ReceiptTemplate(props: ReceiptTemplateProps) {
  return (
    <div className="flex flex-col items-center">
      <style>{`
        @media print {
          @page {
            size: auto; 
            margin: 0mm;
          }
          body {
            visibility: hidden;
            height: auto;
          }
          /* Hide everything */
          body * {
            visibility: hidden;
          }
          /* Show receipt portal content only */
          #receipt-print-area, #receipt-print-area * {
            visibility: visible;
          }
          #receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            margin: 0;
            padding: 5mm; 
            border: none;
            background: white;
          }
        }
      `}</style>

      {/* Screen Version - Hidden on Print */}
      <div className="print:hidden">
        <ReceiptContent {...props} id="receipt-preview-area" className="mx-auto" />
      </div>

      {/* Print Version - Portal to Body - Visible only on Print */}
      {createPortal(
        <div className="hidden print:block">
          <ReceiptContent {...props} id="receipt-print-area" />
        </div>,
        document.body
      )}
    </div>
  );
}
