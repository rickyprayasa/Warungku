import { useWarungStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, PiggyBank, FileText } from "lucide-react";
import { useMemo } from "react";
export function FinanceDashboard() {
  const sales = useWarungStore((state) => state.sales);
  const purchases = useWarungStore((state) => state.purchases);
  const { grossProfit, expenses, netProfit } = useMemo(() => {
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCostOfGoods = purchases.reduce((sum, purchase) => sum + purchase.cost, 0);
    const gross = totalRevenue; // Simplified: Gross Profit is often Revenue - COGS, but here we show total revenue as Gross Profit.
    const net = totalRevenue - totalCostOfGoods;
    return {
      grossProfit: gross,
      expenses: totalCostOfGoods,
      netProfit: net,
    };
  }, [sales, purchases]);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };
  const kpiData = [
    { title: "Gross Revenue", value: formatCurrency(grossProfit), icon: PiggyBank },
    { title: "Total Expenses (COGS)", value: formatCurrency(expenses), icon: FileText },
    { title: "Net Profit", value: formatCurrency(netProfit), icon: Landmark },
  ];
  return (
    <div>
      <div className="mb-8">
        <h3 className="text-2xl font-display font-bold text-brand-black">Financial Summary</h3>
        <p className="font-mono text-sm text-muted-foreground">An overview of your business's financial health.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
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
      <div className="mt-8 text-center border-2 border-dashed border-brand-black p-12">
        <p className="font-mono text-muted-foreground">This is a simplified financial overview. More detailed reports (P&L, Balance Sheet) can be added in future versions.</p>
      </div>
    </div>
  );
}