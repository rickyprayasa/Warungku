import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { usePlan } from '@/contexts/PlanContext';
import { Crown, Check, Mail, MessageCircle, Zap, Package, BarChart3, Users, Download, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: 'product_limit' | 'transaction_limit' | 'export' | 'general';
}

const CONTACT_EMAIL = 'cs.kontak@rsquareidea.my.id';
const WHATSAPP_NUMBER = '6281234567890'; // Ganti dengan nomor WA yang benar

interface DatabasePlan {
  id: string;
  name: string;
  description: string;
  price: number;
  yearly_price: number;
  duration_days: number;
  features: string[];
  is_active: boolean;
  plan_type: string;
  max_products?: number;
  max_users?: number;
}

interface DisplayPlan {
  name: string;
  price: string;
  period: string;
  features: string[];
  recommended: boolean;
  monthlyPrice: number;
  yearlyPrice: number;
}

export function UpgradeDialog({ open, onOpenChange, trigger = 'general' }: UpgradeDialogProps) {
  const { plan, limits, currentProductCount, currentMonthTransactionCount } = usePlan();
  const [plans, setPlans] = useState<DisplayPlan[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pricePeriod, setPricePeriod] = useState<'monthly' | 'yearly'>('monthly');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const fetchPlans = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .in('name', ['Free', 'Pro', 'Enterprise'])
        .eq('is_active', true);

      if (error) throw error;

      // Map database plans to display format
      const displayPlans: DisplayPlan[] = (data || []).map((dbPlan: DatabasePlan) => ({
        name: dbPlan.name,
        price: dbPlan.price === 0 ? 'Gratis' : formatCurrency(dbPlan.price),
        period: dbPlan.price === 0 ? '' : '/bulan',
        features: dbPlan.features || [],
        recommended: dbPlan.plan_type === 'pro',
        monthlyPrice: dbPlan.price,
        yearlyPrice: dbPlan.yearly_price || 0,
      }));

      setPlans(displayPlans);
    } catch (error) {
      console.error('Error fetching plans:', error);
      // Fallback to default plans if fetch fails
      setPlans([
        {
          name: 'Free',
          price: 'Gratis',
          period: '',
          features: ['50 Produk', '100 Transaksi/bulan', 'Laporan Dasar'],
          recommended: false,
          monthlyPrice: 0,
          yearlyPrice: 0,
        },
        {
          name: 'Pro',
          price: 'Rp 199.000',
          period: '/bulan',
          features: [
            '500 Produk',
            '2.000 Transaksi/bulan',
            'Export Data (CSV/Excel)',
            'Analytics Lengkap',
            'Pembayaran QRIS',
            'Multi-User (5 team)',
            'Hingga 3 Toko',
            'Priority Support',
          ],
          recommended: true,
          monthlyPrice: 199000,
          yearlyPrice: 500000,
        },
        {
          name: 'Enterprise',
          price: 'Custom',
          period: '',
          features: [
            'Unlimited Produk',
            'Unlimited Transaksi',
            'Export Data',
            'Analytics Lengkap',
            'Pembayaran QRIS',
            'Multi-User Unlimited',
            'Multiple Toko Unlimited',
            'Custom Integration',
            'Dedicated Support',
          ],
          recommended: false,
          monthlyPrice: 0,
          yearlyPrice: 0,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty deps as fetchPlans doesn't depend on any external values

  // Fetch plans from database when dialog opens
  useEffect(() => {
    if (open) {
      fetchPlans();
    }
  }, [open, fetchPlans]);

  const getTriggerMessage = () => {
    switch (trigger) {
      case 'product_limit':
        return `Anda telah mencapai batas ${limits.maxProducts} produk. Upgrade untuk menambah lebih banyak produk.`;
      case 'transaction_limit':
        return `Anda telah mencapai batas ${limits.maxTransactionsPerMonth} transaksi bulan ini. Upgrade untuk transaksi tanpa batas.`;
      case 'export':
        return 'Fitur export data hanya tersedia untuk paket berbayar. Upgrade sekarang!';
      default:
        return 'Tingkatkan paket Anda untuk akses fitur lengkap dan tanpa batasan.';
    }
  };

  const handleContactEmail = () => {
    const subject = encodeURIComponent('Upgrade Paket Omzetin');
    const body = encodeURIComponent(`Halo Tim Omzetin,

Saya tertarik untuk upgrade paket aplikasi Omzetin.

Informasi akun:
- Paket saat ini: ${plan}
- Jumlah produk: ${currentProductCount}
- Transaksi bulan ini: ${currentMonthTransactionCount}

Mohon informasi lebih lanjut mengenai paket yang tersedia.

Terima kasih.`);
    
    window.open(`mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`, '_blank');
  };

  const handleContactWhatsApp = () => {
    const message = encodeURIComponent(`Halo, saya tertarik untuk upgrade paket Omzetin.

Paket saat ini: ${plan}
Jumlah produk: ${currentProductCount}
Transaksi bulan ini: ${currentMonthTransactionCount}

Mohon info lebih lanjut.`);
    
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto rounded-none border-4 border-brand-black bg-brand-white p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-10 h-10 bg-brand-orange border-2 border-brand-black flex items-center justify-center">
              <Crown className="w-5 h-5 text-brand-black" />
            </div>
            <DialogTitle className="font-display text-2xl font-bold">Upgrade Paket</DialogTitle>
          </div>
          <DialogDescription className="font-mono text-sm">
            {getTriggerMessage()}
          </DialogDescription>
        </DialogHeader>

        <div className="p-6">
          {/* Current Usage */}
          <div className="mb-6 p-4 bg-muted/50 border-2 border-brand-black">
            <p className="font-mono text-xs text-muted-foreground mb-2">PENGGUNAAN SAAT INI</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="font-mono text-sm">Produk</p>
                <p className="font-bold text-lg">{currentProductCount} / {limits.maxProducts === Infinity ? '∞' : limits.maxProducts}</p>
              </div>
              <div>
                <p className="font-mono text-sm">Transaksi Bulan Ini</p>
                <p className="font-bold text-lg">{currentMonthTransactionCount} / {limits.maxTransactionsPerMonth === Infinity ? '∞' : limits.maxTransactionsPerMonth}</p>
              </div>
            </div>
          </div>

          {/* Price Period Toggle */}
          <div className="mb-6 flex items-center justify-center gap-3 p-3 bg-muted/30 border-2 border-brand-black">
            <span className={`font-mono text-sm ${pricePeriod === 'monthly' ? 'font-bold' : 'text-muted-foreground'}`}>
              Bulanan
            </span>
            <Switch
              checked={pricePeriod === 'yearly'}
              onCheckedChange={(checked) => setPricePeriod(checked ? 'yearly' : 'monthly')}
            />
            <span className={`font-mono text-sm ${pricePeriod === 'yearly' ? 'font-bold' : 'text-muted-foreground'}`}>
              Tahunan
              <span className="ml-1 text-xs text-green-600 font-bold">(Hemat 20%)</span>
            </span>
          </div>

          {/* Plans */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
              <span className="ml-3 font-mono text-sm text-muted-foreground">Memuat paket...</span>
            </div>
          ) : (
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {plans.map((p) => (
              <div
                key={p.name}
                className={`relative p-4 border-2 border-brand-black ${
                  p.recommended ? 'bg-brand-orange/10 shadow-hard-sm' : 'bg-white'
                }`}
              >
                {p.recommended && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-mono text-xs">
                    RECOMMENDED
                  </Badge>
                )}
                <h3 className="font-display font-bold text-lg mb-1">{p.name}</h3>
                <div className="mb-4">
                  {p.name === 'Enterprise' ? (
                    <span className="font-bold text-2xl">Custom</span>
                  ) : p.monthlyPrice === 0 ? (
                    <span className="font-bold text-2xl">Gratis</span>
                  ) : pricePeriod === 'monthly' ? (
                    <>
                      <span className="font-bold text-2xl">{formatCurrency(p.monthlyPrice)}</span>
                      <span className="font-mono text-sm text-muted-foreground">/bulan</span>
                    </>
                  ) : (
                    <>
                      <span className="font-bold text-2xl">{formatCurrency(p.yearlyPrice)}</span>
                      <span className="font-mono text-sm text-muted-foreground">/tahun</span>
                    </>
                  )}
                </div>
                <ul className="space-y-2">
                  {p.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm font-mono">
                      <Check className="w-4 h-4 text-green-600 shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            </div>
          )}

          {/* Features comparison */}
          <div className="mb-6 p-4 border-2 border-dashed border-brand-black/30">
            <p className="font-mono text-xs text-muted-foreground mb-3">FITUR PAKET BERBAYAR</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-brand-orange" />
                <span className="text-sm font-mono">Lebih Banyak Produk</span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-brand-orange" />
                <span className="text-sm font-mono">Transaksi Unlimited</span>
              </div>
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-brand-orange" />
                <span className="text-sm font-mono">Export Data</span>
              </div>
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-brand-orange" />
                <span className="text-sm font-mono">Laporan Lengkap</span>
              </div>
            </div>
          </div>

          {/* Contact buttons */}
          <div className="space-y-3">
            <p className="font-mono text-sm text-center text-muted-foreground">
              Hubungi kami untuk upgrade atau konsultasi
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleContactEmail}
                className="flex-1 h-12 bg-brand-black text-brand-white hover:bg-brand-black/90 rounded-none border-2 border-brand-black font-mono font-bold"
              >
                <Mail className="w-4 h-4 mr-2" />
                Email: {CONTACT_EMAIL}
              </Button>
              <Button
                onClick={handleContactWhatsApp}
                className="flex-1 h-12 bg-green-500 text-white hover:bg-green-600 rounded-none border-2 border-brand-black font-mono font-bold"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook untuk mudah trigger upgrade dialog
export function useUpgradeDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [trigger, setTrigger] = useState<UpgradeDialogProps['trigger']>('general');

  const openUpgrade = (triggerType: UpgradeDialogProps['trigger'] = 'general') => {
    setTrigger(triggerType);
    setIsOpen(true);
  };

  const closeUpgrade = () => {
    setIsOpen(false);
  };

  return {
    isOpen,
    trigger,
    openUpgrade,
    closeUpgrade,
    setIsOpen,
  };
}
