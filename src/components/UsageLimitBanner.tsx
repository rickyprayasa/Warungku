import { usePlan } from '@/contexts/PlanContext';
import { AlertTriangle, TrendingUp, Gift, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { UpgradeDialog } from './UpgradeDialog';
import { Progress } from '@/components/ui/progress';

export function UsageLimitBanner() {
  const {
    isFreePlan,
    isTrialActive,
    daysRemainingInTrial,
    productUsagePercent,
    transactionUsagePercent,
    productLimitReached,
    transactionLimitReached,
    limits,
    currentProductCount,
    currentMonthTransactionCount
  } = usePlan();

  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [upgradeTrigger, setUpgradeTrigger] = useState<'product_limit' | 'transaction_limit' | 'general'>('general');

  // Trial users - don't show banner in content (already shown in sidebar)
  if (isTrialActive && daysRemainingInTrial !== null && daysRemainingInTrial > 0) {
    return null;
  }

  // Trial expired warning
  if (isTrialActive && daysRemainingInTrial === 0) {
    return (
      <div className="bg-red-50 border-b-2 border-brand-black px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="font-mono text-sm font-bold text-red-800">
                Trial Berakhir
              </span>
            </div>

            <div className="flex-1">
              <p className="text-sm font-mono text-red-700">
                Masa trial Anda telah berakhir. Upgrade untuk tetap menikmati fitur Pro.
              </p>
            </div>

            <button
              onClick={() => setUpgradeOpen(true)}
              className="shrink-0 flex items-center gap-2 px-4 py-2 bg-brand-orange text-brand-black font-mono text-sm font-bold border-2 border-brand-black hover:shadow-hard-sm transition-all"
            >
              <TrendingUp className="w-4 h-4" />
              Upgrade
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!isFreePlan) {
    return null;
  }

  const showProductWarning = productUsagePercent >= 80;
  const showTransactionWarning = transactionUsagePercent >= 80;

  if (!showProductWarning && !showTransactionWarning) {
    return null;
  }

  const handleUpgrade = (trigger: 'product_limit' | 'transaction_limit') => {
    setUpgradeTrigger(trigger);
    setUpgradeOpen(true);
  };

  return (
    <>
      <div className="bg-amber-50 border-b-2 border-brand-black px-4 py-3">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex items-center gap-2 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
              <span className="font-mono text-sm font-bold text-amber-800">
                Batas Penggunaan
              </span>
            </div>

            <div className="flex-1 grid md:grid-cols-2 gap-4">
              {showProductWarning && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span>Produk</span>
                    <span className={productLimitReached ? 'text-red-600 font-bold' : ''}>
                      {currentProductCount}/{limits.maxProducts}
                    </span>
                  </div>
                  <Progress
                    value={productUsagePercent}
                    className="h-2"
                  />
                </div>
              )}

              {showTransactionWarning && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span>Transaksi Bulan Ini</span>
                    <span className={transactionLimitReached ? 'text-red-600 font-bold' : ''}>
                      {currentMonthTransactionCount}/{limits.maxTransactionsPerMonth}
                    </span>
                  </div>
                  <Progress
                    value={transactionUsagePercent}
                    className="h-2"
                  />
                </div>
              )}
            </div>

            <button
              onClick={() => handleUpgrade(productLimitReached ? 'product_limit' : 'transaction_limit')}
              className="shrink-0 flex items-center gap-2 px-4 py-2 bg-brand-orange text-brand-black font-mono text-sm font-bold border-2 border-brand-black hover:shadow-hard-sm transition-all"
            >
              <TrendingUp className="w-4 h-4" />
              Upgrade
            </button>
          </div>
        </div>
      </div>

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        trigger={upgradeTrigger}
      />
    </>
  );
}
