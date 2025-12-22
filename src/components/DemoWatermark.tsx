import { usePlan } from '@/contexts/PlanContext';
import { Crown } from 'lucide-react';
import { useState } from 'react';
import { UpgradeDialog } from './UpgradeDialog';

export function DemoWatermark() {
  const { plan, limits, isFreePlan } = usePlan();
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  if (!limits.showWatermark) {
    return null;
  }

  // Don't show watermark for paid plans
  if (!isFreePlan) {
    return null;
  }

  const planLabel = plan === 'demo' ? 'DEMO' : 'TRIAL';

  return (
    <>
      <div className="fixed bottom-20 md:bottom-4 left-4 z-40">
        <button
          onClick={() => setUpgradeOpen(true)}
          className="group flex items-center gap-2 px-3 py-2 bg-brand-orange/90 backdrop-blur-sm border-2 border-brand-black shadow-hard-sm hover:shadow-hard transition-all cursor-pointer"
        >
          <Crown className="w-4 h-4 text-brand-black" />
          <span className="font-mono text-xs font-bold text-brand-black">
            MODE {planLabel}
          </span>
          <span className="hidden group-hover:inline font-mono text-xs text-brand-black/70">
            • Klik untuk upgrade
          </span>
        </button>
      </div>

      <UpgradeDialog
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
        trigger="general"
      />
    </>
  );
}
