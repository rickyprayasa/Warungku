import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface PaymentConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  total: string;
  isProcessing?: boolean;
}

export function PaymentConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  total,
  isProcessing = false,
}: PaymentConfirmDialogProps) {
  const [step, setStep] = useState<1 | 2>(1);

  const handleConfirmFirst = () => {
    setStep(2);
  };

  const handleBackToFirst = () => {
    setStep(1);
  };

  const handleFinalConfirm = async () => {
    await onConfirm();
    setStep(1);
  };

  const handleCancel = () => {
    setStep(1);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={(newOpen) => {
      if (!newOpen) setStep(1);
      onOpenChange(newOpen);
    }}>
      <AlertDialogContent className="max-w-md border-4 border-brand-black shadow-hard">
        {step === 1 ? (
          <>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-yellow-100 border-2 border-brand-black flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-yellow-600" />
                </div>
                <AlertDialogTitle className="font-display font-bold text-2xl">
                  KONFIRMASI PEMBAYARAN
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="font-mono text-sm pt-2">
                <div className="bg-brand-black text-brand-white p-3 mb-3 rounded-none">
                  <p className="text-xs">TOTAL PEMBAYARAN</p>
                  <p className="font-display font-bold text-xl">{total}</p>
                </div>
                <p className="font-bold text-brand-black">
                  Apakah Anda SUDAH MEMBAYAR via QRIS?
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Klik YA hanya jika pembayaran sudah berhasil di aplikasi e-wallet/mobile banking Anda.
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-2">
              <AlertDialogCancel
                onClick={handleCancel}
                disabled={isProcessing}
                className="border-2 border-brand-black rounded-none font-bold font-mono"
              >
                BATAL
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmFirst}
                disabled={isProcessing}
                className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold hover:bg-brand-orange/90"
              >
                YA, SUDAH BAYAR
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-full bg-red-100 border-2 border-brand-black flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <AlertDialogTitle className="font-display font-bold text-2xl">
                  KONFIRMASI TERAKHIR
                </AlertDialogTitle>
              </div>
              <AlertDialogDescription className="font-mono text-sm pt-2">
                <p className="font-bold text-brand-black mb-2">
                  Dengan mengklik YA, Anda menyatakan bahwa:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Pembayaran sebesar <span className="font-bold">{total}</span> SUDAH BERHASIL</li>
                  <li>Anda sudah melihat notifikasi sukses di aplikasi pembayaran</li>
                </ul>
                <p className="text-xs text-red-600 font-bold mt-2">
                  Transaksi tidak dapat dibatalkan setelah dikonfirmasi!
                </p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-2">
              <AlertDialogCancel
                onClick={handleBackToFirst}
                disabled={isProcessing}
                className="border-2 border-brand-black rounded-none font-bold font-mono"
              >
                KEMBALI
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleFinalConfirm}
                disabled={isProcessing}
                className="bg-brand-black text-brand-white border-2 border-brand-black rounded-none font-bold hover:bg-brand-black/90"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    MEMPROSES...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    YA, KONFIRMASI
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
