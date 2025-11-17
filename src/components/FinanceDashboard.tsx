import { useWarungStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, PiggyBank, FileText, Percent } from "lucide-react";
import { useMemo } from "react";
export function FinanceDashboard() {
  const sales = useWarungStore((state) => state.sales);
  const { grossRevenue, cogs, netProfit, profitMargin } = useMemo(() => {
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCogs = sales.reduce((sum, sale) =>
      sum + sale.items.reduce((itemSum, item) => itemSum + (item.cost * item.quantity), 0),
    0);
    const net = totalRevenue - totalCogs;
    const margin = totalRevenue > 0 ? (net / totalRevenue) * 100 : 0;
    return {
      grossRevenue: totalRevenue,
      cogs: totalCogs,
      netProfit: net,
      profitMargin: margin,
    };
  }, [sales]);
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };
  const kpiData = [
    { title: "Gross Revenue", value: formatCurrency(grossRevenue), icon: PiggyBank },
    { title: "Cost of Goods Sold", value: formatCurrency(cogs), icon: FileText },
    { title: "Net Profit", value: formatCurrency(netProfit), icon: Landmark },
    { title: "Profit Margin", value: `${profitMargin.toFixed(2)}%`, icon: Percent },
  ];
  return (
    <div>
      <div className="mb-8">
        <h3 className="text-2xl font-display font-bold text-brand-black">Financial Summary</h3>
        <p className="font-mono text-sm text-muted-foreground">An overview of your business's financial health.</p>
      </div>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
        <p className="font-mono text-muted-foreground">This is a simplified financial overview based on recorded sales and product costs.</p>
      </div>
    </div>
  );
}