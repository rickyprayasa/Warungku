import { useMemo, useState, useEffect } from 'react';
import { SalesDataTable } from '@/components/SalesDataTable';
import { OnboardingTour } from '@/components/OnboardingTour';
import { POSSaleForm } from '@/components/POSSaleForm';
import { PurchaseForm } from '@/components/PurchaseForm';
import { ProductForm } from '@/components/ProductForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useWarungStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DashboardSkeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  Package,
  ShoppingCart,
  DollarSign,
  ArrowRightLeft,
  Banknote,
  Truck,
  Inbox,
  Warehouse,
  ClipboardCheck,
  BarChart3,
  Tag,
  QrCode,
  Crown,
  Settings,
  MessageCircle,
  PlusCircle,
  Lock,
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
import { usePlan } from '@/contexts/PlanContext';
import { PlanUpgradePrompt } from '@/components/PlanUpgradePrompt';

export function AnalyticsDashboard({ isActive }: { isActive?: boolean }) {
  const { limits } = usePlan();
  const products = useWarungStore((state) => state.products);
  const sales = useWarungStore((state) => state.sales);
  const purchases = useWarungStore((state) => state.purchases);
  const isLoading = useWarungStore((state) => state.isLoading);
  const fetchSales = useWarungStore((state) => state.fetchSales);
  const fetchPurchases = useWarungStore((state) => state.fetchPurchases);
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [isSaleDialogOpen, setSaleDialogOpen] = useState(false);
  const [isPurchaseDialogOpen, setPurchaseDialogOpen] = useState(false);
  const [isProductDialogOpen, setProductDialogOpen] = useState(false);

  // Check if user can access analytics
  if (!limits.canAccessAnalytics) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4">
        <div className="w-20 h-20 bg-brand-orange/10 border-4 border-brand-black flex items-center justify-center mb-6">
          <Lock className="w-10 h-10 text-brand-orange" />
        </div>
        <h2 className="text-2xl font-display font-bold text-brand-black mb-2">
          Analytics Tidak Tersedia
        </h2>
        <p className="font-mono text-sm text-muted-foreground text-center max-w-md mb-6">
          Fitur analytics dan laporan detail hanya tersedia untuk plan Pro dan Enterprise.
        </p>
        <Button
          onClick={() => setUpgradeOpen(true)}
          className="bg-brand-orange text-brand-black hover:bg-brand-black hover:text-brand-white border-2 border-brand-black rounded-none font-mono font-bold uppercase"
        >
          Upgrade ke Pro
        </Button>
        <PlanUpgradePrompt
          open={upgradeOpen}
          onClose={() => setUpgradeOpen(false)}
          feature="analytics"
        />
      </div>
    );
  }

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
    const yesterdayStart = startOfDay(subDays(now, 1)).getTime();
    const yesterdayEnd = endOfDay(subDays(now, 1)).getTime();
    const yesterdaySales = validSales.filter(s => s.createdAt >= yesterdayStart && s.createdAt <= yesterdayEnd);

    const monthSales = validSales.filter(s => s.createdAt >= startOfMonth && s.createdAt <= endOfToday);

    const todayProfit = todaySales.reduce((sum, s) => sum + (Number(s.profit) || 0), 0);
    const todayRevenue = todaySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
    const yesterdayRevenue = yesterdaySales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);

    // Calculate daily growth (Today vs Yesterday)
    const salesGrowthDay = yesterdayRevenue > 0 ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 : (todayRevenue > 0 ? 100 : 0);

    // Calculate Today's Best Seller
    const todayProductMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    todaySales.forEach((sale) => {
      if (sale.items && Array.isArray(sale.items)) {
        sale.items.forEach((item) => {
          const existing = todayProductMap.get(item.productId);
          const itemQuantity = Number(item.quantity) || 0;
          const itemPrice = Number(item.price) || 0;

          if (existing) {
            existing.quantity += itemQuantity;
            existing.revenue += (itemPrice * itemQuantity);
          } else {
            // Find product name safely
            const product = validProducts.find((p) => p.id === item.productId);
            todayProductMap.set(item.productId, {
              name: product?.name || 'Unknown Product',
              quantity: itemQuantity,
              revenue: (itemPrice * itemQuantity)
            });
          }
        });
      }
    });

    const todayBestSeller = Array.from(todayProductMap.values())
      .sort((a, b) => b.quantity - a.quantity)[0] || null;

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
      todayRevenue,
      yesterdayRevenue,
      salesGrowthDay,
      todayBestSeller,
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
        <div className="flex flex-row items-center gap-2">
          <OnboardingTour isActive={isActive} />
          <div className="flex-1 min-w-0">
            <DateRangePicker date={dateRange} onDateChange={setDateRange} />
          </div>
        </div>
      </div>

      <div className="w-full overflow-x-auto pb-2 gap-2 scrollbar-hide flex">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPresetRange('today')}
          className="rounded-lg border-2 border-brand-black font-mono font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all whitespace-nowrap flex-shrink-0"
        >
          Hari Ini
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPresetRange('yesterday')}
          className="rounded-lg border-2 border-brand-black font-mono font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all whitespace-nowrap flex-shrink-0"
        >
          Kemarin
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPresetRange('7days')}
          className="rounded-lg border-2 border-brand-black font-mono font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all whitespace-nowrap flex-shrink-0"
        >
          7 Hari
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPresetRange('30days')}
          className="rounded-lg border-2 border-brand-black font-mono font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all whitespace-nowrap flex-shrink-0"
        >
          30 Hari
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPresetRange('month')}
          className="rounded-lg border-2 border-brand-black font-mono font-bold shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5 transition-all whitespace-nowrap flex-shrink-0"
        >
          Bulan Ini
        </Button>
      </div>

      <Tabs defaultValue="sales" className="space-y-3">
        <TabsList className="grid w-full grid-cols-3 rounded-lg border-2 border-brand-black p-1 h-auto bg-white gap-1">
          <TabsTrigger value="sales" className="rounded-lg data-[state=active]:bg-brand-orange data-[state=active]:text-brand-black font-bold text-xs md:text-sm py-2.5 border-2 border-transparent data-[state=active]:border-brand-black uppercase tracking-wider transition-all">
            <DollarSign className="w-3 h-3 md:w-4 md:h-4 mr-1" />
            Penjualan
          </TabsTrigger>
          <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-brand-orange data-[state=active]:text-brand-black font-bold text-xs md:text-sm py-2.5 border-2 border-transparent data-[state=active]:border-brand-black uppercase tracking-wider transition-all">
            <BarChart3 className="w-3 h-3 md:w-4 md:h-4 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="products" className="rounded-lg data-[state=active]:bg-brand-orange data-[state=active]:text-brand-black font-bold text-xs md:text-sm py-2.5 border-2 border-transparent data-[state=active]:border-brand-black uppercase tracking-wider transition-all">
            <Package className="w-3 h-3 md:w-4 md:h-4 mr-1" />
            Produk
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
                /* Calculate 30-day velocity for fallback for all products */
                const now = new Date();
                const vStart = new Date();
                vStart.setDate(now.getDate() - 30);
                const vStartTs = vStart.getTime();

                const validSales = Array.isArray(sales) ? sales : [];
                const vSales = validSales.filter(s => s.createdAt >= vStartTs);
                const vMap = new Map(); // productId -> totalQty
                vSales.forEach(s => s.items.forEach(i => {
                  vMap.set(i.productId, (vMap.get(i.productId) || 0) + (Number(i.quantity) || 0));
                }));

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

                // Fill missing velocity/DSL using 30-day fallback
                productMap.forEach((val) => {
                  if (!val.velocity || val.velocity === 0) {
                    const pid = val.product.id;
                    if (pid) {
                      const qty30 = vMap.get(pid) || 0;
                      if (qty30 > 0) {
                        val.velocity = qty30 / 30;
                        val.dsl = (val.product.totalStock || 0) / val.velocity;
                      }
                    }
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
                                  {(item.product?.totalStock || 0) === 0 ? 'HABIS' : (item.dsl !== null && item.dsl !== Infinity) ? `${item.dsl.toFixed(1)}h` : '-'}
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
                            <th className="text-center p-2 font-mono font-bold text-xs">
                              Terjual
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
                            <th className="text-center p-2 font-mono font-bold text-xs">
                              Kecepatan Jual
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
                            <th className="text-center p-2 font-mono font-bold text-xs">
                              Habis dalam
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
                            <th className="text-center p-2 font-mono font-bold text-xs">
                              Stok
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
                            <th className="text-right p-2 font-mono font-bold text-xs">
                              Pendapatan
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
                                  <p className={`font-bold font-mono text-sm ${(item.product?.totalStock || 0) === 0 ? 'text-red-600' : (item.dsl !== null && item.dsl < 7) ? 'text-red-600' : ''
                                    }`}>
                                    {(item.product?.totalStock || 0) === 0 ? 'HABIS' : (item.dsl !== null && item.dsl !== undefined && item.dsl !== Infinity) ? `${item.dsl.toFixed(1)} hari` : '-'}
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

        <TabsContent value="sales" className="space-y-4">
          {/* Sales Analytics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Card 1: Penjualan Hari Ini */}
            <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-brand-orange/10">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs font-mono font-bold flex items-center justify-between uppercase tracking-wider">
                  Penjualan Hari Ini
                  <Banknote className="h-4 w-4 text-brand-black" />
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className="text-xl md:text-2xl font-bold font-mono text-brand-black">
                  {formatCurrency(metrics.todayRevenue)}
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-1">
                  {metrics.todaySalesCount} transaksi berhasil
                </p>
              </CardContent>
            </Card>

            {/* Card 2: Produk Terlaris Hari Ini */}
            <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] bg-blue-50">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs font-mono font-bold flex items-center justify-between uppercase tracking-wider">
                  Terlaris Hari Ini
                  <Crown className="h-4 w-4 text-blue-600" />
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                {metrics.todayBestSeller ? (
                  <>
                    <div className="text-sm md:text-base font-bold font-display leading-tight line-clamp-1" title={metrics.todayBestSeller.name}>
                      {metrics.todayBestSeller.name}
                    </div>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {metrics.todayBestSeller.quantity} terjual
                      </p>
                      <p className="text-[10px] font-bold font-mono">
                        {formatCurrency(metrics.todayBestSeller.revenue)}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground font-mono italic py-1">
                    Belum ada penjualan
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card 3: Performa Penjualan */}
            <Card className="border-2 border-brand-black rounded-lg shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
              <CardHeader className="pb-2 px-3 pt-3">
                <CardTitle className="text-xs font-mono font-bold flex items-center justify-between uppercase tracking-wider">
                  Performa vs Kemarin
                  {metrics.salesGrowthDay >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3">
                <div className={`text-xl md:text-2xl font-bold font-mono ${metrics.salesGrowthDay >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {metrics.salesGrowthDay >= 0 ? '+' : ''}{metrics.salesGrowthDay.toFixed(1)}%
                </div>
                <div className="flex justify-between items-center mt-1">
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Kemarin: {formatCurrency(metrics.yesterdayRevenue)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Action Buttons */}
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
            <Dialog open={isSaleDialogOpen} onOpenChange={setSaleDialogOpen}>
              <DialogTrigger asChild>
                <Button id="tour-add-sale" className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-xs sm:text-sm shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12 md:h-10 col-span-2 md:col-span-1">
                  <PlusCircle className="w-4 h-4 mr-1.5" />
                  Catat Penjualan
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[95vw] md:max-w-[1200px] h-[90vh] p-0 overflow-hidden rounded-none border-4 border-brand-black bg-brand-white flex flex-col">
                <DialogHeader className="px-6 py-4 border-b-2 border-brand-black bg-gray-50 flex-shrink-0">
                  <DialogTitle className="font-display text-2xl font-bold">Catat Penjualan Baru</DialogTitle>
                </DialogHeader>
                <div className="p-6 flex-1 overflow-hidden h-full">
                  <POSSaleForm onSuccess={() => {
                    setSaleDialogOpen(false);
                    fetchSales();
                  }} />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isPurchaseDialogOpen} onOpenChange={setPurchaseDialogOpen}>
              <DialogTrigger asChild>
                <Button id="tour-add-purchase" variant="outline" className="text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-xs sm:text-sm shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12 md:h-10">
                  <ShoppingCart className="w-4 h-4 mr-1.5" />
                  Catat Pembelian
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[95vw] md:max-w-[1200px] h-[90vh] p-0 overflow-hidden rounded-none border-4 border-brand-black bg-brand-white flex flex-col">
                <DialogHeader className="px-6 py-4 border-b-2 border-brand-black bg-gray-50 flex-shrink-0">
                  <DialogTitle className="font-display text-2xl font-bold">Catat Pembelian Baru</DialogTitle>
                </DialogHeader>
                <div className="p-6 flex-1 overflow-y-auto">
                  <PurchaseForm onSuccess={() => {
                    setPurchaseDialogOpen(false);
                    fetchPurchases();
                  }} />
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isProductDialogOpen} onOpenChange={setProductDialogOpen}>
              <DialogTrigger asChild>
                <Button id="tour-add-product" variant="outline" className="text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-xs sm:text-sm shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-12 md:h-10">
                  <Package className="w-4 h-4 mr-1.5" />
                  Tambah Produk
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[95vw] md:max-w-[1200px] h-[90vh] p-0 overflow-hidden rounded-none border-4 border-brand-black bg-brand-white flex flex-col">
                <DialogHeader className="px-6 py-4 border-b-2 border-brand-black bg-gray-50 flex-shrink-0">
                  <DialogTitle className="font-display text-2xl font-bold">Tambah Produk Baru</DialogTitle>
                </DialogHeader>
                <div className="p-6 flex-1 overflow-y-auto">
                  <ProductForm onSuccess={() => setProductDialogOpen(false)} />
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Sales History Table */}
          <div>
            <h3 className="text-lg font-display font-bold text-brand-black mb-1">Riwayat Penjualan Terbaru</h3>
            <p className="font-mono text-xs text-muted-foreground mb-3">Transaksi penjualan terbaru dari toko Anda.</p>
            {isLoading ? (
              <div className="border-4 border-brand-black p-4 space-y-2">
                <div className="h-10 w-full bg-gray-200 animate-pulse rounded" />
                <div className="h-10 w-full bg-gray-200 animate-pulse rounded" />
                <div className="h-10 w-full bg-gray-200 animate-pulse rounded" />
              </div>
            ) : (
              <SalesDataTable sales={sales} />
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
