import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, Zap, Check, Loader2 } from 'lucide-react';
import { usePlan } from '@/contexts/PlanContext';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

interface PlanUpgradePromptProps {
  open: boolean;
  onClose: () => void;
  feature: 'products' | 'transactions' | 'export' | 'analytics' | 'qris' | 'multiuser' | 'stores';
  title?: string;
  description?: string;
}

interface DatabasePlan {
  name: string;
  price: number;
  yearly_price: number;
}

const FEATURE_MESSAGES = {
  products: {
    title: 'Batas Produk Tercapai',
    description: 'Anda telah mencapai batas maksimum produk untuk plan saat ini.',
    feature: 'Buat Produk Unlimited',
  },
  transactions: {
    title: 'Batas Transaksi Bulanan Tercapai',
    description: 'Anda telah mencapai batas transaksi bulanan untuk plan saat ini.',
    feature: 'Transaksi Tanpa Batas',
  },
  export: {
    title: 'Fitur Export Tidak Tersedia',
    description: 'Fitur export data hanya tersedia untuk plan Pro dan Enterprise.',
    feature: 'Export Data ke Excel/CSV',
  },
  analytics: {
    title: 'Analytics Tidak Tersedia',
    description: 'Fitur analytics dan laporan detail hanya tersedia untuk plan Pro dan Enterprise.',
    feature: 'Analytics & Laporan Detail',
  },
  qris: {
    title: 'QRIS Payment Tidak Tersedia',
    description: 'Fitur pembayaran QRIS hanya tersedia untuk plan Pro dan Enterprise.',
    feature: 'Terima Pembayaran QRIS',
  },
  multiuser: {
    title: 'Multi-User Tidak Tersedia',
    description: 'Fitur multi-user untuk kelola tim hanya tersedia untuk plan Pro dan Enterprise.',
    feature: 'Kelola Tim & Multi-User',
  },
  stores: {
    title: 'Batas Toko Tercapai',
    description: 'Anda telah mencapai batas maksimum toko untuk plan saat ini.',
    feature: 'Kelola Multiple Toko',
  },
};

