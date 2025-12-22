import { createContext, useContext, useMemo, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useWarungStore } from '@/lib/store-supabase';

export type PlanType = 'demo' | 'trial' | 'basic' | 'pro' | 'enterprise';

interface PlanLimits {
  maxProducts: number;
  maxTransactionsPerMonth: number;
  canExport: boolean;
  canAccessReports: boolean;
  canMultiUser: boolean;
  showWatermark: boolean;
}

const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  demo: {
    maxProducts: 20,
    maxTransactionsPerMonth: 50,
    canExport: false,
    canAccessReports: false,
    canMultiUser: false,
    showWatermark: true,
  },
  trial: {
    maxProducts: 20,
    maxTransactionsPerMonth: 50,
    canExport: false,
    canAccessReports: true,
    canMultiUser: false,
    showWatermark: true,
  },
  basic: {
    maxProducts: 100,
    maxTransactionsPerMonth: 500,
    canExport: true,
    canAccessReports: true,
    canMultiUser: false,
    showWatermark: false,
  },
  pro: {
    maxProducts: 1000,
    maxTransactionsPerMonth: 5000,
    canExport: true,
    canAccessReports: true,
    canMultiUser: true,
    showWatermark: false,
  },
  enterprise: {
    maxProducts: Infinity,
    maxTransactionsPerMonth: Infinity,
    canExport: true,
    canAccessReports: true,
    canMultiUser: true,
    showWatermark: false,
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

    if (storePlan && ['demo', 'trial', 'basic', 'pro', 'enterprise'].includes(storePlan)) {
      return storePlan as PlanType;
    }

    // No plan set - assume paid/enterprise (existing stores before plan feature)
    return 'enterprise';
  }, [isAuthenticated, store, refreshTrigger]); // Add refreshTrigger to dependency array

  const refreshPlan = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Optional: Add polling to check for plan changes (disabled by default)
  // This would refresh the plan periodically to catch changes made in admin panel
  useEffect(() => {
    if (!isAuthenticated || !store?.id) return;

    const interval = setInterval(() => {
      // In a real implementation, you might want to check if the plan has changed
      // For now, we'll just keep this as a mechanism that can be enabled if needed
    }, 300000); // Check every 5 minutes

    return () => clearInterval(interval);
  }, [isAuthenticated, store?.id]);

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

  const isFreePlan = plan === 'demo' || plan === 'trial';
  const isPaidPlan = plan === 'basic' || plan === 'pro' || plan === 'enterprise';

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
