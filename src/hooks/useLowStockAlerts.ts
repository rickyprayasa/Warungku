import { useMemo } from 'react';
import { useWarungStore } from '@/lib/store';
import { getLowDSLProducts } from '@/lib/stock-analysis';

export function useLowStockAlerts() {
  const products = useWarungStore((state) => state.products);
  const sales = useWarungStore((state) => state.sales);

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

  // Calculate low DSL products (products that will run out of stock soon based on sales velocity)
  const lowDSLProducts = useMemo(() => {
    // Use the getLowDSLProducts function from stock analysis
    return getLowDSLProducts(products, sales, 30, 10); // Last 30 days, top 10
  }, [products, sales]);

  return {
    lowStockProducts,
    outOfStockProducts,
    criticalStockProducts,
    lowDSLProducts, // Add DSL products to the return object
    totalAlerts: lowStockProducts.length + outOfStockProducts.length + lowDSLProducts.length,
    hasCritical: criticalStockProducts.length > 0 || outOfStockProducts.length > 0,
  };
}