export function PlanUpgradePrompt({ open, onClose, feature, title, description }: PlanUpgradePromptProps) {
  const { plan, limits, currentProductCount, currentMonthTransactionCount, productUsagePercent, transactionUsagePercent } = usePlan();
  const navigate = useNavigate();
  const [proPlan, setProPlan] = useState<DatabasePlan | null>(null);

  // Fetch Pro plan price when dialog opens
  useEffect(() => {
    if (open) {
      fetchProPlan();
    }
  }, [open]);

  const fetchProPlan = async () => {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('name, price, yearly_price')
        .eq('name', 'Pro')
        .eq('is_active', true)
        .single();

      if (!error && data) {
        setProPlan(data);
      }
    } catch (error) {
      console.error('Error fetching Pro plan:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const messages = FEATURE_MESSAGES[feature];
  const displayTitle = title || messages.title;
  const displayDescription = description || messages.description;

  const handleUpgrade = () => {
    onClose();
    navigate('/upgrade');
  };

  const handleKeepPlan = () => {
    onClose();
  };

  const getPlanLabel = (planType: string) => {
    switch (planType) {
      case 'free': return 'Free';
      case 'pro': return 'Pro';
      case 'enterprise': return 'Enterprise';
      default: return planType;
    }
  };

  const getPlanColor = (planType: string) => {
    switch (planType) {
      case 'free': return 'bg-gray-500 text-white';
      case 'pro': return 'bg-purple-500 text-white';
      case 'enterprise': return 'bg-brand-orange text-brand-black';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="border-4 border-brand-black rounded-none max-w-lg">
        <DialogHeader className="border-b-2 border-brand-black pb-4">
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            <Lock className="w-6 h-6 text-brand-orange" />
            {displayTitle}
          </DialogTitle>
          <DialogDescription className="font-mono text-sm mt-2">
            {displayDescription}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Current Plan Badge */}
          <div className="flex items-center justify-between p-3 bg-gray-50 border-2 border-gray-200">
            <span className="font-mono text-sm text-gray-700">Plan Saat Ini:</span>
            <Badge className={`rounded-none font-mono uppercase text-xs ${getPlanColor(plan)}`}>
              {getPlanLabel(plan)}
            </Badge>
          </div>

          {/* Usage Stats (for products/transactions) */}
          {(feature === 'products' || feature === 'transactions') && (
            <div className="p-3 bg-brand-orange/10 border-2 border-brand-orange">
              <div className="flex justify-between items-center mb-2">
                <span className="font-mono text-sm font-bold text-brand-black">
                  {feature === 'products' ? 'Penggunaan Produk' : 'Transaksi Bulan Ini'}
                </span>
                <span className="font-mono text-xs text-brand-black">
                  {feature === 'products'
                    ? `${currentProductCount} / ${limits.maxProducts === Infinity ? '∞' : limits.maxProducts}`
                    : `${currentMonthTransactionCount} / ${limits.maxTransactionsPerMonth === Infinity ? '∞' : limits.maxTransactionsPerMonth}`
                  }
                </span>
              </div>
              <div className="w-full bg-gray-200 border-2 border-brand-black rounded-none h-3">
                <div
                  className="bg-brand-orange h-full transition-all"
                  style={{ width: `${feature === 'products' ? productUsagePercent : transactionUsagePercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Upgrade Benefits */}
          <div className="p-4 bg-purple-50 border-2 border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-600" />
                <span className="font-mono font-bold text-purple-800">Upgrade ke Pro</span>
              </div>
              {proPlan ? (
                <div className="text-right">
                  <p className="text-lg font-bold font-mono text-purple-600">
                    {formatCurrency(proPlan.price)}
                    <span className="text-sm font-normal">/bulan</span>
                  </p>
                  {proPlan.yearly_price > 0 && (
                    <p className="text-xs font-mono text-green-600">
                      atau {formatCurrency(proPlan.yearly_price)}/tahun
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                </div>
              )}
            </div>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="font-mono text-sm text-purple-700">
                  {feature === 'products' && 'Hingga 500 produk'}
                  {feature === 'transactions' && 'Hingga 2.000 transaksi/bulan'}
                  {feature === 'export' && 'Export data ke Excel/CSV'}
                  {feature === 'analytics' && 'Analytics & laporan detail'}
                  {feature === 'qris' && 'Terima pembayaran QRIS'}
                  {feature === 'multiuser' && 'Tambah hingga 5 team member'}
                  {feature === 'stores' && 'Kelola hingga 3 toko'}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                <span className="font-mono text-sm text-purple-700">
                  {feature === 'products' && '2.000 transaksi/bulan'}
                  {feature === 'transactions' && '500 produk'}
                  {feature === 'export' && 'Analytics lengkap'}
                  {feature === 'analytics' && 'Export data'}
                  {feature === 'qris' && 'Analytics & export data'}
                  {feature === 'multiuser' && 'Multi-store management'}
                  {feature === 'stores' && 'Multi-user team management'}
                </span>
              </li>
            </ul>
          </div>

          {/* Enterprise CTA */}
          <div className="p-4 bg-brand-orange/10 border-2 border-brand-orange">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-brand-orange" />
              <span className="font-mono font-bold text-brand-black">Enterprise?</span>
            </div>
            <p className="font-mono text-xs text-brand-black mb-0">
              Unlimited semua fitur dengan priority support. Hubungi kami untuk penawaran khusus.
            </p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 border-t-2 border-brand-black pt-4">
          <Button
            onClick={handleKeepPlan}
            variant="outline"
            className="flex-1 rounded-none border-2 border-brand-black font-mono"
          >
            Tetap Free
          </Button>
          <Button
            onClick={handleUpgrade}
            className="flex-1 bg-brand-orange text-brand-black hover:bg-brand-black hover:text-brand-white border-2 border-brand-black rounded-none font-mono font-bold uppercase"
          >
            <Crown className="w-4 h-4 mr-2" />
            Upgrade Sekarang
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
