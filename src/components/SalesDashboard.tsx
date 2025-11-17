import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, ShoppingBag, Users } from "lucide-react";
export function SalesDashboard() {
  const kpiData = [
    { title: "Today's Revenue", value: "Rp 1,250,000", icon: DollarSign, change: "+12%" },
    { title: "Today's Sales", value: "142", icon: ShoppingBag, change: "+8%" },
    { title: "New Customers", value: "23", icon: Users, change: "+5" },
  ];
  return (
    <div>
      <div className="mb-8">
        <h3 className="text-2xl font-display font-bold text-brand-black">Sales Overview</h3>
        <p className="font-mono text-sm text-muted-foreground">A snapshot of your sales performance.</p>
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
              <p className="text-xs text-muted-foreground font-mono">{kpi.change} from yesterday</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="mt-8 text-center border-2 border-dashed border-brand-black p-12">
        <p className="font-mono text-muted-foreground">Detailed sales charts and transaction history will be available here soon.</p>
      </div>
    </div>
  );
}