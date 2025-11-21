import { useMemo } from 'react';
import { useWarungStore } from '@/lib/store';

export function useLowStockAlerts() {
  const products = useWarungStore((state) => state.products);

  const lowStockProducts = useMemo(() => {
    return products.filter((p) => {
      const stock = p.totalStock || 0;
      const minLevel = p.minStockLevel || 10;
      return p.isActive !== false && stock > 0 && stock <= minLevel;
    });
  }, [products]);

  const outOfStockProducts = useMemo(() => {
    return products.filter((p) => p.isActive !== false && (p.totalStock || 0) === 0);
  }, [products]);

  const criticalStockProducts = useMemo(() => {
    return products.filter((p) => {
      const stock = p.totalStock || 0;
      const minLevel = p.minStockLevel || 10;
      return p.isActive !== false && stock > 0 && stock <= Math.ceil(minLevel * 0.3); // 30% of min level
    });
  }, [products]);

  return {
    lowStockProducts,
    outOfStockProducts,
    criticalStockProducts,
    totalAlerts: lowStockProducts.length + outOfStockProducts.length,
    hasCritical: criticalStockProducts.length > 0 || outOfStockProducts.length > 0,
  };
}
