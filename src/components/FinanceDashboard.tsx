import { useWarungStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Landmark, PiggyBank, FileText, Percent, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
export function FinanceDashboard() {
  const sales = useWarungStore((state) => state.sales);
  const initialBalance = useWarungStore((state) => state.initialBalance);
  const setInitialBalance = useWarungStore((state) => state.setInitialBalance);
  const purchases = useWarungStore((state) => state.purchases);
  const [balanceInput, setBalanceInput] = useState(initialBalance.toString());
  const { grossRevenue, cogs, netProfit, profitMargin, cashOnHand } = useMemo(() => {
    const totalRevenue = sales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCogs = sales.reduce((sum, sale) =>
      sum + sale.items.reduce((itemSum, item) => itemSum + (item.cost * item.quantity), 0),
    0);
    const totalPurchases = purchases.reduce((sum, purchase) => sum + purchase.cost, 0);
    const net = totalRevenue - totalCogs;
    const margin = totalRevenue > 0 ? (net / totalRevenue) * 100 : 0;
    const cash = initialBalance + totalRevenue - totalPurchases;
    return {
      grossRevenue: totalRevenue,
      cogs: totalCogs,
      netProfit: net,
      profitMargin: margin,
      cashOnHand: cash,
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="rounded-none border-2 border-brand-black shadow-hard">
          <CardHeader>
            <CardTitle className="font-display text-xl font-bold">Cash on Hand</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Wallet className="h-10 w-10 text-brand-orange" />
              <div>
                <p className="text-4xl font-bold font-display text-brand-black">{formatCurrency(cashOnHand)}</p>
                <p className="text-sm text-muted-foreground font-mono">Based on initial balance, sales, and purchases.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-none border-2 border-brand-black shadow-hard">
          <CardHeader>
            <CardTitle className="font-display text-xl font-bold">Set Initial Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="Enter starting cash"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                className="rounded-none border-2 border-brand-black"
              />
              <Button onClick={handleSetBalance} className="bg-brand-orange text-brand-black border-2 border-brand-black rounded-none font-bold shadow-hard hover:bg-brand-black hover:text-brand-white active:shadow-none active:translate-x-0.5 active:translate-y-0.5">Set</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}