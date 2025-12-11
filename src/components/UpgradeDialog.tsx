import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { usePlan } from '@/contexts/PlanContext';
import { Crown, Check, Mail, MessageCircle, Zap, Package, BarChart3, Users, Download } from 'lucide-react';

interface UpgradeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: 'product_limit' | 'transaction_limit' | 'export' | 'general';
}

const CONTACT_EMAIL = 'cs.kontak@rsquareidea.my.id';
const WHATSAPP_NUMBER = '6281234567890'; // Ganti dengan nomor WA yang benar

const plans = [
  {
    name: 'Basic',
    price: 'Rp 99.000',
    period: '/bulan',
    features: [
      '100 Produk',
      '500 Transaksi/bulan',
      'Export Data',
      'Laporan Lengkap',
    ],
    recommended: false,
  },
  {
    name: 'Pro',
    price: 'Rp 199.000',
    period: '/bulan',
    features: [
      '1.000 Produk',
      '5.000 Transaksi/bulan',
      'Export Data',
      'Laporan Lengkap',
      'Multi User',
      'Priority Support',
    ],
    recommended: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    features: [
      'Unlimited Produk',
      'Unlimited Transaksi',
      'Semua Fitur Pro',
      'Custom Integration',
      'Dedicated Support',
    ],
    recommended: false,
  },
];

export function UpgradeDialog({ open, onOpenChange, trigger = 'general' }: UpgradeDialogProps) {
  const { plan, limits, currentProductCount, currentMonthTransactionCount } = usePlan();

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

          {/* Plans */}
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
                  <span className="font-bold text-2xl">{p.price}</span>
                  <span className="font-mono text-sm text-muted-foreground">{p.period}</span>
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
