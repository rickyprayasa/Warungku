import { useMemo, useState } from 'react';
import { useWarungStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Calendar,
  ArrowRightLeft,
  Timer,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { DateRange } from 'react-day-picker';
import { subDays, startOfDay, endOfDay, format, differenceInDays } from 'date-fns';
import { RevenueTrendChart } from '@/components/charts/RevenueTrendChart';
import { TopProductsChart } from '@/components/charts/TopProductsChart';
import { CategoryPieChart } from '@/components/charts/CategoryPieChart';
import { getFastMovingProducts, getLowDSLProducts } from '@/lib/stock-analysis';

export function AnalyticsDashboard() {
  const products = useWarungStore((state) => state.products);
  const sales = useWarungStore((state) => state.sales);
  const purchases = useWarungStore((state) => state.purchases);
  const isLoading = useWarungStore((state) => state.isLoading);

  // Date range state - default to last 30 days
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 29)),
    to: endOfDay(new Date()),
  });

  // State for product insights filtering and sorting
  const [productFilter, setProductFilter] = useState('all');
  const [productSort, setProductSort] = useState('rank');

  // Preset filters
  const setPresetRange = (preset: 'today' | 'yesterday' | '7days' | '30days' | 'month') => {
    const now = new Date();
    switch (preset) {
      case 'today':
        setDateRange({ from: startOfDay(now), to: endOfDay(now) });
        break;
      case 'yesterday':
        const yesterday = subDays(now, 1);
        setDateRange({ from: startOfDay(yesterday), to: endOfDay(yesterday) });
        break;
      case '7days':
        setDateRange({ from: startOfDay(subDays(now, 6)), to: endOfDay(now) });
        break;
      case '30days':
        setDateRange({ from: startOfDay(subDays(now, 29)), to: endOfDay(now) });
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        setDateRange({ from: startOfDay(monthStart), to: endOfDay(now) });
        break;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('id-ID').format(value);
  };

  // Calculate metrics with date filter
  const metrics = useMemo(() => {
    // Ensure we have valid arrays
    const validSales = Array.isArray(sales) ? sales : [];
    const validPurchases = Array.isArray(purchases) ? purchases : [];
    const validProducts = Array.isArray(products) ? products : [];

    if (!dateRange?.from) {
      return {
        revenue: 0,
        profit: 0,
        purchaseTotal: 0,
        salesCount: 0,
        growthPercentage: 0,
        trendData: [],
        topProducts: [],
        categoryData: [],
        totalProducts: validProducts.length,
        activeProducts: validProducts.filter(p => p.isActive !== false).length,
        lowStockProducts: validProducts.filter(p => (p.totalStock || 0) < 10).length,
        outOfStockProducts: validProducts.filter(p => (p.totalStock || 0) === 0).length,
        // Added metrics
        todayProfit: 0,
        thisMonthProfit: 0,
        thisMonthRevenue: 0,
        todaySalesCount: 0,
        thisMonthSalesCount: 0,
        // DSL and fast-moving metrics
        fastMovingProducts: [],
        lowDSLProducts: [],
      };
    }

    const fromTimestamp = dateRange.from.getTime();
    const toTimestamp = dateRange.to ? dateRange.to.getTime() : fromTimestamp;

    // Calculate previous period for comparison
    const daysDiff = differenceInDays(toTimestamp, fromTimestamp) + 1;
    const prevFromTimestamp = fromTimestamp - daysDiff * 24 * 60 * 60 * 1000;
    const prevToTimestamp = fromTimestamp - 1;

    // Filter sales by date range
    const periodSales = validSales.filter(
      (s) => s.createdAt >= fromTimestamp && s.createdAt <= toTimestamp
    );
    const prevPeriodSales = validSales.filter(
      (s) => s.createdAt >= prevFromTimestamp && s.createdAt <= prevToTimestamp
    );

    // Calculate metrics
    const revenue = periodSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const profit = periodSales.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
    const prevRevenue = prevPeriodSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const growthPercentage = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Purchase metrics
    const periodPurchases = validPurchases.filter(
      (p) => p.createdAt >= fromTimestamp && p.createdAt <= toTimestamp
    );
    const purchaseTotal = periodPurchases.reduce((sum, p) => sum + (Number(p.totalCost) || 0), 0);

    // Product metrics
    const totalProducts = validProducts.length;
    const activeProducts = validProducts.filter((p) => p.isActive !== false).length;
    const lowStockProducts = validProducts.filter((p) => (p.totalStock || 0) < 10).length;
    const outOfStockProducts = validProducts.filter((p) => (p.totalStock || 0) === 0).length;

    // Generate trend data for chart (daily breakdown)
    // First, create a map for all dates in the range
    const trendMap = new Map<string, { date: Date; revenue: number; profit: number }>();

    // Initialize all dates in range with zero values
    const currentDate = new Date(fromTimestamp);
    const endDate = new Date(toTimestamp);

    while (currentDate <= endDate) {
      const dateKey = format(currentDate, 'yyyy-MM-dd');
      trendMap.set(dateKey, {
        date: new Date(currentDate),
        revenue: 0,
        profit: 0,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Now fill in actual sales data
    periodSales.forEach((sale) => {
      const saleDate = new Date(sale.createdAt);
      const dateKey = format(saleDate, 'yyyy-MM-dd');
      const existing = trendMap.get(dateKey);
      if (existing) {
        existing.revenue += Number(sale.total) || 0;
        existing.profit += Number(sale.profit) || 0;
      }
    });

    // Convert to array and sort by date
    const trendData = Array.from(trendMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((item) => ({
        date: format(item.date, 'dd/MM'),
        revenue: item.revenue,
        profit: item.profit,
      }));

    // Top selling products (filtered by period)
    const productSalesMap = new Map<string, { product: any; quantity: number; revenue: number }>();
    periodSales.forEach((sale) => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item) => {
          const existing = productSalesMap.get(item.productId);
          const product = validProducts.find((p) => p.id === item.productId);
          const itemQuantity = Number(item.quantity) || 0;
          const itemPrice = Number(item.price) || 0;
          const itemRevenue = itemPrice * itemQuantity;

          if (existing) {
            existing.quantity += itemQuantity;
            existing.revenue += itemRevenue;
          } else if (product) {
            productSalesMap.set(item.productId, {
              product,
              quantity: itemQuantity,
              revenue: itemRevenue,
            });
          }
        });
      }
    });

    const topProducts = Array.from(productSalesMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)
      .map((item) => ({
        name: item.product.name,
        quantity: item.quantity,
        revenue: item.revenue,
      }));

    // Sales by category (filtered by period)
    const categoryMap = new Map<string, { revenue: number; quantity: number }>();
    periodSales.forEach((sale) => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item) => {
          const product = validProducts.find((p) => p.id === item.productId);
          if (product) {
            const existing = categoryMap.get(product.category);
            const itemPrice = Number(item.price) || 0;
            const itemQuantity = Number(item.quantity) || 0;
            const itemRevenue = itemPrice * itemQuantity;

            if (existing) {
              existing.revenue += itemRevenue;
              existing.quantity += itemQuantity;
            } else {
              categoryMap.set(product.category, {
                revenue: itemRevenue,
                quantity: itemQuantity,
              });
            }
          }
        });
      }
    });

    const categoryStats = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        ...data,
      }))
      .sort((a, b) => b.revenue - a.revenue);

    const categoryData = Array.from(categoryMap.entries())
      .map(([name, data]) => ({
        name,
        value: data.revenue,
      }))
      .sort((a, b) => b.value - a.value);

    // Calculate Today and Month metrics for the Sales Tab
    const now = new Date();
    const startOfToday = startOfDay(now).getTime();
    const endOfToday = endOfDay(now).getTime();
    const startOfMonth = startOfDay(new Date(now.getFullYear(), now.getMonth(), 1)).getTime();

    const todaySales = validSales.filter(s => s.createdAt >= startOfToday && s.createdAt <= endOfToday);
    const monthSales = validSales.filter(s => s.createdAt >= startOfMonth && s.createdAt <= endOfToday);

    const todayProfit = todaySales.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
    const thisMonthProfit = monthSales.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
    const thisMonthRevenue = monthSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const todaySalesCount = todaySales.length;
    const thisMonthSalesCount = monthSales.length;

    // Calculate fast-moving products and DSL data
    const fastMovingProducts = getFastMovingProducts(products, validSales, 30, 10);
    const lowDSLProducts = getLowDSLProducts(products, validSales, 30, 10);

    return {
      revenue,
      profit,
      purchaseTotal,
      salesCount: periodSales.length,
      growthPercentage,
      trendData,
      topProducts,
      categoryData,
      categoryStats,
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      // Added metrics
      todayProfit,
      thisMonthProfit,
      thisMonthRevenue,
      todaySalesCount,
      thisMonthSalesCount,
      // Hari Habis Stok and fast-moving metrics
      fastMovingProducts,
      lowDSLProducts,
    };
  }, [sales, purchases, products, dateRange]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-black border-t-transparent mx-auto mb-4"></div>
          <p className="font-mono text-muted-foreground">Memuat data analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-brand-black uppercase tracking-wider">Analytics & Report</h1>
          <p className="text-sm font-mono text-muted-foreground">Analisis performa dengan filter periode</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <DateRangePicker date={dateRange} onDateChange={setDateRange} />
        </div>
      </div>

      {/* Preset Filter Buttons */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPresetRange('today')}
          className="rounded-lg border-2 border-brand-black font-mono font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
        >
          Hari Ini
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPresetRange('yesterday')}
          className="rounded-lg border-2 border-brand-black font-mono font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
        >
          Kemarin
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPresetRange('7days')}
          className="rounded-lg border-2 border-brand-black font-mono font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
        >
          7 Hari
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPresetRange('30days')}
          className="rounded-lg border-2 border-brand-black font-mono font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
        >
          30 Hari
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPresetRange('month')}
          className="rounded-lg border-2 border-brand-black font-mono font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all"
        >
          Bulan Ini
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-3">
        <TabsList className="grid w-full md:grid-cols-3 rounded-lg border-2 border-brand-black p-1 h-auto bg-white gap-1">
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-brand-orange data-[state=active]:text-brand-black font-bold text-xs md:text-sm py-2.5 border-2 border-transparent data-[state=active]:border-brand-black uppercase tracking-wider transition-all">
            <BarChart3 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="products" className="rounded-lg data-[state=active]:bg-brand-orange data-[state=active]:text-brand-black font-bold text-xs md:text-sm py-2.5 border-2 border-transparent data-[state=active]:border-brand-black uppercase tracking-wider transition-all">
            <Package className="w-3 h-3 md:w-4 md:h-4 mr-1" />
            Produk
          </TabsTrigger>
          <TabsTrigger value="sales" className="rounded-lg data-[state=active]:bg-brand-orange data-[state=active]:text-brand-black font-bold text-xs md:text-sm py-2.5 border-2 border-transparent data-[state=active]:border-brand-black uppercase tracking-wider transition-all">
            <DollarSign className="w-3 h-3 md:w-4 md:h-4 mr-1" />
            Penjualan
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-3">
          {/* Quick Stats Row */}
          <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
            <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs font-mono font-bold flex items-center justify-between uppercase tracking-wider">
                  Pendapatan
                  <DollarSign className="h-3 w-3 text-brand-orange" />
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-lg md:text-xl font-bold font-mono">{formatCurrency(metrics.revenue)}</div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {metrics.salesCount} transaksi
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs font-mono font-bold flex items-center justify-between">
                  Profit
                  <TrendingUp className="h-3 w-3 text-green-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-lg md:text-xl font-bold font-mono text-green-600">
                  {formatCurrency(metrics.profit)}
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Margin {metrics.revenue > 0
                    ? ((metrics.profit / metrics.revenue) * 100).toFixed(1)
                    : 0}%
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs font-mono font-bold flex items-center justify-between">
                  Growth
                  {metrics.growthPercentage >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className={cn(
                  "text-lg md:text-xl font-bold font-mono",
                  metrics.growthPercentage >= 0 ? "text-green-600" : "text-red-600"
                )}>
                  {metrics.growthPercentage > 0 ? '+' : ''}{metrics.growthPercentage.toFixed(1)}%
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  vs periode sebelumnya
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs font-mono font-bold flex items-center justify-between">
                  Pembelian
                  <ShoppingCart className="h-3 w-3 text-red-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-lg md:text-xl font-bold font-mono text-red-600">
                  {formatCurrency(metrics.purchaseTotal)}
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Modal keluar
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Charts Section */}
          <div className="grid gap-3 md:grid-cols-1">
            {metrics.trendData.length > 0 && (
              <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="font-display text-base md:text-lg flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Trend Pendapatan & Profit
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <RevenueTrendChart data={metrics.trendData} />
                </CardContent>
              </Card>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {metrics.topProducts.length > 0 && (
              <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="font-display text-base md:text-lg flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Top 5 Produk Terlaris
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <TopProductsChart data={metrics.topProducts} />
                </CardContent>
              </Card>
            )}

            {metrics.categoryData.length > 0 && (
              <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <CardHeader className="pb-2 px-3 pt-3">
                  <CardTitle className="font-display text-base md:text-lg flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Distribusi Kategori
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-3 pb-3">
                  <CategoryPieChart data={metrics.categoryData} />
                </CardContent>
              </Card>
            )}
          </div>

          {/* Category Performance - Compact */}
          <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="font-display text-base md:text-lg flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Performa Kategori
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {metrics.categoryStats.length > 0 ? (
                <div className="space-y-2">
                  {metrics.categoryStats.slice(0, 5).map((cat, index) => (
                    <div key={cat.category} className="flex items-center justify-between p-2 border-2 border-brand-black bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <Badge className="rounded-lg bg-brand-orange text-brand-black font-bold text-xs h-5 w-5 p-0 flex items-center justify-center border-2 border-brand-black">
                          {index + 1}
                        </Badge>
                        <div>
                          <p className="font-bold text-sm">{cat.category}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {formatNumber(cat.quantity)} unit
                          </p>
                        </div>
                      </div>
                      <p className="font-bold font-mono text-sm">{formatCurrency(cat.revenue)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground font-mono py-4 text-sm">
                  Belum ada data penjualan
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-3">
          <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
            <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs font-mono font-bold flex items-center justify-between">
                  Total
                  <Package className="h-3 w-3" />
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-lg md:text-xl font-bold font-mono">{metrics.totalProducts}</div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  {metrics.activeProducts} aktif
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs font-mono font-bold flex items-center justify-between">
                  Low Stock
                  <TrendingDown className="h-3 w-3 text-yellow-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-lg md:text-xl font-bold font-mono text-yellow-600">{metrics.lowStockProducts}</div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Stok &lt; 10
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs font-mono font-bold flex items-center justify-between">
                  Out of Stock
                  <Package className="h-3 w-3 text-red-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-lg md:text-xl font-bold font-mono text-red-600">{metrics.outOfStockProducts}</div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Habis
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs font-mono font-bold flex items-center justify-between">
                  Nilai Stok
                  <DollarSign className="h-3 w-3 text-green-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-lg md:text-xl font-bold font-mono text-green-600">
                  {formatCurrency(
                    products.reduce((sum, p) => {
                      const cost = Number(p.cost) || 0;
                      const stock = Number(p.totalStock) || 0;
                      return sum + (cost * stock);
                    }, 0)
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Total inventori
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Combined Product Insights Section */}
          <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="font-display text-base md:text-lg flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Wawasan Produk
                </div>
                {/* Filter Controls */}
                <div className="flex gap-2">
                  <Select
                    value={productFilter}
                    onValueChange={setProductFilter}
                    className="w-[140px] h-8 rounded-none border-2 border-brand-black text-xs font-mono"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Filter" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-2 border-brand-black">
                      <SelectItem value="all">Semua Produk</SelectItem>
                      <SelectItem value="bestseller">Terlaris</SelectItem>
                      <SelectItem value="fastmoving">Perputaran Cepat</SelectItem>
                      <SelectItem value="restock">Perlu Restock Segera</SelectItem>
                      <SelectItem value="outofstock">Stok Habis</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select
                    value={productSort}
                    onValueChange={setProductSort}
                    className="w-[160px] h-8 rounded-none border-2 border-brand-black text-xs font-mono"
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Urutkan" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-2 border-brand-black">
                      <SelectItem value="rank">Urutkan Berdasarkan Rank</SelectItem>
                      <SelectItem value="name">Nama Produk (A-Z)</SelectItem>
                      <SelectItem value="sold-desc">Terjual (Tertinggi)</SelectItem>
                      <SelectItem value="sold-asc">Terjual (Terendah)</SelectItem>
                      <SelectItem value="velocity-desc">Kecepatan Jual (Tertinggi)</SelectItem>
                      <SelectItem value="velocity-asc">Kecepatan Jual (Terendah)</SelectItem>
                      <SelectItem value="revenue-desc">Pendapatan (Tertinggi)</SelectItem>
                      <SelectItem value="revenue-asc">Pendapatan (Terendah)</SelectItem>
                      <SelectItem value="stock-desc">Stok (Tertinggi)</SelectItem>
                      <SelectItem value="stock-asc">Stok (Terendah)</SelectItem>
                      <SelectItem value="dsl-desc">Habis dalam (Tercepat)</SelectItem>
                      <SelectItem value="dsl-asc">Habis dalam (Terlama)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b-2 border-brand-black">
                      <th className="text-left p-2 font-mono font-bold text-xs">Rank
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1"
                          onClick={() => {
                            // Toggle between rank and rank-asc/rank-desc
                            setProductSort(prev => prev === 'rank' ? 'rank-desc' : 'rank');
                          }}
                        >
                          {productSort.includes('rank') ? (productSort.includes('desc') ? '↓' : '↑') : '↕️'}
                        </Button>
                      </th>
                      <th className="text-left p-2 font-mono font-bold text-xs">Produk
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1"
                          onClick={() => {
                            setProductSort(prev => prev === 'name' ? 'name-asc' : 'name');
                          }}
                        >
                          {productSort.includes('name') ? (productSort.includes('asc') ? '↑' : '↓') : '↕️'}
                        </Button>
                      </th>
                      <th className="text-center p-2 font-mono font-bold text-xs">Terjual
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1"
                          onClick={() => {
                            setProductSort(prev => prev === 'sold-desc' ? 'sold-asc' : 'sold-desc');
                          }}
                        >
                          {productSort.includes('sold') ? (productSort.includes('asc') ? '↑' : '↓') : '↕️'}
                        </Button>
                      </th>
                      <th className="text-center p-2 font-mono font-bold text-xs">Kecepatan Jual
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1"
                          onClick={() => {
                            setProductSort(prev => prev === 'velocity-desc' ? 'velocity-asc' : 'velocity-desc');
                          }}
                        >
                          {productSort.includes('velocity') ? (productSort.includes('asc') ? '↑' : '↓') : '↕️'}
                        </Button>
                      </th>
                      <th className="text-center p-2 font-mono font-bold text-xs">Habis dalam
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1"
                          onClick={() => {
                            setProductSort(prev => prev === 'dsl-desc' ? 'dsl-asc' : 'dsl-desc');
                          }}
                        >
                          {productSort.includes('dsl') ? (productSort.includes('asc') ? '↑' : '↓') : '↕️'}
                        </Button>
                      </th>
                      <th className="text-center p-2 font-mono font-bold text-xs">Stok
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1"
                          onClick={() => {
                            setProductSort(prev => prev === 'stock-desc' ? 'stock-asc' : 'stock-desc');
                          }}
                        >
                          {productSort.includes('stock') ? (productSort.includes('asc') ? '↑' : '↓') : '↕️'}
                        </Button>
                      </th>
                      <th className="text-right p-2 font-mono font-bold text-xs">Pendapatan
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-auto p-0 ml-1"
                          onClick={() => {
                            setProductSort(prev => prev === 'revenue-desc' ? 'revenue-asc' : 'revenue-desc');
                          }}
                        >
                          {productSort.includes('revenue') ? (productSort.includes('asc') ? '↑' : '↓') : '↕️'}
                        </Button>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      // Create a map to combine data from all three sources by product name
                      const productMap = new Map();

                      // Add top products to the map
                      metrics.topProducts.forEach((item, idx) => {
                        const key = item.name;
                        if (!productMap.has(key)) {
                          productMap.set(key, {
                            name: item.name,
                            product: { name: item.name, totalStock: 0 }, // Placeholder until we get real data
                            quantity: item.quantity || 0,
                            revenue: item.revenue || 0,
                            rank: idx + 1,
                            category: 'bestseller',
                            velocity: 0, // Will be filled if also in fast moving
                            dsl: null // Will be filled if also in low DSL
                          });
                        } else {
                          // Update existing entry with top product data
                          const existing = productMap.get(key);
                          existing.quantity = item.quantity || existing.quantity;
                          existing.revenue = item.revenue || existing.revenue;
                          existing.category = 'bestseller'; // Prioritize bestseller category
                        }
                      });

                      // Add or update with fast moving data
                      metrics.fastMovingProducts.forEach((item, idx) => {
                        const key = item.product.name;
                        if (productMap.has(key)) {
                          // Update existing entry with fast moving data
                          const existing = productMap.get(key);
                          existing.velocity = item.velocity || existing.velocity;
                          existing.dsl = item.dsl || existing.dsl;
                          existing.product = item.product;
                          // If this product was not a bestseller, set it as fast moving
                          if (existing.category !== 'bestseller') {
                            existing.category = 'fastmoving';
                          }
                        } else {
                          // Add new entry for fast moving product
                          productMap.set(key, {
                            name: item.product.name,
                            product: item.product,
                            quantity: 0, // Not in top sellers
                            revenue: 0, // Not in top sellers
                            rank: idx + 1,
                            category: 'fastmoving',
                            velocity: item.velocity || 0,
                            dsl: item.dsl || null
                          });
                        }
                      });

                      // Add or update with low DSL data
                      metrics.lowDSLProducts.forEach((item, idx) => {
                        const key = item.product.name;
                        if (productMap.has(key)) {
                          // Update existing entry with low DSL data
                          const existing = productMap.get(key);
                          existing.dsl = item.dsl || existing.dsl;
                          existing.velocity = item.velocity || existing.velocity;
                          existing.product = item.product;
                          // If this product was not a bestseller or fast mover, set as low DSL
                          if (existing.category !== 'bestseller' && existing.category !== 'fastmoving') {
                            existing.category = 'lowdsl';
                          }
                        } else {
                          // Add new entry for low DSL product
                          productMap.set(key, {
                            name: item.product.name,
                            product: item.product,
                            quantity: 0, // Not in top sellers
                            revenue: 0, // Not in top sellers
                            rank: idx + 1, // For low DSL products
                            category: 'lowdsl',
                            velocity: item.velocity || 0,
                            dsl: item.dsl || null
                          });
                        }
                      });

                      // Apply filtering based on selected filter
                      let filteredList = Array.from(productMap.values());

                      switch (productFilter) {
                        case 'bestseller':
                          filteredList = filteredList.filter(item => item.category === 'bestseller');
                          break;
                        case 'fastmoving':
                          filteredList = filteredList.filter(item => item.category === 'fastmoving');
                          break;
                        case 'restock':
                          filteredList = filteredList.filter(item => item.category === 'lowdsl');
                          break;
                        case 'outofstock':
                          filteredList = filteredList.filter(item => (item.product?.totalStock || 0) === 0);
                          break;
                        default:
                          // 'all' - no filtering
                          break;
                      }

                      // Apply sorting based on selected sort option
                      filteredList.sort((a, b) => {
                        // Determine if we need to reverse the comparison for ascending order
                        const multiplier = productSort.includes('-asc') ? 1 : (productSort.includes('-desc') ? -1 : -1);

                        switch (productSort.replace('-asc', '').replace('-desc', '')) {
                          case 'rank':
                            // Maintain category priority but sort within categories
                            const categoryPriority = { bestseller: 1, fastmoving: 2, lowdsl: 3 };
                            if (categoryPriority[a.category] !== categoryPriority[b.category]) {
                              return (categoryPriority[a.category] - categoryPriority[b.category]) * multiplier;
                            }
                            // Within same category, sort by relevant metric
                            if (a.category === 'bestseller') return ((b.quantity || 0) - (a.quantity || 0)) * multiplier;
                            if (a.category === 'fastmoving') return ((b.velocity || 0) - (a.velocity || 0)) * multiplier;
                            if (a.category === 'lowdsl') return ((a.dsl || Infinity) - (b.dsl || Infinity)) * multiplier;
                            return 0;
                          case 'name':
                            const comparison = a.product?.name.localeCompare(b.product?.name);
                            return productSort.includes('asc') ? comparison : -comparison;
                          case 'sold':
                            return ((b.quantity || 0) - (a.quantity || 0)) * multiplier;
                          case 'velocity':
                            return ((b.velocity || 0) - (a.velocity || 0)) * multiplier;
                          case 'revenue':
                            return ((b.revenue || 0) - (a.revenue || 0)) * multiplier;
                          case 'stock':
                            return ((b.product?.totalStock || 0) - (a.product?.totalStock || 0)) * multiplier;
                          case 'dsl':
                            return ((a.dsl || Infinity) - (b.dsl || Infinity)) * multiplier;
                          default:
                            // Default sorting (rank) - same as 'rank' case
                            const defaultPriority = { bestseller: 1, fastmoving: 2, lowdsl: 3 };
                            if (defaultPriority[a.category] !== defaultPriority[b.category]) {
                              return (defaultPriority[a.category] - defaultPriority[b.category]) * multiplier;
                            }
                            if (a.category === 'bestseller') return ((b.quantity || 0) - (a.quantity || 0)) * multiplier;
                            if (a.category === 'fastmoving') return ((b.velocity || 0) - (a.velocity || 0)) * multiplier;
                            if (a.category === 'lowdsl') return ((a.dsl || Infinity) - (b.dsl || Infinity)) * multiplier;
                            return 0;
                        }
                      });

                      const combinedList = filteredList.slice(0, 10); // Show top 10 items after filtering and sorting

                      if (combinedList.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="text-center p-4 text-muted-foreground font-mono text-sm">
                              Belum ada data produk untuk analisis
                            </td>
                          </tr>
                        );
                      }

                      return combinedList.map((item, index) => {
                        // Determine badge color based on category
                        let badgeColor = "bg-gray-200"; // default
                        if (item.category === 'bestseller') badgeColor = "bg-brand-orange";
                        if (item.category === 'fastmoving') badgeColor = "bg-blue-500";
                        if (item.category === 'lowdsl') badgeColor = "bg-red-500";

                        return (
                          <tr key={`${item.product?.name || item.name}-${index}`} className="border-b border-brand-black/30 last:border-b-0 hover:bg-brand-orange/10">
                            <td className="p-2">
                              <Badge className={`rounded-lg ${badgeColor} text-brand-black font-bold text-xs h-5 w-5 p-0 flex items-center justify-center border-2 border-brand-black`}>
                                {index + 1}
                              </Badge>
                            </td>
                            <td className="p-2">
                              <div className="min-w-[120px]">
                                <p className="font-bold text-sm truncate">{item.product?.name || item.name}</p>
                                <p className="text-[10px] text-muted-foreground font-mono capitalize">
                                  {item.category === 'bestseller' && 'Produk Terlaris'}
                                  {item.category === 'fastmoving' && 'Produk Laris Cepat'}
                                  {item.category === 'lowdsl' && 'Perlu Restock Segera'}
                                  {(item.product?.totalStock || 0) === 0 && 'Stok Habis'}
                                </p>
                              </div>
                            </td>
                            <td className="p-2 text-center">
                              <p className="font-bold font-mono text-sm">{formatNumber(item.quantity || 0)}</p>
                            </td>
                            <td className="p-2 text-center">
                              <p className="font-bold font-mono text-sm">{(item.velocity || 0).toFixed(2)} unit/hari</p>
                            </td>
                            <td className="p-2 text-center">
                              <p className={`font-bold font-mono text-sm ${
                                (item.product?.totalStock || 0) === 0
                                  ? 'text-red-600'
                                  : (item.dsl !== null && item.dsl !== undefined && item.dsl < 7)
                                    ? 'text-red-600'
                                    : ''
                              }`}>
                                {(item.product?.totalStock || 0) === 0
                                  ? 'HABIS'
                                  : (item.dsl !== null && item.dsl !== undefined)
                                    ? `${item.dsl.toFixed(1)} hari`
                                    : 'N/A'}
                              </p>
                            </td>
                            <td className="p-2 text-center">
                              <p className="font-bold font-mono text-sm">{item.product?.totalStock || 0}</p>
                            </td>
                            <td className="p-2 text-right">
                              <p className="font-bold font-mono text-sm">{formatCurrency(item.revenue || 0)}</p>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono mt-2">
                * Produk terlaris, fast moving, dan produk yang perlu restock segera
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sales Tab */}
        <TabsContent value="sales" className="space-y-3">
          <div className="grid gap-2 md:grid-cols-2">
            <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="font-display text-base md:text-lg">Ringkasan Penjualan</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                <div className="flex justify-between items-center p-2 border border-brand-black bg-gray-50">
                  <span className="font-mono text-xs md:text-sm">Hari Ini</span>
                  <span className="font-bold font-mono text-sm md:text-base">{metrics.todaySalesCount}</span>
                </div>
                <div className="flex justify-between items-center p-2 border border-brand-black bg-gray-50">
                  <span className="font-mono text-xs md:text-sm">Bulan Ini</span>
                  <span className="font-bold font-mono text-sm md:text-base">{metrics.thisMonthSalesCount}</span>
                </div>
                <div className="flex justify-between items-center p-2 border border-brand-black bg-gray-50">
                  <span className="font-mono text-xs md:text-sm">Total</span>
                  <span className="font-bold font-mono text-sm md:text-base">{formatNumber(sales.length)}</span>
                </div>
                <div className="flex justify-between items-center p-2 border border-brand-black bg-brand-orange/20">
                  <span className="font-mono font-bold text-xs md:text-sm">Avg/Transaksi</span>
                  <span className="font-bold font-mono text-sm md:text-base">
                    {formatCurrency(
                      sales.length > 0
                        ? sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0) / sales.length
                        : 0
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="font-display text-base md:text-lg">Profit Analysis</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 space-y-2">
                <div className="flex justify-between items-center p-2 border border-brand-black bg-gray-50">
                  <span className="font-mono text-xs md:text-sm">Profit Hari Ini</span>
                  <span className="font-bold font-mono text-sm md:text-base text-green-600">
                    {formatCurrency(metrics.todayProfit)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 border border-brand-black bg-gray-50">
                  <span className="font-mono text-xs md:text-sm">Profit Bulan Ini</span>
                  <span className="font-bold font-mono text-sm md:text-base text-green-600">
                    {formatCurrency(metrics.thisMonthProfit)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 border border-brand-black bg-gray-50">
                  <span className="font-mono text-xs md:text-sm">Revenue Total</span>
                  <span className="font-bold font-mono text-sm md:text-base">
                    {formatCurrency(sales.reduce((sum, s) => sum + (Number(s.total) || 0), 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 border border-brand-black bg-green-100">
                  <span className="font-mono font-bold text-xs md:text-sm">Profit Margin</span>
                  <span className="font-bold font-mono text-sm md:text-base text-green-600">
                    {sales.length > 0 && metrics.thisMonthRevenue > 0
                      ? ((metrics.thisMonthProfit / metrics.thisMonthRevenue) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
