import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCartStore } from '@/lib/cart-store';
import { useWarungStore } from '@/lib/store-supabase';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import type { SaleFormValues } from '@shared/types';
import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';
import { convertToDynamicQRIS, getMerchantName, validateQRIS, formatQRISAmount } from '@/lib/qris';
import { ArrowLeft, Clock, CheckCircle, AlertCircle, Copy, ShoppingCart, RefreshCw, Lock, User, Building2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { QRISDownloadButton } from '@/components/QRISDownload';
import { usePlan } from '@/contexts/PlanContext';
import { UpgradeDialog } from '@/components/UpgradeDialog';
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Removed due to error


const PAYMENT_TIMEOUT = 15 * 60; // 15 minutes in seconds

export function CheckoutPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { items, getTotal, clearCart } = useCartStore();
  const { publicStore } = useStore();
  const storeProfile = useWarungStore((state) => state.storeProfile);
  const activeStoreProfile = publicStore || storeProfile;
  const addSale = useWarungStore((state) => state.addSale);
  const addPublicSale = useWarungStore((state) => state.addPublicSale);
  const { isAuthenticated } = useAuth();
  const [timeLeft, setTimeLeft] = useState(PAYMENT_TIMEOUT);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'expired'>('pending');
  const [dynamicQRIS, setDynamicQRIS] = useState<string | null>(null);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'qris' | 'manual'>('qris');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);

  const { canAddTransaction, transactionLimitReached, limits } = usePlan();

  const total = getTotal();
  // Use publicStore QRIS code if available (loaded by PublicStorePage), otherwise use storeProfile
  const qrisCode = activeStoreProfile.qrisCode;
  const validation = qrisCode ? validateQRIS(qrisCode) : { valid: false, error: 'No QRIS code' };
  const hasQRIS = validation.valid;



  // Generate dynamic QRIS on mount
  useEffect(() => {
    if (hasQRIS && qrisCode && total > 0) {
      try {
        const dynamic = convertToDynamicQRIS(qrisCode, total);
        setDynamicQRIS(dynamic);
      } catch (error) {
        console.error('Failed to generate dynamic QRIS:', error);
        toast.error('Gagal membuat QRIS dinamis');
      }
    }
  }, [hasQRIS, storeProfile.qrisCode, total]);

  // Countdown timer
  useEffect(() => {
    if (paymentStatus !== 'pending') return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setPaymentStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [paymentStatus]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);

  const handleCopyQRIS = () => {
    if (dynamicQRIS) {
      navigator.clipboard.writeText(dynamicQRIS);
      toast.success('String QRIS disalin ke clipboard');
    }
  };

  // Auto-select first payment method when switching to manual tab
  useEffect(() => {
    if (activeTab === 'manual' && !selectedPaymentMethod && activeStoreProfile.paymentMethods && activeStoreProfile.paymentMethods.length > 0) {
      setSelectedPaymentMethod(activeStoreProfile.paymentMethods[0]);
    }
  }, [activeTab, activeStoreProfile.paymentMethods, selectedPaymentMethod]);

  const handleBackToMenu = () => {
    if (paymentStatus === 'success') {
      clearCart();
    }
    navigate(slug ? `/${slug}` : '/');
  };

  const handleResetTimer = () => {
    setTimeLeft(PAYMENT_TIMEOUT);
    setPaymentStatus('pending');
  };

  // Redirect if cart is empty
  if (items.length === 0 && paymentStatus !== 'success') {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
        <div className="text-center">
          <ShoppingCart className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="font-display font-bold text-2xl mb-2">Keranjang Kosong</h2>
          <p className="font-mono text-muted-foreground mb-4">Pilih jajanan terlebih dahulu</p>
          <Button
            onClick={() => navigate(slug ? `/${slug}` : '/')}
            className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold"
          >
            Kembali ke Menu
          </Button>
        </div>
      </div>
    );
  }

  // No QRIS setup - show message for visitors (no setup option)
  if (!hasQRIS) {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border-4 border-brand-black p-6">
          <div className="text-center mb-6">
            <AlertCircle className="w-16 h-16 mx-auto text-yellow-500 mb-4" />
            <h2 className="font-display font-bold text-2xl mb-2">Pembayaran QRIS Belum Tersedia</h2>
            <p className="font-mono text-muted-foreground text-sm">
              Maaf, pembayaran QRIS belum diatur oleh pemilik toko. Silakan hubungi kasir untuk melakukan pembayaran.
            </p>
          </div>

          <Button
            onClick={() => navigate(slug ? `/${slug}` : '/')}
            variant="outline"
            className="w-full border-2 border-brand-black rounded-none font-mono"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali ke Menu
          </Button>
        </div>
      </div>
    );
  }

  // Payment Success
  if (paymentStatus === 'success') {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="max-w-md w-full bg-white border-4 border-brand-black p-6"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4 border-4 border-green-500"
            >
              <CheckCircle className="w-10 h-10 text-green-600" />
            </motion.div>
            <h2 className="font-display font-bold text-2xl mb-2">Pembayaran Berhasil!</h2>
            <p className="font-mono text-muted-foreground mb-6">Terima kasih atas pembelian Anda</p>

            <div className="bg-brand-black text-brand-white p-4 mb-6">
              <p className="font-mono text-sm">Total Dibayar</p>
              <p className="font-display font-bold text-3xl">{formatCurrency(total)}</p>
            </div>

            <Button
              onClick={handleBackToMenu}
              className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold"
            >
              Kembali ke Menu
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // Payment Expired
  if (paymentStatus === 'expired') {
    return (
      <div className="min-h-screen bg-muted/40 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white border-4 border-brand-black p-6">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
            <h2 className="font-display font-bold text-2xl mb-2">Waktu Habis</h2>
            <p className="font-mono text-muted-foreground mb-6">
              Sesi pembayaran telah berakhir. Silakan coba lagi.
            </p>

            <div className="space-y-3">
              <Button
                onClick={handleResetTimer}
                className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Coba Lagi
              </Button>
              <Button
                onClick={() => navigate(slug ? `/${slug}` : '/')}
                variant="outline"
                className="w-full border-2 border-brand-black rounded-none font-mono"
              >
                Kembali ke Menu
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Checkout View
  return (
    <div className="min-h-screen bg-muted/40 py-6 px-4">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(slug ? `/${slug}` : '/')}
            className="font-mono text-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Kembali
          </Button>

          {/* Timer */}
          <div
            className={`flex items-center gap-2 px-3 py-1 border-2 ${timeLeft <= 60 ? 'border-red-500 bg-red-50' : 'border-brand-black bg-white'
              }`}
          >
            <Clock className={`w-4 h-4 ${timeLeft <= 60 ? 'text-red-500' : ''}`} />
            <span className={`font-mono font-bold ${timeLeft <= 60 ? 'text-red-500' : ''}`}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Payment Method Tabs */}
        <div className="mb-6">
          <div className="flex w-full mb-4 bg-gray-100 p-1 border-2 border-brand-black">
            <button
              onClick={() => setActiveTab('qris')}
              className={`flex-1 py-2 font-bold font-mono transition-colors ${activeTab === 'qris'
                ? 'bg-brand-orange text-brand-black'
                : 'text-muted-foreground hover:bg-gray-200'
                }`}
            >
              QRIS
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`flex-1 py-2 font-bold font-mono transition-colors ${activeTab === 'manual'
                ? 'bg-brand-orange text-brand-black'
                : 'text-muted-foreground hover:bg-gray-200'
                }`}
            >
              Transfer Manual
            </button>
          </div>

          {activeTab === 'qris' && (
            /* QR Code Card */
            <div className="bg-white border-4 border-brand-black">
              {/* Store Header */}
              <div className="bg-brand-orange p-4 border-b-4 border-brand-black text-center">
                {storeProfile.logoUrl ? (
                  <img
                    src={storeProfile.logoUrl}
                    alt={storeProfile.name}
                    className="h-12 w-auto mx-auto mb-2 object-contain"
                  />
                ) : (
                  <h2 className="font-display font-bold text-xl text-brand-black">
                    {storeProfile.name}
                  </h2>
                )}
                <p className="font-mono text-sm text-brand-black/70">Scan untuk membayar</p>
              </div>

              {/* QR Code */}
              <div className="p-6 flex flex-col items-center">
                {dynamicQRIS ? (
                  <div className="border-4 border-brand-black p-4 bg-white">
                    <QRCodeSVG
                      value={dynamicQRIS}
                      size={200}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                ) : (
                  <div className="w-[200px] h-[200px] border-4 border-brand-black flex items-center justify-center">
                    <p className="font-mono text-muted-foreground text-center">
                      Generating QR...
                    </p>
                  </div>
                )}

                {/* Amount */}
                <div className="mt-4 text-center">
                  <p className="font-mono text-sm text-muted-foreground">Total Pembayaran</p>
                  <p className="font-display font-bold text-3xl text-brand-black">
                    {formatCurrency(total)}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 mt-3">
                  <Button
                    variant="ghost"
                    onClick={handleCopyQRIS}
                    className="font-mono text-xs"
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Salin
                  </Button>
                  {dynamicQRIS && (
                    <QRISDownloadButton
                      qrisString={dynamicQRIS}
                      merchantName={storeProfile.name}
                      merchantLogo={storeProfile.logoUrl}
                      amount={total}
                      showAmount={true}
                      fileName={`pembayaran-${storeProfile.name.replace(/\s+/g, '-').toLowerCase()}`}
                      variant="ghost"
                    />
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="bg-white border-4 border-brand-black p-6">
              <div className="space-y-6">
                {/* Bank Transfer Section */}
                {(activeStoreProfile as any).bankName && (activeStoreProfile as any).accountNumber ? (
                  <div className="space-y-4 border-b-2 border-dashed border-gray-200 pb-6">
                    <div className="flex items-start gap-4">
                      <div className="p-2 bg-orange-100 border-2 border-brand-orange rounded-none">
                        <Building2 className="w-6 h-6 text-brand-orange" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1">Bank Transfer</p>
                          <p className="font-display font-bold text-xl text-brand-black">
                            {(activeStoreProfile as any).bankName}
                          </p>
                        </div>

                        <div>
                          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1">Nomor Rekening</p>
                          <div className="flex items-center gap-2">
                            <p className="font-display font-bold text-2xl tracking-wider text-brand-black">
                              {(activeStoreProfile as any).accountNumber}
                            </p>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 hover:bg-orange-100 hover:text-brand-orange"
                              onClick={() => {
                                navigator.clipboard.writeText((activeStoreProfile as any).accountNumber);
                                toast.success('Nomor rekening disalin');
                              }}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        <div>
                          <p className="font-mono text-xs text-muted-foreground uppercase tracking-wider mb-1">Atas Nama</p>
                          <p className="font-display font-bold text-xl text-brand-black">
                            {(activeStoreProfile as any).accountName || '-'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* E-Wallet Section */}
                {(activeStoreProfile.paymentMethods?.some(m => ['gopay', 'ovo', 'dana', 'shopeepay', 'linkaja'].includes(m)) && (activeStoreProfile as any).phoneNumber) ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 bg-orange-100 border-2 border-brand-orange rounded-none">
                        <CreditCard className="w-4 h-4 text-brand-orange" />
                      </div>
                      <h3 className="font-mono font-bold uppercase text-sm">E-Wallet Available</h3>
                    </div>

                    <div className="grid gap-3">
                      {activeStoreProfile.paymentMethods
                        .filter(m => ['gopay', 'ovo', 'dana', 'shopeepay', 'linkaja'].includes(m))
                        .map(method => (
                          <div key={method} className="flex items-center justify-between p-3 border-2 border-brand-black bg-white hover:bg-gray-50 transition-colors">
                            <span className="font-display font-bold uppercase text-lg">{method}</span>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <p className="font-mono text-xs text-muted-foreground">Nomor HP</p>
                                <p className="font-mono font-bold text-sm">{(activeStoreProfile as any).phoneNumber}</p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-orange-100 hover:text-brand-orange"
                                onClick={() => {
                                  navigator.clipboard.writeText((activeStoreProfile as any).phoneNumber);
                                  toast.success('Nomor HP disalin');
                                }}
                              >
                                <Copy className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}

                {/* Empty State */}
                {!((activeStoreProfile as any).bankName && (activeStoreProfile as any).accountNumber) &&
                  !(activeStoreProfile.paymentMethods?.some(m => ['gopay', 'ovo', 'dana', 'shopeepay', 'linkaja'].includes(m)) && (activeStoreProfile as any).phoneNumber) && (
                    <div className="text-center py-8 border-2 border-dashed border-gray-300 bg-gray-50">
                      <p className="font-mono text-sm text-muted-foreground">
                        Belum ada metode pembayaran manual yang diatur.
                      </p>
                    </div>
                  )}
              </div>
            </div>
          )}
        </div>

        {/* Order Summary */}
        <div className="bg-white border-4 border-brand-black mb-4">
          <div className="p-3 border-b-2 border-brand-black bg-gray-50">
            <h3 className="font-mono font-bold text-sm uppercase">Ringkasan Pesanan</h3>
          </div>
          <div className="p-3 max-h-40 overflow-y-auto">
            {items.map((item) => {
              const price =
                item.product.isPromo && item.product.promoPrice
                  ? item.product.promoPrice
                  : item.product.price;
              const qtyPerUnit = item.product.qtyPerUnit || 1;
              return (
                <div
                  key={item.product.id}
                  className="flex justify-between items-center py-2 border-b last:border-0"
                >
                  <div className="flex-1">
                    <span className="font-mono text-sm">{item.product.name}</span>
                    <span className="font-mono text-xs text-muted-foreground ml-2">
                      x{item.quantity}
                      {qtyPerUnit > 1 && ` (${item.quantity * qtyPerUnit} pcs)`}
                    </span>
                  </div>
                  <span className="font-mono text-sm font-bold">
                    {formatCurrency(price * item.quantity)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Transaction limit warning */}
        {transactionLimitReached && (
          <div className="p-4 bg-amber-50 border-2 border-amber-400 rounded-none mb-4">
            <div className="flex items-center gap-2 text-amber-800">
              <Lock className="w-5 h-5" />
              <span className="font-mono text-sm font-bold">
                Batas {limits.maxTransactionsPerMonth} transaksi/bulan tercapai
              </span>
            </div>
            <p className="text-xs font-mono text-amber-700 mt-1">
              Upgrade paket untuk transaksi tanpa batas.
            </p>
          </div>
        )}
      </div>

      <UpgradeDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        trigger="transaction_limit"
      />
    </div>
  );
}
