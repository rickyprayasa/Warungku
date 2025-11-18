import { useWarungStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, PiggyBank, FileText, Percent, Wallet, Download } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { useShallow } from "zustand/react/shallow";
import { FinancialChart } from "./FinancialChart";
import { exportToCSV } from "@/lib/csv-export";
import { format } from 'date-fns';
import { useTranslation } from "@/lib/i18n";
export function FinanceDashboard() {
  const { sales, initialBalance, setInitialBalance, purchases } = useWarungStore(
    useShallow((state) => ({
      sales: state.sales,
      initialBalance: state.initialBalance,
      setInitialBalance: state.setInitialBalance,
      purchases: state.purchases,
    }))
  );
  const { t } = useTranslation();
  const [balanceInput, setBalanceInput] = useState(initialBalance.toString());
  const { grossRevenue, cogs, netProfit, profitMargin, cashOnHand, monthlyData } = useMemo(() => {
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCogs = sales.reduce((sum, sale) =>
      sum + sale.items.reduce((itemSum, item) => itemSum + (item.cost * item.quantity), 0),
    0);
    const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.totalCost, 0);
    const net = totalRevenue - totalCogs;
    const margin = totalRevenue > 0 ? (net / totalRevenue) * 100 : 0;
    const cash = initialBalance + totalRevenue - totalPurchases;
    const monthlyAggregates: { [key: string]: { revenue: number; profit: number } } = {};
    sales.forEach(sale => {
      const month = format(new Date(sale.createdAt), 'yyyy-MM');
      if (!monthlyAggregates[month]) {
        monthlyAggregates[month] = { revenue: 0, profit: 0 };
      }
      const saleProfit = sale.total - sale.items.reduce((sum, item) => sum + item.cost * item.quantity, 0);
      monthlyAggregates[month].revenue += sale.total;
      monthlyAggregates[month].profit += saleProfit;
    });
    const chartData = Object.entries(monthlyAggregates)
      .map(([month, data]) => ({ name: format(new Date(`${month}-01T00:00:00`), 'MMM yy'), ...data }))
      .sort((a, b) => new Date(a.name).getTime() - new Date(b.name).getTime());
    return {
      grossRevenue: totalRevenue,
      cogs: totalCogs,
      netProfit: net,
      profitMargin: margin,
      cashOnHand: cash,
      monthlyData: chartData,
    };
  }, [sales, purchases, initialBalance]);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };
  const handleSetBalance = () => {
    const newBalance = parseFloat(balanceInput);
    if (!isNaN(newBalance)) {
      setInitialBalance(newBalance);
    }
  };
  const handleExport = () => {
    const dataToExport = [
      { metric: 'Gross Revenue', value: grossRevenue },
      { metric: 'Cost of Goods Sold', value: cogs },
      { metric: 'Net Profit', value: netProfit },
      { metric: 'Profit Margin (%)', value: profitMargin.toFixed(2) },
      { metric: 'Initial Balance', value: initialBalance },
      { metric: 'Total Purchases', value: purchases.reduce((sum, p) => sum + p.totalCost, 0) },
      { metric: 'Cash on Hand', value: cashOnHand },
    ];
    exportToCSV(dataToExport, 'financial_summary_report');
  };
  const kpiData = [
    { title: t('financeDashboard.grossRevenue'), value: formatCurrency(grossRevenue), icon: PiggyBank },
    { title: t('financeDashboard.cogs'), value: formatCurrency(cogs), icon: FileText },
    { title: t('financeDashboard.netProfit'), value: formatCurrency(netProfit), icon: Landmark },
    { title: t('financeDashboard.profitMargin'), value: `${profitMargin.toFixed(2)}%`, icon: Percent },
  ];
  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
        <div>
          <h3 className="text-2xl font-display font-bold text-brand-black">{t('financeDashboard.title')}</h3>
          <p className="font-mono text-sm text-muted-foreground">{t('financeDashboard.subtitle')}</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="text-brand-black border-2 border-brand-black rounded-none font-bold uppercase text-sm shadow-hard hover:bg-brand-black hover:text-brand-white hover:shadow-hard-sm active:translate-x-0.5 active:translate-y-0.5 active:shadow-none transition-all h-11">
          <Download className="w-4 h-4 mr-2" />
          {t('financeDashboard.exportReport')}
        </Button>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
        {kpiData.map((kpi, index) => (
          <Card key={index} className="rounded-none border-2 border-brand-black shadow-hard">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-mono font-bold uppercase">{kpi.title}</CardTitle>
              <kpi.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold font-display text-brand-orange">{kpi.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="rounded-none border-2 border-brand-black shadow-hard mb-8">
        <CardHeader>
          <CardTitle className="font-display text-xl font-bold">{t('financeDashboard.monthlyPerformance')}</CardTitle>
        </CardHeader>
        <CardContent>
          <FinancialChart data={monthlyData} />
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-none border-2 border-brand-black shadow-hard">
          <CardHeader>
            <CardTitle className="font-display text-xl font-bold">{t('financeDashboard.cashOnHand')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Wallet className="h-10 w-10 text-brand-orange" />
              <div>
                <p className="text-4xl font-bold font-display text-brand-black">{formatCurrency(cashOnHand)}</p>
                <p className="text-sm text-muted-foreground font-mono">{t('financeDashboard.cashOnHandSubtitle')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-none border-2 border-brand-black shadow-hard">
          <CardHeader>
            <CardTitle className="font-display text-xl font-bold">{t('financeDashboard.setInitialBalance')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder={t('financeDashboard.setInitialBalancePlaceholder')}
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                className="rounded-none border-2 border-brand-black"
              />
              <Button onClick={handleSetBalance} className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold shadow-hard hover:bg-brand-black hover:text-brand-white active:shadow-none active:translate-x-0.5 active:translate-y-0.5">{t('financeDashboard.setButton')}</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}