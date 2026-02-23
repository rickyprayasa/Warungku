import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useWarungStore } from '@/lib/store-supabase';
import { supabase } from '@/lib/supabase';
import { useDemoMode } from '@/hooks/useDemoMode';

export type PlanType = 'free' | 'pro' | 'enterprise' | 'demo';

interface PlanLimits {
  maxProducts: number;
  maxTransactionsPerMonth: number;
  canExport: boolean;
  canAccessReports: boolean;
  canMultiUser: boolean;
  showWatermark: boolean;
  canAccessAnalytics: boolean;
  canUseQris: boolean;
  canUseCustomDomain: boolean;
  maxStores: number;
}

const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    maxProducts: 50,
    maxTransactionsPerMonth: 100,
    canExport: false,
    canAccessReports: true,
    canMultiUser: false,
    showWatermark: true,
    canAccessAnalytics: false,
    canUseQris: false,
    canUseCustomDomain: false,
    maxStores: 1,
  },
  demo: {
    maxProducts: 20,
    maxTransactionsPerMonth: 50,
    canExport: false,
    canAccessReports: false,
    canMultiUser: false,
    showWatermark: true,
    canAccessAnalytics: false,
    canUseQris: false,
    canUseCustomDomain: false,
    maxStores: 1,
  },
  pro: {
    maxProducts: 500,
    maxTransactionsPerMonth: 2000,
    canExport: true,
    canAccessReports: true,
    canMultiUser: true,
    showWatermark: false,
    canAccessAnalytics: true,
    canUseQris: true,
    canUseCustomDomain: true,
    maxStores: 3,
  },
  enterprise: {
    maxProducts: Infinity,
    maxTransactionsPerMonth: Infinity,
    canExport: true,
    canAccessReports: true,
    canMultiUser: true,
    showWatermark: false,
    canAccessAnalytics: true,
    canUseQris: true,
    canUseCustomDomain: true,
    maxStores: Infinity,
  },
};

interface PlanContextType {
  plan: PlanType;
  effectivePlan: PlanType;
  limits: PlanLimits;
  currentProductCount: number;
  currentMonthTransactionCount: number;
  canAddProduct: boolean;
  canAddTransaction: boolean;
  productLimitReached: boolean;
  transactionLimitReached: boolean;
  productUsagePercent: number;
  transactionUsagePercent: number;
  isFreePlan: boolean;
  isPaidPlan: boolean;
  isTrialActive: boolean;
  trialEndsAt: Date | null;
  daysRemainingInTrial: number | null;
  refreshPlan: () => void;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { store, isAuthenticated } = useAuth();
  const products = useWarungStore((state) => state.products);
  const sales = useWarungStore((state) => state.sales);
  const { isDemo } = useDemoMode();

  // Add a state to force refresh of the plan
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Trial status state
  const [trialStatus, setTrialStatus] = useState<{
    isTrialActive: boolean;
    trialEndsAt: Date | null;
    daysRemainingInTrial: number | null;
  }>({
    isTrialActive: false,
    trialEndsAt: null,
    daysRemainingInTrial: null,
  });

  const plan = useMemo((): PlanType => {
    if (!isAuthenticated || !store) {
      // Not logged in - assume enterprise (no restrictions for public view)
      return 'enterprise';
    }

    if (isDemo) {
      return 'pro';
    }

    const storePlan = (store as any)?.plan as string | undefined;

    if (storePlan && ['free', 'pro', 'enterprise', 'demo'].includes(storePlan)) {
      return storePlan as PlanType;
    }

    // No plan set - default to free for new stores
    return 'free';
  }, [isAuthenticated, store, refreshTrigger, isDemo]);

  // Calculate effective plan (pro during trial)
  const effectivePlan = useMemo((): PlanType => {
    // Only return 'pro' if trial is active AND not expired
    if (trialStatus.isTrialActive &&
      trialStatus.daysRemainingInTrial !== null &&
      trialStatus.daysRemainingInTrial > 0) {
      return 'pro'; // Trial users get pro features
    }
    return plan;
  }, [plan, trialStatus.isTrialActive, trialStatus.daysRemainingInTrial]);

