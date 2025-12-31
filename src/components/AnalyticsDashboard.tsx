import { useMemo, useState } from 'react';
import { useWarungStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardSkeleton } from '@/components/ui/skeleton';
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

  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfDay(subDays(new Date(), 29)),
    to: endOfDay(new Date()),
  });
  const [productFilter, setProductFilter] = useState('all');
  const [productSort, setProductSort] = useState('rank');

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

  const metrics = useMemo(() => {
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
        todayProfit: 0,
        thisMonthProfit: 0,
        thisMonthRevenue: 0,
        todaySalesCount: 0,
        thisMonthSalesCount: 0,
        fastMovingProducts: [],
        lowDSLProducts: [],
      };
    }

    const fromTimestamp = dateRange.from.getTime();
    const toTimestamp = dateRange.to ? dateRange.to.getTime() : fromTimestamp;

    const daysDiff = differenceInDays(toTimestamp, fromTimestamp) + 1;
    const prevFromTimestamp = fromTimestamp - daysDiff * 24 * 60 * 60 * 1000;
    const prevToTimestamp = fromTimestamp - 1;

    const periodSales = validSales.filter(
      (s) => s.createdAt >= fromTimestamp && s.createdAt <= toTimestamp
    );
    const prevPeriodSales = validSales.filter(
      (s) => s.createdAt >= prevFromTimestamp && s.createdAt <= prevToTimestamp
    );

    const revenue = periodSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const profit = periodSales.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
    const prevRevenue = prevPeriodSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const growthPercentage = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

    const periodPurchases = validPurchases.filter(
      (p) => p.createdAt >= fromTimestamp && p.createdAt <= toTimestamp
    );
    const purchaseTotal = periodPurchases.reduce((sum, p) => sum + (Number(p.totalCost) || 0), 0);

    const totalProducts = validProducts.length;
    const activeProducts = validProducts.filter((p) => p.isActive !== false).length;
    const lowStockProducts = validProducts.filter((p) => (p.totalStock || 0) < 10).length;
    const outOfStockProducts = validProducts.filter((p) => (p.totalStock || 0) === 0).length;

    const trendMap = new Map<string, { date: Date; revenue: number; profit: number }>();

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

    periodSales.forEach((sale) => {
      const saleDate = new Date(sale.createdAt);
      const dateKey = format(saleDate, 'yyyy-MM-dd');
      const existing = trendMap.get(dateKey);
      if (existing) {
        existing.revenue += Number(sale.total) || 0;
        existing.profit += Number(sale.profit) || 0;
      }
    });

    const trendData = Array.from(trendMap.values())
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .map((item) => ({
        date: format(item.date, 'dd/MM'),
        revenue: item.revenue,
        profit: item.profit,
      }));

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
      todayProfit,
      thisMonthProfit,
      thisMonthRevenue,
      todaySalesCount,
      thisMonthSalesCount,
      fastMovingProducts,
      lowDSLProducts,
    };
  }, [sales, purchases, products, dateRange]);

  if (isLoading) {
    return <DashboardSkeleton />;
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

        <TabsContent value="overview" className="space-y-3">
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
                <CardTitle className="text-xs font-mono font-bold flex items-center justify-between uppercase tracking-wider">
                  Profit
                  <TrendingUp className="h-3 w-3 text-green-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-lg md:text-xl font-bold font-mono text-green-600">{formatCurrency(metrics.profit)}</div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Margin profit
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs font-mono font-bold flex items-center justify-between uppercase tracking-wider">
                  Pembelian
                  <TrendingDown className="h-3 w-3 text-red-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-lg md:text-xl font-bold font-mono text-red-600">{formatCurrency(metrics.purchaseTotal)}</div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Pengeluaran
                </p>
              </CardContent>
            </Card>

            <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs font-mono font-bold flex items-center justify-between uppercase tracking-wider">
                  Pertumbuhan
                  <BarChart3 className="h-3 w-3 text-blue-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className={`text-lg md:text-xl font-bold font-mono ${metrics.growthPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.growthPercentage >= 0 ? '+' : ''}{metrics.growthPercentage.toFixed(1)}%
                </div>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Dari periode lalu
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <CardHeader className="pb-2 px-3 pt-3">
              <CardTitle className="font-display text-base md:text-lg flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Tren Pendapatan
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <RevenueTrendChart data={metrics.trendData} />
            </CardContent>
          </Card>

          <div className="grid gap-2 md:grid-cols-2">
            <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="font-display text-base md:text-lg flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Produk Terlaris
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {metrics.topProducts.length > 0 ? (
                  <TopProductsChart data={metrics.topProducts} />
                ) : (
                  <p className="text-center text-muted-foreground font-mono py-4 text-sm">
                    Belum ada data penjualan
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="font-display text-base md:text-lg flex items-center gap-2">
                  <BarChart3 className="w-4 h-4" />
                  Distribusi Kategori
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {metrics.categoryData.length > 0 ? (
                  <CategoryPieChart data={metrics.categoryData} />
                ) : (
                  <p className="text-center text-muted-foreground font-mono py-4 text-sm">
                    Belum ada data penjualan
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

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

          <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <CardHeader className="pb-2 px-3 pt-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <CardTitle className="font-display text-base md:text-lg flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Wawasan Produk
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Select value={productFilter} onValueChange={setProductFilter}>
                    <SelectTrigger className="w-full md:w-[140px] h-8 rounded-none border-2 border-brand-black text-xs font-mono">
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

                  <Select value={productSort} onValueChange={setProductSort}>
                    <SelectTrigger className="w-full md:w-[140px] h-8 rounded-none border-2 border-brand-black text-xs font-mono">
                      <SelectValue placeholder="Urutkan" />
                    </SelectTrigger>
                    <SelectContent className="rounded-none border-2 border-brand-black">
                      <SelectItem value="rank">Rank</SelectItem>
                      <SelectItem value="name">Nama Produk</SelectItem>
                      <SelectItem value="sold-desc">Terjual ⬇</SelectItem>
                      <SelectItem value="sold-asc">Terjual ⬆</SelectItem>
                      <SelectItem value="velocity-desc">Kecepatan ⬇</SelectItem>
                      <SelectItem value="velocity-asc">Kecepatan ⬆</SelectItem>
                      <SelectItem value="revenue-desc">Pendapatan ⬇</SelectItem>
                      <SelectItem value="revenue-asc">Pendapatan ⬆</SelectItem>
                      <SelectItem value="stock-desc">Stok ⬇</SelectItem>
                      <SelectItem value="stock-asc">Stok ⬆</SelectItem>
                      <SelectItem value="dsl-desc">Habis dalam ⬇</SelectItem>
                      <SelectItem value="dsl-asc">Habis dalam ⬆</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              {(() => {
                const productMap = new Map();

                metrics.topProducts.forEach((item, idx) => {
                  const key = item.name;
                  if (!productMap.has(key)) {
                    productMap.set(key, {
                      name: item.name,
                      product: products.find(p => p.name === item.name) || { name: item.name, totalStock: 0, imageUrl: '' },
                      quantity: item.quantity || 0,
                      revenue: item.revenue || 0,
                      rank: idx + 1,
                      category: 'bestseller',
                      velocity: 0,
                      dsl: null
                    });
                  } else {
                    const existing = productMap.get(key);
                    existing.quantity = item.quantity || existing.quantity;
                    existing.revenue = item.revenue || existing.revenue;
                    existing.category = 'bestseller';
                  }
                });

                metrics.fastMovingProducts.forEach((item, idx) => {
                  const key = item.product.name;
                  if (productMap.has(key)) {
                    const existing = productMap.get(key);
                    existing.velocity = item.velocity || existing.velocity;
                    existing.dsl = item.dsl || existing.dsl;
                    existing.product = item.product;
                    if (existing.category !== 'bestseller') {
                      existing.category = 'fastmoving';
                    }
                  } else {
                    productMap.set(key, {
                      name: item.product.name,
                      product: item.product,
                      quantity: 0,
                      revenue: 0,
                      rank: idx + 1,
                      category: 'fastmoving',
                      velocity: item.velocity || 0,
                      dsl: item.dsl || null
                    });
                  }
                });

                metrics.lowDSLProducts.forEach((item, idx) => {
                  const key = item.product.name;
                  if (productMap.has(key)) {
                    const existing = productMap.get(key);
                    existing.dsl = item.dsl || existing.dsl;
                    existing.velocity = item.velocity || existing.velocity;
                    existing.product = item.product;
                    if (existing.category !== 'bestseller' && existing.category !== 'fastmoving') {
                      existing.category = 'lowdsl';
                    }
                  } else {
                    productMap.set(key, {
                      name: item.product.name,
                      product: item.product,
                      quantity: 0,
                      revenue: 0,
                      rank: idx + 1,
                      category: 'lowdsl',
                      velocity: item.velocity || 0,
                      dsl: item.dsl || null
                    });
                  }
                });

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
                    break;
                }

                const multiplier = productSort.includes('asc') ? 1 : -1;
                filteredList.sort((a, b) => {
                  switch (productSort.replace('-asc', '').replace('-desc', '')) {
                    case 'rank':
                      const categoryPriority = { bestseller: 1, fastmoving: 2, lowdsl: 3 };
                      if (categoryPriority[a.category] !== categoryPriority[b.category]) {
                        return (categoryPriority[a.category] - categoryPriority[b.category]);
                      }
                      if (a.category === 'bestseller') return (b.quantity - a.quantity) * multiplier;
                      if (a.category === 'fastmoving') return (b.velocity - a.velocity) * multiplier;
                      if (a.category === 'lowdsl') return (a.dsl - b.dsl) * multiplier;
                      return 0;
                    case 'name':
                      const comparison = a.product?.name.localeCompare(b.product?.name);
                      return productSort.includes('asc') ? comparison : -comparison;
                    case 'sold':
                      return (b.quantity - a.quantity) * multiplier;
                    case 'velocity':
                      return (b.velocity - a.velocity) * multiplier;
                    case 'revenue':
                      return (b.revenue - a.revenue) * multiplier;
                    case 'stock':
                      return ((b.product?.totalStock || 0) - (a.product?.totalStock || 0)) * multiplier;
                    case 'dsl':
                      return (a.dsl - b.dsl) * multiplier;
                    default:
                      const defaultPriority = { bestseller: 1, fastmoving: 2, lowdsl: 3 };
                      if (defaultPriority[a.category] !== defaultPriority[b.category]) {
                        return (defaultPriority[a.category] - defaultPriority[b.category]);
                      }
                      if (a.category === 'bestseller') return (b.quantity - a.quantity) * multiplier;
                      if (a.category === 'fastmoving') return (b.velocity - a.velocity) * multiplier;
                      if (a.category === 'lowdsl') return (a.dsl - b.dsl) * multiplier;
                      return 0;
                  }
                });

                const combinedList = filteredList.slice(0, 10);

                if (combinedList.length === 0) {
                  return (
                    <div className="text-center p-8 text-muted-foreground font-mono">
                      Belum ada data produk untuk analisis
                    </div>
                  );
                }

                 return (
                   <>
                     <div className="md:hidden space-y-3">
                       {combinedList.map((item, index) => {
                         let badgeColor = "bg-gray-200";
                         if (item.category === 'bestseller') badgeColor = "bg-brand-orange";
                         if (item.category === 'fastmoving') badgeColor = "bg-blue-500";
                         if (item.category === 'lowdsl') badgeColor = "bg-red-500";

                         return (
                           <div key={`${item.product?.name || item.name}-${index}`} className="border-2 border-brand-black bg-white p-3 rounded-lg">
                             <div className="flex justify-between items-start mb-3">
                               <div className="flex-1 min-w-0">
                                 <div className="flex items-center gap-2 mb-1">
                                   <Badge className={`rounded-lg ${badgeColor} text-brand-black font-bold text-xs px-2 py-0.5 border-2 border-brand-black`}>
                                     #{index + 1}
                                   </Badge>
                                   <span className={`text-[10px] font-mono font-bold ${item.category === 'bestseller' ? 'text-brand-orange' : item.category === 'fastmoving' ? 'text-blue-600' : 'text-red-600'}`}>
                                     {item.category === 'bestseller' && 'TERLARIS'}
                                     {item.category === 'fastmoving' && 'LARIS CEPAT'}
                                     {item.category === 'lowdsl' && 'PERLU RESTOCK'}
                                   </span>
                                 </div>
                                 <h3 className="font-bold text-sm leading-tight truncate">{item.product?.name || item.name}</h3>
                               </div>
                             </div>

                             <div className="grid grid-cols-4 gap-2 text-[10px]">
                               <div>
                                 <p className="text-muted-foreground font-mono">Terjual</p>
                                 <p className="font-bold font-mono text-sm">{formatNumber(item.quantity || 0)}</p>
                               </div>
                               <div>
                                 <p className="text-muted-foreground font-mono">Kecepatan</p>
                                 <p className="font-bold font-mono text-sm">{(item.velocity || 0).toFixed(1)}/hari</p>
                               </div>
                               <div>
                                 <p className="text-muted-foreground font-mono">Habis Dalam</p>
                                 <p className={`font-bold font-mono text-sm ${(item.product?.totalStock || 0) === 0 ? 'text-red-600' : (item.dsl !== null && item.dsl < 7) ? 'text-red-600' : ''}`}>
                                   {(item.product?.totalStock || 0) === 0 ? 'HABIS' : (item.dsl !== null) ? `${item.dsl.toFixed(1)}h` : 'N/A'}
                                 </p>
                               </div>
                               <div>
                                 <p className="text-muted-foreground font-mono">Stok</p>
                                 <p className="font-bold font-mono text-sm">{item.product?.totalStock || 0}</p>
                               </div>
                             </div>

                             <div className="mt-3 pt-2 border-t border-dashed border-brand-black/30 flex justify-between items-center">
                               <span className="text-[10px] text-muted-foreground font-mono">Pendapatan</span>
                               <span className="font-bold font-mono text-sm">{formatCurrency(item.revenue || 0)}</span>
                             </div>
                           </div>
                         );
                       })}
                     </div>

                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full min-w-[700px]">
                        <thead>
                          <tr className="border-b-2 border-brand-black">
                            <th className="text-left p-2 font-mono font-bold text-xs">Rank</th>
                            <th className="text-left p-2 font-mono font-bold text-xs">Produk</th>
                            <th className="text-center p-2 font-mono font-bold text-xs">Terjual</th>
                            <th className="text-center p-2 font-mono font-bold text-xs">Kecepatan Jual</th>
                            <th className="text-center p-2 font-mono font-bold text-xs">Habis dalam</th>
                            <th className="text-center p-2 font-mono font-bold text-xs">Stok</th>
                            <th className="text-right p-2 font-mono font-bold text-xs">Pendapatan</th>
                          </tr>
                        </thead>
                        <tbody>
                          {combinedList.map((item, index) => {
                            let badgeColor = "bg-gray-200";
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
                                  <div className="min-w-[150px]">
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
                                    (item.product?.totalStock || 0) === 0 ? 'text-red-600' : (item.dsl !== null && item.dsl < 7) ? 'text-red-600' : ''
                                  }`}>
                                    {(item.product?.totalStock || 0) === 0 ? 'HABIS' : (item.dsl !== null && item.dsl !== undefined) ? `${item.dsl.toFixed(1)} hari` : 'N/A'}
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
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                );
              })()}
              <p className="text-[10px] text-muted-foreground font-mono mt-2">
                * Produk terlaris, fast moving, dan produk yang perlu restock segera
              </p>
            </CardContent>
          </Card>
        </TabsContent>

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
                  <span className="font-mono text-xs md:text-sm">Profit Hari Ini</span>
                  <span className="font-bold font-mono text-sm md:text-base text-green-600">{formatCurrency(metrics.todayProfit)}</span>
                </div>
                <div className="flex justify-between items-center p-2 border border-brand-black bg-gray-50">
                  <span className="font-mono text-xs md:text-sm">Profit Bulan Ini</span>
                  <span className="font-bold font-mono text-sm md:text-base text-green-600">{formatCurrency(metrics.thisMonthProfit)}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="font-display text-base md:text-lg">Pendapatan Bulan Ini</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-2xl md:text-3xl font-bold font-mono text-brand-orange">
                  {formatCurrency(metrics.thisMonthRevenue)}
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground font-mono mt-1">
                  Total pendapatan bulan ini
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
