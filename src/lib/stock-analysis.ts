import type { Product, Sale } from '@shared/types';
import { differenceInDays } from 'date-fns';

/**
 * Hitung Hari Sampai Stok Habis untuk suatu produk berdasarkan kecepatan penjualan
 * @param product - Produk yang dianalisis
 * @param sales - Semua catatan penjualan
 * @param daysToAnalyze - Jumlah hari untuk melihat data penjualan (default: 30)
 * @returns Hari Sampai Stok Habis atau null jika data tidak cukup
 */
export function calculateDSL(product: Product, sales: Sale[], daysToAnalyze: number = 30): number | null {
  return calculateHariHabisStok(product, sales, daysToAnalyze);
}

// Internal function with new name
function calculateHariHabisStok(product: Product, sales: Sale[], daysToAnalyze: number = 30): number | null {
  if (!product.totalStock || product.totalStock <= 0) {
    return 0; // No stock left
  }

  // Get sales that involve this product in the specified time period
  const cutoffDate = Date.now() - (daysToAnalyze * 24 * 60 * 60 * 1000);
  const relevantSales = sales.filter(sale => {
    return sale.createdAt >= cutoffDate && 
           sale.items.some(item => item.productId === product.id);
  });

  if (relevantSales.length === 0) {
    return null; // Not enough data to calculate
  }

  // Calculate total quantity sold for this product in the period
  let totalSold = 0;
  relevantSales.forEach(sale => {
    const productItem = sale.items.find(item => item.productId === product.id);
    if (productItem) {
      totalSold += productItem.quantity;
    }
  });

  if (totalSold === 0) {
    return null; // Product not sold in the period
  }

  // Calculate average daily sales
  const daysSinceFirstSale = Math.max(
    1,
    differenceInDays(new Date(), new Date(Math.min(...relevantSales.map(s => s.createdAt))))
  );

  const avgDailySales = totalSold / daysSinceFirstSale;

  // Calculate days of stock left
  const hariHabisStok = avgDailySales > 0 ? product.totalStock / avgDailySales : Infinity;

  return hariHabisStok;
}

/**
 * Hitung kecepatan penjualan untuk suatu produk (jumlah unit terjual per hari)
 * @param product - Produk yang dianalisis
 * @param sales - Semua catatan penjualan
 * @param daysToAnalyze - Jumlah hari untuk melihat data penjualan (default: 30)
 * @returns Rata-rata jumlah unit terjual per hari atau null jika data tidak cukup
 */
export function calculateSalesVelocity(product: Product, sales: Sale[], daysToAnalyze: number = 30): number | null {
  return calculateKecepatanPenjualan(product, sales, daysToAnalyze);
}

// Internal function with new name
function calculateKecepatanPenjualan(product: Product, sales: Sale[], daysToAnalyze: number = 30): number | null {
  // Get sales that involve this product in the specified time period
  const cutoffDate = Date.now() - (daysToAnalyze * 24 * 60 * 60 * 1000);
  const relevantSales = sales.filter(sale => {
    return sale.createdAt >= cutoffDate && 
           sale.items.some(item => item.productId === product.id);
  });

  if (relevantSales.length === 0) {
    return 0; // Not enough data to calculate
  }

  // Calculate total quantity sold for this product in the period
  let totalSold = 0;
  relevantSales.forEach(sale => {
    const productItem = sale.items.find(item => item.productId === product.id);
    if (productItem) {
      totalSold += productItem.quantity;
    }
  });

  // Calculate the actual time period covered by the sales
  const firstSaleDate = Math.min(...relevantSales.map(s => s.createdAt));
  const daysSinceFirstSale = Math.max(
    1, 
    differenceInDays(new Date(), new Date(firstSaleDate))
  );
  
  return totalSold / daysSinceFirstSale;
}

/**
 * Dapatkan produk-produk laris cepat berdasarkan kecepatan penjualan
 * @param products - Semua produk
 * @param sales - Semua catatan penjualan
 * @param daysToAnalyze - Jumlah hari untuk melihat data penjualan (default: 30)
 * @param limit - Jumlah produk teratas untuk dikembalikan (default: 10)
 * @returns Array produk dengan data Hari Habis Stok dan Kecepatan Penjualan
 */
export function getFastMovingProducts(
  products: Product[],
  sales: Sale[],
  daysToAnalyze: number = 30,
  limit: number = 10
): Array<{ product: Product; dsl: number | null; velocity: number | null }> {
  return getProdukLarisCepat(products, sales, daysToAnalyze, limit);
}

// Internal function with new name
function getProdukLarisCepat(
  products: Product[],
  sales: Sale[],
  daysToAnalyze: number = 30,
  limit: number = 10
): Array<{ product: Product; dsl: number | null; velocity: number | null }> {
  const results = products
    .map(product => {
      const kecepatanPenjualan = calculateKecepatanPenjualan(product, sales, daysToAnalyze);
      const hariHabisStok = kecepatanPenjualan !== null && kecepatanPenjualan > 0 ? (product.totalStock || 0) / kecepatanPenjualan : null;
      return {
        product,
        dsl: hariHabisStok,  // Using old property name for compatibility
        velocity: kecepatanPenjualan  // Using old property name for compatibility
      };
    })
    .filter(item => item.velocity !== null && item.velocity > 0) // Only products with sales
    .sort((a, b) => (b.velocity || 0) - (a.velocity || 0)) // Sort by velocity (highest first)
    .slice(0, limit); // Take top N products

  return results;
}

/**
 * Dapatkan produk-produk dengan Hari Habis Stok terendah (paling mendesak untuk restock)
 * @param products - Semua produk
 * @param sales - Semua catatan penjualan
 * @param daysToAnalyze - Jumlah hari untuk melihat data penjualan (default: 30)
 * @param limit - Jumlah produk untuk dikembalikan (default: 10)
 * @returns Array produk dengan data Hari Habis Stok, diurutkan berdasarkan Hari Habis Stok (terendah dahulu)
 */
export function getLowDSLProducts(
  products: Product[],
  sales: Sale[],
  daysToAnalyze: number = 30,
  limit: number = 10
): Array<{ product: Product; dsl: number | null; velocity: number | null }> {
  return getProdukHabisStokTerendah(products, sales, daysToAnalyze, limit);
}

// Internal function with new name
function getProdukHabisStokTerendah(
  products: Product[],
  sales: Sale[],
  daysToAnalyze: number = 30,
  limit: number = 10
): Array<{ product: Product; dsl: number | null; velocity: number | null }> {
  const results = products
    .map(product => {
      const kecepatanPenjualan = calculateKecepatanPenjualan(product, sales, daysToAnalyze);
      const hariHabisStok = kecepatanPenjualan !== null && kecepatanPenjualan > 0 ? (product.totalStock || 0) / kecepatanPenjualan : null;
      return {
        product,
        dsl: hariHabisStok,  // Using old property name for compatibility
        velocity: kecepatanPenjualan  // Using old property name for compatibility
      };
    })
    .filter(item => item.dsl !== null && item.dsl !== Infinity) // Only products with calculable DSL
    .sort((a, b) => (a.dsl || Infinity) - (b.dsl || Infinity)) // Sort by DSL (lowest first)
    .slice(0, limit); // Take top N products

  return results;
}