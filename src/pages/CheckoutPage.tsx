import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useCartStore } from '@/lib/cart-store';
import { useWarungStore } from '@/lib/store-supabase';
import { useStore } from '@/contexts/StoreContext';
import { useAuth } from '@/contexts/AuthContext';
import type { SaleFormValues } from '@shared/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { QRCodeSVG } from 'qrcode.react';
import { convertToDynamicQRIS, getMerchantName, validateQRIS, formatQRISAmount } from '@/lib/qris';
import { MapPickerDialog } from '@/components/MapPickerDialog';
import { ArrowLeft, Clock, CheckCircle, AlertCircle, Copy, ShoppingCart, RefreshCw, Lock, User, Building2, CreditCard, Send, Loader2, Upload, Image, Truck, Store, MapPin, Plus, Minus, Trash2, Package, Search } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { QRISDownloadButton } from '@/components/QRISDownload';
import { usePlan } from '@/contexts/PlanContext';
import { UpgradeDialog } from '@/components/UpgradeDialog';
import { supabase } from '@/lib/supabase';

function QuantityInput({ value, max, onChange }: { value: number; max?: number; onChange: (val: number) => void }) {
  const [localVal, setLocalVal] = useState<string | number>(value);

  useEffect(() => {
    setLocalVal(value);
  }, [value]);

  return (
    <input
      type="number"
      min={1}
      max={max}
      value={localVal}
      onChange={(e) => {
        setLocalVal(e.target.value);
        const val = parseInt(e.target.value);
        if (!isNaN(val) && val > 0) {
          onChange(max !== undefined ? Math.min(max, val) : val);
        }
      }}
      onBlur={() => {
        const val = parseInt(String(localVal));
        if (isNaN(val) || val < 1) {
          setLocalVal(1);
          onChange(1);
        } else {
          setLocalVal(val);
        }
      }}
      className="w-10 h-8 text-center font-mono font-bold border-none bg-transparent outline-none focus:bg-brand-orange/20 p-0 m-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    />
  );
}


const PAYMENT_TIMEOUT = 15 * 60; // 15 minutes in seconds