  const refreshPlan = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Optional: Add polling to check for plan changes
  // This checks if the plan has changed in the database and refreshes if needed
  useEffect(() => {
    if (!isAuthenticated || !store?.id) return;

    const interval = setInterval(async () => {
      try {
        // Fetch the current plan from the database to check if it has changed
        const { data, error } = await supabase
          .from('stores')
          .select('plan')
          .eq('id', store.id)
          .single();

        if (error) {
          console.error('Error fetching store plan for refresh check:', error);
          return;
        }

        // If the plan in DB is different from current plan, refresh
        if (data?.plan && data.plan !== store.plan) {
          console.log(`Plan changed from ${store.plan} to ${data.plan}, refreshing...`);
          // We can't directly update the store here, but we can refresh the plan context
          refreshPlan();
        }
      } catch (err) {
        console.error('Error in plan refresh check:', err);
      }
    }, 300000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, store?.id, store?.plan, refreshPlan]);

  // Fetch trial status from database
  useEffect(() => {
    const fetchTrialStatus = async () => {
      if (!isAuthenticated || !store?.id || isDemo) {
        setTrialStatus({
          isTrialActive: false,
          trialEndsAt: null,
          daysRemainingInTrial: null,
        });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('stores')
          .select('is_trial_active, trial_ends_at')
          .eq('id', store.id)
          .single();

        if (error) {
          console.error('[PlanContext] Error fetching trial status:', error);
          return;
        }

        let isTrialActive = data?.is_trial_active || false;
        const trialEndsAt = data?.trial_ends_at ? new Date(data.trial_ends_at) : null;

        // Calculate days remaining
        let daysRemainingInTrial = null;
        if (isTrialActive && trialEndsAt) {
          const now = new Date();
          const diffTime = trialEndsAt.getTime() - now.getTime();
          daysRemainingInTrial = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // If trial has ended, set to 0 and deactivate
          if (daysRemainingInTrial <= 0) {
            daysRemainingInTrial = 0;

            // Auto-expire trial in DB if currently active
            if (isTrialActive) {
              console.log('[PlanContext] Trial expired, deactivating in DB...');
              supabase
                .from('stores')
                .update({ is_trial_active: false })
                .eq('id', store.id)
                .then(({ error }) => {
                  if (error) console.error('Failed to deactivate expired trial:', error);
                });

              // Deactivate locally
              isTrialActive = false;
            }
          }
        }

        setTrialStatus({
          isTrialActive,
          trialEndsAt,
          daysRemainingInTrial,
        });
      } catch (err) {
        console.error('[PlanContext] Error in trial status fetch:', err);
      }
    };

    fetchTrialStatus();
  }, [isAuthenticated, store?.id, isDemo]);

  const limits = PLAN_LIMITS[effectivePlan];

  const currentProductCount = products.length;

  // Count transactions for current month
  const currentMonthTransactionCount = useMemo(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    return sales.filter(sale => sale.createdAt >= startOfMonth).length;
  }, [sales]);

  const canAddProduct = currentProductCount < limits.maxProducts;
  const canAddTransaction = currentMonthTransactionCount < limits.maxTransactionsPerMonth;

  const productLimitReached = currentProductCount >= limits.maxProducts;
  const transactionLimitReached = currentMonthTransactionCount >= limits.maxTransactionsPerMonth;

  const productUsagePercent = limits.maxProducts === Infinity
    ? 0
    : Math.min(100, (currentProductCount / limits.maxProducts) * 100);

  const transactionUsagePercent = limits.maxTransactionsPerMonth === Infinity
    ? 0
    : Math.min(100, (currentMonthTransactionCount / limits.maxTransactionsPerMonth) * 100);

  const isFreePlan = plan === 'free' || plan === 'demo';
  const isPaidPlan = plan === 'pro' || plan === 'enterprise';

  const value: PlanContextType = {
    plan,
    effectivePlan,
    limits,
    currentProductCount,
    currentMonthTransactionCount,
    canAddProduct,
    canAddTransaction,
    productLimitReached,
    transactionLimitReached,
    productUsagePercent,
    transactionUsagePercent,
    isFreePlan,
    isPaidPlan,
    isTrialActive: trialStatus.isTrialActive,
    trialEndsAt: trialStatus.trialEndsAt,
    daysRemainingInTrial: trialStatus.daysRemainingInTrial,
    refreshPlan,
  };

  return (
    <PlanContext.Provider value={value}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan() {
  const context = useContext(PlanContext);
  if (context === undefined) {
    throw new Error('usePlan must be used within a PlanProvider');
  }
  return context;
}
