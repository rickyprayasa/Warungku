import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useWarungStore } from '@/lib/store-supabase';
import { supabase } from '@/lib/supabase';

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
    maxStores: Infinity,
  },
};

interface PlanContextType {
  plan: PlanType;
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
  refreshPlan: () => void;
}

const PlanContext = createContext<PlanContextType | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const { store, isAuthenticated } = useAuth();
  const products = useWarungStore((state) => state.products);
  const sales = useWarungStore((state) => state.sales);

  // Add a state to force refresh of the plan
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const plan = useMemo((): PlanType => {
    if (!isAuthenticated || !store) {
      // Not logged in - assume enterprise (no restrictions for public view)
      return 'enterprise';
    }

    const storePlan = (store as any)?.plan as string | undefined;

    if (storePlan && ['free', 'pro', 'enterprise', 'demo'].includes(storePlan)) {
      return storePlan as PlanType;
    }

    // No plan set - default to free for new stores
    return 'free';
  }, [isAuthenticated, store, refreshTrigger]); // Add refreshTrigger to dependency array

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

  const limits = PLAN_LIMITS[plan];

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