export function CheckoutPage() {
  const navigate = useNavigate();
  const { slug } = useParams<{ slug: string }>();
  const { items, getTotal, clearCart, updateQuantity, removeFromCart } = useCartStore();
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
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);

  // Customer details state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerAddressDetail, setCustomerAddressDetail] = useState('');
  const [customerAddressMapOpen, setCustomerAddressMapOpen] = useState(false);
  const [customerNotes, setCustomerNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);
  const [finalTotal, setFinalTotal] = useState(0); // Store total for success screen
  const [shippingMethod, setShippingMethod] = useState<'pickup' | 'delivery'>('pickup');
  const [shippingCost, setShippingCost] = useState(0);
  const [selectedCourier, setSelectedCourier] = useState('');

  const [productSearch, setProductSearch] = useState('');
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const products = useWarungStore(state => state.products);
  const { addToCart } = useCartStore(); // Note: must add addToCart to existing destructure if not there, or just use this duplicate hook call (zustand supports it)

  const [paymentProofFile, setPaymentProofFile] = useState<File | null>(null);
  const [paymentProofPreview, setPaymentProofPreview] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { canAddTransaction, transactionLimitReached, limits } = usePlan();

  const total = getTotal();
  // Use publicStore QRIS code if available (loaded by PublicStorePage), otherwise use storeProfile
  const qrisCode = activeStoreProfile.qrisCode;
  const validation = qrisCode ? validateQRIS(qrisCode) : { valid: false, error: 'No QRIS code' };
  const hasQRIS = validation.valid;

  // Set default tab based on QRIS availability
  const [activeTab, setActiveTab] = useState<'qris' | 'manual'>('qris');

  // Auto-switch to manual tab if QRIS is not available
  useEffect(() => {
    if (!hasQRIS) {
      setActiveTab('manual');
    }
  }, [hasQRIS]);



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
  }, [hasQRIS, qrisCode, total]);

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

  // Redirect to store if cart becomes empty during checkout
  useEffect(() => {
    if (items.length === 0 && paymentStatus === 'pending') {
      navigate(`/${activeStoreProfile.slug}`);
    }
  }, [items.length, paymentStatus, navigate, activeStoreProfile.slug]);


  const filteredNewProducts = React.useMemo(() => {
    if (!productSearch) return products;
    const q = productSearch.toLowerCase();
    return products.filter(p => p.name.toLowerCase().includes(q));
  }, [products, productSearch]);

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

  // Compress image before upload (max 800px, JPEG quality 0.7)
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 800;
          let width = img.width;
          let height = img.height;

          // Resize if larger than MAX_SIZE
          if (width > height && width > MAX_SIZE) {
            height = (height * MAX_SIZE) / width;
            width = MAX_SIZE;
          } else if (height > MAX_SIZE) {
            width = (width * MAX_SIZE) / height;
            height = MAX_SIZE;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Failed to compress image'));
                return;
              }
              const compressedFile = new File([blob], `payment-${Date.now()}.jpg`, {
                type: 'image/jpeg',
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            0.7 // Quality 70%
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  };

  // Handle payment proof file selection
  const handlePaymentProofChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB for original)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Ukuran file maksimal 10MB');
        return;
      }
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('File harus berupa gambar');
        return;
      }

      try {
        const compressedFile = await compressImage(file);
        setPaymentProofFile(compressedFile);

        // Create preview from compressed file
        const reader = new FileReader();
        reader.onload = (e) => setPaymentProofPreview(e.target?.result as string);
        reader.readAsDataURL(compressedFile);
      } catch (err) {
        console.error('Compression error:', err);
        toast.error('Gagal mengompres gambar');
      }
    }
  };

  const handleConfirmPayment = async () => {
    if (!customerName.trim()) {
      toast.error('Nama harus diisi');
      return;
    }

    // For delivery, require address
    if (shippingMethod === 'delivery' && !customerAddress.trim()) {
      toast.error('Alamat pengiriman wajib diisi untuk metode kirim ke alamat');
      return;
    }

    // For manual payment, require payment proof if tab is manual
    if (activeTab === 'manual' && !paymentProofFile) {
      toast.error('Silakan upload bukti transfer');
      return;
    }

    setIsSubmitting(true);
    try {
      let paymentProofUrl: string | undefined;

      // Upload payment proof if exists
      if (paymentProofFile) {
        setIsUploadingProof(true);
        const fileName = `${Date.now()}-${paymentProofFile.name}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('payment-proofs')
          .upload(fileName, paymentProofFile, { upsert: true });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          throw new Error('Gagal mengupload bukti pembayaran');
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('payment-proofs')
          .getPublicUrl(fileName);
        paymentProofUrl = publicUrl;
        setIsUploadingProof(false);
      }

      // Build notes with shipping info
      const noteParts: string[] = [];
      if (shippingMethod === 'delivery' && shippingCost > 0) {
        const courierInfo = selectedCourier ? ` via ${selectedCourier}` : '';
        noteParts.push(`[Pengiriman] Ongkir: ${formatCurrency(shippingCost)}${courierInfo}`);
      } else if (shippingMethod === 'pickup') {
        noteParts.push('[Pengiriman] Ambil Sendiri');
      }
      if (customerNotes.trim()) noteParts.push(customerNotes.trim());

      const saleData: SaleFormValues = {
        items: items.map(item => ({
          productId: item.product.id,
          productName: item.product.name,
          quantity: item.quantity,
          price: item.product.isPromo && item.product.promoPrice ? item.product.promoPrice : item.product.price,
        })),
        status: 'pending',
        notes: noteParts.length > 0 ? noteParts.join(' | ') : undefined,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() ?
          (customerAddressDetail.trim() ? `${customerAddress.trim()} | Detail: ${customerAddressDetail.trim()}` : customerAddress.trim())
          : undefined,
        paymentProofUrl,
      };

      await addPublicSale(saleData);
      setFinalTotal(total + (shippingMethod === 'delivery' ? shippingCost : 0)); // Save total + ongkir
      setIsCustomerDialogOpen(false);
      setPaymentStatus('success');
      toast.success('Pesanan berhasil dikirim!');
      setTimeout(() => {
        clearCart();
      }, 0);
    } catch (err: any) {
      console.error('Failed to submit order:', err);
      toast.error(err.message || 'Gagal mengirim pesanan');
    } finally {
      setIsSubmitting(false);
      setIsUploadingProof(false);
    }
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

  // REMOVED: No longer block checkout if QRIS is not set up
  // Users can still checkout with manual payment methods

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
              <p className="font-display font-bold text-3xl">{formatCurrency(finalTotal)}</p>
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
      <div className="max-w-5xl mx-auto">
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


        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-6 lg:order-1 order-2">
            {/* Order Summary with Product Images */}
            <div className="bg-white border-4 border-brand-black mb-4">
              <div className="p-3 border-b-2 border-brand-black bg-gray-50">
                <h3 className="font-mono font-bold text-sm uppercase">Ringkasan Pesanan</h3>
              </div>
              <div className="p-3 max-h-60 overflow-y-auto">
                {items.map((item) => {
                  const price =
                    item.product.isPromo && item.product.promoPrice
                      ? item.product.promoPrice
                      : item.product.price;
                  const qtyPerUnit = item.product.qtyPerUnit || 1;
                  return (
                    <div
                      key={item.product.id}
                      className="flex items-center gap-3 py-3 border-b last:border-0"
                    >
                      {/* Product Image */}
                      <div className="w-12 h-12 flex-shrink-0 border-2 border-brand-black overflow-hidden bg-gray-100">
                        {item.product.imageUrl ? (
                          <img
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ShoppingCart className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      {/* Product Details */}
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm font-bold truncate">{item.product.name}</p>
                        <p className="font-mono text-xs text-muted-foreground mb-2">
                          {formatCurrency(price)}
                          {qtyPerUnit > 1 && ` / ${qtyPerUnit} pcs`}
                        </p>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center border-2 border-brand-black bg-white">
                            <button
                              type="button"
                              onClick={() => {
                                if (item.quantity > 1) {
                                  updateQuantity(item.product.id, item.quantity - 1);
                                } else {
                                  removeFromCart(item.product.id);
                                }
                              }}
                              className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 transition-colors"
                            >
                              {item.quantity > 1 ? <Minus className="w-3 h-3" /> : <Trash2 className="w-3 h-3 text-red-500" />}
                            </button>
                            <QuantityInput
                              value={item.quantity}
                              max={item.product.totalStock !== undefined && item.product.totalStock !== null ? Number(item.product.totalStock) : undefined}
                              onChange={(val) => updateQuantity(item.product.id, val)}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const maxStock = item.product.totalStock !== undefined && item.product.totalStock !== null
                                  ? Number(item.product.totalStock)
                                  : Infinity;
                                if (item.quantity < maxStock) {
                                  updateQuantity(item.product.id, item.quantity + 1);
                                } else {
                                  toast.error(`Stok ${item.product.name} tidak mencukupi (Sisa: ${item.product.totalStock})`);
                                }
                              }}
                              className="w-6 h-6 flex items-center justify-center hover:bg-gray-100 transition-colors"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {item.product.totalStock !== undefined && item.product.totalStock !== null && (
                            <span className="font-mono text-[10px] text-orange-600 font-bold bg-orange-100 border border-orange-200 px-2 py-0.5">
                              Sisa stok: {item.product.totalStock}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Subtotal */}
                      <span className="font-mono text-sm font-bold">
                        {formatCurrency(price * item.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>
              {/* Subtotal + Ongkir + Total */}
              <div className="p-3 border-t-2 border-brand-black bg-brand-orange/10 space-y-1">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-sm text-muted-foreground">Subtotal</span>
                  <span className="font-mono text-sm">{formatCurrency(total)}</span>
                </div>
                {shippingMethod === 'delivery' && shippingCost > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-sm text-muted-foreground">Ongkir</span>
                    <span className="font-mono text-sm">{formatCurrency(shippingCost)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-1 border-t border-brand-black/20">
                  <span className="font-mono font-bold">TOTAL</span>
                  <span className="font-mono font-bold text-lg">{formatCurrency(total + (shippingMethod === 'delivery' ? shippingCost : 0))}</span>
                </div>
              </div>
              <div className="p-3 border-t-2 border-brand-black bg-white">
                <Button type="button" onClick={() => setIsProductSearchOpen(true)} variant="outline" className="w-full border-2 border-dashed border-brand-black rounded-none font-mono text-xs h-12 flex items-center justify-center gap-2 hover:bg-brand-orange/10">
                  <Plus className="w-4 h-4" />Tambah Produk Lainnya
                </Button>
              </div>
            </div>


            {/* Shipping Method Section Summary */}
            <div className="bg-white border-4 border-brand-black mb-4">
              <div className="p-3 border-b-2 border-brand-black bg-gray-50 flex justify-between items-center">
                <h3 className="font-mono font-bold text-sm uppercase flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Metode Pengiriman
                </h3>
                <button
                  type="button"
                  onClick={() => setIsShippingModalOpen(true)}
                  className="text-xs font-mono font-bold text-brand-black hover:bg-brand-orange hover:text-white transition-colors px-3 py-1.5 border-2 border-brand-black bg-white shadow-[2px_2px_0px_#000] active:shadow-none active:translate-x-0.5 active:translate-y-0.5"
                >
                  UBAH
                </button>
              </div>
              <div className="p-4">
                {shippingMethod === 'pickup' ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex flex-shrink-0 items-center justify-center border-2 border-brand-black bg-brand-orange text-white">
                      <Store className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-mono font-bold text-sm">Ambil Sendiri</p>
                      <p className="font-mono text-xs text-muted-foreground">Gratis</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 relative overflow-hidden">
                    <div className="w-10 h-10 flex flex-shrink-0 items-center justify-center border-2 border-brand-black bg-brand-orange text-white">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0 pr-4">
                      <p className="font-mono font-bold text-sm truncate">Kirim ke Alamat {selectedCourier ? `(${selectedCourier})` : ''}</p>
                      <p className="font-mono text-xs text-muted-foreground truncate">{customerAddress || 'Alamat belum diatur'}</p>
                    </div>
                    <span className="font-mono font-bold text-sm text-brand-orange flex-shrink-0 pl-2">
                      {formatCurrency(shippingCost)}
                    </span>
                  </div>
                )}
              </div>
            </div>         </div>
          <div className="space-y-6 lg:order-2 order-1">
            {/* Payment Method Tabs - Only show if QRIS is available */}
            <div className="">
              {hasQRIS && (
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
              )}

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


            {/* Confirm Payment Button - Opens Modal */}
            <Button
              onClick={() => setIsCustomerDialogOpen(true)}
              className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-sm shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12 mb-4"
            >
              <Send className="w-4 h-4 mr-2" />
              Konfirmasi Pesanan
            </Button>


          </div>
        </div>
        {/* Customer Details Modal */}
        <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
          <DialogContent className="sm:max-w-4xl w-[95vw] h-fit max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 rounded-none border-4 border-brand-black bg-brand-white overflow-hidden !top-[8vh] !translate-y-0">
            <DialogHeader className="p-4 border-b-2 border-brand-black bg-brand-light-orange/20 flex-shrink-0">
              <DialogTitle className="font-display text-xl font-bold flex items-center gap-2">
                <User className="w-5 h-5" />
                Data Pembeli
              </DialogTitle>
              <DialogDescription className="font-mono text-sm text-muted-foreground">
                Isi data Anda untuk konfirmasi pesanan
              </DialogDescription>
            </DialogHeader>

            {/* Universal Store Address Block */}
            {activeStoreProfile?.address && (
              <div className="p-4 bg-amber-50 border-b-2 border-brand-black shadow-[inset_0_-2px_0_0_#ebb300] flex-shrink-0">
                <div className="max-w-2xl mx-auto flex items-start gap-3">
                  <div className="bg-amber-200 p-2 rounded-full mt-1 border-2 border-amber-400">
                    <Store className="w-4 h-4 text-amber-800" />
                  </div>
                  <div className="flex-1">
                    <p className="font-mono text-[10px] text-amber-700 font-bold uppercase mb-1">
                      Lokasi Toko
                    </p>
                    <p className="font-mono text-sm font-bold text-amber-900 leading-tight">
                      {activeStoreProfile.address}
                    </p>
                    {(activeStoreProfile as any)?.settings?.address_detail && (
                      <p className="font-mono text-xs text-amber-800 mt-1 inline-block bg-white border border-amber-200 px-2 py-0.5 rounded-sm">
                        📌 {(activeStoreProfile as any).settings.address_detail}
                      </p>
                    )}
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={(e) => { e.preventDefault(); setIsMapOpen(true); }}
                        className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-white bg-brand-orange hover:bg-orange-600 border border-brand-black px-2 py-1 transition-colors rounded-sm shadow-[1px_1px_0px_#000]"
                      >
                        <MapPin className="w-3 h-3" /> Cek Peta
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex flex-col flex-1 bg-white min-h-0">
              <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                  {/* Left Column: Data Diri & Catatan */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="customerName" className="font-mono text-sm font-bold">
                        Nama <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="customerName"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Masukkan nama Anda"
                        className="mt-1 border-2 border-brand-black rounded-none font-mono"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerPhone" className="font-mono text-sm font-bold">
                        No. Handphone (Opsional)
                      </Label>
                      <Input
                        id="customerPhone"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="08xxxxxxxxxx"
                        className="mt-1 border-2 border-brand-black rounded-none font-mono"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customerNotes" className="font-mono text-sm font-bold">
                        Catatan (Opsional)
                      </Label>
                      <Input
                        id="customerNotes"
                        value={customerNotes}
                        onChange={(e) => setCustomerNotes(e.target.value)}
                        placeholder="Catatan tambahan untuk pesanan"
                        className="mt-1 border-2 border-brand-black rounded-none font-mono"
                      />
                    </div>
                  </div>

                  {/* Right Column: Alamat & Pembayaran */}
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="customerAddress" className="font-mono text-sm font-bold">
                        Alamat Pengiriman {shippingMethod === 'delivery' && <span className="text-red-500">*</span>}
                      </Label>

                      <MapPickerDialog
                        open={customerAddressMapOpen}
                        onOpenChange={setCustomerAddressMapOpen}
                        currentAddress={customerAddress}
                        onSelectAddress={(addr) => {
                          setCustomerAddress(addr);
                        }}
                      />

                      {customerAddress ? (
                        <div className="mt-1 p-2 bg-green-50 border-2 border-green-300 space-y-1">
                          <p className="font-mono text-xs text-green-800 font-bold">📍 {customerAddress}</p>
                          <button
                            type="button"
                            onClick={() => setCustomerAddressMapOpen(true)}
                            className="text-[11px] font-mono font-bold text-blue-600 hover:text-blue-800 underline"
                          >
                            Ubah Lokasi di Peta
                          </button>
                        </div>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setCustomerAddressMapOpen(true)}
                          className="mt-1 w-full border-2 border-dashed border-brand-black rounded-none font-mono text-xs h-12 flex items-center justify-center gap-2 hover:bg-brand-orange/10"
                        >
                          <MapPin className="w-4 h-4 text-red-500" />
                          Pilih Lokasi di Peta
                        </Button>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="customerAddressDetail" className="font-mono text-sm font-bold">
                        Detail Alamat (Opsional)
                      </Label>
                      <Input
                        id="customerAddressDetail"
                        value={customerAddressDetail}
                        onChange={(e) => setCustomerAddressDetail(e.target.value)}
                        placeholder="Contoh: Blok Akasia No. 21, depan masjid"
                        className="mt-1 border-2 border-brand-black rounded-none font-mono"
                      />
                      <p className="text-[10px] text-muted-foreground font-mono mt-1">
                        Tambahkan detail spesifik seperti nama gedung, blok, nomor rumah.
                      </p>
                    </div>
                    {/* Payment Proof Upload - Only for manual payment */}
                    {activeTab === 'manual' && (
                      <div>
                        <Label className="font-mono text-sm font-bold">
                          Bukti Transfer <span className="text-red-500">*</span>
                        </Label>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handlePaymentProofChange}
                          className="hidden"
                        />
                        {paymentProofPreview ? (
                          <div className="mt-2 relative">
                            <img
                              src={paymentProofPreview}
                              alt="Bukti Transfer"
                              className="w-full max-h-48 object-contain border-2 border-brand-black"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setPaymentProofFile(null);
                                setPaymentProofPreview(null);
                                if (fileInputRef.current) fileInputRef.current.value = '';
                              }}
                              className="absolute top-2 right-2 rounded-none text-xs"
                            >
                              Ganti
                            </Button>
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="mt-2 w-full border-2 border-dashed border-brand-black rounded-none font-mono h-20 flex flex-col items-center justify-center gap-1 hover:bg-brand-orange/10"
                          >
                            <Upload className="w-5 h-5" />
                            <span className="text-xs">Upload Bukti Transfer</span>
                          </Button>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 font-mono">
                          Format: JPG, PNG. Maks 5MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t-2 border-brand-black bg-white flex-shrink-0">
              <Button
                onClick={handleConfirmPayment}
                disabled={isSubmitting || !customerName.trim()}
                className="w-full bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-sm shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Kirim Pesanan
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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


      <Dialog open={isProductSearchOpen} onOpenChange={setIsProductSearchOpen}>
        <DialogContent className="sm:max-w-md h-[80vh] flex flex-col p-0 rounded-none border-4 border-brand-black bg-brand-white">
          <DialogHeader className="p-4 border-b-2 border-brand-black bg-brand-light-orange/20 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold font-display">
              <Package className="w-6 h-6" />
              Pilih Produk
            </DialogTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cari produk..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                className="pl-9 border-2 border-brand-black rounded-none h-11 focus-visible:ring-0 focus-visible:ring-offset-0 font-bold"
              />
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto bg-gray-50">
            <div className="grid grid-cols-1 gap-0">
              {filteredNewProducts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground font-mono">
                  Tidak ada produk ditemukan.
                </div>
              ) : filteredNewProducts.map(p => {
                const cartItem = items.find(i => i.product.id === p.id);
                const qty = cartItem ? cartItem.quantity : 0;
                return (
                  <div key={p.id} className="flex justify-between items-center p-4 border-b border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                      <div className="w-12 h-12 flex-shrink-0 border-2 border-brand-black overflow-hidden bg-gray-100">
                        {p.imageUrl ? (
                          <img
                            src={p.imageUrl}
                            alt={p.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{p.name}</p>
                        <p className="font-mono text-brand-orange font-bold text-sm">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(p.price)}</p>
                        {p.totalStock !== undefined && p.totalStock !== null ? (
                          <p className="font-mono text-[10px] text-muted-foreground mt-1">Sisa stok: {p.totalStock}</p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {qty > 0 ? (
                        <div className="flex items-center border-2 border-brand-black bg-white">
                          <button
                            type="button"
                            onClick={() => {
                              if (qty > 1) {
                                updateQuantity(p.id, qty - 1);
                              } else {
                                removeFromCart(p.id);
                              }
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors border-r-2 border-brand-black"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <QuantityInput
                            value={qty}
                            max={p.totalStock !== undefined && p.totalStock !== null ? Number(p.totalStock) : undefined}
                            onChange={(val) => updateQuantity(p.id, val)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const maxStock = p.totalStock !== undefined && p.totalStock !== null ? Number(p.totalStock) : Infinity;
                              if (qty < maxStock) {
                                updateQuantity(p.id, qty + 1);
                              } else {
                                toast.error(`Stok tidak mencukupi (Sisa: ${p.totalStock})`);
                              }
                            }}
                            className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 transition-colors border-l-2 border-brand-black"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <Button
                          onClick={() => {
                            if ((p.totalStock !== undefined && p.totalStock !== null && p.totalStock <= 0)) {
                              toast.error(`Stok ${p.name} habis`);
                            } else {
                              addToCart(p, 1);
                              toast.success(`${p.name} ditambahkan`);
                            }
                          }}
                          disabled={p.totalStock !== undefined && p.totalStock !== null && p.totalStock <= 0}
                          className="flex-shrink-0 bg-brand-orange text-brand-black border-2 border-brand-black rounded-none shadow-sm hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all h-8 px-3"
                        >
                          <Plus className="w-4 h-4 mr-1" /> Tambah
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="p-4 border-t-2 border-brand-black bg-white flex-shrink-0">
            <Button onClick={() => setIsProductSearchOpen(false)} className="w-full bg-brand-black text-white hover:bg-brand-black/90 font-bold rounded-none h-12 uppercase">
              Selesai ({items.length} Item)
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <UpgradeDialog
        open={upgradeDialogOpen}
        onOpenChange={setUpgradeDialogOpen}
        trigger="transaction_limit"
      />


      {/* Shipping Method Modal Dialog */}
      <Dialog open={isShippingModalOpen} onOpenChange={setIsShippingModalOpen}>
        <DialogContent className="sm:max-w-2xl h-fit max-h-[90vh] sm:max-h-[85vh] flex flex-col p-0 rounded-none border-4 border-brand-black bg-brand-white overflow-hidden !top-[8vh] !translate-y-0">
          <DialogHeader className="p-4 border-b-2 border-brand-black bg-brand-light-orange/20 flex-shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl font-bold font-display">
              <Truck className="w-6 h-6" />
              Metode Pengiriman
            </DialogTitle>
          </DialogHeader>

          {/* Universal Store Address Block */}
          {activeStoreProfile?.address && (
            <div className="p-4 bg-amber-50 border-b-2 border-brand-black shadow-[inset_0_-2px_0_0_#ebb300] flex-shrink-0">
              <div className="max-w-2xl mx-auto flex items-start gap-3">
                <div className="bg-amber-200 p-2 rounded-full mt-1 border-2 border-amber-400">
                  <Store className="w-4 h-4 text-amber-800" />
                </div>
                <div className="flex-1">
                  <p className="font-mono text-[10px] text-amber-700 font-bold uppercase mb-1">
                    Lokasi Toko
                  </p>
                  <p className="font-mono text-sm font-bold text-amber-900 leading-tight">
                    {activeStoreProfile.address}
                  </p>
                  {(activeStoreProfile as any)?.settings?.address_detail && (
                    <p className="font-mono text-xs text-amber-800 mt-1 inline-block bg-white border border-amber-200 px-2 py-0.5 rounded-sm shadow-sm">
                      📌 {(activeStoreProfile as any).settings.address_detail}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={(e) => { e.preventDefault(); setIsMapOpen(true); }}
                      className="inline-flex items-center gap-1 text-[11px] font-mono font-bold text-white bg-brand-orange hover:bg-orange-600 border-2 border-brand-black px-2 py-1 transition-colors rounded-none shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-[1px]"
                    >
                      <MapPin className="w-3 h-3" /> Cek Peta
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}


          <div className="flex flex-col flex-1 bg-white min-h-0">

            {/* Top Toggle Switch */}
            <div className="p-4 border-b-2 border-brand-black bg-gray-50 flex-shrink-0 z-10">
              <div className="relative flex w-full h-14 bg-white border-2 border-brand-black shadow-[3px_3px_0px_0px_#000] p-1">
                {/* Animated Indicator */}
                <motion.div
                  className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-brand-orange border-2 border-brand-black shadow-[2px_2px_0px_0px_#000]"
                  initial={false}
                  animate={{ x: shippingMethod === 'pickup' ? 0 : '100%' }}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />

                {/* Tab: Ambil Sendiri */}
                <button
                  onClick={() => { setShippingMethod('pickup'); setShippingCost(0); }}
                  className={`relative flex-1 flex items-center justify-center gap-2 font-mono font-bold text-sm z-10 transition-colors ${shippingMethod === 'pickup' ? 'text-white' : 'text-brand-black hover:text-brand-orange'}`}
                >
                  <Store className="w-4 h-4" /> Ambil Sendiri
                </button>

                {/* Tab: Kirim ke Alamat */}
                <button
                  onClick={() => setShippingMethod('delivery')}
                  className={`relative flex-1 flex items-center justify-center gap-2 font-mono font-bold text-sm z-10 transition-colors ${shippingMethod === 'delivery' ? 'text-white' : 'text-brand-black hover:text-brand-orange'}`}
                >
                  <Truck className="w-4 h-4" /> Kirim ke Alamat
                </button>
              </div>
            </div>

            {/* Middle Content Area */}
            <div className="flex-1 overflow-y-auto p-0 relative bg-white">
              <AnimatePresence mode="wait">
                {shippingMethod === 'pickup' ? (
                  <motion.div
                    key="pickup"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center justify-center text-center space-y-4 p-8 sm:p-12 text-muted-foreground w-full"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-brand-black -rotate-3 translate-x-1 translate-y-1 rounded-xl"></div>
                      <div className="relative w-28 h-28 bg-brand-orange border-4 border-brand-black shadow-[4px_4px_0px_0px_#000] rounded-xl flex items-center justify-center z-10 overflow-hidden group">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0IiBoZWlnaHQ9IjQiPgo8cmVjdCB3aWR0aD0iNCIgaGVpZ2h0PSI0IiBmaWxsPSIjZmZmIiBmaWxsLW9wYWNpdHk9IjAiLz4KPGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiMwMDAiIGZpbGwtb3BhY2l0eT0iMC4xNSIvPgo8L3N2Zz4=')] opacity-50 mix-blend-overlay"></div>
                        <Store className="w-12 h-12 text-brand-black group-hover:scale-110 transition-transform duration-300 relative z-10" />
                      </div>
                    </div>
                    <div className="mt-6 flex flex-col items-center w-full max-w-sm">
                      <h4 className="font-black text-2xl text-brand-black uppercase tracking-tight font-display bg-brand-orange/20 px-2 leading-none inline-block">Pesanan Diambil</h4>
                      <p className="font-mono text-sm mt-4 text-brand-black font-medium px-4">Siapkan kaki Anda! Pesanan siap diambil langsung di toko tanpa drama ongkos kirim.</p>



                      <div className="mt-6 inline-flex items-center gap-2 bg-brand-black text-white px-4 py-2 border-2 border-transparent hover:bg-brand-orange hover:border-brand-black hover:text-brand-black hover:shadow-[3px_3px_0px_0px_#000] transition-all font-mono font-bold text-xs uppercase cursor-default">
                        <CheckCircle className="w-4 h-4" /> Rp 0 (BEBAS ONGKIR)
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="delivery"
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="p-6 space-y-6"
                  >
                    <div className="flex items-center gap-2 border-b-2 border-brand-black pb-3">
                      <Truck className="w-5 h-5 text-brand-orange" />
                      <h4 className="font-mono font-bold text-lg text-brand-black uppercase">Rincian Pengiriman</h4>
                    </div>
                    {shippingMethod === 'delivery' && (
                      <div className="pl-2 border-l-4 border-brand-orange space-y-3 pt-2">
                        {/* Store address has been moved to universal header */}

                        <div>
                          <Label className="font-mono text-sm font-bold">Jasa Kurir</Label>
                          <div className="mt-1 grid grid-cols-3 gap-2">
                            {['JNE', 'J&T', 'SiCepat', 'AnterAja', 'ID Express', 'Pos Indonesia'].map((courier) => (
                              <button
                                key={courier}
                                type="button"
                                onClick={() => setSelectedCourier(prev => prev === courier ? '' : courier)}
                                className={`px-2 py-2 text-xs font-mono font-bold border-2 transition-all ${selectedCourier === courier
                                  ? 'border-brand-orange bg-brand-orange/20 text-brand-black'
                                  : 'border-gray-300 bg-white text-gray-600 hover:border-brand-black'
                                  }`}
                              >
                                {courier}
                              </button>
                            ))}
                          </div>
                          <Input
                            value={!['JNE', 'J&T', 'SiCepat', 'AnterAja', 'ID Express', 'Pos Indonesia'].includes(selectedCourier) ? selectedCourier : ''}
                            onChange={(e) => setSelectedCourier(e.target.value)}
                            placeholder="Atau ketik jasa kurir lainnya..."
                            className="mt-2 border-2 border-brand-black rounded-none font-mono text-xs"
                          />
                        </div>

                        <div>
                          <Label className="font-mono text-sm font-bold">Biaya Ongkir (Rp)</Label>
                          <Input
                            type="number"
                            min={0}
                            value={shippingCost || ''}
                            onChange={(e) => setShippingCost(parseInt(e.target.value) || 0)}
                            placeholder="Masukkan biaya ongkir"
                            className="mt-1 border-2 border-brand-black rounded-none font-mono"
                          />
                        </div>
                        <a
                          href="https://cek-ongkir.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-mono font-bold text-blue-600 hover:text-blue-800 bg-blue-50 border-2 border-blue-200 px-3 py-2 hover:bg-blue-100 transition-colors"
                        >
                          <Truck className="w-4 h-4" />
                          Cek Ongkir di sini →
                        </a>
                        <p className="font-mono text-xs text-muted-foreground">
                          Cek ongkir, lalu masukkan biaya di kolom di atas.
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className="p-4 border-t-2 border-brand-black bg-white flex-shrink-0 space-y-3">
            <Button type="button" onClick={() => setIsShippingModalOpen(false)} className="w-full bg-brand-black text-white hover:bg-brand-black/90 font-bold rounded-none h-12 uppercase">
              Simpan Pengiriman
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Read-Only Map Picker Modal */}
      {activeStoreProfile?.address && (
        <MapPickerDialog
          open={isMapOpen}
          onOpenChange={setIsMapOpen}
          currentAddress={activeStoreProfile.address}
          currentLocation={(activeStoreProfile as any)?.settings?.location_lat && (activeStoreProfile as any)?.settings?.location_lng ? {
            lat: (activeStoreProfile as any).settings.location_lat,
            lng: (activeStoreProfile as any).settings.location_lng
          } : undefined}
          onSelectAddress={() => { }} // dummy
          readOnly={true}
        />
      )}
    </div>
  );
}
